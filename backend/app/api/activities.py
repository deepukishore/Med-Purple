import hashlib
from datetime import datetime, timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import FocusSession, Question, Clip
from app.services.xp import award

router = APIRouter(prefix="/activities", tags=["Learning activities"])


class ResourceIn(BaseModel):
    url: str = Field(max_length=1000)


@router.post("/resource")
def resource(data: ResourceIn, user=Depends(current_user), db: Session = Depends(get_db)):
    valid = db.scalar(select(Question.id).where(Question.source_url == data.url)) or db.scalar(select(Clip.id).where(Clip.source_url == data.url))
    if not valid:
        raise HTTPException(400, "Choose a reading from the resource library.")
    points = award(db, user, "resource:" + hashlib.sha256(data.url.encode()).hexdigest(), "resource")
    db.commit()
    return dict(xp_earned=points)


class FocusIn(BaseModel):
    seconds: Literal[300, 900, 1500]


@router.post("/focus", status_code=201)
def focus(data: FocusIn, user=Depends(current_user), db: Session = Depends(get_db)):
    session = FocusSession(user_id=user.id, seconds=data.seconds)
    db.add(session)
    db.commit()
    return dict(id=session.id, seconds=session.seconds)


@router.post("/focus/{session_id}/complete")
def complete_focus(session_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    session = db.get(FocusSession, session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Focus session not found.")
    elapsed = (datetime.now(timezone.utc) - session.started_at.replace(tzinfo=timezone.utc)).total_seconds()
    if elapsed < session.seconds:
        raise HTTPException(409, "Your focus session is still running.")
    points = award(db, user, "focus:" + session.id, "focus")
    session.completed = True
    db.commit()
    return dict(xp_earned=points)
