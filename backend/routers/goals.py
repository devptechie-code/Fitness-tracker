"""Server-side goals (replaces the old localStorage gym plan)."""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, Goal, User
from routers.deps import get_current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])


class GoalPayload(BaseModel):
    title: str
    category: Optional[str] = None
    dueDate: Optional[date] = None


def _row(g: Goal):
    return {"id": g.id, "title": g.title, "category": g.category,
            "dueDate": g.due_date.isoformat() if g.due_date else None,
            "completed": g.completed}


@router.get("")
def list_goals(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = (db.query(Goal).filter(Goal.user_id == user.id)
             .order_by(Goal.due_date.is_(None), Goal.due_date, Goal.id).all())
    return [_row(g) for g in goals]


@router.post("")
def create_goal(payload: GoalPayload, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    goal = Goal(user_id=user.id, title=payload.title, category=payload.category,
                due_date=payload.dueDate or date.today())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _row(goal)


@router.patch("/{goal_id}/complete")
def complete_goal(goal_id: int, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    # Scoped to the caller so nobody can mark another member's goal done.
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.completed = True
    goal.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(goal)
    return _row(goal)


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"ok": True}
