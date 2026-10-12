"""
Integration tests for ML-UI Phase 2: Live Inference Reliability.
Tests:
1. Live student scoring success for SYN-1007 (Day-30 features present).
2. Feature incompleteness / validation failure (HTTP 422) for students lacking full 25 features.
3. Unauthenticated access rejection (HTTP 401).
4. Leadership individual telemetry access denial (HTTP 403 per ADR-004).
5. Tenancy isolation enforcement (HTTP 404 for student outside active campus).
6. Anti-leakage rejection (HTTP 422 for target or post-cutoff scores).
7. Verification of dynamic decision threshold (0.46) via /api/v1/ml/model-info.
"""

import uuid
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select

from app.models.institution import Institution, InstitutionMembership
from app.models.ml import MLInferenceLog
from app.models.observation import StudentObservation
from app.models.student import Student
from app.schemas.ml import DAY30_REQUIRED_FEATURES
from tests.utils import make_jwt


@pytest_asyncio.fixture
async def setup_live_inference_env(db_session):
    """Sets up campus, memberships, students, and observations."""
    campus_a_id = uuid.uuid4()
    campus_b_id = uuid.uuid4()
    inst_a = Institution(id=campus_a_id, name="Campus Live Alpha")
    inst_b = Institution(id=campus_b_id, name="Campus Other Beta")
    db_session.add_all([inst_a, inst_b])
    await db_session.flush()

    faculty_user_id = uuid.uuid4()
    leadership_user_id = uuid.uuid4()

    mem_faculty = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=faculty_user_id,
        role="faculty",
        is_active=True,
    )
    mem_lead = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        user_id=leadership_user_id,
        role="leadership",
        is_active=True,
    )
    db_session.add_all([mem_faculty, mem_lead])

    # Student 1: Authorized student with full 25 Day-30 features
    student_complete = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="SYN-1007",
        display_name="Asha (synthetic)",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    # Student 2: Incomplete student (missing VLE features)
    student_incomplete = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="SYN-1008",
        display_name="Dev (incomplete)",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    # Student 3: Cross-campus student
    student_cross_campus = Student(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        external_ref="SYN-OTHER-99",
        display_name="Other Campus Student",
        cohort_code="ENG-Y1",
        enrollment_status="active",
    )
    # Student 4: Student with leaked target feature
    student_leaked = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="SYN-LEAKED",
        display_name="Leaked Student",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )

    db_session.add_all([student_complete, student_incomplete, student_cross_campus, student_leaked])
    await db_session.flush()

    now = datetime.now(timezone.utc)

    # Populate 25 canonical features for student_complete
    canonical_features = {
        "num_of_prev_attempts": 0,
        "studied_credits": 60,
        "gender": "F",
        "region": "East Anglian Region",
        "highest_education": "A Level or Equivalent",
        "imd_band": "20-30%",
        "age_band": "0-35",
        "disability": "N",
        "days_registered_before_start": -32.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 142,
        "vle_active_days_d30": 8,
        "vle_clicks_precourse": 24,
        "vle_clicks_poststart_d30": 118,
        "vle_clicks_last_7d": 12,
        "vle_days_since_last_click": 6.0,
        "vle_clicks_forumng_d30": 18,
        "vle_clicks_oucontent_d30": 82,
        "vle_clicks_quiz_d30": 0,
        "vle_clicks_homepage_d30": 28,
        "vle_clicks_other_d30": 14,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 1,
        "assessment_banked_d30": 0,
        "has_early_assessment_submission_d30": 1,
    }

    for feat_name, feat_val in canonical_features.items():
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=student_complete.id,
            domain="academic" if "assessment" in feat_name else ("participation" if "vle" in feat_name else "demographic"),
            metric_key=feat_name,
            value={"val": feat_val},
            quality_state="valid",
            event_at=now,
            available_at=now,
            source_system="canonical_telemetry_importer",
            source_record_ref=f"rec-{feat_name}",
        ))

    # Add only attendance to incomplete student
    db_session.add(StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_incomplete.id,
        domain="attendance",
        metric_key="attendance_rate",
        value={"val": 0.55},
        quality_state="valid",
        event_at=now,
        available_at=now,
        source_system="attendance_system",
        source_record_ref="rec-att",
    ))

    # Add all 25 features PLUS forbidden leakage feature to leaked student
    for feat_name, feat_val in canonical_features.items():
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=student_leaked.id,
            domain="academic",
            metric_key=feat_name,
            value={"val": feat_val},
            quality_state="valid",
            event_at=now,
            available_at=now,
            source_system="canonical_telemetry_importer",
            source_record_ref=f"rec-leak-{feat_name}",
        ))
    db_session.add(StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_leaked.id,
        domain="academic",
        metric_key="final_result",
        value={"val": "Pass"},
        quality_state="valid",
        event_at=now,
        available_at=now,
        source_system="illegal_future_extractor",
        source_record_ref="rec-leak-target",
    ))

    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "faculty_user_id": faculty_user_id,
        "leadership_user_id": leadership_user_id,
        "student_complete": student_complete,
        "student_incomplete": student_incomplete,
        "student_cross_campus": student_cross_campus,
        "student_leaked": student_leaked,
    }


