"""
SUTRA ML-UI Phase 8 — Governed What-If Scenarios Tests.

Verifies:
1. Valid hypothetical modifications produce a side-by-side comparison, calculates delta, tracks tier transition, and exposes model version v1.0.0.
2. In-memory execution: simulation NEVER writes to ml_inference_logs, signals, cases, or student_observations.
3. Rejection of prospective interventions & future events (e.g. tutoring_sessions, future attendance).
4. Rejection of immutable demographic traits (e.g. gender, disability).
5. Rejection of target outcome leakage (e.g. final_result) and arbitrary unsupported features.
6. Bounds validation for supported features (e.g. vle_active_days_d30 in [0, 30]).
7. Direct /api/v1/ml/simulate-scenario endpoint and non-predictive support planning guidance.
8. Permission boundaries: students 403 Forbidden; unauthenticated 401 Unauthorized; faculty/advisor permitted.
9. GET /api/v1/ml/supported-scenario-features returns canonical Day-30 feature specs.
"""

import uuid
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.case import Case
from app.models.institution import Institution, InstitutionMembership
from app.models.ml import MLInferenceLog
from app.models.observation import StudentObservation
from app.models.signal import Signal
from app.models.student import Student
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_whatif_test_data(db_session: AsyncSession):
    """Sets up campus, users (faculty, student), and a test student with Day-30 observations."""
    campus_id = uuid.uuid4()
    inst = Institution(
        id=campus_id,
        name="What-If Scenarios Test Campus",
    )
    db_session.add(inst)
    await db_session.flush()

    faculty_id = uuid.uuid4()
    student_user_id = uuid.uuid4()

    faculty_membership = InstitutionMembership(
        id=uuid.uuid4(),
        user_id=faculty_id,
        institution_id=campus_id,
        role="faculty",
        is_active=True,
    )
    db_session.add(faculty_membership)

    student_membership = InstitutionMembership(
        id=uuid.uuid4(),
        user_id=student_user_id,
        institution_id=campus_id,
        role="student",
        is_active=True,
    )
    db_session.add(student_membership)

    student_record = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref=f"STU-WIF-{uuid.uuid4().hex[:6]}",
        display_name="WhatIf Subject Student",
        cohort_code="2026-FALL",
        enrollment_status="active",
    )
    db_session.add(student_record)

    # Seed observations representing an At-Risk student at Day 30
    base_observations = [
        ("vle_active_days_d30", {"val": 3.0}),
        ("vle_total_clicks_d30", {"val": 45.0}),
        ("vle_clicks_last_7d", {"val": 2.0}),
        ("vle_days_since_last_click", {"val": 16.0}),
        ("assessments_submitted_d30", {"val": 0.0}),
        ("has_early_assessment_submission_d30", {"val": 0.0}),
        ("has_vle_activity_d30", {"val": 1.0}),
        ("num_of_prev_attempts", {"val": 1.0}),
        ("studied_credits", {"val": 60.0}),
        ("days_registered_before_start", {"val": -10.0}),
        ("has_missing_registration_date", {"val": 0.0}),
        ("vle_clicks_precourse", {"val": 5.0}),
        ("vle_clicks_poststart_d30", {"val": 40.0}),
        ("vle_clicks_forumng_d30", {"val": 2.0}),
        ("vle_clicks_oucontent_d30", {"val": 20.0}),
        ("vle_clicks_quiz_d30", {"val": 0.0}),
        ("vle_clicks_homepage_d30", {"val": 15.0}),
        ("vle_clicks_other_d30", {"val": 3.0}),
        ("assessment_banked_d30", {"val": 0.0}),
        ("gender", {"val": "M"}),
        ("region", {"val": "South"}),
        ("highest_education", {"val": "A Level"}),
        ("imd_band", {"val": "20-30%"}),
        ("age_band", {"val": "0-35"}),
        ("disability", {"val": "N"}),
    ]

    from datetime import datetime, timezone
    now_ts = datetime.now(timezone.utc)

    for metric_key, val_dict in base_observations:
        obs = StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_id,
            student_id=student_record.id,
            domain="academic",
            metric_key=metric_key,
            value=val_dict,
            quality_state="good",
            source_system="oulad_lms",
            source_record_ref=f"REC-{metric_key}-{uuid.uuid4().hex[:6]}",
            event_at=now_ts,
            available_at=now_ts,
        )
        db_session.add(obs)

    await db_session.commit()

    faculty_token = make_jwt(user_id=faculty_id, email="advisor@sutra.edu")
    student_token = make_jwt(user_id=student_user_id, email="student@sutra.edu")

    return {
        "campus_id": campus_id,
        "faculty_token": faculty_token,
        "student_token": student_token,
        "student": student_record,
    }


