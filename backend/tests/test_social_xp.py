from datetime import datetime, timezone, timedelta
from sqlalchemy import select, func
from app.core.database import SessionLocal
from app.models import XPEvent, FocusSession, User, Attempt, SavedItem, CardReview
import uuid

API = "/api/v1"


def other(c, name="Helper"):
    session = c.post(API + "/auth/guest", headers={"X-Client": "native"}).json()
    with SessionLocal() as db:
        db.get(User, session["user"]["id"]).name = name
        db.commit()
    return {"Authorization": "Bearer " + session["access_token"]}, session["user"]["id"]


def xp(c, h):
    response = c.get(API + "/progress", headers=h)
    assert response.status_code == 200, response.text
    return response.json()["xp"]


def post(c, h, path, **changes):
    response = c.post(API + path, headers=h, json={"title": "Medical learning", "subject": "Physiology", "content": "A question about our study material.", **changes})
    assert response.status_code == 201, response.text
    return response.json()


def test_xp_across_study_tools_and_persistent_history(authenticated):
    c, h, session = authenticated
    note = post(c, h, "/saved", kind="note")
    card = post(c, h, "/saved", kind="flashcard")
    for _ in range(2):
        assert c.post(API + f"/flashcards/{card['id']}/review", headers=h, json={"rating":"good"}).status_code == 200
    assert xp(c, h) == 25
    edited = dict(kind="note", title="Updated idea", subject="Physiology", content="Revised notes.")
    for _ in range(2): c.put(API + "/saved/" + note["id"], headers=h, json=edited)
    block_data = dict(title="Study",subject="Physiology",day="2026-10-13",time="09:00",minutes=25,done=False)
    block = c.post(API + "/planner", headers=h, json=block_data).json()
    for done in [True, False, True]:
        c.put(API + "/planner/" + block["id"], headers=h, json={**block_data,"done":done})
    assert xp(c,h) == 47
    resource = c.get(API + "/resources", headers=h).json()["items"][0]
    for _ in range(2): c.post(API + "/activities/resource", headers=h, json={"url":resource["url"]})
    c.post(API + "/tutor", headers=h, json={"question":"cardiac conduction"})
    c.post(API + "/tutor", headers=h, json={"question":"cardiac conduction"})
    c.put(API + "/anatomy/lv/studied", headers=h)
    assert c.post(API + "/anatomy/recall", headers=h, json={"structure_id":"lv"}).json()["xp_earned"] == 0
    assert c.post(API + "/anatomy/recall", headers=h, json={"structure_id":"rv"}).json()["xp_earned"] == 10
    c.post(API + "/medbytes/conduction/complete", headers=h)
    c.put(API + "/dashboard/goals/anatomy", headers=h, json={"done":True})
    c.put(API + "/mcqs/q01/bookmark", headers=h, json={"saved":True})
    assert xp(c,h) == 109
    profile = c.get(API + "/profiles/" + session["user"]["id"]).json()
    assert profile["level"] == 2 and profile["xp"] == 109
    c.delete(API + "/saved/" + note["id"], headers=h)
    c.delete(API + "/saved/" + card["id"], headers=h)
    c.delete(API + "/planner/" + block["id"], headers=h)
    assert xp(c,h) == 109
    history = c.get(API + "/progress", headers=h).json()
    assert sum(item["points"] for item in history["xp_history"]) == 109
    assert any(day["xp"] for day in history["activity"])
    assert c.post(API + "/activities/resource", headers=h, json={"url":"https://invalid.example"}).status_code == 400


def test_open_community_profiles_and_reaction_idempotency(authenticated):
    c, h, session = authenticated
    helper, helper_id = other(c)
    thread = post(c,h,"/community")
    assert c.get(API + "/community").json()["items"][0]["id"] == thread["id"]
    for _ in range(2):
        response = c.put(API + f"/community/{thread['id']}/like",headers=helper,json={"liked":True})
        assert response.json()["likes"] == 1
    c.put(API + f"/community/{thread['id']}/like",headers=helper,json={"liked":False})
    c.put(API + f"/community/{thread['id']}/like",headers=helper,json={"liked":True})
    for _ in range(2): c.post(API + f"/community/{thread['id']}/replies",headers=helper,json={"content":"A useful resource to discuss."})
    assert xp(c,helper) == 7
    assert xp(c,h) == 10
    profile = c.get(API + "/profiles/" + helper_id).json()
    assert profile["xp"] == 7
    assert set(profile) == {"id","name","year","xp","level","level_progress","next_level_xp","posts","doubts","solutions"}
    assert c.get(API + "/profiles?search=Helper").json()["items"][0]["id"] == helper_id
    assert c.post(API + "/community",json={"title":"x","subject":"x","content":"x"}).status_code == 401
    assert c.get(API + "/doubts/" + thread["id"]).status_code == 404


