import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import Question, Clip
from app.api.progress import progress_data
from app.services.xp import award
from app.services.progress import local_today

router = APIRouter(prefix="/tutor", tags=["Study coach"])


class CoachIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    question: str = Field(min_length=2, max_length=500)


@router.get("")
def coach(user=Depends(current_user), db: Session = Depends(get_db)):
    progress = progress_data(db, user)
    weak = sorted([s for s in progress["subjects"] if s["answered"]], key=lambda s: s["accuracy"])
    return dict(subject=weak[0]["subject"] if weak else "", suggestions=[
        "Try five questions and read each explanation.",
        "Turn a tricky idea into a flashcard in your own words.",
        "Schedule one short revision block, then take a break."
    ])


@router.post("")
def ask(data: CoachIn, user=Depends(current_user), db: Session = Depends(get_db)):
    words = set(re.findall(r"[a-z]{3,}", data.question.lower())) - {"the", "what", "how", "does", "explain", "tell", "about", "and", "with", "for", "can", "are"}
    matches = []
    for q in db.scalars(select(Question)).all():
        text = f"{q.topic} {q.subject} {q.stem} {q.explanation}".lower()
        score = sum(len(re.findall(r"\b" + re.escape(word) + r"\b", text)) for word in words)
        if score:
            matches.append((score, dict(title=q.topic, content=q.explanation, subject=q.subject, source_url=q.source_url)))
    for c in db.scalars(select(Clip)).all():
        text = f"{c.title} {c.subject} {c.transcript}".lower()
        score = sum(len(re.findall(r"\b" + re.escape(word) + r"\b", text)) for word in words)
        if score:
            matches.append((score, dict(title=c.title, content=c.transcript, subject=c.subject, source_url=c.source_url)))
    matches.sort(key=lambda row: -row[0])
    if matches:
        award(db, user, f"coach:{local_today(user)}", "coach")
        db.commit()
    return dict(results=[m[1] for m in matches[:3]], message="Related explanations from your foundation library." if matches else "No matching explanation yet. Try a specific topic, such as cardiac conduction or gas exchange.")

