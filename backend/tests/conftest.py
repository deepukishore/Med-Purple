import os
from pathlib import Path
import tempfile

# A separate test database is mandatory. Never run against the development DB.
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL", "sqlite:///" + (Path(tempfile.gettempdir()) / f"med-purple-pytest-{os.getpid()}.sqlite").as_posix()
)
os.environ["JWT_SECRET"] = "tests-only-signing-secret-with-more-than-48-characters"
os.environ["ENVIRONMENT"] = "test"
import pytest
from fastapi.testclient import TestClient
from app.main import app, buckets
from app.core.database import Base, engine
from app.services.seed import seed_content
from app.core.database import SessionLocal


@pytest.fixture(autouse=True)
def database():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed_content(db)
    buckets.clear()
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def authenticated(client):
    response = client.post("/api/v1/auth/guest", headers={"X-Client": "native"})
    assert response.status_code == 200, response.text
    data = response.json()
    return client, {"Authorization": "Bearer " + data["access_token"]}, data
