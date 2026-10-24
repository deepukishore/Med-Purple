import uuid
from datetime import datetime, timezone, date, timedelta
from sqlalchemy import (
    String,
    DateTime,
    Date,
    Integer,
    Boolean,
    JSON,
    Text,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.dialects.mysql import DATETIME
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base


def uid():
    return str(uuid.uuid4())


def now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    email: Mapped[str | None] = mapped_column(String(254), unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(String(80), default="Student")
    year: Mapped[str] = mapped_column(String(30), default="MBBS · Year 1")
    location: Mapped[str] = mapped_column(String(80), default="Your study space")
    timezone: Mapped[str] = mapped_column(String(80), default="Asia/Kolkata")
    exam_name: Mapped[str] = mapped_column(String(100), default="Foundation review")
    exam_date: Mapped[date] = mapped_column(
        Date, default=lambda: date.today() + timedelta(days=28)
    )
    daily_target: Mapped[int] = mapped_column(Integer, default=10)
    college: Mapped[str] = mapped_column(String(160), default="", server_default="")
    university: Mapped[str] = mapped_column(String(160), default="", server_default="")
    specialty: Mapped[str] = mapped_column(String(100), default="", server_default="")
    graduation_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_guest: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class RefreshSession(Base):
    __tablename__ = "refresh_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class Question(Base):
    __tablename__ = "questions"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    subject: Mapped[str] = mapped_column(String(50), index=True)
    topic: Mapped[str] = mapped_column(String(100), index=True)
    difficulty: Mapped[str] = mapped_column(String(20))
    stem: Mapped[str] = mapped_column(Text)
    options: Mapped[list] = mapped_column(JSON)
    correct_index: Mapped[int] = mapped_column(Integer)
    explanation: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)


class Attempt(Base):
    __tablename__ = "attempts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[str] = mapped_column(ForeignKey("questions.id"))
    request_id: Mapped[str] = mapped_column(String(36))
    selected_index: Mapped[int] = mapped_column(Integer)
    correct: Mapped[bool] = mapped_column(Boolean)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now, index=True
    )
    __table_args__ = (UniqueConstraint("user_id", "request_id"),)


class MCQCompletion(Base):
    __tablename__ = "mcq_completions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    total: Mapped[int] = mapped_column(Integer)
    correct: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("user_id", "fingerprint"),)


class MCQExamSession(Base):
    __tablename__ = "mcq_exam_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question_ids: Mapped[list] = mapped_column(JSON)
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    pass_mark: Mapped[int] = mapped_column(Integer)
    duration_seconds: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    passed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)


class Bookmark(Base):
    __tablename__ = "bookmarks"
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    question_id: Mapped[str] = mapped_column(
        ForeignKey("questions.id"), primary_key=True
    )


class Clip(Base):
    __tablename__ = "clips"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    title: Mapped[str] = mapped_column(String(150))
    subject: Mapped[str] = mapped_column(String(50))
    topic: Mapped[str] = mapped_column(String(100))
    exam: Mapped[str] = mapped_column(String(40), default="MBBS foundations")
    creator: Mapped[str] = mapped_column(String(80), default="Med Purple")
    credentials: Mapped[str] = mapped_column(
        String(100), default="Original foundation series"
    )
    duration: Mapped[int] = mapped_column(Integer)
    video_path: Mapped[str] = mapped_column(Text)
    poster_path: Mapped[str] = mapped_column(Text)
    transcript: Mapped[str] = mapped_column(Text)
    takeaway: Mapped[str] = mapped_column(Text)
    prompt: Mapped[str] = mapped_column(Text)
    source_url: Mapped[str] = mapped_column(Text)


class ClipView(Base):
    __tablename__ = "clip_views"
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    clip_id: Mapped[str] = mapped_column(ForeignKey("clips.id"), primary_key=True)
    day: Mapped[date] = mapped_column(Date, primary_key=True)


class SavedItem(Base):
    __tablename__ = "saved_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    clip_id: Mapped[str | None] = mapped_column(ForeignKey("clips.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    subject: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)
    __table_args__ = (UniqueConstraint("user_id", "clip_id", "kind"),)


class Goal(Base):
    __tablename__ = "goals"
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    day: Mapped[date] = mapped_column(Date, primary_key=True)
    key: Mapped[str] = mapped_column(String(30), primary_key=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False)


class StudyBlock(Base):
    __tablename__ = "study_blocks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    subject: Mapped[str] = mapped_column(String(50))
    day: Mapped[date] = mapped_column(Date, index=True)
    time: Mapped[str] = mapped_column(String(5))
    minutes: Mapped[int] = mapped_column(Integer)
    done: Mapped[bool] = mapped_column(Boolean, default=False)