def test_doubts_answers_solution_permissions_and_reopen(authenticated):
    c,h,session = authenticated
    helper,helper_id = other(c)
    stranger,_ = other(c,"Other")
    doubt=post(c,h,"/doubts")
    answer=c.post(API + f"/doubts/{doubt['id']}/replies",headers=helper,json={"content":"Here is my reasoning and source."}).json()
    solution=API + f"/doubts/{doubt['id']}/solution"
    assert c.put(solution,headers=helper,json={"reply_id":answer["id"]}).status_code == 403
    assert c.put(solution,headers=stranger,json={"reply_id":answer["id"]}).status_code == 403
    own=c.post(API + f"/doubts/{doubt['id']}/replies",headers=h,json={"content":"Additional detail."}).json()
    assert c.put(solution,headers=h,json={"reply_id":own["id"]}).status_code == 400
    elsewhere=post(c,h,"/doubts",title="Another concept")
    foreign=c.post(API + f"/doubts/{elsewhere['id']}/replies",headers=stranger,json={"content":"Another answer."}).json()
    assert c.put(solution,headers=h,json={"reply_id":foreign["id"]}).status_code == 400
    for _ in range(2): assert c.put(solution,headers=h,json={"reply_id":answer["id"]}).json()["solved"]
    assert xp(c,helper) == 35
    assert c.get(API + "/doubts?status=solved").json()["items"][0]["id"] == doubt["id"]
    assert c.get(API + f"/doubts/{doubt['id']}").json()["messages"][0]["accepted"]
    assert c.get(API + "/profiles/" + helper_id).json()["solutions"] == 1
    assert c.put(solution,headers=h,json={"reply_id":None}).json()["solved"] is False
    c.put(solution,headers=h,json={"reply_id":answer["id"]})
    assert xp(c,helper) == 35
    assert c.delete(API + "/doubts/replies/" + answer["id"],headers=stranger).status_code == 404
    c.delete(API + "/doubts/replies/" + answer["id"],headers=helper)
    assert not c.get(API + f"/doubts/{doubt['id']}").json()["solved"]
    assert xp(c,helper) == 35


def test_daily_caps_and_focus_verification(authenticated):
    c,h,_ = authenticated
    for index in range(5): post(c,h,"/community",title=f"Medical post {index}")
    assert xp(c,h) == 30
    assert c.post(API + "/activities/focus",headers=h,json={"seconds":1}).status_code == 422
    focus=c.post(API + "/activities/focus",headers=h,json={"seconds":300}).json()
    path=API + f"/activities/focus/{focus['id']}/complete"
    assert c.post(path,headers=h).status_code == 409
    outsider,_=other(c)
    assert c.post(path,headers=outsider).status_code == 404
    with SessionLocal() as db:
        db.get(FocusSession,focus["id"]).started_at=datetime.now(timezone.utc)-timedelta(seconds=301)
        db.commit()
    assert c.post(path,headers=h).json()["xp_earned"] == 20
    assert c.post(path,headers=h).json()["xp_earned"] == 0
    assert xp(c,h) == 50


def test_legacy_xp_and_account_deletion(authenticated):
    c,h,session=authenticated
    user_id=session["user"]["id"]
    with SessionLocal() as db:
        db.add(Attempt(user_id=user_id,question_id="q01",request_id=str(uuid.uuid4()),selected_index=3,correct=True))
        db.commit()
    assert xp(c,h) == xp(c,h) == 20
    helper,helper_id=other(c)
    doubt=post(c,helper,"/doubts")
    answer=c.post(API + f"/doubts/{doubt['id']}/replies",headers=h,json={"content":"A solution."}).json()
    c.put(API + f"/doubts/{doubt['id']}/solution",headers=helper,json={"reply_id":answer["id"]})
    c.put(API + f"/doubts/{doubt['id']}/like",headers=h,json={"liked":True})
    c.post(API + "/activities/focus",headers=h,json={"seconds":300})
    assert c.delete(API + "/auth/me",headers=h).status_code == 204
    assert not c.get(API + f"/doubts/{doubt['id']}").json()["solved"]
    with SessionLocal() as db:
        assert not db.scalar(select(XPEvent.id).where(XPEvent.user_id==user_id))
        assert not db.scalar(select(FocusSession.id).where(FocusSession.user_id==user_id))
    assert c.get(API + "/profiles/" + user_id).status_code == 404


def test_legacy_review_xp_survives_deletion_before_first_progress_visit(authenticated):
    c, h, session = authenticated
    with SessionLocal() as db:
        user = db.get(User, session["user"]["id"])
        item = SavedItem(user_id=user.id, kind="flashcard", title="Old card", content="Existing learning", subject="General")
        db.add(item)
        db.flush()
        db.add(CardReview(item_id=item.id, user_id=user.id, due=datetime.now(timezone.utc).date(), interval=1, reviews=1))
        db.commit()
        item_id = item.id
    assert c.delete(API + "/saved/" + item_id, headers=h).status_code == 204
    assert xp(c, h) == 10
