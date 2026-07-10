"""VitaCircle — merged fitness tracker (FastAPI backend + static JS/CSS frontend).

Secrets live in the environment (see .env.example). The old hardcoded Gemini
key has been removed — rotate it in Google AI Studio since it appeared in
public git history.
"""
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db
from routers import auth, goals, logs, documents, family, pregnancy, chat
from services.scheduler import start_scheduler

init_db()

app = FastAPI(title="VitaCircle")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(goals.router)
app.include_router(logs.router)
app.include_router(documents.router)
app.include_router(family.router)
app.include_router(pregnancy.router)
app.include_router(chat.router)


@app.on_event("startup")
def _startup():
    start_scheduler()


app.mount("/", StaticFiles(directory=Path(__file__).parent / "static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
