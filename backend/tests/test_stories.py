import base64
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models import (
    StudyStory,
    StudyStoryCloseFriend,
    StudyStoryFollow,
    StudyStorySlideView,
    StudyStoryUpload,
    StudyStoryView,
    User,
    XPEvent,
)

API = "/api/v1"


def new_user(client, name):
    session = client.post(API + "/auth/guest", headers={"X-Client": "native"}).json()
    with SessionLocal() as db:
        db.get(User, session["user"]["id"]).name = name
        db.commit()
    return {"Authorization": "Bearer " + session["access_token"]}, session["user"]["id"]


def create_story(client, headers, **updates):
    payload = {
        "title": "Cardiac cycle check",
        "subject": "Physiology",
        "kind": "quiz",
        "slides": [
            {
                "text": "Which valve closes at the start of systole?",
                "options": ["Mitral", "Aortic", "Pulmonary"],
                "correct_index": 0,
                "explanation": "The mitral valve closes as ventricular pressure rises.",
            }
        ],
    }
    payload.update(updates)
    response = client.post(API + "/stories", headers=headers, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_story_media_is_served_from_private_storage_with_signed_links(authenticated):
    client, poster_headers, _ = authenticated
    viewer_headers, viewer_id = new_user(client, "Media viewer")
    upload = client.post(
        API + "/stories/media",
        headers=poster_headers,
        json={"data_url": "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n").decode()},
    )
    assert upload.status_code == 201, upload.text
    assert client.put(
        API + f"/stories/close-friends/{viewer_id}",
        headers=poster_headers,
    ).status_code == 200
    story = create_story(
        client,
        poster_headers,
        kind="diagram",
        slides=[{"media_url": upload.json()["media_url"]}],
        audience="close_friends",
    )

    detail = client.get(API + f"/stories/{story['id']}", headers=viewer_headers)
    assert detail.status_code == 200, detail.text
    media_url = detail.json()["slides"][0]["media_url"]
    assert media_url.startswith("/api/v1/stories/media/")
    media = client.get(urlsplit(media_url).path + "?" + urlsplit(media_url).query)
    assert media.status_code == 200
    assert media.content == b"\x89PNG\r\n\x1a\n"

    mismatched_path = media_url.replace(".png?", ".jpg?")
    assert client.get(mismatched_path).status_code == 403
    assert client.put(
        API + f"/stories/close-friends/{viewer_id}?active=false",
        headers=poster_headers,
    ).status_code == 200
    assert client.get(media_url).status_code == 404
    assert client.delete(API + f"/stories/{story['id']}", headers=poster_headers).status_code == 204


def test_quiz_story_privacy_views_results_reactions_and_xp(authenticated):
    client, poster_headers, poster_session = authenticated
    viewer_headers, viewer_id = new_user(client, "Quiz viewer")
    story = create_story(client, poster_headers)
    viewer_detail = client.get(API + f"/stories/{story['id']}", headers=viewer_headers)
    assert viewer_detail.status_code == 200
    assert "correct_index" not in viewer_detail.json()["slides"][0]

    answer = client.post(
        API + f"/stories/{story['id']}/responses",
        headers=viewer_headers,
        json={"response_type": "quiz", "option_index": 0},
    )
    assert answer.status_code == 201, answer.text
    assert answer.json()["correct"] is True
    assert client.get(API + f"/stories/{story['id']}", headers=viewer_headers).json()["slides"][0]["correct_index"] == 0

    reaction = client.put(
        API + f"/stories/{story['id']}/reactions",
        headers=viewer_headers,
        json={"reaction": "helpful", "active": True},
    )
    assert reaction.status_code == 200, reaction.text
    assert reaction.json()["reactions"]["helpful"] == 1
    poster_detail = client.get(API + f"/stories/{story['id']}", headers=poster_headers).json()
    assert poster_detail["views"] == 1
    assert poster_detail["responses"][0]["option_index"] == 0
    assert poster_detail["responses"][0]["author"] == "Quiz viewer"
    featured = client.get(API + "/stories/featured", headers=poster_headers)
    assert featured.status_code == 200
    assert featured.json()["item"]["id"] == story["id"]
    with SessionLocal() as db:
        viewer_xp = sum(db.scalars(select(XPEvent.points).where(XPEvent.user_id == viewer_id)).all())
        poster_xp = sum(db.scalars(select(XPEvent.points).where(XPEvent.user_id == poster_session["user"]["id"])).all())
        poster_activities = {
            event.activity: event.points
            for event in db.scalars(
                select(XPEvent).where(XPEvent.user_id == poster_session["user"]["id"])
            ).all()
        }
    assert viewer_xp >= 3
    assert poster_xp >= 7
    assert poster_activities["story_streak"] == 3
    assert poster_activities["story_featured"] == 25
    assert client.post(
        API + f"/stories/{story['id']}/responses",
        headers=viewer_headers,
        json={"response_type": "quiz", "option_index": 1},
    ).status_code == 409


