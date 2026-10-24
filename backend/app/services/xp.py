"""A single, persistent XP ledger for all learning and contribution activities."""
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from app.models import User, XPEvent, Question, ClipView, AnatomyVisit, CardReview, MCQCompletion
from app.services.progress import attempts_for, local_today, local_day
from app.services.mcq_journey import mcq_journey

# Points and daily caps are enforced on the server. Finite library rewards have no cap.
RULES = {
    "question": (10, None, "Try a new MCQ", "/mcqs"),
    "correct_answer": (10, None, "Get a question right for the first time", "/mcqs"),
    "mcq_quest": (0, None, "Complete MCQ quests (15–75 XP each)", "/mcqs"),
    "mcq_exam": (20, 120, "Complete a timed exam session (more for passing)", "/mcqs"),
    "video": (15, None, "Complete a new video or lesson", "/medbytes"),
    "anatomy": (20, None, "Study a new anatomy structure", "/anatomy"),
    "recall": (10, None, "Solve the anatomy recall exercise", "/anatomy"),
    "note": (10, 50, "Create a study note", "/notes"),
    "flashcard": (5, 25, "Create a flashcard", "/flashcards"),
    "review": (10, None, "Review a flashcard for the first time", "/flashcards"),
    "review_day": (5, 25, "Review a card on a later day", "/flashcards"),
    "edit": (2, 10, "Revise a note or flashcard", "/notes"),
    "plan": (5, 15, "Plan a study session", "/planner"),
    "plan_complete": (15, 60, "Complete a planned session", "/planner"),
    "community_post": (10, 30, "Share a medical post", "/community"),
    "community_reply": (5, 30, "Join a medical discussion", "/community"),
    "reaction": (2, 10, "Appreciate another student's post", "/community"),
    "doubt": (10, 30, "Ask a medical doubt", "/doubts"),
    "doubt_answer": (10, 50, "Answer another student's doubt", "/doubts"),
    "solution": (25, 100, "Have your answer accepted as a solution", "/doubts"),
    "resource": (5, None, "Open a new textbook resource", "/resources"),
    "coach": (5, 5, "Find explanations with the study coach", "/tutor"),
    "focus": (20, 60, "Complete a focus timer (at least 5 minutes)", "/"),
    "bookmark": (2, 10, "Bookmark a question for revision", "/mcqs"),
    "goal": (5, 15, "Complete a daily learning goal", "/"),
    "profile": (10, None, "Set up your student profile", "/profile"),
    "story": (5, 15, "Share a useful study story", "/community"),
    "story_response": (1, 20, "Take part in a study story", "/community"),
    "story_reaction": (1, 20, "Share a helpful story reaction", "/community"),
    "story_quiz": (2, 20, "Answer a study story quiz correctly", "/community"),
    "story_streak": (3, 3, "Post a story to extend your creator streak", "/community"),
    "story_featured": (25, 25, "Have a story featured by the study community", "/community"),
}


def lock_rewards(db, user):
    # Acquire before inserting child rows to avoid MySQL FK lock upgrades.
    db.scalar(select(User.id).where(User.id == user.id).with_for_update())


def award(db, user, key, activity, *, points=None, day=None):
    amount, cap, _, _ = RULES[activity]
    amount = amount if points is None else points
    day = day or local_today(user)
    # Serializes rewards and daily caps for one account on MySQL.
    lock_rewards(db, user)
    if db.scalar(select(XPEvent.id).where(XPEvent.user_id == user.id, XPEvent.event_key == key).with_for_update()):
        return 0
    if cap is not None:
        earned = sum(db.scalars(select(XPEvent.points).where(
            XPEvent.user_id == user.id, XPEvent.activity == activity, XPEvent.day == day
        ).with_for_update()).all())
        if earned + amount > cap:
            return 0
    try:
        with db.begin_nested():
            db.add(XPEvent(user_id=user.id, event_key=key, activity=activity, points=amount, day=day))
            db.flush()
    except IntegrityError:
        return 0
    return amount


def sync_legacy_rewards(db, user):
    """Retain existing XP, upgrading old accounts lazily without double counting."""
    existing = set(db.scalars(select(XPEvent.event_key).where(XPEvent.user_id == user.id)).all())

    def grant(key, activity, **kwargs):
        if key not in existing:
            award(db, user, key, activity, **kwargs)
            existing.add(key)

    attempts = attempts_for(db, user)
    for attempt in attempts:
        day = local_day(attempt.created_at, user)
        grant("question:" + attempt.question_id, "question", day=day)
        if attempt.correct:
            grant("correct:" + attempt.question_id, "correct_answer", day=day)
    for view in db.scalars(select(ClipView).where(ClipView.user_id == user.id)).all():
        grant("video:" + view.clip_id, "video", day=view.day)
    for visit in db.scalars(select(AnatomyVisit).where(AnatomyVisit.user_id == user.id)).all():
        grant("anatomy:" + visit.structure_id, "anatomy", day=local_day(visit.created_at, user))
    for review in db.scalars(select(CardReview).where(CardReview.user_id == user.id)).all():
        grant("review:" + review.item_id, "review")
    questions = db.scalars(select(Question)).all()
    completions = db.scalars(select(MCQCompletion).where(MCQCompletion.user_id == user.id)).all()
    journey = mcq_journey(attempts, questions, completions)
    for task in journey["tasks"]:
        if task["done"]:
            grant("mcq_quest:" + task["key"], "mcq_quest", points=task["xp"])
    return journey


def level_summary(db, user):
    sync_legacy_rewards(db, user)
    db.commit()
    xp = db.scalar(select(func.coalesce(func.sum(XPEvent.points), 0)).where(XPEvent.user_id == user.id))
    return dict(xp=xp, level=1 + xp // 100, level_progress=xp % 100, next_level_xp=100)


def reward_rules():
    return [dict(activity=key, points=value[0], daily_cap=value[1], title=value[2], route=value[3]) for key, value in RULES.items()]
