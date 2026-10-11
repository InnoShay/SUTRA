import uuid
import pytest
from httpx import AsyncClient

from tests.utils import make_jwt


@pytest.mark.asyncio
async def test_auth_me_missing_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"


@pytest.mark.asyncio
async def test_auth_me_expired_token(client: AsyncClient):
    token = make_jwt(user_id=uuid.uuid4(), expired=True)
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_auth_me_invalid_secret(client: AsyncClient):
    token = make_jwt(user_id=uuid.uuid4(), secret="wrong-secret-key-that-fails-verification")
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_auth_me_valid_user(client: AsyncClient, seed_data):
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert len(data["memberships"]) == 1
    assert data["memberships"][0]["institution_id"] == str(seed_data["campus_1"].id)
    assert "faculty" in data["memberships"][0]["roles"]
    assert data["memberships"][0]["is_active"] is True


@pytest.mark.asyncio
async def test_active_campuses_endpoint(client: AsyncClient, seed_data):
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)
    response = await client.get("/api/v1/campuses/active", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    campuses = response.json()
    assert len(campuses) == 1
    assert campuses[0]["id"] == str(seed_data["campus_1"].id)
    assert "faculty" in campuses[0]["roles"]


@pytest.mark.asyncio
async def test_campus_access_missing_header(client: AsyncClient, seed_data):
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)
    campus_1_id = seed_data["campus_1"].id
    response = await client.get(
        f"/api/v1/campuses/{campus_1_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
    assert "X-Campus-Id" in response.text


@pytest.mark.asyncio
async def test_campus_access_allowed(client: AsyncClient, seed_data):
    user_id = seed_data["user_faculty_id"]
    campus_1_id = seed_data["campus_1"].id
    token = make_jwt(user_id=user_id)
    response = await client.get(
        f"/api/v1/campuses/{campus_1_id}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_1_id),
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(campus_1_id)
    assert "faculty" in data["roles"]


@pytest.mark.asyncio
async def test_campus_access_denied_inactive_membership(client: AsyncClient, seed_data):
    user_id = seed_data["user_inactive_id"]
    campus_1_id = seed_data["campus_1"].id
    token = make_jwt(user_id=user_id)
    response = await client.get(
        f"/api/v1/campuses/{campus_1_id}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_1_id),
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "INACTIVE_MEMBERSHIP"


@pytest.mark.asyncio
async def test_campus_isolation_denied_cross_campus(client: AsyncClient, seed_data):
    # User 3 belongs only to Campus 2, attempting to access Campus 1
    user_id = seed_data["user_campus2_id"]
    campus_1_id = seed_data["campus_1"].id
    token = make_jwt(user_id=user_id)
    response = await client.get(
        f"/api/v1/campuses/{campus_1_id}",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_1_id),
        },
    )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "CAMPUS_MEMBERSHIP_NOT_FOUND"


@pytest.mark.asyncio
async def test_ml_model_info_endpoint(client: AsyncClient, seed_data):
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)
    response = await client.get("/api/v1/ml/model-info", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("uncalibrated", "ready")
    assert data["decision_threshold"] == 0.46
    assert data["cutoff_days"] == 30
