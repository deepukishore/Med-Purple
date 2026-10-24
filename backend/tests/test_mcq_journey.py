import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models import MCQCompletion, MCQExamSession, Question, XPEvent

API = "/api/v1"


def answer(c, h, question, choice):
    key = str(uuid.uuid4())
    response = c.post(f"{API}/mcqs/{question}/answer", headers=h,
                      json={"request_id": key, "selected_index": choice})
    assert response.status_code == 200, response.text
    return key


def complete(c, h, keys):
    return c.post(f"{API}/mcqs/complete", headers=h, json={"request_ids": keys})


def test_three_levels_and_new_account(authenticated):
    c, h, _ = authenticated
    progress = c.get(f"{API}/progress", headers=h).json()
    assert progress["xp"] == 0
    assert [level["name"] for level in progress["mcq_journey"]["levels"]] == ["Foundation", "Applied", "Challenge"]
    assert not any(task["done"] for task in progress["mcq_journey"]["tasks"])
    for level in progress["mcq_journey"]["levels"]:
        page = c.get(f"{API}/mcqs", headers=h, params={"difficulty": level["name"]}).json()
        assert len(page["items"]) == level["total"] > 0
        assert all(q["difficulty"] == level["name"] for q in page["items"])
        assert not any("correct_index" in q for q in page["items"])


def test_retry_rewards_idempotency_and_no_xp_farming(authenticated):
    c, h, _ = authenticated
    keys = [answer(c, h, "q01", 0), answer(c, h, "q02", 1), answer(c, h, "q05", 1)]
    first = complete(c, h, keys)
    assert first.status_code == 200, first.text
    result = first.json()
    assert (result["correct"], result["total"]) == (2, 3)
    assert result["progress"]["xp"] == 75  # 30 encounters + 20 correct + 25 completion
    assert complete(c, h, list(reversed(keys))).json() == result
    corrected = answer(c, h, "q01", 3)
    retry = complete(c, h, [corrected]).json()
    # First correct + comeback + Foundation quest + perfect round.
    assert retry["progress"]["xp"] == 155
    assert retry["progress"]["level"] == 2
    assert retry["progress"]["level_progress"] == 55
    assert c.get(f"{API}/mcqs?mode=mistakes", headers=h).json()["total"] == 0
    for _ in range(2):
        replay = complete(c, h, [answer(c, h, "q01", 3)]).json()
        assert replay["progress"]["xp"] == 155
    answer(c, h, "q01", 0)
    assert c.get(f"{API}/progress", headers=h).json()["xp"] == 155
    with SessionLocal() as db:
        assert len(db.scalars(select(MCQCompletion)).all()) == 4


def test_completion_rejects_missing_foreign_and_duplicate_answers(authenticated):
    c, h, _ = authenticated
    one = answer(c, h, "q01", 3)
    assert complete(c, h, []).status_code == 422
    assert complete(c, h, [one, one]).status_code == 422
    assert complete(c, h, [str(uuid.uuid4())]).status_code == 400
    assert complete(c, h, [one, answer(c, h, "q01", 0)]).status_code == 400
    other = c.post(f"{API}/auth/guest", headers={"X-Client": "native"}).json()
    other_h = {"Authorization": "Bearer " + other["access_token"]}
    assert complete(c, other_h, [one]).status_code == 400
    assert c.get(f"{API}/progress", headers=other_h).json()["xp"] == 0
    assert c.post(f"{API}/mcqs/complete", json={"request_ids": [one]}).status_code == 401


def test_level_quests_require_distinct_questions_and_survive_retries(authenticated):
    c, h, _ = authenticated
    for _ in range(3):
        answer(c, h, "q03", 2)
    p = c.get(f"{API}/progress", headers=h).json()
    applied = next(task for task in p["mcq_journey"]["tasks"] if task["key"] == "applied")
    assert applied["current"] == 1 and not applied["done"]
    for question, choice in [("q04", 3), ("q06", 2), ("q10", 0), ("q12", 1)]:
        answer(c, h, question, choice)
    p = c.get(f"{API}/progress", headers=h).json()
    assert p["xp"] == 225  # Five mastered questions and two difficulty quests.
    assert p["mcq_journey"]["bonus_xp"] == 125
    assert not next(t for t in p["mcq_journey"]["tasks"] if t["key"] == "first_set")["done"]


