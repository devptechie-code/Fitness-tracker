"""Daily vitals logs (weight, water, calories; kicks/symptoms when pregnant)."""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, DailyLog, User
from routers.deps import get_current_user

router = APIRouter(prefix="/api/logs", tags=["logs"])


class LogPayload(BaseModel):
    date: str
    weight_kg: float
    water_glasses: int
    calories: int
    kicks: Optional[int] = None
    symptoms: Optional[str] = None


@router.post("")
def save_log(payload: LogPayload, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    log = DailyLog(user_id=user.id, date=payload.date, weight_kg=payload.weight_kg,
                   water_glasses=payload.water_glasses, calories=payload.calories,
                   kicks=payload.kicks, symptoms=payload.symptoms)
    db.add(log)
    # Keep the profile's current weight in sync so BMI/TDEE stay fresh.
    user.weight_kg = payload.weight_kg
    db.commit()
    return {"status": "ok"}


@router.get("/history")
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    logs = (db.query(DailyLog).filter(DailyLog.user_id == user.id)
            .order_by(DailyLog.id.desc()).limit(7).all())
    return [{
        "date": l.date, "weight_kg": l.weight_kg, "water_glasses": l.water_glasses,
        "calories": l.calories, "kicks": l.kicks, "symptoms": l.symptoms,
    } for l in logs]
