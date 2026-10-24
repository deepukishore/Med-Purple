API = "/api/v1"


def test_exam_and_clinical_workspace_state_round_trip(authenticated):
    client, headers, _ = authenticated
    initial = client.get(API + "/features", headers=headers)
    assert initial.status_code == 200
    assert initial.json()["exam_track"] == "NEET PG"

    saved = client.patch(
        API + "/features",
        headers=headers,
        json={
            "exam_track": "USMLE",
            "mistake_notes": {"renal-physiology": "I confused clearance with filtration."},
            "clinical_logs": [
                {"caseName": "Acute asthma", "type": "Case seen", "note": "Practised respiratory examination."}
            ],
            "clinical_state": {"image_done": True, "diagnosis": "Stable angina"},
            "community": {"joined_room": "Anatomy focus room", "followed_people": ["Aarav"]},
            "followed_creators": ["Dr Meera Rao"],
        },
    )
    assert saved.status_code == 200, saved.text

    restored = client.get(API + "/features", headers=headers).json()
    assert restored["exam_track"] == "USMLE"
    assert restored["mistake_notes"]["renal-physiology"]
    assert restored["clinical_logs"][0]["caseName"] == "Acute asthma"
    assert restored["clinical_state"]["image_done"] is True
    assert restored["community"]["joined_room"] == "Anatomy focus room"
    assert restored["followed_creators"] == ["Dr Meera Rao"]


def test_medbyte_save_for_later_and_doubt_answer_upvote(authenticated):
    client, headers, _ = authenticated
    saved = client.post(
        API + "/medbytes/conduction/save",
        headers=headers,
        json={"kind": "later"},
    )
    assert saved.status_code == 200
    page = client.get(API + "/medbytes", headers=headers).json()
    assert next(item for item in page["items"] if item["id"] == "conduction")["saved_later"] is True
    assert client.delete(API + "/medbytes/conduction/save?kind=later", headers=headers).status_code == 204

    doubt = client.post(
        API + "/doubts",
        headers=headers,
        json={"title": "A clinical doubt", "subject": "Medicine", "content": "How should I approach this case?"},
    ).json()
    answer = client.post(
        API + f"/doubts/{doubt['id']}/replies",
        headers=headers,
        json={"content": "Start with a structured history and examination."},
    ).json()
    upvoted = client.put(
        API + f"/doubts/replies/{answer['id']}/upvote",
        headers=headers,
        json={"liked": True},
    )
    assert upvoted.status_code == 200
    detail = client.get(API + f"/doubts/{doubt['id']}", headers=headers).json()
    assert detail["messages"][0]["upvotes"] == 1
