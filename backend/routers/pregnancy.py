"""Pregnancy Premium module: weekly fetal theme, weight tracking vs BMI-band
expected range, blood tests, hydration/nutrition, care-circle contacts with
cadence, delivery → postpartum flip, and the simulated smart ring."""
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import (get_db, User, PregnancyProfile, PregnancyContact,
                      ContactUpdateLog, BloodTest, HydrationLog, NutritionLog, DailyLog)
from routers.deps import get_current_user
from services import pregnancy_calc as preg
from services.fetal_stages import get_week_data
from services.ring_simulator import generate_reading, CALMING_SOUNDS
from services.email_service import build_weekly_update_email, send_update_email

router = APIRouter(prefix="/api/pregnancy", tags=["pregnancy"])


def _profile_or_404(user, db) -> PregnancyProfile:
    profile = db.query(PregnancyProfile).filter_by(user_id=user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="No pregnancy profile yet")
    return profile


# ---- Weekly fetal development theme ---------------------------------------

@router.get("/week")
def week(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _profile_or_404(user, db)
    wk = preg.weeks_from_due_date(profile.due_date)
    return {
        "week": wk["weeks_pregnant"],
        "weeksRemaining": wk["weeks_remaining"],
        "daysRemaining": wk["days_remaining"],
        "dueDate": profile.due_date.isoformat(),
        "trimester": preg.trimester_for(wk["weeks_pregnant"]),
        **get_week_data(wk["weeks_pregnant"]),
    }


# ---- Weight ----------------------------------------------------------------

@router.get("/weight-summary")
def weight_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _profile_or_404(user, db)
    logs = (db.query(DailyLog).filter(DailyLog.user_id == user.id,
                                      DailyLog.weight_kg.isnot(None))
            .order_by(DailyLog.id.asc()).all())
    current = logs[-1].weight_kg if logs else user.weight_kg
    gained = (current - profile.pre_weight_kg) if (current and profile.pre_weight_kg) else None
    return {
        "prePregnancyWeightKg": profile.pre_weight_kg,
        "currentWeightKg": current,
        "gainedSoFarKg": round(gained, 1) if gained is not None else None,
        "expectedRangeKg": preg.expected_weight_gain_range_kg(profile.pre_weight_kg, user.height_cm),
        "history": [{"recorded_at": l.date, "weight_kg": l.weight_kg} for l in logs],
    }


# ---- Blood tests -----------------------------------------------------------

class BloodTestPayload(BaseModel):
    testName: str
    value: float
    unit: Optional[str] = None
    refLow: Optional[float] = None
    refHigh: Optional[float] = None


@router.get("/blood-tests")
def blood_tests(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tests = (db.query(BloodTest).filter(BloodTest.user_id == user.id)
             .order_by(BloodTest.id.asc()).all())
    return [{
        "id": t.id, "test_name": t.test_name, "value": t.value, "unit": t.unit,
        "inRange": (t.ref_low is None or t.value >= t.ref_low) and
                   (t.ref_high is None or t.value <= t.ref_high),
    } for t in tests]


@router.post("/blood-tests")
def add_blood_test(payload: BloodTestPayload, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    t = BloodTest(user_id=user.id, test_name=payload.testName, value=payload.value,
                  unit=payload.unit, ref_low=payload.refLow, ref_high=payload.refHigh)
    db.add(t)
    db.commit()
    return {"ok": True}


# ---- Hydration & nutrition --------------------------------------------------

class HydrationPayload(BaseModel):
    amountMl: int


class NutritionPayload(BaseModel):
    calories: int
    note: Optional[str] = None


@router.get("/hydration/today")
def hydration_today(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total = (db.query(func.coalesce(func.sum(HydrationLog.amount_ml), 0))
             .filter(HydrationLog.user_id == user.id,
                     HydrationLog.logged_at >= start.replace(tzinfo=None)).scalar())
    return {"totalMl": int(total), **preg.hydration_guidance_ml()}


@router.post("/hydration")
def log_hydration(payload: HydrationPayload, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    db.add(HydrationLog(user_id=user.id, amount_ml=payload.amountMl))
    db.commit()
    return {"ok": True}


@router.get("/nutrition/today")
def nutrition_today(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _profile_or_404(user, db)
    wk = preg.weeks_from_due_date(profile.due_date)["weeks_pregnant"]
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    total = (db.query(func.coalesce(func.sum(NutritionLog.calories), 0))
             .filter(NutritionLog.user_id == user.id,
                     NutritionLog.logged_at >= start.replace(tzinfo=None)).scalar())
    return {"totalCalories": int(total), **preg.calorie_guidance(wk)}


@router.post("/nutrition")
def log_nutrition(payload: NutritionPayload, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    db.add(NutritionLog(user_id=user.id, calories=payload.calories, note=payload.note))
    db.commit()
    return {"ok": True}


# ---- Care circle contacts ----------------------------------------------------

class ContactPayload(BaseModel):
    name: str
    relation: str  # doctor | husband | relative
    email: str


@router.get("/contacts")
def contacts(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _profile_or_404(user, db)
    wk = preg.weeks_from_due_date(profile.due_date)["weeks_pregnant"]
    rows = db.query(PregnancyContact).filter_by(user_id=user.id).all()
    return [{
        "id": c.id, "name": c.name, "relation": c.relation, "email": c.email,
        "cadenceDays": preg.update_cadence_days(wk),
        "updateDue": preg.is_update_due(c.last_update_sent, wk),
    } for c in rows]


@router.post("/contacts")
def add_contact(payload: ContactPayload, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    if payload.relation not in ("doctor", "husband", "relative"):
        raise HTTPException(status_code=400, detail="relation must be doctor, husband, or relative")
    c = PregnancyContact(user_id=user.id, name=payload.name,
                         relation=payload.relation, email=payload.email)
    db.add(c)
    db.commit()
    return {"ok": True}


@router.post("/contacts/{contact_id}/send-now")
def send_now(contact_id: int, user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    profile = _profile_or_404(user, db)
    contact = db.query(PregnancyContact).filter_by(id=contact_id, user_id=user.id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    wk = preg.weeks_from_due_date(profile.due_date)
    subject, body_html = build_weekly_update_email(
        mom_name=user.name or "Mom", week=wk["weeks_pregnant"],
        weeks_remaining=wk["weeks_remaining"], due_date=profile.due_date,
        relation=contact.relation)
    result = send_update_email(contact.email, subject, body_html)
    db.add(ContactUpdateLog(contact_id=contact.id, content=subject))
    contact.last_update_sent = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, **result}


# ---- Delivery / postpartum -----------------------------------------------------

@router.post("/deliver")
def deliver(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = _profile_or_404(user, db)
    profile.delivered_at = datetime.now(timezone.utc)
    user.is_pregnant = False
    user.is_postpartum = True
    db.commit()
    return {"ok": True}


@router.get("/postpartum/guidance")
def postpartum_guidance(user: User = Depends(get_current_user)):
    # Deliberately general and non-prescriptive: ranges, not targets, always
    # paired with a "confirm with your doctor" note. No calorie deficits or
    # numeric weight-loss goals.
    return {"guidance": [
        {"topic": "Physical recovery",
         "note": "Most doctors recommend waiting for your postpartum check (around 6 weeks) "
                 "before starting structured exercise. Gentle walking is usually fine sooner "
                 "if you feel up to it."},
        {"topic": "Weight changes",
         "note": "Weight loss after birth is gradual and highly individual, especially if "
                 "breastfeeding. There is no healthy universal timeline — please talk to your "
                 "doctor before setting any specific goal."},
        {"topic": "Mental health",
         "note": "It is common to have ups and downs. If sadness, anxiety, or hopelessness "
                 "last more than two weeks, please reach out to your doctor — postpartum "
                 "support is available and effective."},
        {"topic": "Watch for",
         "note": "Heavy bleeding, fever, severe headache, or swelling/pain in one leg warrant "
                 "an urgent call to your doctor."},
    ]}


# ---- Premium: simulated smart ring ----------------------------------------------

@router.get("/premium/status")
def premium_status(user: User = Depends(get_current_user)):
    return {"ring_activated": user.ring_activated}


@router.post("/premium/activate")
def activate_ring(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Payment stub — swap for a real Stripe/App Store webhook later.
    user.ring_activated = True
    db.commit()
    return {"ring_activated": True}


@router.get("/premium/ring")
def ring_data(user: User = Depends(get_current_user)):
    if not user.ring_activated:
        raise HTTPException(status_code=403, detail="Ring not activated")
    return generate_reading()


@router.get("/premium/sounds")
def sounds(user: User = Depends(get_current_user)):
    return CALMING_SOUNDS
