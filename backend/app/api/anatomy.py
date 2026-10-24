from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import AnatomyVisit, now
from app.schemas.contracts import *
from app.services.content import STRUCTURES, HEART
from app.services.xp import award

router = APIRouter(prefix="/anatomy", tags=["Anatomy"])


@router.get("", response_model=AnatomyOut)
def anatomy(user=Depends(current_user), db: Session = Depends(get_db)):
    studied = set(
        db.scalars(
            select(AnatomyVisit.structure_id).where(AnatomyVisit.user_id == user.id)
        ).all()
    )
    return AnatomyOut(
        title="The human heart",
        scope="Simplified chamber model. Not to scale. Vessel paths and proportions are schematic; valves and coronary anatomy are omitted.",
        structures=[
            StructureOut(**s, source_url=HEART, studied=s["id"] in studied)
            for s in STRUCTURES
        ],
    )


@router.put("/{structure_id}/studied", response_model=Success)
def studied(
    structure_id: str, user=Depends(current_user), db: Session = Depends(get_db)
):
    if structure_id not in {s["id"] for s in STRUCTURES}:
        raise HTTPException(404, "Structure not found.")
    visit = db.get(AnatomyVisit, (user.id, structure_id))
    if not visit:
        visit = AnatomyVisit(user_id=user.id, structure_id=structure_id)
        db.add(visit)
    visit.created_at = now()
    award(db, user, "anatomy:" + structure_id, "anatomy")
    db.commit()
    return Success()


class RecallIn(BaseModel):
    structure_id: str


@router.post("/recall")
def recall(data: RecallIn, user=Depends(current_user), db: Session = Depends(get_db)):
    correct = data.structure_id == "rv"
    points = award(db, user, "recall:pulmonary", "recall") if correct else 0
    db.commit()
    return dict(correct=correct, xp_earned=points)
