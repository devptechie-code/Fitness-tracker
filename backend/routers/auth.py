"""Register / login. Passwords are bcrypt-hashed (never stored in plaintext),
and sessions use signed JWTs instead of raw user ids."""
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from passlib.hash import bcrypt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import get_db, User, PregnancyProfile
from routers.deps import create_token, get_current_user
from services.persona import derive_persona
from services import pregnancy_calc as preg

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthPayload(BaseModel):
    email: str
    password: str


class ProfilePayload(BaseModel):
    name: str
    sex: str
    birthdate: date
    heightCm: float
    weightKg: float
    activityLevel: str
    isPregnant: bool = False
    pregWeek: Optional[int] = None
    preWeight: Optional[float] = None
    emergencyName: Optional[str] = None
    emergencyEmail: Optional[str] = None
    guardianName: Optional[str] = None
    guardianEmail: Optional[str] = None
    doctorName: Optional[str] = None
    doctorEmail: Optional[str] = None
    familyCode: Optional[str] = None  # join an existing family; blank = create one


def _user_payload(user: User, db: Session):
    p = derive_persona(user)
    out = {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "sex": user.sex,
        "age": p["age"],
        "persona": p["persona"],
        "variant": p["variant"],
        "role": user.role,
        "familyId": user.family_id,
        "heightCm": user.height_cm,
        "weightKg": user.weight_kg,
        "activityLevel": user.activity_level,
        "isPregnant": user.is_pregnant,
        "isPostpartum": user.is_postpartum,
        "emergencyName": user.emergency_name,
        "emergencyEmail": user.emergency_email,
        "guardianName": user.guardian_name,
        "guardianEmail": user.guardian_email,
        "doctorName": user.doctor_name,
        "doctorEmail": user.doctor_email,
        "ringActivated": user.ring_activated,
        "needsOnboarding": user.name is None,
    }
    if user.is_pregnant:
        profile = db.query(PregnancyProfile).filter_by(user_id=user.id).first()
        if profile:
            out["pregnancyWeek"] = preg.weeks_from_due_date(profile.due_date)["weeks_pregnant"]
    return out


@router.post("/register")
def register(payload: AuthPayload, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=payload.email, password_hash=bcrypt.hash(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"token": create_token(user.id), "user": _user_payload(user, db)}


@router.post("/login")
def login(payload: AuthPayload, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not bcrypt.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": create_token(user.id), "user": _user_payload(user, db)}


@router.get("/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _user_payload(user, db)


@router.post("/profile")
def save_profile(
    payload: ProfilePayload,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.name = payload.name
    user.sex = payload.sex
    user.birthdate = payload.birthdate
    user.height_cm = payload.heightCm
    user.weight_kg = payload.weightKg
    user.activity_level = payload.activityLevel
    user.emergency_name = payload.emergencyName
    user.emergency_email = payload.emergencyEmail
    user.guardian_name = payload.guardianName
    user.guardian_email = payload.guardianEmail
    user.doctor_name = payload.doctorName
    user.doctor_email = payload.doctorEmail

    # Pregnancy only applies to female profiles.
    user.is_pregnant = bool(payload.isPregnant and payload.sex == "female")

    if payload.familyCode:
        head = db.query(User).filter(User.family_id == payload.familyCode).first()
        if not head:
            raise HTTPException(status_code=404, detail="Family code not found")
        user.family_id = payload.familyCode
        if user.role != "head":
            user.role = "member"
    elif not user.family_id:
        # First profile in a household becomes its family head.
        user.family_id = uuid.uuid4().hex[:8]
        user.role = "head"

    if user.is_pregnant:
        week = min(40, max(1, payload.pregWeek or 1))
        due = date.today() + timedelta(days=(40 - week) * 7)
        profile = db.query(PregnancyProfile).filter_by(user_id=user.id).first()
        if profile:
            profile.due_date = due
            profile.pre_weight_kg = payload.preWeight
            profile.delivered_at = None
        else:
            db.add(PregnancyProfile(user_id=user.id, due_date=due, pre_weight_kg=payload.preWeight))

    db.commit()
    db.refresh(user)
    return _user_payload(user, db)
