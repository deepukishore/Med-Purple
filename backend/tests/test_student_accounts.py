from datetime import date

API = "/api/v1"


def test_registration_keeps_guest_data_and_student_details(authenticated):
    client, headers, guest = authenticated
    saved = client.post(f"{API}/saved", headers=headers, json={"kind": "note", "title": "My revision", "content": "Recall cardiac conduction", "subject": "Physiology"})
    assert saved.status_code == 201
    profile = {"name": " Asha Rao ", "year": "MBBS · Year 3", "college": " Example Medical College ", "university": "Example University", "graduation_year": 2029, "specialty": "Internal medicine", "location": "Bengaluru", "timezone": "Asia/Kolkata", "exam_name": "University finals", "exam_date": "2027-04-15", "daily_target": 15}
    response = client.post(f"{API}/auth/register", headers={**headers, "X-Client": "native"}, json={"name": " Asha Rao ", "email": "ASHA@example.com", "password": "a-long-test-password", "profile": profile})
    assert response.status_code == 201, response.text
    account = response.json()
    user = account["user"]
    assert user["id"] == guest["user"]["id"]
    assert user["is_guest"] is False
    assert user["name"] == "Asha Rao"
    assert user["college"] == "Example Medical College"
    assert user["graduation_year"] == 2029
    assert user["email"] == "asha@example.com"
    headers = {"Authorization": "Bearer " + account["access_token"]}
    assert client.get(f"{API}/notes", headers=headers).json()[0]["title"] == "My revision"
    assert client.get(f"{API}/profiles/{user['id']}").json()["xp"] == 20
    assert client.post(f"{API}/auth/login", json={"email": "asha@example.com", "password": "incorrect-password"}).status_code == 401
    login = client.post(f"{API}/auth/login", json={"email": "asha@example.com", "password": "a-long-test-password"}).json()
    assert login["user"]["specialty"] == "Internal medicine"
    assert login["user"]["university"] == "Example University"
    refresh = client.post(f"{API}/auth/refresh", json={"refresh_token": account["refresh_token"]})
    assert refresh.status_code == 200
    assert refresh.json()["user"]["college"] == "Example Medical College"
    # Older clients can still save the original fields without erasing new details.
    legacy = {key: profile[key] for key in ("name", "year", "location", "timezone", "exam_name", "exam_date", "daily_target")}
    legacy["daily_target"] = 20
    updated = client.patch(f"{API}/auth/me", headers=headers, json=legacy)
    assert updated.status_code == 200
    assert updated.json()["college"] == "Example Medical College"
    assert updated.json()["daily_target"] == 20
    assert client.patch(f"{API}/auth/me", headers=headers, json={**legacy, "graduation_year": 1800}).status_code == 422
    assert client.patch(f"{API}/auth/me", headers=headers, json={**legacy, "college": "x" * 161}).status_code == 422
    assert client.patch(f"{API}/auth/me", headers=headers, json={**legacy, "name": "   "}).status_code == 422
    cleared = client.patch(f"{API}/auth/me", headers=headers, json={**legacy, "graduation_year": None, "specialty": ""})
    assert cleared.json()["graduation_year"] is None
    assert cleared.json()["specialty"] == ""
    assert client.get(f"{API}/profiles/{user['id']}").json()["xp"] == 20


def test_registration_rejects_blank_name_and_keeps_legacy_contract(client):
    payload = {"name": "   ", "email": "student@example.com", "password": "a-long-test-password"}
    assert client.post(f"{API}/auth/register", json=payload).status_code == 422
    payload["name"] = "Student"
    response = client.post(f"{API}/auth/register", json=payload)
    assert response.status_code == 201
    assert response.json()["user"]["college"] == ""
    assert response.json()["user"]["graduation_year"] is None
    assert client.post(f"{API}/auth/register", json=payload).status_code == 409
