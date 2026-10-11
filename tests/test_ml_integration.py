import json
import math
import os
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.ml.service import ml_service
from app.models.ml import MLInferenceLog
from app.models.student import Student
from app.services.policy_engine import PolicyEngineService
from tests.utils import make_jwt


@pytest.fixture
def valid_features_fixture():
    fixture_path = "docs/fixtures/demo_seed.json" if os.path.exists("docs/fixtures/demo_seed.json") else "SUTRA_Backend_Docs/fixtures/demo_seed.json"
    with open(fixture_path) as f:
        data = json.load(f)["ml_day30_test_vector"]
    return {
        "external_student_ref": data["student"],
        "cutoff_days": data["cutoff_days"],
        "features": dict(data["features"]),
        "expected_prob": data["expected_baseline_probability"],
        "expected_threshold": data["expected_threshold"],
        "expected_classification": data["expected_classification"],
    }


@pytest.mark.asyncio
async def test_ml_model_loads_and_predicts_valid_fixture(
    client: AsyncClient, seed_data, valid_features_fixture
):
    """
    Acceptance Criterion 1 & 4:
    Model loads and produces valid response using known valid fixture (SYN-1007).
    Evidence Card follows canonical response schema.
    """
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    response = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": valid_features_fixture["external_student_ref"],
            "cutoff_days": valid_features_fixture["cutoff_days"],
            "features": valid_features_fixture["features"],
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["external_student_ref"] == "SYN-1007"
    assert round(data["risk_probability"], 2) == valid_features_fixture["expected_prob"]
    assert data["threshold"] == valid_features_fixture["expected_threshold"]
    assert data["classification"] == valid_features_fixture["expected_classification"]

    card = data["evidence_card"]
    assert card["card_type"] == "ml_early_warning_evidence"
    assert card["model_name"] == "logistic_regression_baseline"
    assert card["model_version"] == "1.0.0"
    assert card["threshold"] == 0.46
    assert len(card["top_attributions"]) > 0
    assert len(card["limitations"]) >= 3


@pytest.mark.asyncio
async def test_ml_batch_prediction_endpoint(
    client: AsyncClient, seed_data, valid_features_fixture
):
    """Tests batch prediction endpoint (/api/v1/ml/predict/batch)."""
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    batch_payload = {
        "instances": [
            {
                "external_student_ref": "SYN-1007",
                "cutoff_days": 30,
                "features": valid_features_fixture["features"],
            },
            {
                "external_student_ref": "SYN-1008",
                "cutoff_days": 30,
                "features": valid_features_fixture["features"],
            },
        ]
    }

    response = await client.post(
        "/api/v1/ml/predict/batch",
        json=batch_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )

    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    assert results[0]["external_student_ref"] == "SYN-1007"
    assert results[1]["external_student_ref"] == "SYN-1008"


@pytest.mark.asyncio
async def test_feature_schema_validation_rejects_missing_and_nonfinite(
    client: AsyncClient, seed_data, valid_features_fixture
):
    """
    Acceptance Criterion 2:
    Validates the 25-feature schema; rejects missing or non-finite values with 422.
    """
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    # 1. Missing required feature
    incomplete_features = dict(valid_features_fixture["features"])
    del incomplete_features["vle_days_since_last_click"]

    res_missing = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": "SYN-1007",
            "cutoff_days": 30,
            "features": incomplete_features,
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert res_missing.status_code == 422

    # 2. Non-finite value (NaN or Inf) validation in Pydantic schema
    from pydantic import ValidationError
    from app.schemas.ml import MLPredictRequest

    bad_features_nan = dict(valid_features_fixture["features"])
    bad_features_nan["vle_total_clicks_d30"] = float("nan")

    with pytest.raises(ValidationError):
        MLPredictRequest(
            external_student_ref="SYN-1007",
            cutoff_days=30,
            features=bad_features_nan,
        )

    bad_features_inf = dict(valid_features_fixture["features"])
    bad_features_inf["vle_days_since_last_click"] = float("inf")

    with pytest.raises(ValidationError):
        MLPredictRequest(
            external_student_ref="SYN-1007",
            cutoff_days=30,
            features=bad_features_inf,
        )

    # Raw HTTP malformed non-numeric string for numeric feature
    bad_features_str = dict(valid_features_fixture["features"])
    bad_features_str["vle_total_clicks_d30"] = "not_a_number"
    res_str = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": "SYN-1007",
            "cutoff_days": 30,
            "features": bad_features_str,
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert res_str.status_code == 422

    # 3. Invalid cutoff_days != 30
    res_cutoff = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": "SYN-1007",
            "cutoff_days": 15,
            "features": valid_features_fixture["features"],
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert res_cutoff.status_code == 422


