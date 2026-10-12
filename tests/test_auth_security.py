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


# ==============================================================================
# Phase 7 & Multi-Algorithm ES256 Verification Tests
# ==============================================================================

from app.core.config import settings
from tests.utils import generate_test_ec_key_pair, make_es256_jwt


@pytest.mark.asyncio
async def test_auth_me_valid_es256_token(client: AsyncClient, seed_data, monkeypatch):
    """Verifies that an authentic asymmetric ES256 token (Supabase Auth format) is accepted."""
    priv_key, pub_pem = generate_test_ec_key_pair()
    monkeypatch.setattr(settings, "SUPABASE_JWT_PUBLIC_KEY", pub_pem)

    user_id = seed_data["user_faculty_id"]
    token = make_es256_jwt(
        user_id=user_id,
        private_key=priv_key,
        email="faculty@sutra.edu",
        audience="authenticated",
    )

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == str(user_id)
    assert len(data["memberships"]) >= 1


@pytest.mark.asyncio
async def test_auth_me_expired_es256_token(client: AsyncClient, monkeypatch):
    """Verifies that an expired ES256 token is rejected with TOKEN_EXPIRED."""
    priv_key, pub_pem = generate_test_ec_key_pair()
    monkeypatch.setattr(settings, "SUPABASE_JWT_PUBLIC_KEY", pub_pem)

    token = make_es256_jwt(
        user_id=uuid.uuid4(),
        private_key=priv_key,
        expired=True,
    )
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_auth_me_invalid_es256_signature(client: AsyncClient, monkeypatch):
    """Verifies that an ES256 token signed by an unknown/untrusted private key is rejected."""
    priv_key_1, pub_pem_1 = generate_test_ec_key_pair()
    priv_key_2, _ = generate_test_ec_key_pair()
    monkeypatch.setattr(settings, "SUPABASE_JWT_PUBLIC_KEY", pub_pem_1)

    # Sign with private key 2, but verifier only trusts public key 1
    token = make_es256_jwt(
        user_id=uuid.uuid4(),
        private_key=priv_key_2,
    )
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_auth_unsupported_algorithm_rejected(client: AsyncClient):
    """Verifies that tokens using disallowed or unsigned algorithms ('none', 'fake_alg') are rejected."""
    import jwt
    now = uuid.uuid4()
    payload = {"sub": str(now), "aud": "authenticated"}

    # 1. Unsigned 'none' algorithm token
    none_token = jwt.encode(payload, key="", algorithm="none")
    res1 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {none_token}"})
    assert res1.status_code == 401
    assert "alg" in res1.text.lower() or res1.json()["error"]["code"] in ("UNSUPPORTED_ALGORITHM", "INVALID_CREDENTIALS")

    # 2. Arbitrary unsupported algorithm
    import base64, json
    h = base64.urlsafe_b64encode(json.dumps({"alg": "fake_alg", "typ": "JWT"}).encode()).decode().rstrip("=")
    p = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    fake_token = f"{h}.{p}.invalidsignature"
    res2 = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {fake_token}"})
    assert res2.status_code == 401
    assert "alg" in res2.text.lower() or res2.json()["error"]["code"] in ("UNSUPPORTED_ALGORITHM", "INVALID_CREDENTIALS")


@pytest.mark.asyncio
async def test_auth_invalid_audience_rejected(client: AsyncClient):
    """Verifies that tokens issued for an incorrect audience are rejected."""
    token = make_jwt(user_id=uuid.uuid4(), audience="attacker_service")
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_auth_invalid_issuer_rejected(client: AsyncClient, monkeypatch):
    """Verifies that asymmetric tokens with an untrusted issuer are rejected."""
    priv_key, pub_pem = generate_test_ec_key_pair()
    monkeypatch.setattr(settings, "SUPABASE_JWT_PUBLIC_KEY", pub_pem)
    monkeypatch.setattr(settings, "SUPABASE_JWT_ISSUER", "https://trusted-project.supabase.co/auth/v1")

    # Token forged with untrusted issuer
    token = make_es256_jwt(
        user_id=uuid.uuid4(),
        private_key=priv_key,
        issuer="https://evil-untrusted-server.com/auth/v1",
    )
    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_student_my_cases_endpoint_retrieval(client: AsyncClient, seed_data, monkeypatch):
    """Verifies that an authenticated user can retrieve real cases via GET /api/v1/cases/my-cases."""
    priv_key, pub_pem = generate_test_ec_key_pair()
    monkeypatch.setattr(settings, "SUPABASE_JWT_PUBLIC_KEY", pub_pem)

    user_id = seed_data["user_faculty_id"]
    token = make_es256_jwt(user_id=user_id, private_key=priv_key)

    response = await client.get("/api/v1/cases/my-cases", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
