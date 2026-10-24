from app.core.database import SessionLocal
from app.models import Clip


def test_medbytes_cursor_pages_beyond_three(authenticated):
    client, headers, _ = authenticated
    with SessionLocal() as db:
        original = db.get(Clip, "conduction")
        fields = {column.name: getattr(original, column.name)
                  for column in Clip.__table__.columns if column.name != "id"}
        for index in range(20):
            db.add(Clip(id=f"extra-{index:02}", **fields))
        db.commit()
    seen = []
    cursor = ""
    while True:
        response = client.get("/api/v1/medbytes", headers=headers,
                              params={"limit": 6, "cursor": cursor})
        assert response.status_code == 200
        page = response.json()
        assert "session_limit" not in page
        assert len(page["items"]) <= 6
        seen.extend(clip["id"] for clip in page["items"])
        if page["next_cursor"] is None:
            break
        cursor = page["next_cursor"]
    assert len(seen) == len(set(seen)) == 23
    assert seen == sorted(seen)


def test_medbytes_filter_metadata_and_limits(authenticated):
    client, headers, _ = authenticated
    page = client.get("/api/v1/medbytes?subject=Physiology&limit=1", headers=headers).json()
    assert all(item["subject"] == "Physiology" for item in page["items"])
    assert page["subjects"] == client.get("/api/v1/medbytes", headers=headers).json()["subjects"]
    assert client.get("/api/v1/medbytes?limit=51", headers=headers).status_code == 422
    assert client.get("/api/v1/medbytes?limit=0", headers=headers).status_code == 422
    empty = client.get("/api/v1/medbytes?subject=missing", headers=headers).json()
    assert empty["items"] == [] and empty["next_cursor"] is None
