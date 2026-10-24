from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy import select
from app.models import Attempt, ClipView, AnatomyVisit, XPEvent


def local_today(user):
    return datetime.now(ZoneInfo(user.timezone)).date()


def local_day(dt, user):
    return dt.replace(tzinfo=timezone.utc).astimezone(ZoneInfo(user.timezone)).date()


def attempts_for(db, user):
    return db.scalars(
        select(Attempt).where(Attempt.user_id == user.id).order_by(Attempt.created_at)
    ).all()


def streak_for(db, user, attempts):
    days = {local_day(a.created_at, user) for a in attempts}
    days.update(db.scalars(select(XPEvent.day).where(XPEvent.user_id == user.id)).all())
    days.update(
        db.scalars(select(ClipView.day).where(ClipView.user_id == user.id)).all()
    )
    days.update(
        local_day(v, user)
        for v in db.scalars(
            select(AnatomyVisit.created_at).where(AnatomyVisit.user_id == user.id)
        ).all()
    )
    cursor = local_today(user)
    if cursor not in days:
        cursor -= timedelta(days=1)
    streak = 0
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak
