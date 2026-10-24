import base64
import binascii
import json
import logging
import mimetypes
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
import jwt
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.config import settings
from app.core.security import current_user
from app.models import (
    Attempt,
    SavedItem,
    StudyStory,
    StudyStoryBlock,
    StudyStoryCloseFriend,
    StudyStoryFlag,
    StudyStoryFollow,
    StudyStoryGroup,
    StudyStoryGroupMember,
    StudyStoryHide,
    StudyStoryReaction,
    StudyStoryResponse,
    StudyStorySlideView,
    StudyStoryUpload,
    StudyStoryView,
    User,
    XPEvent,
)
from app.services.progress import attempts_for, local_day, local_today, streak_for
from app.services.xp import award, lock_rewards

router = APIRouter(prefix="/stories", tags=["Study stories"])
logger = logging.getLogger(__name__)
MEDIA_DIR = Path(__file__).resolve().parents[1] / "private" / "stories"
ALLOWED_REACTIONS = {
    "helpful": "💡",
    "learned": "🧠",
    "fire": "🔥",
    "motivated": "👏",
}
ALLOWED_KINDS = {
    "text",
    "quiz",
    "mnemonic",
    "flashcard",
    "diagram",
    "video",
    "study_with_me",
    "milestone",
    "senior_tip",
    "group",
}


def utcnow():
    return datetime.now(timezone.utc)


def aware(value: datetime | None) -> datetime | None:
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


class StoryIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    title: str = Field(min_length=1, max_length=150)
    subject: str = Field(min_length=1, max_length=50)
    kind: str
    slides: list[dict[str, Any]] = Field(min_length=1, max_length=10)
    audience: Literal["everyone", "friends", "close_friends", "group"] = "everyone"
    group_id: str | None = Field(default=None, max_length=36)
    excluded_user_ids: list[str] = Field(default_factory=list, max_length=100)
    anonymous: bool = False
    duration_hours: Literal[24, 48, 72, 168] = 24
    highlight: str = Field(default="", max_length=80)
    scheduled_at: datetime | None = None
    draft: bool = False
    reply_to_story_id: str | None = Field(default=None, max_length=36)

    @field_validator("scheduled_at")
    @classmethod
    def scheduled_time_has_timezone(cls, value):
        if value is not None and value.tzinfo is None:
            raise ValueError("Scheduled story time must include a timezone.")
        return value

    @field_validator("kind")
    @classmethod
    def story_kind_is_supported(cls, value):
        if value not in ALLOWED_KINDS:
            raise ValueError("Choose a supported study story type.")
        return value


class StoryMediaIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    data_url: str = Field(min_length=20, max_length=42_000_000)


class ResponseIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    response_type: Literal["quiz", "poll", "question", "question_box", "doubt", "answer", "join", "contribution"]
    answer: str = Field(default="", max_length=2000)
    option_index: int | None = Field(default=None, ge=0, le=9)
    slide_index: int = Field(default=0, ge=0, le=9)
    sticker_key: str = Field(default="", max_length=20)
    anonymous: bool = False


class ReactionIn(BaseModel):
    reaction: Literal["helpful", "learned", "fire", "motivated"]
    active: bool = True


class FlagIn(BaseModel):
    flag: Literal[
        "report",
        "needs_verification",
        "wrong_info",
        "patient_info",
        "spam",
        "abuse",
    ]
    details: str = Field(default="", max_length=500)


class SaveIn(BaseModel):
    kind: Literal["note", "flashcard"] = "note"
    slide_index: int = Field(default=0, ge=0, le=9)
    sticker_key: str = Field(default="", max_length=20)


class GroupIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(min_length=1, max_length=100)


class GroupMembersIn(BaseModel):
    user_ids: list[str] = Field(min_length=1, max_length=100)


class HighlightIn(BaseModel):
    name: str = Field(default="", max_length=80)


def _readable_media(path: str) -> str | None:
    if path.startswith("/media/stories/") and re.fullmatch(
        r"/media/stories/[0-9a-f-]{36}\.(png|jpg|webp|mp4|webm)", path
    ):
        return path
    return None


def _validate_slides(data: StoryIn):
    encoded = json.dumps(data.slides, ensure_ascii=True)
    if len(encoded) > 50_000:
        raise HTTPException(422, "Story slides are too large.")
    for slide in data.slides:
        if not isinstance(slide, dict):
            raise HTTPException(422, "Each story slide must be an object.")
        stickers = slide.get("stickers", [])
        if not isinstance(stickers, list):
            raise HTTPException(422, "Story stickers must be a list.")
        legacy_sticker = slide.get("sticker")
        if legacy_sticker is not None and not isinstance(legacy_sticker, dict):
            raise HTTPException(422, "Story stickers must be objects.")
        all_stickers = [*stickers, *([legacy_sticker] if legacy_sticker else [])]
        if len(all_stickers) > 4:
            raise HTTPException(422, "A slide can have at most four stickers.")
        keys = set()
        for sticker in all_stickers:
            if not isinstance(sticker, dict):
                raise HTTPException(422, "Story stickers must be objects.")
            if sticker.get("type") not in {
                "quiz", "poll", "this_or_that", "question", "question_box",
                "countdown", "doubt", "progress", "streak",
            }:
                raise HTTPException(422, "Choose a supported study sticker.")
            key = sticker.get("key", "")
            if key:
                if not isinstance(key, str) or len(key) > 20 or key in keys:
                    raise HTTPException(422, "Sticker keys must be unique and at most 20 characters.")
                keys.add(key)
            elif stickers:
                raise HTTPException(422, "Every sticker in a sticker list needs a key.")
            for coordinate in ("x", "y"):
                value = sticker.get(coordinate)
                if value is not None and (
                    isinstance(value, bool)
                    or not isinstance(value, (int, float))
                    or not 0 <= value <= 1
                ):
                    raise HTTPException(422, "Sticker positions must be fractions between 0 and 1.")
            if sticker.get("type") in {"quiz", "poll", "this_or_that"}:
                options = sticker.get("options")
                if not isinstance(options, list) or not 2 <= len(options) <= 6:
                    raise HTTPException(422, "Quiz and poll stickers need between two and six options.")
                if any(
                    not isinstance(option, str)
                    or not option.strip()
                    or len(option) > 80
                    for option in options
                ):
                    raise HTTPException(422, "Sticker options must be 1 to 80 characters.")
                if sticker.get("type") == "quiz":
                    correct = sticker.get("correct", sticker.get("correct_index"))
                    if isinstance(correct, bool) or not isinstance(correct, int) or not 0 <= correct < len(options):
                        raise HTTPException(422, "Select a valid correct quiz option.")
        for media_key in ("media_url", "video_url"):
            media = slide.get(media_key)
            if media and not _readable_media(media):
                raise HTTPException(422, "Story media must be uploaded to this app.")
        if data.kind == "quiz":
            options = slide.get("options")
            correct = slide.get("correct_index")
            if not isinstance(options, list) or not 2 <= len(options) <= 6:
                raise HTTPException(422, "A quiz needs between two and six options.")
            if any(not isinstance(option, str) or not option.strip() or len(option) > 80 for option in options):
                raise HTTPException(422, "Quiz options must be 1 to 80 characters.")
            if isinstance(correct, bool) or not isinstance(correct, int) or correct < 0 or correct >= len(options):
                raise HTTPException(422, "Select a valid correct quiz option.")
        if data.kind == "flashcard" and (
            not slide.get("front") or not slide.get("back")
        ):
            raise HTTPException(422, "Flashcard stories need a question and answer.")
        if data.kind == "video" and int(slide.get("duration_seconds", 0)) > 30:
            raise HTTPException(422, "Explain-in-30-seconds videos must be 30 seconds or shorter.")
        if data.kind == "video" and not slide.get("video_url"):
            raise HTTPException(422, "Choose a video before posting this story.")
        if data.kind == "study_with_me":
            try:
                minutes = int(slide.get("minutes", 50))
            except (TypeError, ValueError):
                raise HTTPException(422, "Study timer duration must be a number.")
            if not 5 <= minutes <= 180:
                raise HTTPException(422, "Study timers must be between 5 and 180 minutes.")


def _group_member(db: Session, group_id: str, user_id: str) -> bool:
    return db.get(StudyStoryGroupMember, (group_id, user_id)) is not None


def _has_follow(db: Session, follower_id: str, creator_id: str) -> bool:
    return db.get(StudyStoryFollow, (follower_id, creator_id)) is not None


def _can_view(db: Session, story: StudyStory, user: User) -> bool:
    if story.user_id == user.id:
        return True
    if story.hidden_from_feed:
        return False
    if user.id in (story.excluded_user_ids or []):
        return False
    if db.get(StudyStoryBlock, (story.user_id, user.id)) or db.get(
        StudyStoryBlock, (user.id, story.user_id)
    ):
        return False
    if db.get(StudyStoryHide, (user.id, story.user_id)):
        return False
    if story.audience == "everyone":
        return True
    if story.audience == "friends":
        return _has_follow(db, user.id, story.user_id) and _has_follow(
            db, story.user_id, user.id
        )
    if story.audience == "close_friends":
        return db.get(StudyStoryCloseFriend, (story.user_id, user.id)) is not None
    if story.audience == "group":
        return bool(story.group_id and _group_member(db, story.group_id, user.id))
    return False


def _story_or_404(db: Session, story_id: str, user: User) -> StudyStory:
    story = db.get(StudyStory, story_id)
    if not story or not _can_view(db, story, user):
        raise HTTPException(404, "Story not found.")
    now = utcnow()
    published_at = aware(story.published_at)
    expires_at = aware(story.expires_at)
    if story.status != "live" or not published_at or (expires_at and expires_at <= now):
        raise HTTPException(404, "Story is no longer available.")
    return story


def _response(
    db: Session,
    story: StudyStory,
    user_id: str,
    response_type: str,
    slide_index: int = 0,
    sticker_key: str = "",
):
    return db.scalar(
        select(StudyStoryResponse).where(
            StudyStoryResponse.story_id == story.id,
            StudyStoryResponse.user_id == user_id,
            StudyStoryResponse.response_type == response_type,
            StudyStoryResponse.slide_index == slide_index,
            StudyStoryResponse.sticker_key == sticker_key,
        )
    )


