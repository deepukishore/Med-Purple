from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import current_user
from app.models import CollaborativeNote, QuickCapture, StudyHistory, StudyRoomMessage, StudySet, User

router = APIRouter(tags=["Study productivity"])


class CaptureIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    kind: Literal["note", "photo", "voice", "link"] = "note"
    title: str = Field(default="Quick capture", min_length=1, max_length=200)
    content: str = Field(default="", max_length=20000)
    source_url: str = Field(default="", max_length=2000)
    media_name: str = Field(default="", max_length=200)
    media_data: str = Field(default="", max_length=3_500_000)


class CaptureOut(CaptureIn):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime


class StudySetIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=1000)
    items: list[dict] = Field(default_factory=list, max_length=100)


class StudySetOut(StudySetIn):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime


class HistoryIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    kind: str = Field(min_length=1, max_length=30)
    reference_id: str = Field(default="", max_length=100)
    title: str = Field(min_length=1, max_length=200)
    subject: str = Field(default="", max_length=80)
    metadata: dict = Field(default_factory=dict)


class RoomMessageIn(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class SharedNoteIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=180)
    content: str = Field(default="", max_length=30000)


@router.get("/captures", response_model=list[CaptureOut])
def captures(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(QuickCapture)
        .where(QuickCapture.user_id == user.id, QuickCapture.deleted_at.is_(None))
        .order_by(QuickCapture.created_at.desc())
        .limit(100)
    ).all()


@router.post("/captures", response_model=CaptureOut, status_code=201)
def create_capture(data: CaptureIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = QuickCapture(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/captures/{capture_id}", status_code=204)
def delete_capture(capture_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(QuickCapture, capture_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Capture not found.")
    item.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.get("/study-sets", response_model=list[StudySetOut])
def study_sets(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(
        select(StudySet).where(StudySet.user_id == user.id).order_by(StudySet.updated_at.desc())
    ).all()


@router.post("/study-sets", response_model=StudySetOut, status_code=201)
def create_study_set(data: StudySetIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = StudySet(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/study-sets/{set_id}", response_model=StudySetOut)
def update_study_set(set_id: str, data: StudySetIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(StudySet, set_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Study set not found.")
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/study-sets/{set_id}", status_code=204)
def delete_study_set(set_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(StudySet, set_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Study set not found.")
    db.delete(item)
    db.commit()


@router.get("/study-history")
def history(user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StudyHistory).where(StudyHistory.user_id == user.id)
        .order_by(StudyHistory.opened_at.desc()).limit(30)
    ).all()
    return [
        dict(id=row.id, kind=row.kind, reference_id=row.reference_id, title=row.title,
             subject=row.subject, metadata=row.extra, opened_at=row.opened_at)
        for row in rows
    ]


@router.post("/study-history", status_code=201)
def add_history(data: HistoryIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = StudyHistory(
        user_id=user.id,
        kind=data.kind,
        reference_id=data.reference_id,
        title=data.title,
        subject=data.subject,
        extra=data.metadata,
    )
    db.add(item)
    db.commit()
    return dict(id=item.id, kind=item.kind, reference_id=item.reference_id, title=item.title,
                subject=item.subject, metadata=item.extra, opened_at=item.opened_at)


@router.get("/study-rooms/{room_id}/messages")
def room_messages(room_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(
        select(StudyRoomMessage).where(StudyRoomMessage.room_id == room_id)
        .order_by(StudyRoomMessage.created_at.desc()).limit(50)
    ).all()
    rows.reverse()
    return [
        dict(id=row.id, room_id=row.room_id, content=row.content,
             author=(db.get(User, row.user_id).name if db.get(User, row.user_id) else "Student"),
             created_at=row.created_at)
        for row in rows
    ]


@router.post("/study-rooms/{room_id}/messages", status_code=201)
def add_room_message(room_id: str, data: RoomMessageIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = StudyRoomMessage(room_id=room_id, user_id=user.id, content=data.content)
    db.add(item)
    db.commit()
    return dict(id=item.id, room_id=room_id, content=item.content, author=user.name, created_at=item.created_at)


@router.get("/shared-notes")
def shared_notes(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(CollaborativeNote).order_by(CollaborativeNote.updated_at.desc()).limit(100)).all()


@router.post("/shared-notes", status_code=201)
def create_shared_note(data: SharedNoteIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = CollaborativeNote(owner_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/shared-notes/{note_id}")
def update_shared_note(note_id: str, data: SharedNoteIn, user=Depends(current_user), db: Session = Depends(get_db)):
    item = db.get(CollaborativeNote, note_id)
    if not item:
        raise HTTPException(404, "Shared note not found.")
    item.title = data.title
    item.content = data.content
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    return item
