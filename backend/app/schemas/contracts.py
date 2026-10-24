from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    email: str | None
    name: str
    year: str
    location: str
    timezone: str
    exam_name: str
    exam_date: date
    daily_target: int
    college: str
    university: str
    specialty: str
    graduation_year: int | None
    is_guest: bool


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshIn(BaseModel):
    refresh_token: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str | None = None
    user: UserOut


class StudentDetails(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    college: str = Field(default="", max_length=160)
    university: str = Field(default="", max_length=160)
    specialty: str = Field(default="", max_length=100)
    graduation_year: int | None = Field(default=None, ge=1950, le=2100)


class ProfileIn(StudentDetails):
    name: str = Field(min_length=1, max_length=80)
    year: str = Field(min_length=1, max_length=30)
    location: str = Field(max_length=80)
    timezone: str = Field(max_length=80)
    exam_name: str = Field(min_length=1, max_length=100)
    exam_date: date
    daily_target: int = Field(ge=1, le=100)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value):
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError:
            raise ValueError("Use an IANA timezone such as Asia/Kolkata")
        return value


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    profile: ProfileIn | None = None

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class QuestionOut(BaseModel):
    id: str
    subject: str
    topic: str
    difficulty: str
    stem: str
    options: list[str]
    bookmarked: bool = False


class QuestionPage(BaseModel):
    items: list[QuestionOut]
    total: int
    subjects: list[str]
    topics: list[str]


class AnswerIn(BaseModel):
    selected_index: int = Field(ge=0, le=3)
    request_id: str = Field(pattern=r"^[a-fA-F0-9-]{36}$")


class AnswerOut(BaseModel):
    correct: bool
    correct_index: int
    selected_index: int
    explanation: str
    source_url: str


class MCQCompleteIn(BaseModel):
    request_ids: list[str] = Field(min_length=1, max_length=100)

    @field_validator("request_ids")
    @classmethod
    def unique_submissions(cls, value):
        if len(set(value)) != len(value):
            raise ValueError("Each answer must appear once.")
        if any(len(item) != 36 for item in value):
            raise ValueError("Invalid submission id.")
        return value


class MCQExamStartIn(BaseModel):
    subject: str = Field(default="", max_length=50)
    topic: str = Field(default="", max_length=100)
    difficulty: str = Field(default="", max_length=20)
    mode: Literal["all", "bookmarked", "mistakes"] = "all"
    limit: int = Field(default=10, ge=3, le=50)
    pass_mark: int = Field(default=70, ge=1, le=100)
    duration_seconds: int | None = Field(default=None, ge=60, le=7200)


class MCQExamAnswerIn(BaseModel):
    question_id: str = Field(min_length=1, max_length=40)
    selected_index: int = Field(ge=0, le=3)


class ToggleIn(BaseModel):
    saved: bool


class GoalIn(BaseModel):
    done: bool


class Success(BaseModel):
    ok: bool = True


class ClipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    title: str
    subject: str
    topic: str
    exam: str
    creator: str
    credentials: str
    duration: int
    video_path: str
    poster_path: str
    transcript: str
    source_url: str
    saved_note: bool = False
    saved_flashcard: bool = False
    saved_later: bool = False
    watched: bool = False


class ClipPage(BaseModel):
    items: list[ClipOut]
    subjects: list[str]
    exams: list[str]
    completed_today: int
    next_cursor: str | None = None


class SaveIn(BaseModel):
    kind: Literal["note", "flashcard", "later"]


class SavedOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    kind: str
    title: str
    content: str
    subject: str


class ScheduleOut(BaseModel):
    time: str
    title: str
    detail: str
    type: str


class TopicProgress(BaseModel):
    topic: str
    subject: str
    progress: int
    answered: int
    total: int


class GoalOut(BaseModel):
    key: str
    title: str
    done: bool
    route: str


class DashboardOut(BaseModel):
    user: UserOut
    date: date
    progress: int
    streak: int
    days_to_exam: int
    exam_at: datetime
    answered_today: int
    daily_target: int
    accuracy: int
    total_answered: int
    clips_today: int
    goals: list[GoalOut]
    schedule: list[ScheduleOut]
    topics: list[TopicProgress]
    badges: list[str]


class StructureOut(BaseModel):
    id: str
    name: str
    category: str
    description: str
    clinical_note: str
    color: str
    source_url: str
    studied: bool = False


class AnatomyOut(BaseModel):
    title: str
    scope: str
    structures: list[StructureOut]


class FeatureOut(BaseModel):
    slug: str
    title: str
    status: Literal["coming_soon"] = "coming_soon"
    description: str


class CompleteOut(Success):
    completed_today: int
