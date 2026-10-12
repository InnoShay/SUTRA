import json
import os
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.institution import InstitutionMembership
from app.models.ml import MLInferenceLog
from tests.utils import make_jwt


@pytest.fixture
def valid_features():
    fixture_path = (
        "docs/fixtures/demo_seed.json"
        if os.path.exists("docs/fixtures/demo_seed.json")
        else "SUTRA_Backend_Docs/fixtures/demo_seed.json"
    )
    with open(fixture_path) as f:
        data = json.load(f)["ml_day30_test_vector"]
    return {
        "external_student_ref": data["student"],
        "cutoff_days": data["cutoff_days"],
        "features": dict(data["features"]),
    }


@pytest.mark.asyncio
async def test_root_predict_rejects_missing_credentials(client: AsyncClient, valid_features):
    """Regression Test 1: Anonymous / unauthenticated calls are rejected with 401."""
    # Single prediction
    res_single = await client.post("/predict", json=valid_features)
    assert res_single.status_code == 401

    # Batch prediction
    res_batch = await client.post("/predict/batch", json={"instances": [valid_features]})
    assert res_batch.status_code == 401

    # Model info
    res_info = await client.get("/model-info")
    assert res_info.status_code == 401


@pytest.mark.asyncio
async def test_root_predict_rejects_expired_and_invalid_jwts(
    client: AsyncClient, seed_data, valid_features
):
    """Regression Test 2: Expired and signature-tampered JWTs are rejected with 401."""
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]

    # Expired token
    expired_token = make_jwt(user_id=user_id, expired=True)
    res_exp = await client.post(
        "/predict",
        json=valid_features,
        headers={"Authorization": f"Bearer {expired_token}", "X-Campus-Id": str(campus_id)},
    )
    assert res_exp.status_code == 401

    # Malformed / tampered token
    res_bad = await client.post(
        "/predict",
        json=valid_features,
        headers={"Authorization": "Bearer not.a.valid.jwt.signature", "X-Campus-Id": str(campus_id)},
    )
    assert res_bad.status_code == 401


@pytest.mark.asyncio
async def test_root_predict_rejects_inactive_membership(
    client: AsyncClient, seed_data, valid_features
):
    """Regression Test 3: Inactive campus membership is rejected with 403."""
    campus_id = seed_data["campus_1"].id
    inactive_user_id = seed_data["user_inactive_id"]
    token = make_jwt(user_id=inactive_user_id)

    res = await client.post(
        "/predict",
        json=valid_features,
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_root_predict_rejects_cross_campus_unauthorized_access(
    client: AsyncClient, seed_data, valid_features
):
    """Regression Test 4: User accessing a campus they do not belong to is rejected with 403."""
    campus_1_id = seed_data["campus_1"].id
    # User 3 only belongs to campus 2
    user_campus2_id = seed_data["user_campus2_id"]
    token = make_jwt(user_id=user_campus2_id)

    res = await client.post(
        "/predict",
        json=valid_features,
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_1_id)},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_root_predict_rejects_disallowed_role(
    client: AsyncClient, seed_data, db_session: AsyncSession, valid_features
):
    """Regression Test 5: Role not in ('faculty', 'hod', 'mentor', 'institution_admin') is rejected with 403."""
    campus_id = seed_data["campus_1"].id
    student_user_id = uuid.uuid4()

    # Seed a user with disallowed role 'student'
    m_student = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=student_user_id,
        role="student",
        is_active=True,
    )
    db_session.add(m_student)
    await db_session.commit()

    token = make_jwt(user_id=student_user_id)
    res = await client.post(
        "/predict",
        json=valid_features,
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)},
    )
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_root_predict_rejects_missing_or_invalid_campus_header(
    client: AsyncClient, seed_data, valid_features
):
    """Regression Test 6: Missing or malformed X-Campus-Id header is rejected cleanly."""
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    # Missing X-Campus-Id header
    res_missing = await client.post(
        "/predict",
        json=valid_features,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res_missing.status_code in (400, 422)

    # Malformed UUID in X-Campus-Id header
    res_malformed = await client.post(
        "/predict",
        json=valid_features,
        headers={"Authorization": f"Bearer {token}", "X-Campus-Id": "not-a-uuid"},
    )
    assert res_malformed.status_code in (400, 422)


@pytest.mark.asyncio
async def test_root_predict_rejects_leakage_and_invalid_schema(
    client: AsyncClient, seed_data, valid_features
):
    """Regression Test 7: Target leakage and invalid feature schemas are rejected with 422."""
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)}

    # Target leakage feature 'final_result'
    leaked = dict(valid_features)
    leaked["features"] = dict(valid_features["features"])
    leaked["features"]["final_result"] = "Pass"

    res_leak = await client.post("/predict", json=leaked, headers=headers)
    assert res_leak.status_code == 422

    # Non-30 cutoff days
    bad_cutoff = dict(valid_features)
    bad_cutoff["cutoff_days"] = 45
    res_cutoff = await client.post("/predict", json=bad_cutoff, headers=headers)
    assert res_cutoff.status_code == 422

    # Missing required feature
    missing_feat = dict(valid_features)
    missing_feat["features"] = dict(valid_features["features"])
    del missing_feat["features"]["vle_total_clicks_d30"]
    res_miss = await client.post("/predict", json=missing_feat, headers=headers)
    assert res_miss.status_code == 422


