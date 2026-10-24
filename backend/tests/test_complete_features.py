from datetime import timedelta
from app.core.database import SessionLocal
from app.models import User
from app.services.progress import local_today

API = "/api/v1"


def test_notes_reviews_and_ownership(authenticated):
    c, h, _ = authenticated
    payload = dict(kind="note", title="My idea", content="A useful explanation", subject="General")
    r = c.post(API + "/saved", headers=h, json=payload)
    assert r.status_code == 201, r.text
    item = r.json()
    assert c.get(API + "/notes", headers=h).json()[0]["id"] == item["id"]
    assert c.put(API + "/saved/" + item["id"], headers=h, json={**payload, "title": "Updated"}).json()["title"] == "Updated"
    card = c.post(API + "/saved", headers=h, json={**payload, "kind": "flashcard"}).json()
    review = c.post(API + "/flashcards/" + card["id"] + "/review", headers=h, json={"rating": "easy"})
    assert review.status_code == 200, review.text
    assert review.json()["interval"] == 3
    assert c.get(API + "/flashcards/reviews", headers=h).json()[0]["reviews"] == 1
    again = c.post(API + "/flashcards/" + card["id"] + "/review", headers=h, json={"rating": "again"}).json()
    assert again["interval"] == 0
    other = c.post(API + "/auth/guest", headers={"X-Client": "native"}).json()
    oh = {"Authorization": "Bearer " + other["access_token"]}
    assert c.get(API + "/notes", headers=oh).json() == []
    assert c.put(API + "/saved/" + item["id"], headers=oh, json=payload).status_code == 404
    assert c.post(API + "/flashcards/" + card["id"] + "/review", headers=oh, json={"rating": "easy"}).status_code == 404
    assert c.delete(API + "/saved/" + card["id"], headers=h).status_code == 204
    assert c.get(API + "/flashcards/reviews", headers=h).json() == []
    assert c.post(API + "/saved", headers=h, json={**payload,"title":"   "}).status_code == 422


def test_discussions_and_replies(authenticated):
    c, h, _ = authenticated
    thread = c.post(API + "/community", headers=h, json=dict(title="Study buddies?",subject="Anatomy",content="How do you revise?")).json()
    other = c.post(API + "/auth/guest", headers={"X-Client": "native"}).json()
    oh = {"Authorization": "Bearer " + other["access_token"]}
    assert c.get(API + "/community?subject=anat", headers=oh).json()["items"][0]["id"] == thread["id"]
    reply = c.post(API + "/community/" + thread["id"] + "/replies", headers=oh, json={"content":"I use flashcards."}).json()
    assert c.get(API + "/community/" + thread["id"], headers=h).json()["messages"][0]["content"] == "I use flashcards."
    assert c.delete(API + "/community/" + thread["id"], headers=oh).status_code == 404
    assert c.delete(API + "/community/replies/" + reply["id"], headers=h).status_code == 404
    assert c.delete(API + "/community/" + thread["id"], headers=h).status_code == 204
    assert c.get(API + "/community/" + thread["id"], headers=oh).status_code == 404


def test_progress_rewards_do_not_inflate_on_replay(authenticated):
    c, h, _ = authenticated
    assert c.get(API + "/progress", headers=h).json()["xp"] == 0
    for _ in range(3):
        c.post(API + "/medbytes/conduction/complete", headers=h)
    progress = c.get(API + "/progress", headers=h).json()
    assert progress["xp"] == 15
    assert len(progress["activity"]) == 14
    assert progress["activity"][-1]["videos"] == 1
    assert progress["level"] == 1


def test_coach_resources_and_real_schedule(authenticated):
    c, h, session = authenticated
    results = c.post(API + "/tutor", headers=h, json={"question":"cardiac conduction"}).json()
    assert results["results"]
    assert results["results"][0]["source_url"].startswith("https://")
    assert c.post(API + "/tutor", headers=h, json={"question":"zqxwrty"}).json()["results"] == []
    assert c.get(API + "/lectures", headers=h).json()["items"]
    assert c.get(API + "/resources", headers=h).json()["items"]
    assert c.get(API + "/dashboard", headers=h).json()["schedule"] == []
    with SessionLocal() as db:
        day = local_today(db.get(User, session["user"]["id"]))
    c.post(API + "/planner", headers=h, json=dict(title="My real session",subject="General",day=str(day),time="15:00",minutes=25))
    assert c.get(API + "/dashboard", headers=h).json()["schedule"][0]["title"] == "My real session"


def test_account_delete_cleans_new_records(authenticated):
    c, h, session = authenticated
    c.post(API + "/planner", headers=h, json=dict(title="Revision",subject="General",day="2026-10-09",time="15:00",minutes=25))
    card = c.post(API + "/saved", headers=h, json=dict(kind="flashcard",title="Question",content="Answer",subject="General")).json()
    c.post(API + "/flashcards/"+card["id"]+"/review", headers=h, json={"rating":"good"})
    thread = c.post(API + "/community", headers=h, json=dict(title="Hello",subject="General",content="A study tip")).json()
    c.post(API + "/community/"+thread["id"]+"/replies", headers=h, json={"content":"A reply"})
    assert c.delete(API + "/auth/me", headers=h).status_code == 204
    assert c.get(API + "/auth/me", headers=h).status_code == 401
