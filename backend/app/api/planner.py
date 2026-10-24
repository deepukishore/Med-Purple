from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models.entities import StudyBlock
from app.services.xp import award, lock_rewards

router = APIRouter(prefix="/planner", tags=["Study planner"])


class BlockInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=150)
    subject: str = Field(min_length=1, max_length=50)
    day: date
    time: str = Field(pattern=r"^(?:[01]\d|2[0-3]):[0-5]\d$")
    minutes: int = Field(ge=5, le=480)
    done: bool = False


class BlockOut(BlockInput):
    model_config = ConfigDict(from_attributes=True)
    id: str


class AutoPlanIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    subjects: list[str] = Field(min_length=1, max_length=7)
    days: int = Field(default=7, ge=1, le=14)
    minutes: int = Field(default=30, ge=5, le=240)


@router.get("", response_model=list[BlockOut])
def blocks(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(StudyBlock).where(StudyBlock.user_id == user.id)
                      .order_by(StudyBlock.day, StudyBlock.time, StudyBlock.id)).all()


@router.post("", response_model=BlockOut, status_code=201)
def create(data: BlockInput, user=Depends(current_user), db: Session = Depends(get_db)):
    lock_rewards(db, user)
    item = StudyBlock(user_id=user.id, **data.model_dump())
    db.add(item)
    db.flush()
    award(db, user, "plan:" + item.id, "plan")
    if item.done:
        award(db, user, "plan_complete:" + item.id, "plan_complete")
    db.commit()
    return item


@router.post("/auto", response_model=list[BlockOut], status_code=201)
def auto_plan(data: AutoPlanIn, user=Depends(current_user), db: Session = Depends(get_db)):
    """Create a small editable plan from the student's focus subjects."""
    lock_rewards(db, user)
    today = date.today()
    existing = set(
        db.scalars(select(StudyBlock.day).where(StudyBlock.user_id == user.id)).all()
    )
    created = []
    for index in range(data.days):
        day = today + timedelta(days=index)
        if day in existing:
            continue
        subject = data.subjects[index % len(data.subjects)]
        item = StudyBlock(
            user_id=user.id,
            title=f"{subject} focused review",
            subject=subject,
            day=day,
            time="07:30" if index % 2 == 0 else "19:00",
            minutes=data.minutes,
            done=False,
        )
        db.add(item)
        created.append(item)
        award(db, user, "auto_plan:" + str(day), "plan")
    db.commit()
    for item in created:
        db.refresh(item)
    return created


def owned(item_id, user, db):
    item = db.get(StudyBlock, item_id)
    if not item or item.user_id != user.id:
        raise HTTPException(404, "Study block not found.")
    return item


@router.put("/{item_id}", response_model=BlockOut)
def update(item_id: str, data: BlockInput, user=Depends(current_user), db: Session = Depends(get_db)):
    item = owned(item_id, user, db)
    for key, value in data.model_dump().items():
        setattr(item, key, value)
    if item.done:
        award(db, user, "plan_complete:" + item.id, "plan_complete")
    db.commit()
    return item


@router.delete("/{item_id}", status_code=204)
def remove(item_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    db.delete(owned(item_id, user, db))
    db.commit()