class CardReview(Base):
    __tablename__ = "card_reviews"
    item_id: Mapped[str] = mapped_column(ForeignKey("saved_items.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    due: Mapped[date] = mapped_column(Date)
    interval: Mapped[int] = mapped_column(Integer, default=0)
    reviews: Mapped[int] = mapped_column(Integer, default=0)


class Discussion(Base):
    __tablename__ = "discussions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    subject: Mapped[str] = mapped_column(String(50))
    content: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(20), default="community", server_default="community", index=True)
    accepted_reply_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class DiscussionReply(Base):
    __tablename__ = "discussion_replies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    discussion_id: Mapped[str] = mapped_column(ForeignKey("discussions.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class AnatomyVisit(Base):
    __tablename__ = "anatomy_visits"
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    structure_id: Mapped[str] = mapped_column(String(50), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class DiscussionLike(Base):
    __tablename__ = "discussion_likes"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    discussion_id: Mapped[str] = mapped_column(ForeignKey("discussions.id", ondelete="CASCADE"), primary_key=True)


class XPEvent(Base):
    __tablename__ = "xp_events"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    event_key: Mapped[str] = mapped_column(String(160))
    activity: Mapped[str] = mapped_column(String(40))
    points: Mapped[int] = mapped_column(Integer)
    day: Mapped[date] = mapped_column(Date, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    __table_args__ = (UniqueConstraint("user_id", "event_key"),)


class FocusSession(Base):
    __tablename__ = "focus_sessions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    seconds: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)


class FeatureState(Base):
    """User-owned state for the newer study and clinical workspaces."""
    __tablename__ = "feature_states"
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    exam_track: Mapped[str] = mapped_column(String(30), default="NEET PG")
    mistake_notes: Mapped[dict] = mapped_column(JSON, default=dict)
    clinical_logs: Mapped[list] = mapped_column(JSON, default=list)
    clinical_state: Mapped[dict] = mapped_column(JSON, default=dict)
    community: Mapped[dict] = mapped_column(JSON, default=dict)
    followed_creators: Mapped[list] = mapped_column(JSON, default=list)
    preferences: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )


class DiscussionReplyLike(Base):
    __tablename__ = "discussion_reply_likes"
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    reply_id: Mapped[str] = mapped_column(
        ForeignKey("discussion_replies.id", ondelete="CASCADE"), primary_key=True
    )


class QuickCapture(Base):
    __tablename__ = "quick_captures"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(20), default="note")
    title: Mapped[str] = mapped_column(String(200), default="Quick capture")
    content: Mapped[str] = mapped_column(Text, default="")
    source_url: Mapped[str] = mapped_column(Text, default="")
    media_name: Mapped[str] = mapped_column(String(200), default="")
    media_data: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StudySet(Base):
    __tablename__ = "study_sets"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    description: Mapped[str] = mapped_column(Text, default="")
    items: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )


class StudyHistory(Base):
    __tablename__ = "study_history"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    reference_id: Mapped[str] = mapped_column(String(100), default="")
    title: Mapped[str] = mapped_column(String(200))
    subject: Mapped[str] = mapped_column(String(80), default="")
    extra: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )


class StudyRoomMessage(Base):
    __tablename__ = "study_room_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    room_id: Mapped[str] = mapped_column(String(100), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content: Mapped[str] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )


class StudyStory(Base):
    __tablename__ = "study_stories"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    group_id: Mapped[str | None] = mapped_column(ForeignKey("study_story_groups.id", ondelete="CASCADE"), nullable=True, index=True)
    reply_to_story_id: Mapped[str | None] = mapped_column(ForeignKey("study_stories.id", ondelete="SET NULL"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(150))
    subject: Mapped[str] = mapped_column(String(50), index=True)
    kind: Mapped[str] = mapped_column(String(30), index=True)
    slides: Mapped[list] = mapped_column(JSON, default=list)
    excluded_user_ids: Mapped[list] = mapped_column(JSON, default=list)
    audience: Mapped[str] = mapped_column(String(24), default="everyone")
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    duration_hours: Mapped[int] = mapped_column(Integer, default=24)
    highlight: Mapped[str] = mapped_column(String(80), default="", server_default="")
    status: Mapped[str] = mapped_column(String(12), default="live", server_default="live")
    needs_review: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    hidden_from_feed: Mapped[bool] = mapped_column(Boolean, default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStoryGroup(Base):
    __tablename__ = "study_story_groups"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStoryGroupMember(Base):
    __tablename__ = "study_story_group_members"
    group_id: Mapped[str] = mapped_column(ForeignKey("study_story_groups.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStoryFollow(Base):
    __tablename__ = "study_story_follows"
    follower_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStoryCloseFriend(Base):
    __tablename__ = "study_story_close_friends"
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    friend_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class StudyStoryHide(Base):
    __tablename__ = "study_story_hides"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    creator_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class StudyStoryBlock(Base):
    __tablename__ = "study_story_blocks"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    blocked_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)


class StudyStoryView(Base):
    __tablename__ = "study_story_views"
    story_id: Mapped[str] = mapped_column(ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStorySlideView(Base):
    __tablename__ = "study_story_slide_views"
    story_id: Mapped[str] = mapped_column(ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True)
    slide_index: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStoryUpload(Base):
    __tablename__ = "study_story_uploads"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    story_id: Mapped[str | None] = mapped_column(ForeignKey("study_stories.id", ondelete="SET NULL"), nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String(80), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStoryResponse(Base):
    __tablename__ = "study_story_responses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    story_id: Mapped[str] = mapped_column(ForeignKey("study_stories.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    response_type: Mapped[str] = mapped_column(String(24))
    slide_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    sticker_key: Mapped[str] = mapped_column(String(20), default="", server_default="")
    answer: Mapped[str] = mapped_column(Text, default="")
    option_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)
    __table_args__ = (
        UniqueConstraint(
            "story_id",
            "user_id",
            "response_type",
            "slide_index",
            "sticker_key",
            name="uq_study_story_response_slot",
        ),
    )


class StudyStoryReaction(Base):
    __tablename__ = "study_story_reactions"
    story_id: Mapped[str] = mapped_column(ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    reaction: Mapped[str] = mapped_column(String(24), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class StudyStoryFlag(Base):
    __tablename__ = "study_story_flags"
    story_id: Mapped[str] = mapped_column(ForeignKey("study_stories.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    flag: Mapped[str] = mapped_column(String(24), primary_key=True)
    details: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now)


class CollaborativeNote(Base):
    __tablename__ = "collaborative_notes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(180))
    content: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True).with_variant(DATETIME(fsp=6), "mysql"), default=now
    )
