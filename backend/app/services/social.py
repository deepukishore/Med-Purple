from datetime import timezone
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, delete, func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user, optional_user
from app.models import Discussion, DiscussionReply, DiscussionLike, DiscussionReplyLike, User
from app.services.xp import award, level_summary, lock_rewards


class ReplyIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    content: str = Field(min_length=1, max_length=5000)


class ThreadIn(ReplyIn):
    title: str = Field(min_length=1, max_length=150)
    subject: str = Field(min_length=1, max_length=50)


class LikeIn(BaseModel):
    liked: bool


class SolutionIn(BaseModel):
    reply_id: str | None = Field(default=None, max_length=36)


def public_profile(db, author):
    return dict(id=author.id, name=author.name, year=author.year, **level_summary(db, author))


def serialize(item, user, db, profiles=None):
    profiles = profiles if profiles is not None else {}
    if item.user_id not in profiles:
        profiles[item.user_id] = public_profile(db, db.get(User, item.user_id))
    profile = profiles[item.user_id]
    result = dict(id=item.id, content=item.content, author=profile["name"], author_id=item.user_id,
                  author_level=profile["level"], author_xp=profile["xp"], mine=bool(user and item.user_id == user.id),
                  created_at=item.created_at.replace(tzinfo=timezone.utc).isoformat())
    if isinstance(item, Discussion):
        result.update(title=item.title, subject=item.subject, kind=item.kind,
                      accepted_reply_id=item.accepted_reply_id, solved=bool(item.accepted_reply_id),
                      replies=db.scalar(select(func.count()).select_from(DiscussionReply).where(DiscussionReply.discussion_id == item.id)),
                      likes=db.scalar(select(func.count()).select_from(DiscussionLike).where(DiscussionLike.discussion_id == item.id)),
                      liked=bool(user and db.get(DiscussionLike, (user.id, item.id))))
    elif isinstance(item, DiscussionReply):
        result.update(
            upvotes=db.scalar(select(func.count()).select_from(DiscussionReplyLike).where(DiscussionReplyLike.reply_id == item.id)),
            upvoted=bool(user and db.get(DiscussionReplyLike, (user.id, item.id))),
        )
    return result


