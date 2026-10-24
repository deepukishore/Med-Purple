"""Build populated API fixtures in an isolated temporary database for web rendering checks."""
import os
import json
import tempfile
from uuid import uuid4
from pathlib import Path

handle, filename = tempfile.mkstemp(suffix=".sqlite")
os.close(handle)
os.environ["DATABASE_URL"] = "sqlite:///" + Path(filename).as_posix()
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "isolated-render-check-secret-at-least-forty-eight-characters"
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.services.seed import seed_content

try:
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_content(db)
    with TestClient(app) as client:
        session = client.post("/api/v1/auth/guest", headers={"X-Client": "native"}).json()
        headers = {"Authorization": "Bearer " + session["access_token"]}
        for kind in ("note", "flashcard"):
            client.post("/api/v1/saved", headers=headers, json=dict(kind=kind, title="Recall a concept", content="A source-linked study idea.", subject="General"))
        client.post("/api/v1/community", headers=headers, json=dict(title="Study question",content="A discussion in an isolated test database.",subject="General"))
        fixtures = {"user": session["user"]}
        for path in ("dashboard", "progress", "notes", "flashcards", "flashcards/reviews", "planner", "tutor", "community", "lectures", "resources", "anatomy", "mcqs", "medbytes"):
            response = client.get("/api/v1/" + path, headers=headers)
            assert response.status_code == 200, response.text
            fixtures["/" + path] = response.json()
        question_id = fixtures["/mcqs"]["items"][0]["id"]
        fixtures["warmup_answers"] = {}
        for selected_index in range(4):
            response = client.post(f"/api/v1/mcqs/{question_id}/answer", headers=headers, json={"selected_index": selected_index, "request_id": str(uuid4())})
            assert response.status_code == 200, response.text
            fixtures["warmup_answers"][str(selected_index)] = {
                "answer": response.json(),
                "progress": client.get("/api/v1/progress", headers=headers).json(),
                "dashboard": client.get("/api/v1/dashboard", headers=headers).json(),
            }
        output = Path(__file__).resolve().parents[2] / "scripts" / ".render-fixtures.json"
        output.write_text(json.dumps(fixtures), encoding="utf-8")
        print("Exported isolated API fixtures for web rendering checks.")
finally:
    engine.dispose()
    Path(filename).unlink(missing_ok=True)
