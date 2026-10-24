import uuid
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import Settings
from pydantic import ValidationError
import pytest

API = "/api/v1"


def answer(client, headers, q="q01", index=0, request_id=None):
    return client.post(
        f"{API}/mcqs/{q}/answer",
        headers=headers,
        json={"selected_index": index, "request_id": request_id or str(uuid.uuid4())},
    )


def test_auth_required_and_answers_are_not_leaked(authenticated):
    c, h, _ = authenticated
    assert c.get(f"{API}/mcqs").status_code == 401
    items = c.get(f"{API}/mcqs", headers=h).json()["items"]
    assert len(items) == 12
    assert not any("correct_index" in q or "explanation" in q for q in items)
    assert c.get(f"{API}/mcqs?limit=500", headers=h).status_code == 422


def test_answer_idempotency_conflict_and_progress(authenticated):
    c, h, _ = authenticated
    key = str(uuid.uuid4())
    first = answer(c, h, index=3, request_id=key)
    assert first.json()["correct"] is True
    assert answer(c, h, index=3, request_id=key).json() == first.json()
    assert answer(c, h, index=0, request_id=key).status_code == 409
    assert answer(c, h, index=7).status_code == 422
    dashboard = c.get(f"{API}/dashboard", headers=h).json()
    assert dashboard["total_answered"] == 1
    assert dashboard["answered_today"] == 1
    assert dashboard["progress"] == 8
    assert dashboard["streak"] == 1
    assert "First step" in dashboard["badges"]


def test_mistakes_resolve_and_bookmarks_persist(authenticated):
    c, h, _ = authenticated
    assert answer(c, h, index=0).json()["correct"] is False
    assert [
        q["id"] for q in c.get(f"{API}/mcqs?mode=mistakes", headers=h).json()["items"]
    ] == ["q01"]
    answer(c, h, index=3)
    assert c.get(f"{API}/mcqs?mode=mistakes", headers=h).json()["total"] == 0
    for _ in range(2):
        assert (
            c.put(
                f"{API}/mcqs/q01/bookmark", headers=h, json={"saved": True}
            ).status_code
            == 200
        )
    assert c.get(f"{API}/mcqs?mode=bookmarked", headers=h).json()["total"] == 1
    c.put(f"{API}/mcqs/q01/bookmark", headers=h, json={"saved": False})
    assert c.get(f"{API}/mcqs?mode=bookmarked", headers=h).json()["total"] == 0


def test_guest_upgrade_retains_progress_and_login(authenticated):
    c, h, guest = authenticated
    answer(c, h, index=3)
    account = c.post(
        f"{API}/auth/register",
        headers={**h, "X-Client": "native"},
        json={
            "name": "Test Learner",
            "email": "learner@example.org",
            "password": "correct-horse-study-2026",
        },
    )
    assert account.status_code == 201, account.text
    assert account.json()["user"]["id"] == guest["user"]["id"]
    assert account.json()["user"]["is_guest"] is False
    assert (
        c.post(
            f"{API}/auth/refresh", json={"refresh_token": guest["refresh_token"]}
        ).status_code
        == 401
    )
    login = c.post(
        f"{API}/auth/login",
        headers={"X-Client": "native"},
        json={"email": "learner@example.org", "password": "correct-horse-study-2026"},
    )
    assert login.status_code == 200
    new_h = {"Authorization": "Bearer " + login.json()["access_token"]}
    assert c.get(f"{API}/dashboard", headers=new_h).json()["total_answered"] == 1
    assert (
        c.post(
            f"{API}/auth/login",
            json={"email": "learner@example.org", "password": "incorrect"},
        ).status_code
        == 401
    )


def test_refresh_rotation_logout_and_cookie_security(authenticated):
    c, h, data = authenticated
    renewed = c.post(
        f"{API}/auth/refresh", json={"refresh_token": data["refresh_token"]}
    )
    assert renewed.status_code == 200
    assert (
        c.post(
            f"{API}/auth/refresh", json={"refresh_token": data["refresh_token"]}
        ).status_code
        == 401
    )
    token = renewed.json()["refresh_token"]
    assert (
        c.post(f"{API}/auth/logout", json={"refresh_token": token}).status_code == 200
    )
    assert (
        c.post(f"{API}/auth/refresh", json={"refresh_token": token}).status_code == 401
    )
    web = c.post(f"{API}/auth/guest")
    assert web.json()["refresh_token"] is None
    cookie = web.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=strict" in cookie
    assert c.post(f"{API}/auth/refresh", json={}).status_code == 200


