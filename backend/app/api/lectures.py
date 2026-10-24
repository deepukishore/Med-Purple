from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import Clip, ClipView
from app.schemas.contracts import ClipOut

router = APIRouter(prefix="/lectures", tags=["Video lessons"])


@router.get("")
def lessons(user=Depends(current_user), db: Session = Depends(get_db)):
    watched = set(db.scalars(select(ClipView.clip_id).where(ClipView.user_id == user.id)).all())
    return dict(items=[dict(**ClipOut.model_validate(c).model_dump(exclude={"watched"}), watched=c.id in watched)
                       for c in db.scalars(select(Clip).order_by(Clip.subject, Clip.title)).all()])