def test_each_slide_tracks_views_and_quiz_responses_independently(authenticated):
    client, poster_headers, _ = authenticated
    viewer_headers, _ = new_user(client, "Slide viewer")
    story = create_story(
        client,
        poster_headers,
        slides=[
            {"text": "First question", "options": ["A", "B"], "correct_index": 1},
            {"text": "Second question", "options": ["C", "D"], "correct_index": 0},
        ],
    )
    assert "correct_index" not in client.get(
        API + f"/stories/{story['id']}?slide_index=0", headers=viewer_headers
    ).json()["slides"][0]
    assert "correct_index" not in client.get(
        API + f"/stories/{story['id']}?slide_index=1", headers=viewer_headers
    ).json()["slides"][1]
    for index, option_index in ((0, 1), (1, 0)):
        response = client.post(
            API + f"/stories/{story['id']}/responses",
            headers=viewer_headers,
            json={"response_type": "quiz", "option_index": option_index, "slide_index": index},
        )
        assert response.status_code == 201, response.text
        assert response.json()["correct"] is True
    with SessionLocal() as db:
        views = db.scalars(
            select(StudyStorySlideView).where(StudyStorySlideView.story_id == story["id"])
        ).all()
        assert {row.slide_index for row in views} == {0, 1}
    owner_detail = client.get(API + f"/stories/{story['id']}", headers=poster_headers).json()
    assert {row["slide_index"] for row in owner_detail["responses"]} == {0, 1}
    viewers = client.get(
        API + f"/stories/{story['id']}/slides/1/viewers",
        headers=poster_headers,
    )
    assert viewers.status_code == 200
    assert viewers.json()["items"][0]["name"] == "Slide viewer"


def test_sticker_lists_are_validated_and_responses_are_per_sticker(authenticated):
    client, poster_headers, _ = authenticated
    viewer_headers, _ = new_user(client, "Sticker viewer")
    stickers = [
        {
            "key": "quiz-a",
            "type": "quiz",
            "x": 0.5,
            "y": 0.6,
            "question": "Pick the correct answer",
            "options": ["A", "B"],
            "correct": 1,
            "explanation": "B is correct.",
        },
        {
            "key": "poll-a",
            "type": "poll",
            "x": 0.5,
            "y": 0.8,
            "question": "Was this helpful?",
            "options": ["Yes", "No"],
        },
    ]
    story = create_story(
        client,
        poster_headers,
        kind="text",
        slides=[{"text": "Sticker content", "stickers": stickers}],
    )
    for sticker_key, response_type, option_index in (
        ("quiz-a", "quiz", 1),
        ("poll-a", "poll", 0),
    ):
        result = client.post(
            API + f"/stories/{story['id']}/responses",
            headers=viewer_headers,
            json={
                "response_type": response_type,
                "sticker_key": sticker_key,
                "option_index": option_index,
            },
        )
        assert result.status_code == 201, result.text
    viewer_story = client.get(API + f"/stories/{story['id']}", headers=viewer_headers).json()
    assert viewer_story["slides"][0]["stickers"][0]["correct"] == 1
    assert viewer_story["slides"][0]["stickers"][0]["is_correct"] is True
    assert viewer_story["slides"][0]["stickers"][1]["results"] == [1, 0]
    saved = client.post(
        API + f"/stories/{story['id']}/save",
        headers=viewer_headers,
        json={"kind": "flashcard", "sticker_key": "quiz-a"},
    )
    assert saved.status_code == 201
    assert "Answer: B" in saved.json()["content"]
    assert "B is correct." in saved.json()["content"]

    invalid = client.post(
        API + "/stories",
        headers=poster_headers,
        json={
            "title": "Invalid sticker layout",
            "subject": "Anatomy",
            "kind": "text",
            "slides": [{
                "text": "Invalid",
                "stickers": [
                    {"key": str(index), "type": "question", "x": 0.5, "y": 0.5}
                    for index in range(5)
                ],
            }],
        },
    )
    assert invalid.status_code == 422


