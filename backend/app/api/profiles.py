import base64
import binascii
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy import select, func, exists
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user, optional_user
from app.models import FeatureState, User, Discussion, DiscussionReply
from app.services.social import public_profile
from app.services.profile_avatar import PROFILE_AVATAR_DIR, profile_avatar_url, remove_profile_avatar_file

router = APIRouter(prefix="/profiles", tags=["Student profiles"])


class ProfileAvatarIn(BaseModel):
    data_url: str = Field(min_length=40, max_length=3_000_000)


@router.put("/me/avatar")
def upload_profile_avatar(data: ProfileAvatarIn, user=Depends(current_user), db: Session = Depends(get_db)):
    try:
        header, encoded = data.data_url.split(",", 1)
    except ValueError:
        raise HTTPException(422, "Choose a valid profile photo.")
    mime = {
        "data:image/jpeg;base64": ("jpg", lambda raw: raw.startswith(b"\xff\xd8\xff")),
        "data:image/png;base64": ("png", lambda raw: raw.startswith(b"\x89PNG\r\n\x1a\n")),
        "data:image/webp;base64": ("webp", lambda raw: len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"),
    }.get(header)
    if not mime:
        raise HTTPException(415, "Use a JPEG, PNG, or WebP profile photo.")
    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "The profile photo is not valid image data.")
    if not content or len(content) > 2 * 1024 * 1024:
        raise HTTPException(413, "Profile photos must be smaller than 2 MB after cropping.")
    extension, matches = mime
    if not matches(content):
        raise HTTPException(415, "The uploaded file does not match its image type.")

    state = db.get(FeatureState, user.id)
    if not state:
        state = FeatureState(user_id=user.id)
        db.add(state)
        db.flush()
    preferences = dict(state.preferences or {})
    previous_url = profile_avatar_url(user.id, preferences.get("avatar_photo_url"))
    filename = f"{user.id}-{uuid.uuid4().hex[:12]}.{extension}"
    avatar_url = f"/media/profiles/{filename}"
    PROFILE_AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    path = PROFILE_AVATAR_DIR / filename
    path.write_bytes(content)
    preferences["avatar_photo_url"] = avatar_url
    state.preferences = preferences
    state.updated_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except SQLAlchemyError:
        path.unlink(missing_ok=True)
        db.rollback()
        raise
    remove_profile_avatar_file(user.id, previous_url)
    return {"avatar_photo_url": avatar_url}


@router.delete("/me/avatar", status_code=204)
def remove_profile_avatar(user=Depends(current_user), db: Session = Depends(get_db)):
    state = db.get(FeatureState, user.id)
    if not state:
        return Response(status_code=204)
    preferences = dict(state.preferences or {})
    avatar_url = profile_avatar_url(user.id, preferences.pop("avatar_photo_url", None))
    state.preferences = preferences
    state.updated_at = datetime.now(timezone.utc)
    db.commit()
    remove_profile_avatar_file(user.id, avatar_url)
    return Response(status_code=204)


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
    return dict(**public_profile(db, author, include_photo=True), **counts)
