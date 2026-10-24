from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import Question, Clip

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("")
def resources(user=Depends(current_user), db: Session = Depends(get_db)):
    items = {}
    for q in db.scalars(select(Question)).all():
        items.setdefault(q.source_url, dict(title=q.topic, subject=q.subject, url=q.source_url, type="Reading"))
    for c in db.scalars(select(Clip)).all():
        items.setdefault(c.source_url, dict(title=c.topic, subject=c.subject, url=c.source_url, type="Reading"))
    return dict(items=list(items.values()))

