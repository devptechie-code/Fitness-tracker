"""Family head overview: name/persona, today's goal completion %, due/ok pill.
Deliberately selects NO raw vitals and NO documents — those require an
explicit share grant from the owner."""
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db, Goal, User
from routers.deps import require_family_head

router = APIRouter(prefix="/api/family", tags=["family"])


@router.get("/overview")
def overview(head: User = Depends(require_family_head), db: Session = Depends(get_db)):
    members = db.query(User).filter(User.family_id == head.family_id).all()
    from services.persona import derive_persona
    out = []
    for m in members:
        today = date.today()
        total = db.query(Goal).filter(Goal.user_id == m.id, Goal.due_date == today).count()
        done = db.query(Goal).filter(Goal.user_id == m.id, Goal.due_date == today,
                                     Goal.completed.is_(True)).count()
        pct = round(done / total * 100) if total else 100
        p = derive_persona(m)
        out.append({
            "userId": m.id,
            "name": m.name or m.email,
            "persona": p["persona"],
            "variant": p["variant"],
            "completionPct": pct,
            "due": total - done,
            "status": "due" if total - done > 0 else "ok",
            "isYou": m.id == head.id,
        })
    return out
