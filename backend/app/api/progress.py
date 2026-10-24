from datetime import timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import Question, ClipView, AnatomyVisit, CardReview, StudyBlock, MCQCompletion, XPEvent
from app.services.xp import level_summary, reward_rules
from app.services.mcq_journey import mcq_journey
from app.services.progress import attempts_for, local_today, local_day, streak_for

router = APIRouter(prefix="/progress", tags=["Learning progress"])


def progress_data(db, user):
    attempts = attempts_for(db, user)
    today = local_today(user)
    latest = {a.question_id: a for a in attempts}
    questions = db.scalars(select(Question)).all()
    clips = db.scalars(select(ClipView).where(ClipView.user_id == user.id)).all()
    anatomy = db.scalars(select(AnatomyVisit).where(AnatomyVisit.user_id == user.id)).all()
    reviews = db.scalars(select(CardReview).where(CardReview.user_id == user.id)).all()
    blocks = db.scalars(select(StudyBlock).where(StudyBlock.user_id == user.id, StudyBlock.done.is_(True))).all()
    mastered = {a.question_id for a in attempts if a.correct}
    completions = db.scalars(select(MCQCompletion).where(MCQCompletion.user_id == user.id)).all()
    journey = mcq_journey(attempts, questions, completions)
    level = level_summary(db, user)
    events = db.scalars(select(XPEvent).where(XPEvent.user_id == user.id).order_by(XPEvent.created_at.desc(), XPEvent.id)).all()
    subjects = []
    for subject in sorted({q.subject for q in questions}):
        qs = [q for q in questions if q.subject == subject]
        answered = [latest[q.id] for q in qs if q.id in latest]
        subjects.append(dict(subject=subject, total=len(qs), answered=len(answered),
                             correct=sum(a.correct for a in answered),
                             accuracy=round(100 * sum(a.correct for a in answered) / len(answered)) if answered else None))
    activity = []
    for offset in range(13, -1, -1):
        day = today - timedelta(days=offset)
        activity.append(dict(day=day, questions=sum(local_day(a.created_at, user) == day for a in attempts),
                             videos=sum(c.day == day for c in clips), xp=sum(e.points for e in events if e.day == day)))
    badges = [
        dict(name="First spark", description="Answer your first question", earned=bool(attempts), icon="spark"),
        dict(name="Brain builder", description="Answer 10 different questions", earned=len(latest) >= 10, icon="brain"),
        dict(name="On a roll", description="Build a 3-day study streak", earned=streak_for(db, user, attempts) >= 3, icon="fire"),
        dict(name="Heart explorer", description="Study 6 heart structures", earned=len(anatomy) >= 6, icon="heart"),
        dict(name="Recall ranger", description="Review your first flashcard", earned=bool(reviews), icon="cards"),
        dict(name="Plan in action", description="Complete a planned session", earned=bool(blocks), icon="check"),
    ]
    return dict(**level, mcq_journey=journey, reward_rules=reward_rules(),
                xp_history=[dict(id=e.id, activity=e.activity, points=e.points, day=e.day) for e in events[:30]],
                streak=streak_for(db, user, attempts), total_answered=len(attempts),
                accuracy=round(100 * sum(a.correct for a in attempts) / len(attempts)) if attempts else 0,
                mastered=len(mastered), subjects=subjects, activity=activity, badges=badges,
                completed_sessions=len(blocks), reviewed_cards=len(reviews))


@router.get("")
def progress(user=Depends(current_user), db: Session = Depends(get_db)):
    return progress_data(db, user)

