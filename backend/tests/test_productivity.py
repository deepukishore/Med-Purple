API = "/api/v1"


def test_captures_study_sets_history_and_preferences_persist(authenticated):
    client, headers, _ = authenticated
    capture = client.post(
        API + "/captures",
        headers=headers,
        json={"kind": "note", "title": "Ward reminder", "content": "Review murmurs after rounds."},
    )
    assert capture.status_code == 201
    assert client.get(API + "/captures", headers=headers).json()[0]["title"] == "Ward reminder"

    study_set = client.post(
        API + "/study-sets",
        headers=headers,
        json={"title": "Cardiology week", "description": "Mixed revision", "items": [{"id": "q01", "kind": "MCQ"}]},
    )
    assert study_set.status_code == 201
    assert client.get(API + "/study-sets", headers=headers).json()[0]["items"][0]["id"] == "q01"

    history = client.post(
        API + "/study-history",
        headers=headers,
        json={"kind": "timed-session", "title": "15-minute sprint", "subject": "Medicine", "metadata": {"minutes": 15}},
    )
    assert history.status_code == 201
    assert client.get(API + "/study-history", headers=headers).json()[0]["metadata"]["minutes"] == 15

    preferences = client.patch(
        API + "/features",
        headers=headers,
        json={"preferences": {"language": "हिन्दी", "difficulty": "Medium", "widgets": ["Planner", "Streak"]}},
    )
    assert preferences.status_code == 200
    assert client.get(API + "/features", headers=headers).json()["preferences"]["difficulty"] == "Medium"

    assert client.delete(API + "/captures/" + capture.json()["id"], headers=headers).status_code == 204
    assert client.get(API + "/captures", headers=headers).json() == []


def test_auto_plan_room_messages_and_shared_notes(authenticated):
    client, headers, _ = authenticated
    plan = client.post(API + "/planner/auto", headers=headers, json={"subjects": ["Anatomy", "Medicine"], "days": 3, "minutes": 25})
    assert plan.status_code == 201
    assert len(plan.json()) == 3

    message = client.post(API + "/study-rooms/anatomy-focus/messages", headers=headers, json={"content": "Starting a five-minute sprint."})
    assert message.status_code == 201
    assert client.get(API + "/study-rooms/anatomy-focus/messages", headers=headers).json()[0]["content"] == "Starting a five-minute sprint."

    note = client.post(API + "/shared-notes", headers=headers, json={"title": "Class summary", "content": "Add the brachial plexus branches here."})
    assert note.status_code == 201
    updated = client.put(API + "/shared-notes/" + note.json()["id"], headers=headers, json={"title": "Class summary", "content": "Roots, trunks, divisions, cords, branches."})
    assert updated.status_code == 200
    assert client.get(API + "/shared-notes", headers=headers).json()[0]["content"].startswith("Roots")