def _serialize(db: Session, story: StudyStory, user: User, *, owner_view=False):
    slides = json.loads(json.dumps(story.slides))
    for slide_index, slide in enumerate(slides):
        stickers = slide.get("stickers")
        if stickers is None:
            legacy = slide.pop("sticker", None)
            stickers = [legacy] if isinstance(legacy, dict) else []
        if not isinstance(stickers, list):
            stickers = []
        slide["stickers"] = stickers
        if stickers:
            slide["sticker"] = stickers[0]
        quiz_items = (
            [slide] if story.kind == "quiz" and not stickers
            else [item for item in stickers if item.get("type") == "quiz"]
        )
        for quiz_item in quiz_items:
            key = quiz_item.get("key", "")
            quiz_response = _response(db, story, user.id, "quiz", slide_index, key)
            correct = quiz_item.get("correct_index", quiz_item.get("correct"))
            if not owner_view and not (quiz_response and quiz_response.option_index is not None):
                quiz_item.pop("correct_index", None)
                quiz_item.pop("correct", None)
                quiz_item.pop("explanation", None)
            elif quiz_response and not owner_view:
                quiz_item["correct_index"] = correct
                quiz_item["your_answer"] = quiz_response.option_index
                if quiz_item is slide:
                    quiz_item["correct"] = quiz_response.correct
                else:
                    quiz_item["is_correct"] = quiz_response.correct
                quiz_item["explanation"] = quiz_item.get("explanation", "")
    for slide in slides:
        for key in ("media_url", "video_url"):
            file_url = slide.get(key)
            if file_url and _readable_media(file_url):
                slide[key] = _signed_media_url(story, user, file_url)
    user_profile = db.get(User, story.user_id)
    if not user_profile:
        raise HTTPException(404, "Story creator not found.")
    identity_hidden = story.anonymous and not owner_view
    views = db.scalar(
        select(func.count()).select_from(StudyStoryView).where(StudyStoryView.story_id == story.id)
    ) or 0
    reactions = {
        key: db.scalar(
            select(func.count()).select_from(StudyStoryReaction).where(
                StudyStoryReaction.story_id == story.id,
                StudyStoryReaction.reaction == key,
            )
        ) or 0
        for key in ALLOWED_REACTIONS
    }
    response_counts = dict(
        db.execute(
            select(StudyStoryResponse.response_type, func.count())
            .where(StudyStoryResponse.story_id == story.id)
            .group_by(StudyStoryResponse.response_type)
        ).all()
    )
    result = {
        "id": story.id,
        "title": story.title,
        "subject": story.subject,
        "kind": story.kind,
        "slides": slides,
        "audience": story.audience,
        "anonymous": story.anonymous,
        "group_id": story.group_id,
        "reply_to_story_id": story.reply_to_story_id,
        "creator": "Anonymous student" if identity_hidden else user_profile.name,
        "creator_id": None if identity_hidden else story.user_id,
        "mine": story.user_id == user.id,
        "seen": story.user_id == user.id
        or db.get(StudyStoryView, (story.id, user.id)) is not None,
        "status": story.status,
        "needs_review": story.needs_review if owner_view else False,
        "created_at": aware(story.created_at).isoformat(),
        "published_at": aware(story.published_at).isoformat() if story.published_at else None,
        "scheduled_at": aware(story.scheduled_at).isoformat() if story.scheduled_at else None,
        "expires_at": aware(story.expires_at).isoformat() if story.expires_at else None,
        "duration_hours": story.duration_hours,
        "highlight": story.highlight,
        "hidden_from_feed": story.hidden_from_feed if owner_view else False,
        "views": views,
        "reactions": reactions,
        "response_counts": response_counts,
        "my_reactions": [
            reaction
            for reaction in ALLOWED_REACTIONS
            if db.get(StudyStoryReaction, (story.id, user.id, reaction))
        ],
    }
    my_answers = db.scalars(
        select(StudyStoryResponse).where(
            StudyStoryResponse.story_id == story.id,
            StudyStoryResponse.user_id == user.id,
        )
    ).all()
    result["my_responses"] = {}
    for item in my_answers:
        response_key = (
            f"{item.response_type}:{item.slide_index}:{item.sticker_key}"
            if item.sticker_key
            else item.response_type if item.slide_index == 0
            else f"{item.response_type}:{item.slide_index}"
        )
        result["my_responses"][response_key] = {
            "answer": item.answer,
            "option_index": item.option_index,
            "correct": item.correct,
        }
    if owner_view:
        result["excluded_user_ids"] = story.excluded_user_ids or []
        rows = db.scalars(
            select(StudyStoryResponse)
            .where(StudyStoryResponse.story_id == story.id)
            .order_by(StudyStoryResponse.created_at)
        ).all()
        result["responses"] = [
            {
                "id": row.id,
                "type": row.response_type,
                "slide_index": row.slide_index,
                "sticker_key": row.sticker_key,
                "answer": row.answer,
                "option_index": row.option_index,
                "correct": row.correct,
                "anonymous": row.anonymous,
                "user_id": None if row.anonymous else row.user_id,
                "author": "Anonymous student" if row.anonymous else db.get(User, row.user_id).name,
                "created_at": aware(row.created_at).isoformat(),
            }
            for row in rows
        ]
        result["flags"] = [
            {"flag": flag, "details": details, "count": count}
            for flag, details, count in db.execute(
                select(
                    StudyStoryFlag.flag,
                    StudyStoryFlag.details,
                    func.count(),
                )
                .where(StudyStoryFlag.story_id == story.id)
                .group_by(StudyStoryFlag.flag, StudyStoryFlag.details)
            )
        ]
        views_rows = db.scalars(
            select(StudyStoryView)
            .where(StudyStoryView.story_id == story.id)
            .order_by(StudyStoryView.viewed_at.desc())
        ).all()
        result["viewers"] = [
            {"user_id": row.user_id, "name": db.get(User, row.user_id).name, "viewed_at": aware(row.viewed_at).isoformat()}
            for row in views_rows
        ]
        slide_views = db.scalars(
            select(StudyStorySlideView)
            .where(StudyStorySlideView.story_id == story.id)
            .order_by(StudyStorySlideView.slide_index, StudyStorySlideView.viewed_at.desc())
        ).all()
        result["slide_views"] = [
            {
                "slide_index": row.slide_index,
                "user_id": row.user_id,
                "name": db.get(User, row.user_id).name,
                "viewed_at": aware(row.viewed_at).isoformat(),
            }
            for row in slide_views
        ]
    for slide_index, slide in enumerate(slides):
        for sticker in slide.get("stickers", []):
            if sticker.get("type") in {"poll", "this_or_that"} and (
                owner_view or _response(db, story, user.id, "poll", slide_index, sticker.get("key", ""))
            ):
                counts = [0] * len(sticker.get("options", []))
                for index, count in db.execute(
                    select(StudyStoryResponse.option_index, func.count())
                    .where(
                        StudyStoryResponse.story_id == story.id,
                        StudyStoryResponse.response_type == "poll",
                        StudyStoryResponse.slide_index == slide_index,
                        StudyStoryResponse.sticker_key == sticker.get("key", ""),
                    )
                    .group_by(StudyStoryResponse.option_index)
                ):
                    if index is not None and index < len(counts):
                        counts[index] = count
                sticker["results"] = counts
    return result


def _mark_view(db: Session, story: StudyStory, user: User, slide_index: int):
    if story.user_id != user.id and not db.get(StudyStoryView, (story.id, user.id)):
        db.add(StudyStoryView(story_id=story.id, user_id=user.id))
    key = (story.id, slide_index, user.id)
    if story.user_id != user.id and not db.get(StudyStorySlideView, key):
        db.add(StudyStorySlideView(
            story_id=story.id,
            slide_index=slide_index,
            user_id=user.id,
        ))


def _award_story_streak(db: Session, story: StudyStory):
    creator = db.get(User, story.user_id)
    if not creator or not story.published_at:
        return
    day = local_day(aware(story.published_at), creator)
    award(db, creator, f"story_streak:{day.isoformat()}", "story_streak", day=day)


def _contains_patient_claim(slides):
    return any(bool(slide.get("clinical_photo")) for slide in slides)