def test_mnemonic_save_poll_breakdown_and_anonymous_answers(authenticated):
    client, headers, _ = authenticated
    viewer_headers, _ = new_user(client, "Viewer")
    mnemonic = create_story(
        client,
        headers,
        title="Cranial nerve mnemonic",
        kind="mnemonic",
        slides=[{"mnemonic": "Some Say Marry Money, But My Brother Says Big Brains Matter More"}],
    )
    saved = client.post(
        API + f"/stories/{mnemonic['id']}/save",
        headers=viewer_headers,
        json={"kind": "note"},
    )
    assert saved.status_code == 201, saved.text
    assert "Some Say" in saved.json()["content"]
    assert client.get(API + "/notes", headers=viewer_headers).json()[0]["id"] == saved.json()["id"]

    poll = create_story(
        client,
        headers,
        title="Exam poll",
        kind="text",
        slides=[{"text": "Which topic is more high-yield?", "sticker": {"type": "poll", "options": ["ECG", "Murmurs"]}}],
    )
    vote = client.post(
        API + f"/stories/{poll['id']}/responses",
        headers=viewer_headers,
        json={"response_type": "poll", "option_index": 1},
    )
    assert vote.status_code == 201, vote.text
    owner = client.get(API + f"/stories/{poll['id']}", headers=headers).json()
    assert owner["response_counts"]["poll"] == 1
    assert owner["responses"][0]["answer"] == "Murmurs"

    question = client.post(
        API + f"/stories/{poll['id']}/responses",
        headers=viewer_headers,
        json={"response_type": "question", "answer": "Can you share a source?", "anonymous": True},
    )
    assert question.status_code == 201, question.text
    owner = client.get(API + f"/stories/{poll['id']}", headers=headers).json()
    assert owner["responses"][1]["author"] == "Anonymous student"
    assert owner["responses"][1]["user_id"] is None


def test_story_audiences_follow_close_friends_groups_hide_and_block(authenticated):
    client, owner_headers, owner_session = authenticated
    viewer_headers, viewer_id = new_user(client, "Viewer")
    outsider_headers, outsider_id = new_user(client, "Outsider")
    owner_id = owner_session["user"]["id"]

    friends_story = create_story(
        client, owner_headers, audience="friends", kind="text", slides=[{"text": "Friends only"}]
    )
    assert client.get(API + f"/stories/{friends_story['id']}", headers=viewer_headers).status_code == 404
    with SessionLocal() as db:
        db.add_all([
            StudyStoryFollow(follower_id=viewer_id, creator_id=owner_id),
            StudyStoryFollow(follower_id=owner_id, creator_id=viewer_id),
        ])
        db.commit()
    assert client.get(API + f"/stories/{friends_story['id']}", headers=viewer_headers).status_code == 200

    close_story = create_story(
        client, owner_headers, audience="close_friends", kind="text", slides=[{"text": "Close friends"}]
    )
    assert client.get(API + f"/stories/{close_story['id']}", headers=viewer_headers).status_code == 404
    with SessionLocal() as db:
        db.add(StudyStoryCloseFriend(owner_id=owner_id, friend_id=viewer_id))
        db.commit()
    assert client.get(API + f"/stories/{close_story['id']}", headers=viewer_headers).status_code == 200

    group = client.post(API + "/stories/groups", headers=owner_headers, json={"name": "Cardiology class"}).json()
    assert client.post(
        API + f"/stories/groups/{group['id']}/members",
        headers=owner_headers,
        json={"user_ids": [viewer_id]},
    ).json()["added"] == 1
    group_story = create_story(
        client,
        owner_headers,
        title="Today’s shared revision",
        kind="group",
        audience="group",
        group_id=group["id"],
        slides=[{"text": "Contribute one takeaway."}],
    )
    assert client.get(API + f"/stories/{group_story['id']}", headers=viewer_headers).status_code == 200
    assert client.get(API + f"/stories/{group_story['id']}", headers=outsider_headers).status_code == 404

    assert client.post(API + f"/stories/users/{owner_id}/hide", headers=viewer_headers).status_code == 200
    assert client.get(API + f"/stories/{friends_story['id']}", headers=viewer_headers).status_code == 404
    assert client.post(API + f"/stories/users/{owner_id}/hide", headers=viewer_headers).status_code == 200
    assert client.post(API + f"/stories/users/{owner_id}/block", headers=viewer_headers).status_code == 200
    assert client.get(API + f"/stories/{friends_story['id']}", headers=viewer_headers).status_code == 404