def social_router(kind):
    router = APIRouter(prefix="/" + ("doubts" if kind == "doubt" else "community"), tags=["Doubts" if kind == "doubt" else "Community"])

    def find(db, thread_id):
        item = db.get(Discussion, thread_id)
        if not item or item.kind != kind:
            raise HTTPException(404, "Post not found.")
        return item

    @router.get("")
    def threads(subject: str = "", search: str = "", status: Literal["all", "open", "solved"] = "all",
                offset: int = Query(0, ge=0), user=Depends(optional_user), db: Session = Depends(get_db)):
        query = select(Discussion).where(Discussion.kind == kind).order_by(Discussion.created_at.desc(), Discussion.id)
        if subject:
            query = query.where(Discussion.subject.ilike("%" + subject + "%"))
        if search:
            query = query.where(Discussion.title.ilike("%" + search + "%") | Discussion.content.ilike("%" + search + "%"))
        if status != "all":
            query = query.where(Discussion.accepted_reply_id.is_not(None) if status == "solved" else Discussion.accepted_reply_id.is_(None))
        rows = db.scalars(query.offset(offset).limit(21)).all()
        profiles = {}
        return dict(items=[serialize(row, user, db, profiles) for row in rows[:20]], has_more=len(rows) > 20)

    @router.post("", status_code=201)
    def create(data: ThreadIn, user=Depends(current_user), db: Session = Depends(get_db)):
        lock_rewards(db, user)
        item = Discussion(user_id=user.id, kind=kind, **data.model_dump())
        db.add(item)
        db.flush()
        activity = "doubt" if kind == "doubt" else "community_post"
        award(db, user, f"{activity}:{item.id}", activity)
        db.commit()
        return serialize(item, user, db)

    @router.get("/{thread_id}")
    def thread(thread_id: str, user=Depends(optional_user), db: Session = Depends(get_db)):
        item = find(db, thread_id)
        replies = db.scalars(select(DiscussionReply).where(DiscussionReply.discussion_id == thread_id)
                            .order_by(DiscussionReply.created_at, DiscussionReply.id)).all()
        profiles = {}
        return dict(**serialize(item, user, db, profiles), messages=[
            dict(**serialize(row, user, db, profiles), accepted=row.id == item.accepted_reply_id) for row in replies])

    @router.post("/{thread_id}/replies", status_code=201)
    def reply(thread_id: str, data: ReplyIn, user=Depends(current_user), db: Session = Depends(get_db)):
        thread = find(db, thread_id)
        lock_rewards(db, user)
        item = DiscussionReply(user_id=user.id, discussion_id=thread_id, content=data.content)
        db.add(item)
        db.flush()
        activity = "doubt_answer" if kind == "doubt" else "community_reply"
        if thread.user_id != user.id:
            award(db, user, f"{activity}:{thread_id}", activity)
        db.commit()
        return serialize(item, user, db)

    @router.put("/{thread_id}/like")
    def like(thread_id: str, data: LikeIn, user=Depends(current_user), db: Session = Depends(get_db)):
        thread = find(db, thread_id)
        entry = db.get(DiscussionLike, (user.id, thread_id))
        if data.liked and not entry:
            db.add(DiscussionLike(user_id=user.id, discussion_id=thread_id))
        elif not data.liked and entry:
            db.delete(entry)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
        if data.liked and thread.user_id != user.id:
            award(db, user, "reaction:" + thread_id, "reaction")
            db.commit()
        return serialize(thread, user, db)

    @router.put("/{thread_id}/solution")
    def solution(thread_id: str, data: SolutionIn, user=Depends(current_user), db: Session = Depends(get_db)):
        item = find(db, thread_id)
        if kind != "doubt" or item.user_id != user.id:
            raise HTTPException(403, "Only the person who asked can mark a doubt as solved.")
        if data.reply_id:
            reply = db.get(DiscussionReply, data.reply_id)
            if not reply or reply.discussion_id != thread_id:
                raise HTTPException(400, "Choose an answer from this doubt.")
            if reply.user_id == user.id:
                raise HTTPException(400, "Choose another student's answer as the solution.")
            award(db, db.get(User, reply.user_id), "solution:" + thread_id, "solution")
        item.accepted_reply_id = data.reply_id
        db.commit()
        return serialize(item, user, db)

    @router.put("/replies/{reply_id}/upvote")
    def upvote_reply(reply_id: str, data: LikeIn, user=Depends(current_user), db: Session = Depends(get_db)):
        reply = db.get(DiscussionReply, reply_id)
        if not reply:
            raise HTTPException(404, "Reply not found.")
        find(db, reply.discussion_id)
        entry = db.get(DiscussionReplyLike, (user.id, reply_id))
        if data.liked and not entry:
            db.add(DiscussionReplyLike(user_id=user.id, reply_id=reply_id))
        elif not data.liked and entry:
            db.delete(entry)
        db.commit()
        return serialize(reply, user, db)

    @router.delete("/replies/{reply_id}", status_code=204)
    def remove_reply(reply_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
        item = db.get(DiscussionReply, reply_id)
        if not item or item.user_id != user.id:
            raise HTTPException(404, "Reply not found.")
        find(db, item.discussion_id)
        db.execute(update(Discussion).where(Discussion.accepted_reply_id == reply_id).values(accepted_reply_id=None))
        db.delete(item)
        db.commit()

    @router.delete("/{thread_id}", status_code=204)
    def remove(thread_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
        item = find(db, thread_id)
        if item.user_id != user.id:
            raise HTTPException(404, "Post not found.")
        db.execute(delete(DiscussionLike).where(DiscussionLike.discussion_id == thread_id))
        db.execute(delete(DiscussionReply).where(DiscussionReply.discussion_id == thread_id))
        db.delete(item)
        db.commit()

    return router
