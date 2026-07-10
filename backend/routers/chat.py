"""AI chat + RAG document upload + emergency alert."""
import json
import urllib.request

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from config import ALERT_WEBHOOK_URL
from database import get_db, ChatMessage, PregnancyProfile, User
from routers.deps import get_current_user
from services import gemini, rag
from services import pregnancy_calc as preg
from services.persona import derive_persona

router = APIRouter(prefix="/api", tags=["chat"])


class ChatPayload(BaseModel):
    message: str


@router.post("/chat")
def chat(payload: ChatPayload, user: User = Depends(get_current_user),
         db: Session = Depends(get_db)):
    p = derive_persona(user)

    db.add(ChatMessage(user_id=user.id, role="user", content=payload.message))
    db.commit()

    history = (db.query(ChatMessage).filter(ChatMessage.user_id == user.id)
               .order_by(ChatMessage.id.desc()).limit(10).all())
    history = list(reversed(history))[:-1]  # exclude the message just stored

    pregnancy_week = None
    if p["persona"] == "pregnancy" and p["variant"] == "expecting":
        profile = db.query(PregnancyProfile).filter_by(user_id=user.id).first()
        if profile:
            pregnancy_week = preg.weeks_from_due_date(profile.due_date)["weeks_pregnant"]

    reply, meta = gemini.chat_reply(user, p["persona"], p["variant"],
                                    payload.message, history, pregnancy_week)

    db.add(ChatMessage(user_id=user.id, role="assistant", content=reply))
    db.commit()
    return {"reply": reply, "persona": p["persona"], **meta}


@router.get("/chat/history")
def chat_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = (db.query(ChatMessage).filter(ChatMessage.user_id == user.id)
            .order_by(ChatMessage.id.desc()).limit(30).all())
    return [{"role": m.role, "content": m.content} for m in reversed(msgs)]


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if not (file.filename or "").endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    reader = PdfReader(file.file)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if not text.strip():
        return {"status": "Failed to extract text from PDF."}
    count = rag.add_document_text(text)
    return {"status": f"Success! Uploaded and embedded {count} chunks into RAG."}


@router.post("/emergency/alert")
def emergency_alert(user: User = Depends(get_current_user)):
    """Server-side dispatch so the webhook URL never ships to the browser."""
    if not ALERT_WEBHOOK_URL:
        return {"dispatched": False, "detail": "ALERT_WEBHOOK_URL not configured (dev mode)."}
    payload = {
        "user_name": user.name,
        "contact_name": user.emergency_name,
        "contact_email": user.emergency_email,
        "guardian_name": user.guardian_name,
        "guardian_email": user.guardian_email,
        "doctor_name": user.doctor_name,
        "doctor_email": user.doctor_email,
        "alert": "SEVERE SYMPTOMS DETECTED. IMMEDIATE ASSISTANCE REQUIRED.",
    }
    req = urllib.request.Request(
        ALERT_WEBHOOK_URL, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15):
            pass
        return {"dispatched": True}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Webhook failed: {e}")
