"""Daily 08:00 job: send a care-circle update to any contact whose cadence
window has elapsed (weekly normally, every 3 days from week 37+).
The manual "Send now" button does the same work on demand — this automates it.
Python port of vitacircle jobs/pregnancyUpdateScheduler.js using APScheduler."""
from apscheduler.schedulers.background import BackgroundScheduler

from database import SessionLocal, PregnancyContact, PregnancyProfile, User, ContactUpdateLog
from services import pregnancy_calc as preg
from services.email_service import build_weekly_update_email, send_update_email


def run_update_pass():
    db = SessionLocal()
    try:
        rows = (
            db.query(PregnancyContact, User, PregnancyProfile)
            .join(User, User.id == PregnancyContact.user_id)
            .join(PregnancyProfile, PregnancyProfile.user_id == PregnancyContact.user_id)
            .filter(PregnancyProfile.delivered_at.is_(None))
            .all()
        )
        for contact, user, profile in rows:
            wk = preg.weeks_from_due_date(profile.due_date)
            if not preg.is_update_due(contact.last_update_sent, wk["weeks_pregnant"]):
                continue
            subject, body_html = build_weekly_update_email(
                mom_name=user.name or "Mom",
                week=wk["weeks_pregnant"],
                weeks_remaining=wk["weeks_remaining"],
                due_date=profile.due_date,
                relation=contact.relation,
            )
            if contact.email:
                send_update_email(contact.email, subject, body_html)
            db.add(ContactUpdateLog(contact_id=contact.id, content=subject))
            from datetime import datetime, timezone
            contact.last_update_sent = datetime.now(timezone.utc)
        db.commit()
    except Exception as e:
        print(f"Pregnancy update scheduler error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_update_pass, "cron", hour=8, minute=0)
    scheduler.start()
    print("Pregnancy update scheduler started (daily @ 08:00).")
    return scheduler