def _decorate_auto_stickers(db: Session, user: User, slides: list[dict]):
    attempts = attempts_for(db, user)
    today = local_today(user)
    attempts_today = sum(1 for item in attempts if local_day(item.created_at, user) == today)
    streak = streak_for(db, user, attempts)
    xp = db.scalar(
        select(func.coalesce(func.sum(XPEvent.points), 0)).where(XPEvent.user_id == user.id)
    ) or 0
    for slide in slides:
        stickers = slide.get("stickers")
        if stickers is None:
            legacy = slide.pop("sticker", None)
            stickers = [legacy] if isinstance(legacy, dict) else []
            slide["stickers"] = stickers
        for sticker in stickers:
            if sticker.get("type") == "progress":
                sticker["data"] = {"mcqs_today": attempts_today}
                sticker["text"] = f"Finished {attempts_today} MCQs today"
            elif sticker.get("type") == "streak":
                sticker["data"] = {"streak_days": streak}
                sticker["text"] = f"{streak}-day study streak"
    return slides, streak, xp


def _write_story_files(db: Session, user: User, slides):
    uploads = {}
    for slide in slides:
        for key in ("media_url", "video_url"):
            value = slide.get(key)
            if value and not _readable_media(value):
                raise HTTPException(422, "Story media must be uploaded to this app.")
            if value:
                file_name = Path(value).name
                upload = db.scalar(
                    select(StudyStoryUpload).where(
                        StudyStoryUpload.user_id == user.id,
                        StudyStoryUpload.filename == file_name,
                        StudyStoryUpload.story_id.is_(None),
                    )
                )
                if not upload or not (MEDIA_DIR / file_name).is_file():
                    raise HTTPException(422, "Use a media upload created by your account.")
                uploads[upload.id] = upload
    return list(uploads.values())


def _remove_files(slides):
    for slide in slides:
        if not isinstance(slide, dict):
            continue
        for key in ("media_url", "video_url"):
            url = slide.get(key)
            if not url or not _readable_media(url):
                continue
            file_path = MEDIA_DIR / Path(url).name
            try:
                file_path.unlink(missing_ok=True)
            except OSError:
                logger.exception("Could not remove expired story media %s", file_path.name)


def _signed_media_url(story: StudyStory, user: User, path: str):
    token = jwt.encode(
        {
            "sub": user.id,
            "story_id": story.id,
            "file_name": Path(path).name,
            "exp": utcnow() + timedelta(minutes=10),
            "aud": "med-purple",
            "iss": "med-purple-api",
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    return f"/api/v1/stories/media/{story.id}/{Path(path).name}?token={token}"


def promote_scheduled_stories(db: Session, now: datetime | None = None):
    now = now or utcnow()
    rows = db.scalars(
        select(StudyStory).where(
            StudyStory.published_at.is_(None),
            StudyStory.scheduled_at.is_not(None),
            StudyStory.scheduled_at <= now,
            StudyStory.status == "scheduled",
        )
    ).all()
    for story in rows:
        story.published_at = aware(story.scheduled_at)
        story.status = "live"
        if not story.highlight:
            story.expires_at = aware(story.scheduled_at) + timedelta(hours=story.duration_hours)
        _award_story_streak(db, story)
    if rows:
        db.commit()
    return len(rows)


def purge_expired_stories(db: Session, now: datetime | None = None):
    now = now or utcnow()
    rows = db.scalars(
        select(StudyStory).where(
            StudyStory.expires_at.is_not(None),
            StudyStory.expires_at <= now,
            StudyStory.status == "live",
        )
    ).all()
    for story in rows:
        _remove_files(story.slides)
        story.status = "expired"
    stale_uploads = db.execute(
        delete(StudyStoryUpload).where(
            StudyStoryUpload.created_at < now - timedelta(days=30)
        )
    ).rowcount
    if rows or stale_uploads:
        db.commit()
    return len(rows)


def run_story_maintenance():
    with SessionLocal() as db:
        promote_scheduled_stories(db)
        purge_expired_stories(db)


@router.post("/media", status_code=201)
def upload_media(data: StoryMediaIn, user=Depends(current_user), db: Session = Depends(get_db)):
    try:
        header, encoded = data.data_url.split(",", 1)
    except ValueError:
        raise HTTPException(422, "Upload a valid image or short video.")
    match = re.fullmatch(r"data:(image/(?:png|jpeg|webp)|video/(?:mp4|webm));base64", header)
    if not match:
        raise HTTPException(415, "Use PNG, JPEG, WebP, MP4, or WebM media.")
    mime = match.group(1)
    try:
        content = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(422, "Uploaded media is not valid base64 data.")
    limit = 30 * 1024 * 1024 if mime.startswith("video/") else 10 * 1024 * 1024
    if not content or len(content) > limit:
        raise HTTPException(413, "Image uploads are limited to 10 MB and videos to 30 MB.")
    lock_rewards(db, user)
    uploads_this_hour = db.scalar(
        select(func.count()).select_from(StudyStoryUpload).where(
            StudyStoryUpload.user_id == user.id,
            StudyStoryUpload.created_at >= utcnow() - timedelta(hours=1),
        )
    ) or 0
    if uploads_this_hour >= 20:
        raise HTTPException(429, "You have reached the limit of 20 story uploads per hour.")
    signatures = {
        "image/png": content.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg": content.startswith(b"\xff\xd8\xff"),
        "image/webp": len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP",
        "video/mp4": len(content) >= 12 and content[4:8] == b"ftyp",
        "video/webm": content.startswith(b"\x1aE\xdf\xa3"),
    }
    if not signatures[mime]:
        raise HTTPException(415, "The uploaded file does not match its media type.")
    suffix = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "video/mp4": ".mp4",
        "video/webm": ".webm",
    }[mime]
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    file_name = f"{uuid.uuid4()}{suffix}"
    media_path = MEDIA_DIR / file_name
    media_path.write_bytes(content)
    db.add(StudyStoryUpload(user_id=user.id, filename=file_name))
    try:
        db.commit()
    except SQLAlchemyError:
        media_path.unlink(missing_ok=True)
        db.rollback()
        raise
    return {"media_url": f"/media/stories/{file_name}", "size": len(content), "mime_type": mime}


@router.get("/media/{story_id}/{file_name}")
def read_story_media(
    story_id: str,
    file_name: str,
    token: str,
    db: Session = Depends(get_db),
):
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=["HS256"],
            audience="med-purple",
            issuer="med-purple-api",
        )
    except jwt.PyJWTError:
        raise HTTPException(403, "Story media link has expired or is invalid.")
    if claims.get("story_id") != story_id or claims.get("file_name") != file_name:
        raise HTTPException(403, "Story media link does not match.")
    user = db.get(User, claims.get("sub"))
    story = db.get(StudyStory, story_id)
    if not user or not story or not _can_view(db, story, user):
        raise HTTPException(404, "Story media not found.")
    if not story.published_at or (aware(story.expires_at) and aware(story.expires_at) <= utcnow()):
        raise HTTPException(404, "Story media not found.")
    linked = any(
        _readable_media(slide.get(key, "")) == slide.get(key)
        and Path(slide[key]).name == file_name
        for slide in story.slides
        for key in ("media_url", "video_url")
        if slide.get(key)
    )
    if not linked or not re.fullmatch(r"[0-9a-f-]{36}\.(png|jpg|webp|mp4|webm)", file_name):
        raise HTTPException(404, "Story media not found.")
    path = MEDIA_DIR / file_name
    if story.status != "live" or not path.is_file():
        raise HTTPException(404, "Story media not found.")
    return FileResponse(path, media_type=mimetypes.guess_type(file_name)[0] or "application/octet-stream")


