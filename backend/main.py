from fastapi import FastAPI, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean
from sqlalchemy.orm import declarative_base, sessionmaker, Session
import google.generativeai as genai
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import json
import re

# ==========================================
# HARDCODED API KEY (For Hackathon Demo)
# Replace this string with your real key!
# ==========================================
HACKATHON_GEMINI_API_KEY = "AQ.Ab8RN6KvZ12TbXICqnSByzW4LOHs8wA3Li89ELNRtPVER0TyOQ"

import os

# Pure Python RAG In-Memory DB
knowledge_chunks = []

def load_knowledge_base():
    global knowledge_chunks
    file_path = os.path.join(os.path.dirname(__file__), "medical_knowledge.txt")
    if os.path.exists(file_path):
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
        chunk_size = 1000
        overlap = 200
        chunks = []
        i = 0
        while i < len(text):
            chunks.append(text[i:i+chunk_size])
            i += chunk_size - overlap
        knowledge_chunks = chunks

load_knowledge_base()

# SQL DB Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./fitness.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    name = Column(String, nullable=True)
    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    activity_level = Column(String, nullable=True)
    is_pregnant = Column(Boolean, default=False)
    preg_week = Column(Integer, nullable=True)
    pre_weight = Column(Float, nullable=True)
    emergency_name = Column(String, nullable=True)
    emergency_email = Column(String, nullable=True)

class DailyLogDB(Base):
    __tablename__ = "daily_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    date = Column(String)
    weight_kg = Column(Float)
    water_glasses = Column(Integer)
    calories = Column(Integer)
    workouts_done = Column(String)
    kicks = Column(Integer, nullable=True)
    symptoms = Column(String, nullable=True)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class AuthPayload(BaseModel):
    email: str
    password: str

class ProfilePayload(BaseModel):
    user_id: int
    name: str
    sex: str
    age: int
    heightCm: float
    weightKg: float
    activityLevel: str
    isPregnant: bool
    pregWeek: Optional[int] = None
    preWeight: Optional[float] = None
    emergencyName: Optional[str] = None
    emergencyEmail: Optional[str] = None

class LogPayload(BaseModel):
    user_id: int
    date: str
    weight_kg: float
    water_glasses: int
    calories: int
    workouts_done: List[str]
    kicks: Optional[int] = None
    symptoms: Optional[str] = None

class ChatPayload(BaseModel):
    user_id: int
    message: str

@app.post("/api/register")
def register(payload: AuthPayload, db: Session = Depends(get_db)):
    if db.query(UserDB).filter(UserDB.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = UserDB(email=payload.email, password=payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id}

@app.post("/api/login")
def login(payload: AuthPayload, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == payload.email, UserDB.password == payload.password).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "user_id": user.id,
        "profile": {
            "name": user.name,
            "sex": user.sex,
            "age": user.age,
            "isPregnant": user.is_pregnant,
            "weightKg": user.weight_kg,
            "heightCm": user.height_cm,
            "activityLevel": user.activity_level,
            "pregWeek": user.preg_week,
            "preWeight": user.pre_weight,
            "emergencyName": user.emergency_name,
            "emergencyEmail": user.emergency_email
        } if user.name else None
    }