def test_per_user_isolation_and_delete(authenticated):
    c, h, first = authenticated
    answer(c, h, index=0)
    saved = c.post(
        f"{API}/medbytes/conduction/save", headers=h, json={"kind": "note"}
    ).json()
    second = c.post(f"{API}/auth/guest", headers={"X-Client": "native"}).json()
    other = {"Authorization": "Bearer " + second["access_token"]}
    assert c.get(f"{API}/notes", headers=other).json() == []
    assert c.get(f"{API}/dashboard", headers=other).json()["total_answered"] == 0
    assert c.delete(f'{API}/saved/{saved["id"]}', headers=other).status_code == 404
    assert c.delete(f"{API}/auth/me", headers=h).status_code == 204
    assert c.get(f"{API}/auth/me", headers=h).status_code == 401
    assert c.get(f"{API}/auth/me", headers=other).status_code == 200


def test_medbytes_deduplicate_and_real_media(authenticated):
    c, h, _ = authenticated
    data = c.get(f"{API}/medbytes", headers=h).json()
    assert len(data["items"]) == 3
    for _ in range(2):
        c.post(f"{API}/medbytes/conduction/complete", headers=h)
    assert c.get(f"{API}/medbytes", headers=h).json()["completed_today"] == 1
    for kind in ("note", "flashcard"):
        one = c.post(f"{API}/medbytes/conduction/save", headers=h, json={"kind": kind})
        two = c.post(f"{API}/medbytes/conduction/save", headers=h, json={"kind": kind})
        assert one.json()["id"] == two.json()["id"]
    assert len(c.get(f"{API}/notes", headers=h).json()) == 1
    assert len(c.get(f"{API}/flashcards", headers=h).json()) == 1
    for clip in data["items"]:
        response = c.get(clip["video_path"], headers={"Range": "bytes=0-127"})
        assert response.status_code == 206
        assert response.headers["content-type"] == "video/mp4"
        assert len(response.content) == 128
        assert c.get(clip["poster_path"]).status_code == 200
    assert (
        c.post(
            f"{API}/medbytes/missing/save", headers=h, json={"kind": "note"}
        ).status_code
        == 404
    )


def test_profile_validation_goal_and_anatomy(authenticated):
    c, h, data = authenticated
    profile = {
        k: v for k, v in data["user"].items() if k not in ("id", "email", "is_guest")
    }
    profile.update(
        name="Anu", timezone="Asia/Kolkata", daily_target=1, exam_date="2026-12-15"
    )
    assert c.patch(f"{API}/auth/me", headers=h, json=profile).status_code == 200
    invalid = {**profile, "timezone": "Mars/Olympus"}
    assert c.patch(f"{API}/auth/me", headers=h, json=invalid).status_code == 422
    assert (
        c.patch(
            f"{API}/auth/me", headers=h, json={**profile, "daily_target": 0}
        ).status_code
        == 422
    )
    c.put(f"{API}/anatomy/lv/studied", headers=h)
    assert next(
        s
        for s in c.get(f"{API}/anatomy", headers=h).json()["structures"]
        if s["id"] == "lv"
    )["studied"]
    assert c.put(f"{API}/anatomy/invalid/studied", headers=h).status_code == 404
    c.put(f"{API}/dashboard/goals/medbytes", headers=h, json={"done": True})
    assert next(
        g
        for g in c.get(f"{API}/dashboard", headers=h).json()["goals"]
        if g["key"] == "medbytes"
    )["done"]
    assert (
        c.put(
            f"{API}/dashboard/goals/unknown", headers=h, json={"done": True}
        ).status_code
        == 404
    )


def test_study_feature_contracts(authenticated):
    c, h, _ = authenticated
    for feature in [
        "community",
        "tutor",
        "lectures",
        "progress",
        "resources",
    ]:
        data = c.get(f"{API}/{feature}", headers=h).json()
        assert "status" not in data or data["status"] != "coming_soon"
        assert isinstance(data, dict)


def test_origin_rejection_and_production_guards(client):
    assert (
        client.post(
            f"{API}/auth/guest", headers={"Origin": "https://untrusted.invalid"}
        ).status_code
        == 403
    )
    with pytest.raises(ValidationError):
        Settings(
            environment="production",
            jwt_secret="short",
            cookie_secure=True,
            database_url="mysql+pymysql://x:x@localhost/test",
        )
    with pytest.raises(ValidationError):
        Settings(environment="production", jwt_secret="x" * 64, cookie_secure=False)


def test_production_database_requires_mysql():
    options = dict(environment="production", jwt_secret="x" * 64, cookie_secure=True)
    settings = Settings(**options, database_url="mysql+pymysql://x:x@localhost/test")
    assert settings.database_url.startswith("mysql+pymysql://")
    for url in ("sqlite://", "postgresql+psycopg://x:x@localhost/test"):
        with pytest.raises(ValidationError, match="Production requires MySQL"):
            Settings(**options, database_url=url)


def test_mysql_timestamp_precision():
    from sqlalchemy.dialects import mysql
    from sqlalchemy.schema import CreateTable
    from app.models import Attempt

    ddl = str(CreateTable(Attempt.__table__).compile(dialect=mysql.dialect()))
    assert "DATETIME(6)" in ddl
