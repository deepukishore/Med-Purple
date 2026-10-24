from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, exists
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import optional_user
from app.models import User, Discussion, DiscussionReply
from app.services.social import public_profile

router = APIRouter(prefix="/profiles", tags=["Student profiles"])


@router.get("")
def students(search: str = "", offset: int = Query(0, ge=0), user=Depends(optional_user), db: Session = Depends(get_db)):
    visible = (User.is_guest.is_(False) | exists().where(Discussion.user_id == User.id)
               | exists().where(DiscussionReply.user_id == User.id))
    if user:
        visible = visible | (User.id == user.id)
    query = select(User).where(visible, User.name.ilike("%" + search + "%")).order_by(User.name, User.id)
    rows = db.scalars(query.offset(offset).limit(21)).all()
    return dict(items=[public_profile(db, row) for row in rows[:20]], has_more=len(rows) > 20)


@router.get("/{user_id}")
def profile(user_id: str, db: Session = Depends(get_db)):
    author = db.get(User, user_id)
    if not author:
        raise HTTPException(404, "Student not found.")
    counts = {}
    for kind, name in [("community", "posts"), ("doubt", "doubts")]:
        counts[name] = db.scalar(select(func.count()).select_from(Discussion).where(Discussion.user_id == user_id, Discussion.kind == kind))
    counts["solutions"] = db.scalar(select(func.count()).select_from(Discussion).join(
        DiscussionReply, Discussion.accepted_reply_id == DiscussionReply.id).where(DiscussionReply.user_id == user_id))
    return dict(**public_profile(db, author), **counts)