@pytest.mark.asyncio
async def test_root_predict_successful_execution_and_audit_logging(
    client: AsyncClient, seed_data, db_session: AsyncSession, valid_features
):
    """Regression Test 8: Authorized root prediction succeeds and persists audit log in ml_inference_logs."""
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)}

    payload = dict(valid_features)
    payload["external_student_ref"] = "SYN-ROOT-AUDIT-001"

    res = await client.post("/predict", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["external_student_ref"] == "SYN-ROOT-AUDIT-001"
    assert round(data["risk_probability"], 2) == 0.68
    assert data["threshold"] == 0.46
    assert data["classification"] == "At_Risk"

    # Verify audit log in PostgreSQL / SQLite
    logs = (
        await db_session.execute(
            select(MLInferenceLog).where(
                MLInferenceLog.institution_id == campus_id,
                MLInferenceLog.external_student_ref == "SYN-ROOT-AUDIT-001",
            )
        )
    ).scalars().all()

    assert len(logs) >= 1
    log = logs[0]
    assert log.model_name == "logistic_regression_baseline"
    assert log.model_version == "1.0.0"
    assert round(log.risk_probability, 2) == 0.68
    assert log.threshold == 0.46
    assert log.latency_ms is not None
    assert log.latency_ms > 0


@pytest.mark.asyncio
async def test_root_predict_and_canonical_predict_parity(
    client: AsyncClient, seed_data, valid_features
):
    """Regression Test 9: Parity between /api/v1/ml/predict and /predict for identical input."""
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)}

    # Call canonical route
    res_canonical = await client.post("/api/v1/ml/predict", json=valid_features, headers=headers)
    assert res_canonical.status_code == 200

    # Call root compatibility route
    res_root = await client.post("/predict", json=valid_features, headers=headers)
    assert res_root.status_code == 200

    canonical_data = res_canonical.json()
    root_data = res_root.json()

    assert canonical_data["risk_probability"] == root_data["risk_probability"]
    assert canonical_data["threshold"] == root_data["threshold"]
    assert canonical_data["classification"] == root_data["classification"]
    assert canonical_data["evidence_card"]["model_name"] == root_data["evidence_card"]["model_name"]
    assert canonical_data["evidence_card"]["model_version"] == root_data["evidence_card"]["model_version"]
    assert (
        canonical_data["evidence_card"]["top_attributions"]
        == root_data["evidence_card"]["top_attributions"]
    )


@pytest.mark.asyncio
async def test_root_predict_batch_security_and_execution(
    client: AsyncClient, seed_data, valid_features
):
    """Regression Test 10: /predict/batch enforces role authorization and campus scoping."""
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    # 1. Anonymous rejected with 401
    res_unauth = await client.post("/predict/batch", json={"instances": [valid_features]})
    assert res_unauth.status_code == 401

    # 2. Authorized succeeds
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(campus_id)}
    res_auth = await client.post(
        "/predict/batch",
        json={"instances": [valid_features, valid_features]},
        headers=headers,
    )
    assert res_auth.status_code == 200
    assert len(res_auth.json()) == 2
