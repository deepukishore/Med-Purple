from datetime import datetime, time
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import current_user
from app.models import Question, Goal, ClipView, AnatomyVisit, StudyBlock
from app.schemas.contracts import *
from app.services.progress import *
from app.services.xp import award

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
GOALS = [
    ("mcqs", "Answer your daily MCQs", "/mcqs"),
    ("anatomy", "Explore a heart structure", "/anatomy"),
    ("medbytes", "Watch one MedByte", "/medbytes"),
]


@router.get("", response_model=DashboardOut)
def dashboard(user=Depends(current_user), db: Session = Depends(get_db)):
    today = local_today(user)
    attempts = attempts_for(db, user)
    today_questions = {
        a.question_id for a in attempts if local_day(a.created_at, user) == today
    }
    latest = {a.question_id: a for a in attempts}
    questions = db.scalars(select(Question)).all()
    clips = db.scalars(
        select(ClipView).where(ClipView.user_id == user.id, ClipView.day == today)
    ).all()
    visits = db.scalars(
        select(AnatomyVisit).where(AnatomyVisit.user_id == user.id)
    ).all()
    manual = {
        g.key: g.done
        for g in db.scalars(
            select(Goal).where(Goal.user_id == user.id, Goal.day == today)
        ).all()
    }
    automatic = {
        "mcqs": len(today_questions) >= user.daily_target,
        "anatomy": any(local_day(v.created_at, user) == today for v in visits),
        "medbytes": bool(clips),
    }
    topics = []
    for topic in dict.fromkeys(q.topic for q in questions):
        qs = [q for q in questions if q.topic == topic]
        count = sum(q.id in latest for q in qs)
        topics.append(
            TopicProgress(
                topic=topic,
                subject=qs[0].subject,
                progress=round(100 * count / len(qs)),
                answered=count,
                total=len(qs),
            )
        )
    streak = streak_for(db, user, attempts)
    return DashboardOut(
        user=user,
        date=today,
        progress=round(100 * len(latest) / max(len(questions), 1)),
        streak=streak,
        days_to_exam=max(0, (user.exam_date - today).days),
        exam_at=datetime.combine(user.exam_date, time(9), ZoneInfo(user.timezone)),
        answered_today=len(today_questions),
        daily_target=user.daily_target,
        accuracy=round(100 * sum(a.correct for a in attempts) / max(len(attempts), 1)),
        total_answered=len(attempts),
        clips_today=len(clips),
        goals=[
            GoalOut(key=k, title=t, route=r, done=manual.get(k, automatic[k]))
            for k, t, r in GOALS
        ],
        schedule=[ScheduleOut(time=b.time, title=b.title, detail=f"{b.subject} · {b.minutes} min", type="done" if b.done else "study")
                  for b in db.scalars(select(StudyBlock).where(StudyBlock.user_id == user.id, StudyBlock.day == today).order_by(StudyBlock.time)).all()],
        topics=topics,
        badges=(["First step"] if attempts else [])
        + (["Three-day streak"] if streak >= 3 else []),
    )


@router.put("/goals/{key}", response_model=Success)
def toggle_goal(
    key: str, data: GoalIn, user=Depends(current_user), db: Session = Depends(get_db)
):
    if key not in {g[0] for g in GOALS}:
        raise HTTPException(404, "Goal not found.")
    identity = (user.id, local_today(user), key)
    goal = db.get(Goal, identity)
    if not goal:
        goal = Goal(user_id=identity[0], day=identity[1], key=key)
        db.add(goal)
    goal.done = data.done
    if data.done:
        award(db, user, f"goal:{key}:{identity[1]}", "goal")
    db.commit()
    return Success()
