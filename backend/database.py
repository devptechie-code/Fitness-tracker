"""SQLAlchemy models — the merged schema of both prototypes."""
from sqlalchemy import (create_engine, Column, Integer, String, Float, Boolean,
                        Date, DateTime, ForeignKey, Text, func)
from sqlalchemy.orm import declarative_base, sessionmaker

from config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=True)
    birthdate = Column(Date, nullable=True)
    sex = Column(String, nullable=True)  # 'male' | 'female'
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    activity_level = Column(String, nullable=True)
    is_pregnant = Column(Boolean, default=False)
    is_postpartum = Column(Boolean, default=False)
    emergency_name = Column(String, nullable=True)
    emergency_email = Column(String, nullable=True)
    guardian_name = Column(String, nullable=True)
    guardian_email = Column(String, nullable=True)
    doctor_name = Column(String, nullable=True)
    doctor_email = Column(String, nullable=True)
    family_id = Column(String, index=True, nullable=True)
    role = Column(String, default="member")  # 'head' | 'member'
    ring_activated = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class Goal(Base):
    __tablename__ = "goals"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DailyLog(Base):
    __tablename__ = "daily_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    date = Column(String, nullable=False)
    weight_kg = Column(Float)
    water_glasses = Column(Integer)
    calories = Column(Integer)
    kicks = Column(Integer, nullable=True)       # pregnancy only
    symptoms = Column(String, nullable=True)     # pregnancy only
    created_at = Column(DateTime, server_default=func.now())


class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    type = Column(String, nullable=False)  # 'scan' | 'prescription'
    filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    uploaded_at = Column(DateTime, server_default=func.now())


class DocumentShare(Base):
    __tablename__ = "document_shares"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), index=True, nullable=False)
    shared_with_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    revoked_at = Column(DateTime, nullable=True)


class PregnancyProfile(Base):
    __tablename__ = "pregnancy_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, index=True, nullable=False)
    due_date = Column(Date, nullable=False)
    pre_weight_kg = Column(Float, nullable=True)
    delivered_at = Column(DateTime, nullable=True)


class PregnancyContact(Base):
    __tablename__ = "pregnancy_contacts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    relation = Column(String, nullable=False)  # 'doctor' | 'husband' | 'relative'
    email = Column(String, nullable=False)
    last_update_sent = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class ContactUpdateLog(Base):
    __tablename__ = "contact_updates_log"
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("pregnancy_contacts.id"), index=True, nullable=False)
    content = Column(Text)
    sent_at = Column(DateTime, server_default=func.now())


class BloodTest(Base):
    __tablename__ = "blood_tests"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    test_name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=True)
    ref_low = Column(Float, nullable=True)
    ref_high = Column(Float, nullable=True)
    recorded_at = Column(DateTime, server_default=func.now())


class HydrationLog(Base):
    __tablename__ = "hydration_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    amount_ml = Column(Integer, nullable=False)
    logged_at = Column(DateTime, server_default=func.now())


class NutritionLog(Base):
    __tablename__ = "nutrition_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    calories = Column(Integer, nullable=False)
    note = Column(String, nullable=True)
    logged_at = Column(DateTime, server_default=func.now())


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String, nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
