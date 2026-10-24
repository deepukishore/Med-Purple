from datetime import datetime, timedelta, timezone
import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.database import get_db
from app.core.security import current_user
from app.models import Question, Attempt, Bookmark, MCQCompletion, MCQExamSession
from app.schemas.contracts import *
from app.services.progress import attempts_for
from app.services.xp import award, lock_rewards

router = APIRouter(prefix="/mcqs", tags=["MCQ bank"])


def _utc(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _exam_questions(db: Session, session: MCQExamSession):
    questions = {q.id: q for q in db.scalars(
        select(Question).where(Question.id.in_(session.question_ids))
    ).all()}
    if len(questions) != len(session.question_ids):
        raise HTTPException(409, "Some exam questions are no longer available.")
    return [questions[question_id] for question_id in session.question_ids]


def _exam_result(db: Session, session: MCQExamSession):
    questions = _exam_questions(db, session)
    answers = session.answers or {}
    return {
        "id": session.id,
        "status": "completed" if session.completed_at else "in_progress",
        "pass_mark": session.pass_mark,
        "duration_seconds": session.duration_seconds,
        "started_at": _utc(session.started_at).isoformat(),
        "expires_at": _utc(session.expires_at).isoformat(),
        "completed_at": _utc(session.completed_at).isoformat() if session.completed_at else None,
        "items": [
            {
                "id": question.id,
                "subject": question.subject,
                "topic": question.topic,
                "difficulty": question.difficulty,
                "stem": question.stem,
                "options": question.options,
                "selected_index": answers.get(question.id),
                **({
                    "correct": answers.get(question.id) == question.correct_index,
                    "correct_index": question.correct_index,
                    "explanation": question.explanation,
                    "source_url": question.source_url,
                } if session.completed_at else {}),
            }
            for question in questions
        ],
        "score": session.score,
        "passed": session.passed,
    }


@router.post("/exam-sessions", status_code=201)
def start_exam(data: MCQExamStartIn, user=Depends(current_user), db: Session = Depends(get_db)):
    questions = db.scalars(select(Question).order_by(Question.id)).all()
    bookmarks = set(db.scalars(
        select(Bookmark.question_id).where(Bookmark.user_id == user.id)
    ).all())
    latest = {attempt.question_id: attempt for attempt in attempts_for(db, user)}
    eligible = [
        question for question in questions
        if (not data.subject or question.subject == data.subject)
        and (not data.topic or question.topic == data.topic)
        and (not data.difficulty or question.difficulty == data.difficulty)
        and (data.mode != "bookmarked" or question.id in bookmarks)
        and (data.mode != "mistakes" or (
            question.id in latest and not latest[question.id].correct
        ))
    ]
    if not eligible:
        raise HTTPException(404, "No questions match this exam.")
    secrets.SystemRandom().shuffle(eligible)
    selected = eligible[:min(data.limit, len(eligible))]
    now = datetime.now(timezone.utc)
    duration = data.duration_seconds or len(selected) * 60
    session = MCQExamSession(
        user_id=user.id,
        question_ids=[question.id for question in selected],
        answers={},
        pass_mark=data.pass_mark,
        duration_seconds=duration,
        started_at=now,
        expires_at=now + timedelta(seconds=duration),
    )
    db.add(session)
    db.commit()
    return _exam_result(db, session)


@router.post("/exam-sessions/{session_id}/answers")
def save_exam_answer(
    session_id: str,
    data: MCQExamAnswerIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    session = db.scalar(
        select(MCQExamSession)
        .where(MCQExamSession.id == session_id)
        .with_for_update()
    )
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Exam session not found.")
    if session.completed_at:
        raise HTTPException(409, "This exam has already been submitted.")
    if _utc(session.expires_at) <= datetime.now(timezone.utc):
        raise HTTPException(409, "The exam time has expired. Submit to see your results.")
    if data.question_id not in session.question_ids:
        raise HTTPException(422, "This question is not part of the exam.")
    question = db.get(Question, data.question_id)
    if data.selected_index >= len(question.options):
        raise HTTPException(422, "Choose an available answer option.")
    session.answers = {**(session.answers or {}), data.question_id: data.selected_index}
    db.commit()
    return {"saved": True}


@router.post("/exam-sessions/{session_id}/complete")
def complete_exam(session_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    session = db.scalar(
        select(MCQExamSession)
        .where(MCQExamSession.id == session_id)
        .with_for_update()
    )
    if not session or session.user_id != user.id:
        raise HTTPException(404, "Exam session not found.")
    questions = _exam_questions(db, session)
    if not session.completed_at:
        answers = session.answers or {}
        correct_count = sum(
            answers.get(question.id) == question.correct_index
            for question in questions
            if question.id in answers
        )
        session.score = round(correct_count * 100 / len(questions))
        session.passed = correct_count * 100 >= session.pass_mark * len(questions)
        session.completed_at = datetime.now(timezone.utc)
        lock_rewards(db, user)
        for question in questions:
            if question.id not in answers:
                continue
            answer_id = str(uuid.uuid4())
            correct = answers[question.id] == question.correct_index
            db.add(Attempt(
                user_id=user.id,
                question_id=question.id,
                request_id=answer_id,
                selected_index=answers[question.id],
                correct=correct,
            ))
            award(db, user, "question:" + question.id, "question")
            if correct:
                award(db, user, "correct:" + question.id, "correct_answer")
        if answers:
            award(
                db,
                user,
                f"mcq_exam:{session.id}",
                "mcq_exam",
                points=40 if session.passed else 20,
            )
        db.commit()
    from app.api.progress import progress_data
    result = _exam_result(db, session)
    result["progress"] = progress_data(db, user)
    return result


@router.post("/complete")
def complete_set(data: MCQCompleteIn, user=Depends(current_user), db: Session = Depends(get_db)):
    """Score a completed round from owned, saved answers, never client scores."""
    import hashlib
    from app.api.progress import progress_data

    attempts = db.scalars(select(Attempt).where(
        Attempt.user_id == user.id, Attempt.request_id.in_(data.request_ids)
    )).all()
    if len(attempts) != len(data.request_ids):
        raise HTTPException(400, "Some answers have not been saved for this account.")
    if len({a.question_id for a in attempts}) != len(attempts):
        raise HTTPException(400, "A set must contain different questions.")
    fingerprint = hashlib.sha256("|".join(sorted(data.request_ids)).encode()).hexdigest()
    query = select(MCQCompletion).where(
        MCQCompletion.user_id == user.id, MCQCompletion.fingerprint == fingerprint
    )
    completion = db.scalar(query)
    if not completion:
        completion = MCQCompletion(user_id=user.id, fingerprint=fingerprint,
                                   total=len(attempts), correct=sum(a.correct for a in attempts))
        db.add(completion)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            completion = db.scalar(query)
            if not completion:
                raise
    return dict(total=completion.total, correct=completion.correct, progress=progress_data(db, user))


@router.get("", response_model=QuestionPage)
def list_questions(
    shuffle: bool = False,
    subject: str = "",
    topic: str = "",
    difficulty: str = "",
    mode: Literal["all", "bookmarked", "mistakes"] = "all",
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    all_questions = db.scalars(select(Question).order_by(Question.id)).all()
    bookmarks = set(
        db.scalars(
            select(Bookmark.question_id).where(Bookmark.user_id == user.id)
        ).all()
    )
    latest = {a.question_id: a for a in attempts_for(db, user)}
    items = [
        q
        for q in all_questions
        if (not subject or q.subject == subject)
        and (not topic or q.topic == topic)
        and (not difficulty or q.difficulty == difficulty)
        and (mode != "bookmarked" or q.id in bookmarks)
        and (mode != "mistakes" or (q.id in latest and not latest[q.id].correct))
    ]
    if shuffle:
        import secrets

        secrets.SystemRandom().shuffle(items)
    return QuestionPage(
        items=[
            QuestionOut(
                id=q.id,
                subject=q.subject,
                topic=q.topic,
                difficulty=q.difficulty,
                stem=q.stem,
                options=q.options,
                bookmarked=q.id in bookmarks,
            )
            for q in items[offset : offset + limit]
        ],
        total=len(items),
        subjects=sorted({q.subject for q in all_questions}),
        topics=sorted(
            {q.topic for q in all_questions if not subject or q.subject == subject}
        ),
    )


@router.post("/{question_id}/answer", response_model=AnswerOut)
def answer(
    question_id: str,
    data: AnswerIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    q = db.get(Question, question_id)
    if not q:
        raise HTTPException(404, "Question not found.")
    previous = db.scalar(
        select(Attempt).where(
            Attempt.user_id == user.id, Attempt.request_id == data.request_id
        )
    )
    if previous and (
        previous.question_id != q.id or previous.selected_index != data.selected_index
    ):
        raise HTTPException(409, "This submission id was already used.")
    if not previous:
        previous = Attempt(
            user_id=user.id,
            question_id=q.id,
            request_id=data.request_id,
            selected_index=data.selected_index,
            correct=data.selected_index == q.correct_index,
        )
        db.add(previous)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            previous = db.scalar(
                select(Attempt).where(
                    Attempt.user_id == user.id, Attempt.request_id == data.request_id
                )
            )
            if (
                not previous
                or previous.question_id != q.id
                or previous.selected_index != data.selected_index
            ):
                raise HTTPException(409, "This submission id was already used.")
    award(db, user, "question:" + q.id, "question")
    if previous.correct:
        award(db, user, "correct:" + q.id, "correct_answer")
    db.commit()
    return AnswerOut(
        correct=previous.correct,
        correct_index=q.correct_index,
        selected_index=previous.selected_index,
        explanation=q.explanation,
        source_url=q.source_url,
    )


@router.put("/{question_id}/bookmark", response_model=Success)
def bookmark(
    question_id: str,
    data: ToggleIn,
    user=Depends(current_user),
    db: Session = Depends(get_db),
):
    if not db.get(Question, question_id):
        raise HTTPException(404, "Question not found.")
    entry = db.get(Bookmark, (user.id, question_id))
    if data.saved and not entry:
        db.add(Bookmark(user_id=user.id, question_id=question_id))
    if not data.saved and entry:
        db.delete(entry)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    if data.saved:
        award(db, user, "bookmark:" + question_id, "bookmark")
        db.commit()
    return Success()