@pytest.mark.asyncio
async def test_anti_leakage_rejects_target_and_score_fields(
    client: AsyncClient, seed_data, valid_features_fixture
):
    """
    Acceptance Criterion 3:
    Target leakage (final_result, is_at_risk) and unverified scores (score, early_assessment_score)
    are strictly rejected.
    """
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    for leaked_key in ["final_result", "is_at_risk", "score", "early_assessment_score", "date_unregistration"]:
        leaked_features = dict(valid_features_fixture["features"])
        leaked_features[leaked_key] = 1

        res = await client.post(
            "/api/v1/ml/predict",
            json={
                "external_student_ref": "SYN-1007",
                "cutoff_days": 30,
                "features": leaked_features,
            },
            headers={
                "Authorization": f"Bearer {token}",
                "X-Campus-Id": str(campus_id),
            },
        )
        assert res.status_code == 422


@pytest.mark.asyncio
async def test_model_version_threshold_traceability_and_root_aliases(
    client: AsyncClient, seed_data, valid_features_fixture
):
    """
    Acceptance Criterion 5:
    Model version (1.0.0) and threshold (0.46) are traceable.
    Root compatibility aliases (/model-info, /predict, /predict/batch) function properly.
    """
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    # 1. API v1 route
    res_v1 = await client.get("/api/v1/ml/model-info", headers={"Authorization": f"Bearer {token}"})
    assert res_v1.status_code == 200
    v1_data = res_v1.json()
    assert v1_data["model_version"] == "1.0.0"
    assert v1_data["threshold"] == 0.46
    assert len(v1_data["features"]) == 25
    assert v1_data["candidate_model"]["status"] == "research_only"

    # 2. Root alias /model-info
    res_root = await client.get("/model-info")
    assert res_root.status_code == 200
    assert res_root.json()["threshold"] == 0.46

    # 3. Root alias /predict
    res_root_predict = await client.post(
        "/predict",
        json={
            "external_student_ref": "SYN-1007",
            "cutoff_days": 30,
            "features": valid_features_fixture["features"],
        },
    )
    assert res_root_predict.status_code == 200
    assert res_root_predict.json()["classification"] == "At_Risk"


@pytest.mark.asyncio
async def test_prediction_does_not_automatically_trigger_intervention(
    client: AsyncClient, seed_data, db_session: AsyncSession, valid_features_fixture
):
    """
    Acceptance Criterion 8:
    No ML prediction automatically approves an intervention, creates an assigned case,
    or triggers outreach.
    """
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    # Count cases before prediction
    from app.models.case import Case
    cases_before = (await db_session.execute(select(Case).where(Case.institution_id == campus_id))).scalars().all()

    response = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": "SYN-1007",
            "cutoff_days": 30,
            "features": valid_features_fixture["features"],
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert response.status_code == 200

    cases_after = (await db_session.execute(select(Case).where(Case.institution_id == campus_id))).scalars().all()
    assert len(cases_before) == len(cases_after)


@pytest.mark.asyncio
async def test_unauthorized_and_cross_campus_requests_rejected(
    client: AsyncClient, seed_data, valid_features_fixture
):
    """
    Acceptance Criterion 9:
    Rejects anonymous calls (401) and cross-campus calls (403).
    """
    campus_1 = seed_data["campus_1"].id
    campus_2 = seed_data["campus_2"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    # 1. Anonymous request (no token)
    res_anon = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": "SYN-1007",
            "cutoff_days": 30,
            "features": valid_features_fixture["features"],
        },
        headers={"X-Campus-Id": str(campus_1)},
    )
    assert res_anon.status_code == 401

    # 2. Cross-campus access attempt (user belongs to campus 1, attempts campus 2)
    res_cross = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": "SYN-1007",
            "cutoff_days": 30,
            "features": valid_features_fixture["features"],
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_2),
        },
    )
    assert res_cross.status_code == 403


