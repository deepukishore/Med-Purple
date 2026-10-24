from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, delete
from datetime import timedelta
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import SavedItem, CardReview
from app.services.progress import local_today
from app.schemas.contracts import SavedOut
from app.services.xp import award, lock_rewards, sync_legacy_rewards

router = APIRouter(tags=["Saved study material"])


class MaterialIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    kind: Literal["note", "flashcard"]
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=12000)
    subject: str = Field(min_length=1, max_length=50)


class ReviewIn(BaseModel):
    rating: Literal["again", "good", "easy"]


@router.post("/saved", response_model=SavedOut, status_code=201)
def create(data: MaterialIn, user=Depends(current_user), db: Session = Depends(get_db)):
    lock_rewards(db, user)
    item = SavedItem(user_id=user.id, **data.model_dump())
    db.add(item)
    db.flush()
    award(db, user, f"{item.kind}:{item.id}", item.kind)
    db.commit()
    return item


@router.put("/saved/{item_id}", response_model=SavedOut)
def edit(item_id: str, data: MaterialIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(SavedItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Saved item not found.")
    if item.kind != data.kind:
        raise HTTPException(422, "Keep the original item type.")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    award(db, user, f"edit:{item.id}:{local_today(user)}", "edit")
    db.commit()
    return item


@router.get("/flashcards/reviews")
def reviews(user=Depends(current_user), db: Session = Depends(get_db)):
    return [{"item_id": r.item_id, "due": r.due, "reviews": r.reviews} for r in db.scalars(select(CardReview).where(CardReview.user_id == user.id)).all()]


@router.post("/flashcards/{item_id}/review")
def review(item_id: str, data: ReviewIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(SavedItem, item_id)
    if not item or item.user_id != user.id or item.kind != "flashcard":
        raise HTTPException(404, "Flashcard not found.")
    entry = db.get(CardReview, item_id)
    first_review = entry is None
    if not entry:
        entry = CardReview(item_id=item_id, user_id=user.id, interval=0, reviews=0)
        db.add(entry)
    entry.interval = 0 if data.rating == "again" else min(180, max(1 if data.rating == "good" else 3, entry.interval * (2 if data.rating == "good" else 3)))
    entry.reviews += 1
    entry.due = local_today(user) + timedelta(days=entry.interval)
    award(db, user, "review:" + item_id, "review")
    if not first_review:
        from app.models import XPEvent
        first = db.scalar(select(XPEvent).where(XPEvent.user_id == user.id, XPEvent.event_key == "review:" + item_id))
        if first and first.day < local_today(user):
            award(db, user, f"review_day:{item_id}:{local_today(user)}", "review_day")
    db.commit()
    return {"due": entry.due, "interval": entry.interval}


@router.get("/notes", response_model=list[SavedOut])
def notes(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(SavedItem)
        .where(SavedItem.user_id == user.id, SavedItem.kind == "note")
        .order_by(SavedItem.created_at.desc())
    ).all()


@router.get("/flashcards", response_model=list[SavedOut])
def flashcards(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(SavedItem)
        .where(SavedItem.user_id == user.id, SavedItem.kind == "flashcard")
        .order_by(SavedItem.created_at.desc())
    ).all()


@router.delete("/saved/{item_id}", status_code=204)
def remove(item_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(SavedItem, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Saved item not found.")
    sync_legacy_rewards(db, user)
    db.execute(delete(CardReview).where(CardReview.item_id == item_id))
    db.delete(item)
    db.commit()