@app.post("/api/profile")
def save_profile(payload: ProfilePayload, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == payload.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.name = payload.name
    user.age = payload.age
    user.sex = payload.sex
    user.height_cm = payload.heightCm
    user.weight_kg = payload.weightKg
    user.activity_level = payload.activityLevel
    user.is_pregnant = payload.isPregnant
    user.preg_week = payload.pregWeek
    user.pre_weight = payload.preWeight
    user.emergency_name = payload.emergencyName
    user.emergency_email = payload.emergencyEmail
    db.commit()
    return {"status": "ok"}

@app.post("/api/log")
def save_log(payload: LogPayload, db: Session = Depends(get_db)):
    log = DailyLogDB(
        user_id=payload.user_id,
        date=payload.date,
        weight_kg=payload.weight_kg,
        water_glasses=payload.water_glasses,
        calories=payload.calories,
        workouts_done=json.dumps(payload.workouts_done),
        kicks=payload.kicks,
        symptoms=payload.symptoms
    )
    db.add(log)
    db.commit()
    return {"status": "ok"}

@app.get("/api/history/{user_id}")
def get_history(user_id: int, db: Session = Depends(get_db)):
    logs = db.query(DailyLogDB).filter(DailyLogDB.user_id == user_id).order_by(DailyLogDB.id.desc()).limit(7).all()
    return [
        {
            "date": l.date,
            "weight_kg": l.weight_kg,
            "water_glasses": l.water_glasses,
            "calories": l.calories,
            "workouts_done": json.loads(l.workouts_done),
            "symptoms": l.symptoms
        } for l in logs
    ]

# --- RAG ENDPOINTS ---

@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    reader = PdfReader(file.file)
    text = ""
    for page in reader.pages:
        extracted = page.extract_text()
        if extracted:
            text += extracted + "\n"
            
    # Chunking
    chunk_size = 1000
    overlap = 200
    chunks = []
    i = 0
    while i < len(text):
        chunks.append(text[i:i+chunk_size])
        i += chunk_size - overlap
        
    if chunks:
        global knowledge_chunks
        knowledge_chunks = chunks
        return {"status": f"Success! Uploaded and embedded {len(chunks)} chunks into RAG."}
    return {"status": "Failed to extract text from PDF."}

@app.post("/api/chat")
def chat(payload: ChatPayload, db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.id == payload.user_id).first()
    
    if HACKATHON_GEMINI_API_KEY == "YOUR_API_KEY_HERE":
        return {"reply": "Developer: Please hardcode your Gemini API Key in backend/main.py at line 14."}
    
    # 1. RAG Retrieval using TF-IDF
    context_text = "No PDF document uploaded yet."
    global knowledge_chunks
    if knowledge_chunks:
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(knowledge_chunks + [payload.message])
            # The last row is the user message
            similarities = cosine_similarity(tfidf_matrix[-1], tfidf_matrix[:-1]).flatten()
            
            top_indices = similarities.argsort()[-3:][::-1]
            best_chunks = [knowledge_chunks[i] for i in top_indices if similarities[i] > 0.05]
            
            if best_chunks:
                context_text = "\n\n".join(best_chunks)
            else:
                context_text = "No relevant context found in the PDF for this query."
        except Exception:
            pass

    try:
        import urllib.request
        import json
        
        context = (
            f"You are an Emergency Doctor AI for pregnant women. The user is a {user.age} year old {user.sex}. "
            "CRITICAL INSTRUCTION: You are an API. Keep your response VERY concise (maximum 3 sentences). "
            'You MUST respond ONLY with a valid JSON object. Do NOT output any markdown, thinking, or scratchpads outside the JSON. '
            'Format: {"response": "Your final message here"}\n\n'
            f"MEDICAL KNOWLEDGE BASE CONTEXT:\n{context_text}\n\n"
            "Answer the user's question using ONLY the knowledge base context above. If the context doesn't have the answer, advise them to seek emergency care."
        )
        
        prompt = f"{context}\n\nUser says: {payload.message}"
        
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={HACKATHON_GEMINI_API_KEY}"
        data = {"contents": [{"parts": [{"text": prompt}]}]}
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req) as response:
            resp_json = json.loads(response.read().decode())
            reply_text = resp_json["candidates"][0]["content"]["parts"][0]["text"]
            
        # Bulletproof JSON extraction: find all { ... } blocks and parse the last valid one
        json_blocks = re.findall(r'\{.*?\}', reply_text, re.DOTALL)
        for block in reversed(json_blocks):
            try:
                data = json.loads(block)
                if "response" in data:
                    return {"reply": data["response"]}
            except Exception:
                continue
                
        # Absolute fallback if it somehow didn't use JSON at all
        blocks = [b.strip() for b in reply_text.split('\n\n') if b.strip()]
        if blocks: return {"reply": blocks[-1]}
        return {"reply": "API Error: No working model found."}
    except Exception as e:
        return {"reply": f"API Error: Make sure your hardcoded key is valid! ({str(e)})"}

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