@pytest.mark.asyncio
async def test_live_inference_success(client: AsyncClient, setup_live_inference_env, db_session):
    """Verifies live inference on student with full 25 Day-30 features returns 200, valid evidence card and logs audit."""
    env = setup_live_inference_env
    token = make_jwt(user_id=env["faculty_user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(env["campus_a_id"])}

    response = await client.post("/api/v1/students/SYN-1007/predict", headers=headers)
    assert response.status_code == 200
    data = response.json()

    assert data["external_student_ref"] == "SYN-1007"
    assert 0.0 <= data["risk_probability"] <= 1.0
    assert data["threshold"] == 0.46
    assert data["classification"] in ("At_Risk", "On_Track")

    card = data["evidence_card"]
    assert card["card_type"] == "ml_early_warning_evidence"
    assert card["model_name"] == "logistic_regression_baseline"
    assert card["model_version"] == "1.0.0"
    assert len(card["top_attributions"]) > 0

    # Verify audit log in db
    log_q = select(MLInferenceLog).where(MLInferenceLog.external_student_ref == "SYN-1007")
    res = await db_session.execute(log_q)
    log_entry = res.scalars().first()
    assert log_entry is not None
    assert log_entry.institution_id == env["campus_a_id"]
    assert log_entry.threshold == 0.46


@pytest.mark.asyncio
async def test_live_inference_feature_incompleteness(client: AsyncClient, setup_live_inference_env):
    """Verifies that scoring a student lacking canonical Day-30 features returns 422 INSUFFICIENT_FEATURES."""
    env = setup_live_inference_env
    token = make_jwt(user_id=env["faculty_user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(env["campus_a_id"])}

    response = await client.post("/api/v1/students/SYN-1008/predict", headers=headers)
    assert response.status_code == 422
    err = response.json()["error"]
    assert err["code"] == "INSUFFICIENT_FEATURES"
    assert "Missing" in err["message"] or "insufficient" in err["message"]


@pytest.mark.asyncio
async def test_live_inference_unauthenticated(client: AsyncClient, setup_live_inference_env):
    """Verifies that unauthenticated request to /predict returns 401."""
    env = setup_live_inference_env
    response = await client.post("/api/v1/students/SYN-1007/predict")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_live_inference_leadership_denied(client: AsyncClient, setup_live_inference_env):
    """Verifies that leadership role is rejected with 403 per ADR-004 privacy boundaries."""
    env = setup_live_inference_env
    token = make_jwt(user_id=env["leadership_user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(env["campus_a_id"])}

    response = await client.post("/api/v1/students/SYN-1007/predict", headers=headers)
    assert response.status_code == 403
    err = response.json()["error"]
    assert err["code"] in ("LEADERSHIP_QUEUE_ACCESS_DENIED", "LEADERSHIP_INDIVIDUAL_ACCESS_FORBIDDEN")


@pytest.mark.asyncio
async def test_live_inference_tenancy_isolation(client: AsyncClient, setup_live_inference_env):
    """Verifies that requesting a student from another campus returns 404 without leaking records."""
    env = setup_live_inference_env
    token = make_jwt(user_id=env["faculty_user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(env["campus_a_id"])}

    response = await client.post("/api/v1/students/SYN-OTHER-99/predict", headers=headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_live_inference_leakage_rejection(client: AsyncClient, setup_live_inference_env):
    """Verifies that forbidden leakage features trigger 422 LEAKAGE_DETECTED."""
    env = setup_live_inference_env
    token = make_jwt(user_id=env["faculty_user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(env["campus_a_id"])}

    response = await client.post("/api/v1/students/SYN-LEAKED/predict", headers=headers)
    assert response.status_code == 422
    err = response.json()["error"]
    assert err["code"] == "LEAKAGE_DETECTED"


@pytest.mark.asyncio
async def test_ml_model_info_threshold_verification(client: AsyncClient, setup_live_inference_env):
    """Verifies that backend /api/v1/ml/model-info dynamically returns threshold 0.46 and status ready."""
    env = setup_live_inference_env
    token = make_jwt(user_id=env["faculty_user_id"])
    headers = {"Authorization": f"Bearer {token}", "X-Campus-Id": str(env["campus_a_id"])}

    response = await client.get("/api/v1/ml/model-info", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["threshold"] == 0.46
    assert data["decision_threshold"] == 0.46
    assert data["cutoff_days"] == 30
    assert len(data["features"]) == 25