def test_account_deletion_removes_completions(authenticated):
    c, h, _ = authenticated
    complete(c, h, [answer(c, h, "q01", 3)])
    exam = c.post(
        f"{API}/mcqs/exam-sessions",
        headers=h,
        json={"limit": 3},
    ).json()
    assert c.delete(f"{API}/auth/me", headers=h).status_code == 204
    with SessionLocal() as db:
        assert not db.scalars(select(MCQCompletion)).all()
        assert db.get(MCQExamSession, exam["id"]) is None


def test_timed_exam_hides_answers_until_submission_and_awards_exam_xp(authenticated):
    c, h, user = authenticated
    started = c.post(
        f"{API}/mcqs/exam-sessions",
        headers=h,
        json={"limit": 3, "pass_mark": 70},
    )
    assert started.status_code == 201, started.text
    exam = started.json()
    assert exam["duration_seconds"] == 180
    assert exam["pass_mark"] == 70
    assert all("correct_index" not in item for item in exam["items"])
    with SessionLocal() as db:
        correct_choices = {
            question.id: question.correct_index
            for question in db.scalars(
                select(Question).where(
                    Question.id.in_([item["id"] for item in exam["items"]])
                )
            ).all()
        }
    for item in exam["items"]:
        saved = c.post(
            f"{API}/mcqs/exam-sessions/{exam['id']}/answers",
            headers=h,
            json={"question_id": item["id"], "selected_index": correct_choices[item["id"]]},
        )
        assert saved.status_code == 200, saved.text
        assert "correct_index" not in saved.json()

    result = c.post(f"{API}/mcqs/exam-sessions/{exam['id']}/complete", headers=h)
    assert result.status_code == 200, result.text
    payload = result.json()
    assert payload["status"] == "completed"
    assert payload["score"] == 100 and payload["passed"] is True
    assert all(item["correct"] and "correct_index" in item for item in payload["items"])
    repeated = c.post(f"{API}/mcqs/exam-sessions/{exam['id']}/complete", headers=h)
    assert repeated.json()["score"] == 100
    with SessionLocal() as db:
        exam_rewards = db.scalars(
            select(XPEvent).where(
                XPEvent.user_id == user["user"]["id"],
                XPEvent.activity == "mcq_exam",
            )
        ).all()
        assert len(exam_rewards) == 1 and exam_rewards[0].points == 40
        assert db.get(MCQExamSession, exam["id"]).passed is True


def test_timed_exam_enforces_ownership_deadline_and_completion(authenticated):
    c, h, _ = authenticated
    other = c.post(f"{API}/auth/guest", headers={"X-Client": "native"}).json()
    other_headers = {"Authorization": "Bearer " + other["access_token"]}
    exam = c.post(
        f"{API}/mcqs/exam-sessions",
        headers=h,
        json={"limit": 3, "duration_seconds": 60},
    ).json()
    assert c.post(
        f"{API}/mcqs/exam-sessions/{exam['id']}/answers",
        headers=other_headers,
        json={"question_id": exam["items"][0]["id"], "selected_index": 0},
    ).status_code == 404
    assert c.post(
        f"{API}/mcqs/exam-sessions/{exam['id']}/answers",
        headers=h,
        json={"question_id": "not-in-exam", "selected_index": 0},
    ).status_code == 422
    with SessionLocal() as db:
        session = db.get(MCQExamSession, exam["id"])
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert c.post(
        f"{API}/mcqs/exam-sessions/{exam['id']}/answers",
        headers=h,
        json={"question_id": exam["items"][0]["id"], "selected_index": 0},
    ).status_code == 409
    completed = c.post(f"{API}/mcqs/exam-sessions/{exam['id']}/complete", headers=h)
    assert completed.status_code == 200
    assert completed.json()["score"] == 0 and not completed.json()["passed"]
    assert c.post(
        f"{API}/mcqs/exam-sessions/{exam['id']}/answers",
        headers=h,
        json={"question_id": exam["items"][0]["id"], "selected_index": 0},
    ).status_code == 409
