def test_planner_lifecycle(authenticated):
    client, headers, _ = authenticated
    path = "/api/v1/planner"
    payload = dict(title="Revise nerves", subject="Anatomy", day="2026-10-09", time="09:00", minutes=30)
    assert client.get(path, headers=headers).json() == []
    response = client.post(path, headers=headers, json=payload)
    assert response.status_code == 201, response.text
    block = response.json()
    assert block["done"] is False
    assert client.get(path, headers=headers).json() == [block]
    block.update(day="2026-10-12", time="14:30", done=True)
    response = client.put(f"{path}/{block['id']}", headers=headers, json=block)
    assert response.status_code == 200, response.text
    assert response.json() == block
    assert client.get(path, headers=headers).json() == [block]
    assert client.delete(f"{path}/{block['id']}", headers=headers).status_code == 204
    assert client.get(path, headers=headers).json() == []


def test_planner_ownership_and_validation(authenticated):
    client, headers, _ = authenticated
    path = "/api/v1/planner"
    payload = dict(title="Revision", subject="Anatomy", day="2026-10-09", time="09:00", minutes=30)
    block = client.post(path, headers=headers, json=payload).json()
    other = client.post("/api/v1/auth/guest", headers={"X-Client": "native"}).json()
    other_headers = {"Authorization": "Bearer " + other["access_token"]}
    assert client.get(path, headers=other_headers).json() == []
    assert client.put(f"{path}/{block['id']}", headers=other_headers, json=payload).status_code == 404
    assert client.delete(f"{path}/{block['id']}", headers=other_headers).status_code == 404
    for invalid in [dict(minutes=0), dict(time="25:00"), dict(day="invalid"), dict(title="")]:
        assert client.post(path, headers=headers, json={**payload, **invalid}).status_code == 422