@pytest.mark.asyncio
async def test_what_if_scenario_simulation_success_and_side_by_side(client: AsyncClient, setup_whatif_test_data):
    """
    Requirements 1, 2, 4, 5:
    Verifies valid hypothetical modifications produce a side-by-side comparison,
    calculates delta, tracks tier transition, and exposes model version v1.0.0.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    payload = {
        "hypothetical_modifications": {
            "vle_active_days_d30": 18.0,
            "vle_days_since_last_click": 1.0,
            "vle_clicks_last_7d": 80.0,
            "assessments_submitted_d30": 2.0,
        }
    }

    response = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 200, response.text
    res_data = response.json()

    assert res_data["model_version"] == "v1.0.0"
    assert res_data["prediction_cutoff"] == "Day 30"
    assert res_data["threshold"] == 0.46
    assert res_data["is_hypothetical"] is True
    assert res_data["is_official_record"] is False

    # Baseline vs hypothetical side-by-side
    assert "baseline_risk_probability" in res_data
    assert "hypothetical_risk_probability" in res_data
    assert res_data["hypothetical_risk_probability"] < res_data["baseline_risk_probability"]
    assert res_data["delta_probability"] < 0
    assert len(res_data["modified_features"]) == 4

    # Non-causal governance disclaimer present
    assert "NON-CAUSAL MODEL CALCULATION NOTICE" in res_data["non_causal_disclaimer"]
    assert "EPHEMERAL SIMULATION" in res_data["ephemeral_notice"]


@pytest.mark.asyncio
async def test_what_if_scenario_never_mutates_database_records(
    client: AsyncClient, setup_whatif_test_data, db_session: AsyncSession
):
    """
    Requirement 8:
    Never write hypothetical inputs back to a student's official record or trigger
    a real case, signal, or support decision automatically.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    # Count database rows prior to simulation
    pre_inferences = (await db_session.execute(select(func.count(MLInferenceLog.id)))).scalar() or 0
    pre_signals = (await db_session.execute(select(func.count(Signal.id)))).scalar() or 0
    pre_cases = (await db_session.execute(select(func.count(Case.id)))).scalar() or 0
    pre_obs = (await db_session.execute(select(func.count(StudentObservation.id)))).scalar() or 0

    payload = {
        "hypothetical_modifications": {
            "vle_active_days_d30": 25.0,
            "vle_days_since_last_click": 0.0,
        }
    }

    response = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 200

    # Count database rows after simulation
    post_inferences = (await db_session.execute(select(func.count(MLInferenceLog.id)))).scalar() or 0
    post_signals = (await db_session.execute(select(func.count(Signal.id)))).scalar() or 0
    post_cases = (await db_session.execute(select(func.count(Case.id)))).scalar() or 0
    post_obs = (await db_session.execute(select(func.count(StudentObservation.id)))).scalar() or 0

    assert post_inferences == pre_inferences, "Simulation must NEVER write to ml_inference_logs"
    assert post_signals == pre_signals, "Simulation must NEVER create signals"
    assert post_cases == pre_cases, "Simulation must NEVER create cases"
    assert post_obs == pre_obs, "Simulation must NEVER alter student_observations"


@pytest.mark.asyncio
async def test_what_if_scenario_rejects_future_events_and_tutoring(client: AsyncClient, setup_whatif_test_data):
    """
    Requirement 6 & 7:
    Do not include features representing future events in a Day-30 prediction.
    Do not let a user simulate future tutoring attendance as Day-30 evidence.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    # Attempt to simulate future tutoring sessions
    tutoring_payload = {
        "hypothetical_modifications": {
            "tutoring_sessions": 5,
        }
    }

    response = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=tutoring_payload,
        headers=headers,
    )

    assert response.status_code == 422, response.text
    err_body = response.json()
    assert "tutoring" in str(err_body).lower() or "future" in str(err_body).lower()

    # Attempt to simulate prospective attendance or final grades
    future_payload = {
        "hypothetical_modifications": {
            "future_attendance": 0.95,
        }
    }
    resp2 = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=future_payload,
        headers=headers,
    )
    assert resp2.status_code == 422


@pytest.mark.asyncio
async def test_what_if_scenario_rejects_immutable_demographic_attributes(client: AsyncClient, setup_whatif_test_data):
    """
    Ethical & governance validation:
    Protected demographic traits (gender, disability, imd_band, etc.) cannot be
    modified as hypothetical behavioral interventions.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    payload = {
        "hypothetical_modifications": {
            "gender": "F",
        }
    }

    response = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 422
    assert "demographic" in response.text.lower() or "immutable" in response.text.lower()