@router.get("")
def list_stories(subject: str = "", user=Depends(current_user), db: Session = Depends(get_db)):
    run_story_maintenance()
    query = select(StudyStory).where(
        StudyStory.status == "live",
        StudyStory.published_at.is_not(None),
        StudyStory.published_at <= utcnow(),
        (StudyStory.expires_at.is_(None) | (StudyStory.expires_at > utcnow())),
    )
    if subject:
        query = query.where(StudyStory.subject.ilike("%" + subject + "%"))
    rows = db.scalars(query.order_by(StudyStory.created_at.desc()).limit(250)).all()
    visible = [row for row in rows if _can_view(db, row, user)]
    visible.sort(
        key=lambda row: (
            db.get(StudyStoryView, (row.id, user.id)) is not None,
            -(aware(row.created_at).timestamp()),
        )
    )
    return {"items": [_serialize(db, row, user) for row in visible]}


@router.get("/mine")
def my_stories(user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StudyStory)
        .where(StudyStory.user_id == user.id)
        .order_by(StudyStory.created_at.desc())
        .limit(100)
    ).all()
    return {"items": [_serialize(db, row, user, owner_view=True) for row in rows]}


@router.post("", status_code=201)
def create_story(data: StoryIn, user=Depends(current_user), db: Session = Depends(get_db)):
    _validate_slides(data)
    if data.draft and data.scheduled_at:
        raise HTTPException(422, "Save a draft or schedule it, not both.")
    if data.audience == "group":
        if not data.group_id:
            raise HTTPException(422, "Choose a study group for a group-only story.")
        if not _group_member(db, data.group_id, user.id):
            raise HTTPException(403, "Join the study group before posting to it.")
    elif data.group_id:
        raise HTTPException(422, "A group can only be set for a group-only story.")
    if user.id in data.excluded_user_ids or any(not db.get(User, target_id) for target_id in data.excluded_user_ids):
        raise HTTPException(422, "Choose valid students to hide this story from.")
    if data.reply_to_story_id:
        _story_or_404(db, data.reply_to_story_id, user)
    if _contains_patient_claim(data.slides):
        raise HTTPException(422, "Remove patient photos and identifiers before posting.")
    slides, streak, xp = _decorate_auto_stickers(db, user, data.slides)
    media_uploads = _write_story_files(db, user, slides)
    now = utcnow()
    scheduled_at = aware(data.scheduled_at)
    published_at = None if data.draft or (scheduled_at and scheduled_at > now) else now
    expires_at = (
        None
        if data.highlight or not published_at
        else published_at + timedelta(hours=data.duration_hours)
    )
    lock_rewards(db, user)
    story = StudyStory(
        user_id=user.id,
        title=data.title,
        subject=data.subject,
        kind=data.kind,
        slides=slides,
        excluded_user_ids=list(set(data.excluded_user_ids)),
        audience=data.audience,
        group_id=data.group_id,
        anonymous=data.anonymous,
        scheduled_at=scheduled_at,
        published_at=published_at,
        expires_at=expires_at,
        status="draft" if data.draft else "scheduled" if scheduled_at and scheduled_at > now else "live",
        duration_hours=data.duration_hours,
        highlight=data.highlight,
        reply_to_story_id=data.reply_to_story_id,
    )
    db.add(story)
    db.flush()
    for upload in media_uploads:
        upload.story_id = story.id
    if published_at:
        award(db, user, f"story:{story.id}", "story")
        _award_story_streak(db, story)
    db.commit()
    result = _serialize(db, story, user, owner_view=True)
    result["milestone"] = {"streak_days": streak, "xp": xp}
    return result


@router.get("/featured")
def featured_story(user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StudyStory).where(
            StudyStory.status == "live",
            StudyStory.published_at.is_not(None),
            StudyStory.published_at >= utcnow() - timedelta(days=1),
            (StudyStory.expires_at.is_(None) | (StudyStory.expires_at > utcnow())),
        ).order_by(StudyStory.created_at.desc()).limit(200)
    ).all()
    candidates = []
    for story in rows:
        if not _can_view(db, story, user):
            continue
        helpful = db.scalar(
            select(func.count()).select_from(StudyStoryReaction).where(
                StudyStoryReaction.story_id == story.id,
                StudyStoryReaction.reaction == "helpful",
            )
        ) or 0
        responses = db.scalar(
            select(func.count()).select_from(StudyStoryResponse).where(
                StudyStoryResponse.story_id == story.id
            )
        ) or 0
        candidates.append((helpful + responses, story))
    if not candidates:
        return {"item": None}
    story = max(candidates, key=lambda row: row[0])[1]
    creator = db.get(User, story.user_id)
    if creator:
        day = local_today(creator)
        award(
            db,
            creator,
            f"story_featured:{day.isoformat()}",
            "story_featured",
            day=day,
        )
        db.commit()
    return {"item": _serialize(db, story, user)}