@pytest.mark.asyncio
async def test_ml_unavailability_does_not_break_deterministic_workflow(
    db_session: AsyncSession, seed_data
):
    """
    Acceptance Criterion 7:
    When ML artifact is unavailable, deterministic policy evaluation continues smoothly.
    """
    campus_id = seed_data["campus_1"].id

    student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="SYN-ML-FALLBACK",
        display_name="Fallback Student",
    )
    db_session.add(student)
    await db_session.commit()

    # Save original status and temporarily simulate uncalibrated / missing model
    orig_status = ml_service._status
    orig_model = ml_service.model
    try:
        ml_service._status = "uncalibrated"
        ml_service.model = None

        # Policy evaluation should succeed without throwing error
        sig = await PolicyEngineService.evaluate_student(
            db=db_session,
            campus_id=campus_id,
            student_id=student.id,
        )
        assert sig is not None
        assert sig.result == "unknown"
        assert sig.explanation["ml_evidence_card"] is None
        assert sig.explanation["ml_applicability"] in ("insufficient_oulad_features", "ml_service_uncalibrated")
    finally:
        ml_service._status = orig_status
        ml_service.model = orig_model


@pytest.mark.asyncio
async def test_ml_artifact_unavailable_or_corrupt_returns_503(
    client: AsyncClient, seed_data, valid_features_fixture
):
    """
    Reliability Check:
    When model artifact is unavailable or corrupt, /api/v1/ml/predict returns 503.
    """
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    orig_status = ml_service._status
    orig_model = ml_service.model
    try:
        # 1. Unavailable
        ml_service._status = "uncalibrated"
        ml_service.model = None

        res_unavail = await client.post(
            "/api/v1/ml/predict",
            json={
                "external_student_ref": "SYN-1007",
                "cutoff_days": 30,
                "features": valid_features_fixture["features"],
            },
            headers={
                "Authorization": f"Bearer {token}",
                "X-Campus-Id": str(campus_id),
            },
        )
        assert res_unavail.status_code == 503
        assert res_unavail.json()["error"]["code"] == "MODEL_ARTIFACT_UNAVAILABLE"

        # 2. Corrupt
        ml_service._status = "corrupt"
        res_corrupt = await client.post(
            "/api/v1/ml/predict",
            json={
                "external_student_ref": "SYN-1007",
                "cutoff_days": 30,
                "features": valid_features_fixture["features"],
            },
            headers={
                "Authorization": f"Bearer {token}",
                "X-Campus-Id": str(campus_id),
            },
        )
        assert res_corrupt.status_code == 503
        assert res_corrupt.json()["error"]["code"] == "MODEL_ARTIFACT_CORRUPT"

    finally:
        ml_service._status = orig_status
        ml_service.model = orig_model


@pytest.mark.asyncio
async def test_ml_inference_audit_logging(
    client: AsyncClient, seed_data, db_session: AsyncSession, valid_features_fixture
):
    """
    Acceptance Criterion:
    Inference requests are audited into ml_inference_logs.
    """
    campus_id = seed_data["campus_1"].id
    user_id = seed_data["user_faculty_id"]
    token = make_jwt(user_id=user_id)

    res = await client.post(
        "/api/v1/ml/predict",
        json={
            "external_student_ref": "SYN-AUDIT-1007",
            "cutoff_days": 30,
            "features": valid_features_fixture["features"],
        },
        headers={
            "Authorization": f"Bearer {token}",
            "X-Campus-Id": str(campus_id),
        },
    )
    assert res.status_code == 200

    # Query ml_inference_logs table
    logs = (
        await db_session.execute(
            select(MLInferenceLog).where(
                MLInferenceLog.institution_id == campus_id,
                MLInferenceLog.external_student_ref == "SYN-AUDIT-1007",
            )
        )
    ).scalars().all()

    assert len(logs) >= 1
    log = logs[0]
    assert log.model_name == "logistic_regression_baseline"
    assert log.model_version == "1.0.0"
    assert round(log.risk_probability, 2) == 0.68
    assert log.threshold == 0.46
    assert log.classification == "At_Risk"