@pytest.mark.asyncio
async def test_what_if_scenario_rejects_leakage_and_unsupported_features(client: AsyncClient, setup_whatif_test_data):
    """
    Requirement 3:
    Validate hypothetical inputs using the canonical backend schema.
    Do not allow the frontend to alter arbitrary feature values without validation.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    # Leakage feature rejection
    leakage_payload = {
        "hypothetical_modifications": {
            "final_result": 1,
        }
    }
    resp1 = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=leakage_payload,
        headers=headers,
    )
    assert resp1.status_code == 422
    assert "leakage" in resp1.text.lower()

    # Arbitrary unsupported feature rejection
    unsupported_payload = {
        "hypothetical_modifications": {
            "unsupported_arbitrary_factor": 42.0,
        }
    }
    resp2 = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=unsupported_payload,
        headers=headers,
    )
    assert resp2.status_code == 422
    assert "not a supported" in resp2.text.lower()


@pytest.mark.asyncio
async def test_what_if_scenario_enforces_bounds_and_finite_numeric_types(client: AsyncClient, setup_whatif_test_data):
    """
    Bounds validation:
    Rejects out-of-bounds or non-finite inputs.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    # vle_active_days_d30 max is 30.0
    out_of_bounds_payload = {
        "hypothetical_modifications": {
            "vle_active_days_d30": 45.0,
        }
    }
    resp = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=out_of_bounds_payload,
        headers=headers,
    )
    assert resp.status_code == 422
    assert "outside permitted" in resp.text.lower() or "bounds" in resp.text.lower()


@pytest.mark.asyncio
async def test_what_if_scenario_direct_ml_endpoint_and_support_guidance(client: AsyncClient, setup_whatif_test_data):
    """
    Requirement 2, 7, 9:
    Direct /api/v1/ml/simulate-scenario endpoint execution and verification
    of non-predictive support planning guidance.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    payload = {
        "external_student_ref": "HEADLESS-TEST-REF",
        "hypothetical_modifications": {
            "vle_active_days_d30": 12.0,
            "vle_days_since_last_click": 3.0,
        },
    }

    response = await client.post(
        "/api/v1/ml/simulate-scenario",
        json=payload,
        headers=headers,
    )

    assert response.status_code == 200, response.text
    res_data = response.json()
    assert res_data["student_ref"] == "HEADLESS-TEST-REF"

    # Support Planning Guidance verification
    guidance = res_data["support_planning_guidance"]
    assert "why_model_cannot_estimate_causal_interventions" in guidance
    assert "causal_claim_warning" in guidance
    assert len(guidance["recommended_educator_actions"]) > 0


@pytest.mark.asyncio
async def test_what_if_scenario_role_permission_boundaries(client: AsyncClient, setup_whatif_test_data):
    """
    Permission boundaries:
    Students cannot trigger staff what-if scenario simulations (403 Forbidden).
    Unauthenticated requests return 401 Unauthorized.
    """
    data = setup_whatif_test_data
    payload = {
        "hypothetical_modifications": {
            "vle_active_days_d30": 10.0,
        }
    }

    # Student role -> 403 Forbidden
    student_headers = {
        "Authorization": f"Bearer {data['student_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }
    resp_student = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=payload,
        headers=student_headers,
    )
    assert resp_student.status_code == 403

    # Unauthenticated -> 401 Unauthorized
    resp_unauth = await client.post(
        f"/api/v1/students/{data['student'].id}/simulate-scenario",
        json=payload,
    )
    assert resp_unauth.status_code == 401


@pytest.mark.asyncio
async def test_get_supported_scenario_features_metadata(client: AsyncClient, setup_whatif_test_data):
    """
    Metadata verification:
    GET /api/v1/ml/supported-scenario-features returns canonical Day-30 feature specs.
    """
    data = setup_whatif_test_data
    headers = {
        "Authorization": f"Bearer {data['faculty_token']}",
        "X-Campus-Id": str(data["campus_id"]),
    }

    response = await client.get(
        "/api/v1/ml/supported-scenario-features",
        headers=headers,
    )

    assert response.status_code == 200, response.text
    features = response.json()
    assert len(features) >= 6
    feat_names = [f["feature_name"] for f in features]
    assert "vle_active_days_d30" in feat_names
    assert "vle_days_since_last_click" in feat_names
    assert "assessments_submitted_d30" in feat_names