@router.get("/leaderboard")
def story_leaderboard(user=Depends(current_user), db: Session = Depends(get_db)):
    since = utcnow() - timedelta(days=7)
    rows = db.scalars(
        select(StudyStory).where(
            StudyStory.status == "live",
            StudyStory.published_at >= since,
            (StudyStory.expires_at.is_(None) | (StudyStory.expires_at > utcnow())),
        )
    ).all()
    totals: dict[str, int] = {}
    for story in rows:
        if not _can_view(db, story, user):
            continue
        score = (
            db.scalar(select(func.count()).select_from(StudyStoryReaction).where(StudyStoryReaction.story_id == story.id)) or 0
        ) + (
            db.scalar(select(func.count()).select_from(StudyStoryResponse).where(StudyStoryResponse.story_id == story.id)) or 0
        )
        totals[story.user_id] = totals.get(story.user_id, 0) + score
    entries = []
    for creator_id, score in sorted(totals.items(), key=lambda row: row[1], reverse=True)[:10]:
        creator = db.get(User, creator_id)
        if creator:
            entries.append({"user_id": creator.id, "name": creator.name, "score": score})
    return {"items": entries}


@router.get("/groups")
def groups(user=Depends(current_user), db: Session = Depends(get_db)):
    group_ids = db.scalars(
        select(StudyStoryGroupMember.group_id).where(StudyStoryGroupMember.user_id == user.id)
    ).all()
    return {
        "items": [
            {"id": group.id, "name": group.name, "owner_id": group.owner_id}
            for group in db.scalars(select(StudyStoryGroup).where(StudyStoryGroup.id.in_(group_ids))).all()
        ]
    }


@router.get("/close-friends")
def close_friends(user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StudyStoryCloseFriend).where(StudyStoryCloseFriend.owner_id == user.id)
    ).all()
    return {
        "items": [
            {"id": row.friend_id, "name": db.get(User, row.friend_id).name}
            for row in rows
            if db.get(User, row.friend_id)
        ]
    }


@router.post("/groups", status_code=201)
def create_group(data: GroupIn, user=Depends(current_user), db: Session = Depends(get_db)):
    group = StudyStoryGroup(owner_id=user.id, name=data.name)
    db.add(group)
    db.flush()
    db.add(StudyStoryGroupMember(group_id=group.id, user_id=user.id))
    db.commit()
    return {"id": group.id, "name": group.name, "owner_id": user.id}


@router.post("/groups/{group_id}/members")
def add_group_members(group_id: str, data: GroupMembersIn, user=Depends(current_user), db: Session = Depends(get_db)):
    group = db.get(StudyStoryGroup, group_id)
    if not group or group.owner_id != user.id:
        raise HTTPException(404, "Study group not found.")
    added = 0
    for user_id in set(data.user_ids):
        if user_id == user.id or not db.get(User, user_id):
            continue
        if not _group_member(db, group_id, user_id):
            db.add(StudyStoryGroupMember(group_id=group_id, user_id=user_id))
            added += 1
    db.commit()
    return {"added": added}


@router.get("/highlights/{user_id}")
def highlights(user_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StudyStory).where(
            StudyStory.user_id == user_id,
            StudyStory.highlight != "",
            StudyStory.published_at.is_not(None),
        ).order_by(StudyStory.created_at.desc())
    ).all()
    return {"items": [_serialize(db, row, user, owner_view=row.user_id == user.id) for row in rows if _can_view(db, row, user)]}


@router.get("/milestones")
def milestones(user=Depends(current_user), db: Session = Depends(get_db)):
    xp = db.scalar(select(func.coalesce(func.sum(XPEvent.points), 0)).where(XPEvent.user_id == user.id)) or 0
    streak = streak_for(db, user, attempts_for(db, user))
    return {
        "level": 1 + xp // 100,
        "xp": xp,
        "streak_days": streak,
        "milestones": [
            {"kind": "level", "value": 1 + xp // 100, "title": f"Level {1 + xp // 100} reached"},
            {"kind": "streak", "value": streak, "title": f"{streak}-day streak"},
        ],
    }


@router.get("/creator-streak")
def creator_streak(user=Depends(current_user), db: Session = Depends(get_db)):
    stories = db.scalars(
        select(StudyStory).where(
            StudyStory.user_id == user.id,
            StudyStory.published_at.is_not(None),
        )
    ).all()
    days = {local_day(item.published_at, user) for item in stories}
    cursor = local_today(user)
    if cursor not in days:
        cursor -= timedelta(days=1)
    count = 0
    while cursor in days:
        count += 1
        cursor -= timedelta(days=1)
    return {"story_streak": count}


@router.get("/{story_id}")
def read_story(
    story_id: str,
    slide_index: int = Query(default=0, ge=0, le=9),
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    story = _story_or_404(db, story_id, user)
    if slide_index >= len(story.slides):
        raise HTTPException(422, "Choose a slide from this story.")
    _mark_view(db, story, user, slide_index)
    db.commit()
    return _serialize(db, story, user, owner_view=story.user_id == user.id)


@router.get("/{story_id}/slides/{slide_index}/viewers")
def slide_viewers(
    story_id: str,
    slide_index: int,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    story = db.get(StudyStory, story_id)
    if not story or story.user_id != user.id or not 0 <= slide_index < len(story.slides):
        raise HTTPException(404, "Story slide not found.")
    rows = db.scalars(
        select(StudyStorySlideView)
        .where(
            StudyStorySlideView.story_id == story_id,
            StudyStorySlideView.slide_index == slide_index,
        )
        .order_by(StudyStorySlideView.viewed_at.desc())
    ).all()
    return {
        "items": [
            {
                "user_id": row.user_id,
                "name": db.get(User, row.user_id).name,
                "viewed_at": aware(row.viewed_at).isoformat(),
            }
            for row in rows
        ]
    }


@router.put("/{story_id}/highlight")
def set_highlight(story_id: str, data: HighlightIn, user=Depends(current_user), db: Session = Depends(get_db)):
    story = db.get(StudyStory, story_id)
    if not story or story.user_id != user.id or not story.published_at or story.status != "live":
        raise HTTPException(404, "Published story not found.")
    story.highlight = data.name
    story.expires_at = None if data.name else aware(story.published_at) + timedelta(hours=story.duration_hours)
    db.commit()
    return _serialize(db, story, user, owner_view=True)


@router.post("/{story_id}/publish")
def publish_story(story_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    story = db.get(StudyStory, story_id)
    if not story or story.user_id != user.id or story.published_at:
        raise HTTPException(404, "Draft story not found.")
    now = utcnow()
    story.scheduled_at = now
    story.published_at = now
    story.expires_at = None if story.highlight else now + timedelta(hours=story.duration_hours)
    story.status = "live"
    award(db, user, f"story:{story.id}", "story")
    _award_story_streak(db, story)
    db.commit()
    return _serialize(db, story, user, owner_view=True)


@router.post("/{story_id}/responses", status_code=201)
def respond(story_id: str, data: ResponseIn, user=Depends(current_user), db: Session = Depends(get_db)):
    story = _story_or_404(db, story_id, user)
    if story.user_id == user.id:
        raise HTTPException(403, "You cannot respond to your own story.")
    if data.slide_index >= len(story.slides):
        raise HTTPException(422, "Choose a slide from this story.")
    if data.response_type == "join" and story.kind != "study_with_me":
        raise HTTPException(422, "Only study-with-me stories have a join action.")
    if data.response_type == "contribution" and story.audience != "group":
        raise HTTPException(422, "Contributions are only available on group stories.")
    option_index = data.option_index
    correct = None
    answer = data.answer
    slide = story.slides[data.slide_index]
    sticker_key = data.sticker_key
    stickers = slide.get("stickers") or []
    if data.response_type in {"quiz", "poll", "question", "question_box", "doubt"}:
        candidates = [item for item in stickers if item.get("type") == data.response_type]
        if sticker_key:
            candidates = [item for item in candidates if item.get("key") == sticker_key]
        elif len(candidates) == 1:
            sticker_key = candidates[0].get("key", "")
        elif len(candidates) > 1:
            raise HTTPException(422, "Choose which sticker to respond to.")
        if candidates:
            selected_sticker = candidates[0]
        elif data.response_type == "quiz" and story.kind == "quiz" and not stickers:
            selected_sticker = None
        else:
            selected_sticker = None
    else:
        selected_sticker = None
    if data.sticker_key and not selected_sticker:
        raise HTTPException(422, "The selected sticker is not available on this slide.")
    existing = _response(
        db, story, user.id, data.response_type, data.slide_index, sticker_key
    )
    if existing:
        raise HTTPException(409, "You have already responded to this sticker.")
    if data.response_type == "quiz":
        if story.kind != "quiz" and not selected_sticker:
            raise HTTPException(422, "This story does not contain a quiz.")
        quiz_item = selected_sticker or slide
        correct_index = quiz_item.get("correct_index", quiz_item.get("correct"))
        if correct_index is None:
            correct_index = quiz_item.get("correct")
        options = quiz_item.get("options") or []
        if option_index is None or option_index >= len(options):
            raise HTTPException(422, "Choose one of the quiz options.")
        correct = option_index == correct_index
        answer = options[option_index]
    elif data.response_type == "poll":
        if not selected_sticker:
            raise HTTPException(422, "This story does not contain a poll.")
        options = selected_sticker.get("options", [])
        if option_index is None or option_index >= len(options):
            raise HTTPException(422, "Choose one of the poll options.")
        answer = options[option_index]
    elif data.response_type in {"question", "question_box", "doubt", "answer", "contribution"} and not answer:
        raise HTTPException(422, "Write a response before sending it.")
    response = StudyStoryResponse(
        story_id=story.id,
        user_id=user.id,
        response_type=data.response_type,
        slide_index=data.slide_index,
        sticker_key=sticker_key,
        answer=answer,
        option_index=option_index,
        correct=correct,
        anonymous=data.anonymous,
    )
    db.add(response)
    lock_rewards(db, user)
    award(db, user, f"story_response:{story.id}:{data.response_type}:{data.slide_index}:{sticker_key}", "story_response")
    if correct:
        award(db, user, f"story_quiz:{story.id}:{data.slide_index}:{sticker_key}", "story_quiz")
    award(db, db.get(User, story.user_id), f"story_response:{story.id}:{user.id}:{data.slide_index}:{sticker_key}", "story_response")
    db.commit()
    result = {
        "id": response.id,
        "response_type": data.response_type,
        "slide_index": data.slide_index,
        "sticker_key": sticker_key,
        "correct": response.correct,
        "answer": response.answer,
        "option_index": response.option_index,
    }
    if data.response_type == "join":
        duration = int(story.slides[0].get("minutes", 50))
        result.update({"started_at": aware(story.published_at).isoformat(), "minutes": duration})
    return result


@router.put("/{story_id}/reactions")
def react(story_id: str, data: ReactionIn, user=Depends(current_user), db: Session = Depends(get_db)):
    story = _story_or_404(db, story_id, user)
    if story.user_id == user.id:
        raise HTTPException(403, "You cannot react to your own story.")
    item = db.get(StudyStoryReaction, (story.id, user.id, data.reaction))
    if data.active and not item:
        db.add(StudyStoryReaction(story_id=story.id, user_id=user.id, reaction=data.reaction))
        award(db, db.get(User, story.user_id), f"story_reaction:{story.id}:{user.id}:{data.reaction}", "story_reaction")
        if not db.get(StudyStoryView, (story.id, user.id)):
            db.add(StudyStoryView(story_id=story.id, user_id=user.id))
    elif not data.active and item:
        db.delete(item)
    db.commit()
    return _serialize(db, story, user)


@router.post("/{story_id}/save", status_code=201)
def save_story(story_id: str, data: SaveIn, user=Depends(current_user), db: Session = Depends(get_db)):
    story = _story_or_404(db, story_id, user)
    kind = "flashcard" if story.kind == "flashcard" else data.kind
    if data.slide_index >= len(story.slides):
        raise HTTPException(422, "Choose a slide from this story.")
    slide = story.slides[data.slide_index]
    if kind == "flashcard":
        front = slide.get("front") or slide.get("text") or story.title
        back = slide.get("back") or slide.get("answer") or slide.get("explanation", "")
        quiz_item = slide
        if data.sticker_key:
            quiz_item = next(
                (
                    sticker
                    for sticker in slide.get("stickers", [])
                    if sticker.get("key") == data.sticker_key
                    and sticker.get("type") == "quiz"
                ),
                {},
            )
        else:
            quiz_stickers = [
                sticker
                for sticker in slide.get("stickers", [])
                if sticker.get("type") == "quiz"
            ]
            if len(quiz_stickers) == 1:
                quiz_item = quiz_stickers[0]
        options = quiz_item.get("options") or []
        correct_index = quiz_item.get("correct_index", quiz_item.get("correct"))
        if options and isinstance(correct_index, int) and 0 <= correct_index < len(options):
            front = quiz_item.get("question") or slide.get("text") or story.title
            back = f"Answer: {options[correct_index]}"
            if quiz_item.get("explanation"):
                back += f"\n{quiz_item['explanation']}"
        if not back:
            raise HTTPException(422, "This story has no answer to save as a flashcard.")
        content = f"Front: {front}\nBack: {back}"
    else:
        content = "\n".join(
            item for item in (slide.get("text"), slide.get("mnemonic"), slide.get("back"), slide.get("explanation")) if item
        ) or story.title
    title = story.title
    item = db.scalar(
        select(SavedItem).where(
            SavedItem.user_id == user.id,
            SavedItem.kind == kind,
            SavedItem.title == title,
            SavedItem.content == content,
            SavedItem.subject == story.subject,
        )
    )
    if not item:
        lock_rewards(db, user)
        item = SavedItem(user_id=user.id, kind=kind, title=title, content=content, subject=story.subject)
        db.add(item)
        db.flush()
        award(db, user, f"story_save:{story.id}:{data.slide_index}:{kind}", kind)
        db.commit()
    return {"id": item.id, "kind": item.kind, "title": item.title, "content": item.content, "subject": item.subject}


@router.post("/{story_id}/flags")
def flag_story(story_id: str, data: FlagIn, user=Depends(current_user), db: Session = Depends(get_db)):
    story = _story_or_404(db, story_id, user)
    if story.user_id == user.id:
        raise HTTPException(403, "You cannot flag your own story.")
    flag = db.get(StudyStoryFlag, (story.id, user.id, data.flag))
    if not flag:
        db.add(StudyStoryFlag(story_id=story.id, user_id=user.id, flag=data.flag, details=data.details))
        db.flush()
    if data.flag == "patient_info":
        story.hidden_from_feed = True
    if data.flag == "wrong_info":
        wrong_info_reports = db.scalar(
            select(func.count()).select_from(StudyStoryFlag).where(
                StudyStoryFlag.story_id == story.id,
                StudyStoryFlag.flag == "wrong_info",
            )
        ) or 0
        if wrong_info_reports >= 3:
            story.needs_review = True
    db.commit()
    return {"ok": True}


@router.post("/{story_id}/hide")
def hide_story_creator(story_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    story = _story_or_404(db, story_id, user)
    if story.user_id == user.id:
        raise HTTPException(422, "You cannot hide your own stories.")
    db.merge(StudyStoryHide(user_id=user.id, creator_id=story.user_id))
    db.commit()
    return {"ok": True}


@router.post("/users/{target_id}/block")
def block_user(target_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    if target_id == user.id or not db.get(User, target_id):
        raise HTTPException(404, "Student not found.")
    db.merge(StudyStoryBlock(user_id=user.id, blocked_id=target_id))
    db.execute(delete(StudyStoryFollow).where(
        (StudyStoryFollow.follower_id == user.id) & (StudyStoryFollow.creator_id == target_id)
        | (StudyStoryFollow.follower_id == target_id) & (StudyStoryFollow.creator_id == user.id)
    ))
    db.commit()
    return {"ok": True}


@router.delete("/users/{target_id}/block", status_code=204)
def unblock_user(target_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(StudyStoryBlock).where(
        StudyStoryBlock.user_id == user.id, StudyStoryBlock.blocked_id == target_id
    ))
    db.commit()


@router.post("/users/{target_id}/hide")
def hide_user(target_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    if target_id == user.id or not db.get(User, target_id):
        raise HTTPException(404, "Student not found.")
    db.merge(StudyStoryHide(user_id=user.id, creator_id=target_id))
    db.commit()
    return {"ok": True}


@router.delete("/users/{target_id}/hide", status_code=204)
def unhide_user(target_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(StudyStoryHide).where(StudyStoryHide.user_id == user.id, StudyStoryHide.creator_id == target_id))
    db.commit()


@router.put("/users/{target_id}/follow")
def follow_user(target_id: str, active: bool = True, user=Depends(current_user), db: Session = Depends(get_db)):
    if target_id == user.id or not db.get(User, target_id):
        raise HTTPException(404, "Student not found.")
    existing = db.get(StudyStoryFollow, (user.id, target_id))
    if active and not existing:
        db.add(StudyStoryFollow(follower_id=user.id, creator_id=target_id))
    elif not active and existing:
        db.delete(existing)
    db.commit()
    return {"following": active}


@router.put("/close-friends/{target_id}")
def set_close_friend(target_id: str, active: bool = True, user=Depends(current_user), db: Session = Depends(get_db)):
    if target_id == user.id or not db.get(User, target_id):
        raise HTTPException(404, "Student not found.")
    existing = db.get(StudyStoryCloseFriend, (user.id, target_id))
    if active and not existing:
        db.add(StudyStoryCloseFriend(owner_id=user.id, friend_id=target_id))
    elif not active and existing:
        db.delete(existing)
    db.commit()
    return {"close_friend": active}


@router.delete("/{story_id}", status_code=204)
def delete_story(story_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    story = db.get(StudyStory, story_id)
    if not story or story.user_id != user.id:
        raise HTTPException(404, "Story not found.")
    _remove_files(story.slides)
    db.delete(story)
    db.commit()
