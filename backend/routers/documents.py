"""Private scans/prescriptions with explicit, revocable share grants.
Download succeeds only for the owner OR someone holding an active grant —
the one gate every read path (including the family head's) must pass."""
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import STORAGE_ROOT
from database import get_db, Document, DocumentShare, User
from routers.deps import get_current_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


class SharePayload(BaseModel):
    email: str


class RevokePayload(BaseModel):
    shareId: int


def _row(d: Document):
    return {"id": d.id, "type": d.type, "filename": d.filename,
            "uploaded_at": d.uploaded_at.isoformat() if d.uploaded_at else None}


@router.get("")
def list_documents(type: Optional[str] = None, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    q = db.query(Document).filter(Document.user_id == user.id)
    if type:
        q = q.filter(Document.type == type)
    return [_row(d) for d in q.order_by(Document.uploaded_at.desc()).all()]


@router.post("/upload")
async def upload(type: str = Form(...), file: UploadFile = File(...),
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if type not in ("scan", "prescription"):
        raise HTTPException(status_code=400, detail="type must be scan or prescription")
    folder = STORAGE_ROOT / f"{type}s" / str(user.id)
    folder.mkdir(parents=True, exist_ok=True)
    ext = Path(file.filename or "").suffix
    stored = folder / f"{uuid.uuid4().hex}{ext}"
    stored.write_bytes(await file.read())
    doc = Document(user_id=user.id, type=type, filename=file.filename,
                   storage_path=str(stored.relative_to(STORAGE_ROOT)))
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _row(doc)


@router.get("/{doc_id}/download")
def download(doc_id: int, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    owns = doc.user_id == user.id
    shared = False
    if not owns:
        shared = db.query(DocumentShare).filter(
            DocumentShare.document_id == doc.id,
            DocumentShare.shared_with_id == user.id,
            DocumentShare.revoked_at.is_(None),
        ).first() is not None
    if not owns and not shared:
        raise HTTPException(status_code=403, detail="Not shared with you")
    return FileResponse(STORAGE_ROOT / doc.storage_path, filename=doc.filename)


@router.post("/{doc_id}/share")
def share(doc_id: int, payload: SharePayload, user: User = Depends(get_current_user),
          db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id,
                                    Document.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found or not yours")
    target = db.query(User).filter(User.email == payload.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="No VitaCircle user with that email")
    grant = DocumentShare(document_id=doc.id, shared_with_id=target.id)
    db.add(grant)
    db.commit()
    db.refresh(grant)
    return {"id": grant.id, "sharedWith": target.email}


@router.get("/{doc_id}/shares")
def list_shares(doc_id: int, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id,
                                    Document.user_id == user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found or not yours")
    grants = (db.query(DocumentShare, User)
              .join(User, User.id == DocumentShare.shared_with_id)
              .filter(DocumentShare.document_id == doc.id,
                      DocumentShare.revoked_at.is_(None)).all())
    return [{"shareId": g.id, "email": u.email, "name": u.name} for g, u in grants]


@router.post("/{doc_id}/revoke")
def revoke(doc_id: int, payload: RevokePayload, user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    grant = (db.query(DocumentShare)
             .join(Document, Document.id == DocumentShare.document_id)
             .filter(DocumentShare.id == payload.shareId,
                     Document.user_id == user.id).first())
    if not grant:
        raise HTTPException(status_code=404, detail="Share not found")
    grant.revoked_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True}