def test_reports_verification_flags_scheduling_expiry_and_highlights(authenticated):
    client, owner_headers, owner_session = authenticated
    viewer_headers, _ = new_user(client, "Reviewer")
    story = create_story(
        client,
        owner_headers,
        kind="text",
        slides=[{"text": "Review this clinical pearl."}],
        highlight="Clinical pearls",
    )
    assert story["expires_at"] is None
    assert client.post(
        API + f"/stories/{story['id']}/flags",
        headers=viewer_headers,
        json={"flag": "needs_verification", "details": "Please add a source."},
    ).status_code == 200
    assert client.post(
        API + f"/stories/{story['id']}/flags",
        headers=viewer_headers,
        json={"flag": "report", "details": "Incorrect content"},
    ).status_code == 200
    own = client.get(API + f"/stories/{story['id']}", headers=owner_headers).json()
    assert {item["flag"] for item in own["flags"]} == {"report", "needs_verification"}
    highlighted = client.get(
        API + f"/stories/highlights/{owner_session['user']['id']}",
        headers=viewer_headers,
    )
    assert highlighted.status_code == 200
    assert highlighted.json()["items"][0]["id"] == story["id"]

    draft = create_story(
        client,
        owner_headers,
        title="Scheduled story",
        kind="text",
        slides=[{"text": "Not live yet"}],
        draft=True,
    )
    assert client.get(API + f"/stories/{draft['id']}", headers=owner_headers).status_code == 404
    published = client.post(API + f"/stories/{draft['id']}/publish", headers=owner_headers)
    assert published.status_code == 200, published.text

    with SessionLocal() as db:
        story_row = db.get(StudyStory, story["id"])
        story_row.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert client.get(API + f"/stories/{story['id']}", headers=viewer_headers).status_code == 404
    assert all(item["id"] != story["id"] for item in client.get(API + "/stories", headers=viewer_headers).json()["items"])
    with SessionLocal() as db:
        assert db.get(StudyStory, story["id"]).status == "expired"


def test_moderation_hides_patient_info_and_escalates_three_wrong_info_reports(authenticated):
    client, owner_headers, _ = authenticated
    story = create_story(client, owner_headers, kind="text", slides=[{"text": "Potentially incorrect."}])
    for name in ("Reviewer A", "Reviewer B", "Reviewer C"):
        headers, _ = new_user(client, name)
        response = client.post(
            API + f"/stories/{story['id']}/flags",
            headers=headers,
            json={"flag": "wrong_info", "details": "Please verify this claim."},
        )
        assert response.status_code == 200
    owner = client.get(API + f"/stories/{story['id']}", headers=owner_headers).json()
    assert owner["needs_review"] is True

    patient_story = create_story(client, owner_headers, kind="text", slides=[{"text": "Patient details."}])
    reporter_headers, _ = new_user(client, "Privacy reporter")
    assert client.post(
        API + f"/stories/{patient_story['id']}/flags",
        headers=reporter_headers,
        json={"flag": "patient_info", "details": "Identifying patient information."},
    ).status_code == 200
    assert client.get(
        API + f"/stories/{patient_story['id']}", headers=reporter_headers
    ).status_code == 404
    assert client.get(
        API + f"/stories/{patient_story['id']}", headers=owner_headers
    ).json()["hidden_from_feed"] is True


def test_story_media_uploads_are_rate_limited_per_user(authenticated):
    client, headers, session = authenticated
    with SessionLocal() as db:
        db.add_all([
            StudyStoryUpload(
                user_id=session["user"]["id"],
                filename=f"rate-limit-{index}.png",
            )
            for index in range(20)
        ])
        db.commit()
    response = client.post(
        API + "/stories/media",
        headers=headers,
        json={"data_url": "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n").decode()},
    )
    assert response.status_code == 429
