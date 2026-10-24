from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.core.security import current_user
from app.models import Clip, ClipView, SavedItem
from app.schemas.contracts import *
from app.services.progress import local_today
from app.services.xp import award

router = APIRouter(prefix="/medbytes", tags=["MedBytes"])


@router.get("", response_model=ClipPage)
def clips(
    subject: str = "",
    exam: str = "",
    cursor: str = "",
    limit: int = Query(default=12, ge=1, le=50),
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    subjects = db.scalars(select(Clip.subject).distinct().order_by(Clip.subject)).all()
    exams = db.scalars(select(Clip.exam).distinct().order_by(Clip.exam)).all()
    query = select(Clip).order_by(Clip.id)
    if subject:
        query = query.where(Clip.subject == subject)
    if exam:
        query = query.where(Clip.exam == exam)
    if cursor:
        query = query.where(Clip.id > cursor)
    page = db.scalars(query.limit(limit + 1)).all()
    all_clips = page[:limit]
    saved = {
        (s.clip_id, s.kind)
        for s in db.scalars(select(SavedItem).where(SavedItem.user_id == user.id)).all()
    }
    watched = set(
        db.scalars(
            select(ClipView.clip_id).where(
                ClipView.user_id == user.id, ClipView.day == local_today(user)
            )
        ).all()
    )
    items = []
    for c in all_clips:
        if (subject and c.subject != subject) or (exam and c.exam != exam):
            continue
        item = ClipOut.model_validate(c)
        item.saved_note = (c.id, "note") in saved
        item.saved_flashcard = (c.id, "flashcard") in saved
        item.saved_later = (c.id, "later") in saved
        item.watched = c.id in watched
        items.append(item)
    return ClipPage(
        items=items,
        subjects=subjects,
        exams=exams,
        completed_today=len(watched),
        next_cursor=all_clips[-1].id if len(page) > limit else None,
    )


@router.post("/{clip_id}/complete", response_model=CompleteOut)
def complete(clip_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    if not db.get(Clip, clip_id):
        raise HTTPException(404, "Clip not found.")
    key = (user.id, clip_id, local_today(user))
    if not db.get(ClipView, key):
        db.add(ClipView(user_id=key[0], clip_id=key[1], day=key[2]))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
    count = len(
        db.scalars(
            select(ClipView.clip_id).where(
                ClipView.user_id == user.id, ClipView.day == local_today(user)
            )
        ).all()
    )
    award(db, user, "video:" + clip_id, "video")
    db.commit()
    return CompleteOut(completed_today=count)


@router.post("/{clip_id}/save", response_model=SavedOut)
def save(
    clip_id: str,
    data: SaveIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    clip = db.get(Clip, clip_id)
    if not clip:
        raise HTTPException(404, "Clip not found.")
    query = select(SavedItem).where(
        SavedItem.user_id == user.id,
        SavedItem.clip_id == clip_id,
        SavedItem.kind == data.kind,
    )
    item = db.scalar(query)
    if not item:
        item = SavedItem(
            user_id=user.id,
            clip_id=clip_id,
            kind=data.kind,
            title=clip.prompt if data.kind == "flashcard" else clip.title,
            content=clip.takeaway,
            subject=clip.subject,
        )
        db.add(item)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            item = db.scalar(query)
    if data.kind in {"note", "flashcard"}:
        award(db, user, f"{data.kind}:clip:{clip_id}", data.kind)
    db.commit()
    return item


@router.delete("/{clip_id}/save", status_code=204)
def remove_save(
    clip_id: str,
    kind: str = Query(..., pattern="^(note|flashcard|later)$"),
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(SavedItem).where(
            SavedItem.user_id == user.id,
            SavedItem.clip_id == clip_id,
            SavedItem.kind == kind,
        )
    )
    if item:
        db.delete(item)
        db.commit()
