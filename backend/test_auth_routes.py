import uuid

from fastapi.testclient import TestClient

import api


def test_citizen_registration_and_me_endpoint():
    client = TestClient(api.app)
    email = f"test-citizen-{uuid.uuid4().hex[:8]}@example.com"

    register_resp = client.post(
        "/api/auth/register",
        json={
            "full_name": "Test Citizen",
            "email": email,
            "password": "secret123",
            "village_id": 1,
            "location_lat": 10.0,
            "location_lng": 76.0,
        },
    )

    assert register_resp.status_code == 200, register_resp.text
    register_data = register_resp.json()
    assert register_data["user"]["email"] == email
    assert register_data["access_token"]

    login_resp = client.post(
        "/api/auth/login",
        data={"username": email, "password": "secret123"},
    )
    assert login_resp.status_code == 200, login_resp.text
    token = login_resp.json()["access_token"]

    me_resp = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200, me_resp.text
    assert me_resp.json()["email"] == email
