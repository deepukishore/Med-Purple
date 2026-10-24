from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import current_user
from app.models import FeatureState

router = APIRouter(prefix="/features", tags=["Learning features"])


class FeaturePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    exam_track: str | None = Field(default=None, max_length=30)
    mistake_notes: dict[str, str] | None = None
    clinical_logs: list[dict[str, Any]] | None = None
    clinical_state: dict[str, Any] | None = None
    community: dict[str, Any] | None = None
    followed_creators: list[str] | None = None
    preferences: dict[str, Any] | None = None


class FeatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    exam_track: str
    mistake_notes: dict
    clinical_logs: list
    clinical_state: dict
    community: dict
    followed_creators: list
    preferences: dict


def get_or_create(user, db: Session):
    state = db.get(FeatureState, user.id)
    if not state:
        state = FeatureState(user_id=user.id)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


@router.get("", response_model=FeatureOut)
def read_features(user=Depends(current_user), db: Session = Depends(get_db)):
    return get_or_create(user, db)


@router.patch("", response_model=FeatureOut)
def update_features(
    data: FeaturePatch,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    state = get_or_create(user, db)
    for key, value in data.model_dump(exclude_none=True).items():
        setattr(state, key, value)
    state.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(state)
    return state
