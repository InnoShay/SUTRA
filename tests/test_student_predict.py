"""
Unit and integration tests for Phase 12: Authorized Student-Specific ML Scoring.
Verifies:
1. Valid authorized scoring for students with 25 canonical Day-30 features.
2. Inference audit logging to ml_inference_logs table.
3. Strict parity with file-based inference for equivalent feature vectors.
4. Refusal of inference on students with incomplete features (e.g. attendance-only).
5. Refusal of inference on students with stale telemetry.
6. Anti-leakage rejection if forbidden features are detected.
7. Tenancy isolation: 404 for student belonging to another campus.
8. Role gating: 403 for leadership role, 401 for unauthenticated requests.
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

# Canonical test vector values (from demo_seed.json / OULAD Day-30)
CANONICAL_TEST_FEATURES = {
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


@pytest_asyncio.fixture
async def setup_scoring_env(db_session):
    """Sets up campuses, users, students, and observations for student scoring tests."""
    campus_a_id = uuid.uuid4()
    campus_b_id = uuid.uuid4()
    inst_a = Institution(id=campus_a_id, name="Campus Alpha")
    inst_b = Institution(id=campus_b_id, name="Campus Beta")
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

    # Student 1: Authorized student with full 25 canonical features
    student_canonical = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="SYN-1007",
        display_name="Asha (synthetic)",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    # Student 2: Institutional student with only attendance observations
    student_attendance_only = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-ATTEND-ONLY",
        display_name="Dev (attendance only)",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    # Student 3: Student with a stale feature
    student_stale = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-STALE",
        display_name="Ira (stale feature)",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    # Student 4: Student with a leaked target feature
    student_leaked = Student(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        external_ref="STU-LEAKED",
        display_name="Noor (leaked feature)",
        cohort_code="CS-Y2",
        enrollment_status="active",
    )
    # Student 5: Student in Campus B (Cross-campus test)
    student_campus_b = Student(
        id=uuid.uuid4(),
        institution_id=campus_b_id,
        external_ref="STU-BETA-77",
        display_name="Milan (campus B)",
        cohort_code="ENG-Y1",
        enrollment_status="active",
    )
    db_session.add_all([
        student_canonical,
        student_attendance_only,
        student_stale,
        student_leaked,
        student_campus_b,
    ])
    await db_session.flush()

    now = datetime.now(timezone.utc)

    # 1. Populate all 25 features for student_canonical
    for feat_name, feat_val in CANONICAL_TEST_FEATURES.items():
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=student_canonical.id,
            domain="academic" if "assessment" in feat_name else ("participation" if "vle" in feat_name else "demographic"),
            metric_key=feat_name,
            value={"val": feat_val},
            quality_state="valid",
            event_at=now,
            available_at=now,
            source_system="canonical_telemetry_importer",
            source_record_ref=f"rec-{feat_name}",
        ))

    # 2. Populate only attendance for student_attendance_only
    db_session.add(StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_a_id,
        student_id=student_attendance_only.id,
        domain="attendance",
        metric_key="attendance_rate",
        value={"val": 0.65},
        unit="ratio",
        quality_state="valid",
        event_at=now,
        available_at=now,
        source_system="biometric_turnstile",
        source_record_ref="att-turnstile-01",
    ))

    # 3. Populate 25 features for student_stale, with one marked stale
    for idx, (feat_name, feat_val) in enumerate(CANONICAL_TEST_FEATURES.items()):
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=student_stale.id,
            domain="participation" if "vle" in feat_name else "academic",
            metric_key=feat_name,
            value={"val": feat_val},
            quality_state="stale" if idx == 0 else "valid",
            event_at=now,
            available_at=now,
            source_system="telemetry_importer",
            source_record_ref=f"stale-{feat_name}",
        ))

    # 4. Populate 25 features + forbidden target leakage feature for student_leaked
    for feat_name, feat_val in CANONICAL_TEST_FEATURES.items():
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_a_id,
            student_id=student_leaked.id,
            domain="participation" if "vle" in feat_name else "academic",
            metric_key=feat_name,
            value={"val": feat_val},
            quality_state="valid",
            event_at=now,
            available_at=now,
            source_system="telemetry_importer",
            source_record_ref=f"leak-{feat_name}",
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
        source_system="registrar_leakage",
        source_record_ref="leak-target",
    ))

    await db_session.commit()

    return {
        "campus_a_id": campus_a_id,
        "campus_b_id": campus_b_id,
        "faculty_token": make_jwt(faculty_user_id),
        "lead_token": make_jwt(leadership_user_id),
        "student_canonical": student_canonical,
        "student_attendance_only": student_attendance_only,
        "student_stale": student_stale,
        "student_leaked": student_leaked,
        "student_campus_b": student_campus_b,
    }


@pytest.mark.asyncio
async def test_student_predict_valid_authorized_scoring(client: AsyncClient, setup_scoring_env, db_session):
    """
    Verifies that a student with all 25 canonical Day-30 features is scored,
    returns valid Evidence Card, and logs an audit record in ml_inference_logs.
    """
    env = setup_scoring_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s_id = env["student_canonical"].id

    resp = await client.post(f"/api/v1/students/{s_id}/predict", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["external_student_ref"] == "SYN-1007"
    assert 0.0 <= data["risk_probability"] <= 1.0
    assert data["threshold"] == 0.46
    assert data["classification"] in ("At_Risk", "On_Track")
    assert data["evidence_card"]["model_name"] in ("Logistic Regression", "logistic_regression_baseline")
    assert data["evidence_card"]["prediction_cutoff"] == "Day 30"
    assert len(data["evidence_card"]["top_attributions"]) > 0

    # Verify audit record persisted in ml_inference_logs
    log_query = select(MLInferenceLog).where(
        MLInferenceLog.institution_id == env["campus_a_id"],
        MLInferenceLog.student_id == s_id,
    )
    logs = (await db_session.execute(log_query)).scalars().all()
    assert len(logs) >= 1
    latest_log = logs[-1]
    assert latest_log.external_student_ref == "SYN-1007"
    assert latest_log.risk_probability == data["risk_probability"]
    assert latest_log.latency_ms is not None


@pytest.mark.asyncio
async def test_parity_with_file_based_inference(client: AsyncClient, setup_scoring_env):
    """
    Asserts strict numerical and classification parity between student-specific
    scoring (/students/{id}/predict) and direct feature-vector scoring (/ml/predict).
    """
    env = setup_scoring_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s_id = env["student_canonical"].id

    # 1. Student-specific inference
    resp_student = await client.post(f"/api/v1/students/{s_id}/predict", headers=headers)
    assert resp_student.status_code == 200
    student_data = resp_student.json()

    # 2. File-based / direct vector inference with exact same features
    direct_req = {
        "external_student_ref": "SYN-1007",
        "cutoff_days": 30,
        "features": CANONICAL_TEST_FEATURES,
    }
    resp_direct = await client.post("/api/v1/ml/predict", json=direct_req, headers=headers)
    assert resp_direct.status_code == 200
    direct_data = resp_direct.json()

    assert student_data["risk_probability"] == pytest.approx(direct_data["risk_probability"], abs=1e-5)
    assert student_data["classification"] == direct_data["classification"]
    assert student_data["threshold"] == direct_data["threshold"]


@pytest.mark.asyncio
async def test_student_predict_incomplete_features_rejection(client: AsyncClient, setup_scoring_env):
    """
    Verifies that a student with only generic attendance records is refused with 422,
    preventing arbitrary filling of missing inputs or silent approximations.
    """
    env = setup_scoring_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s_id = env["student_attendance_only"].id

    resp = await client.post(f"/api/v1/students/{s_id}/predict", headers=headers)
    assert resp.status_code == 422
    err_body = resp.json()
    assert err_body["error"]["code"] == "INSUFFICIENT_FEATURES"
    assert "cannot be derived from institutional attendance" in err_body["error"]["message"]
    assert "sutra students readiness" in err_body["error"]["message"]


@pytest.mark.asyncio
async def test_student_predict_stale_features_rejection(client: AsyncClient, setup_scoring_env):
    """Verifies that stale features block inference with 422 STALE_FEATURES."""
    env = setup_scoring_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s_id = env["student_stale"].id

    resp = await client.post(f"/api/v1/students/{s_id}/predict", headers=headers)
    assert resp.status_code == 422
    err_body = resp.json()
    assert err_body["error"]["code"] == "STALE_FEATURES"
    assert "stale feature observation(s)" in err_body["error"]["message"]


@pytest.mark.asyncio
async def test_student_predict_anti_leakage_rejection(client: AsyncClient, setup_scoring_env):
    """Verifies that post-cutoff leakage features (final_result) trigger LEAKAGE_DETECTED."""
    env = setup_scoring_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    s_id = env["student_leaked"].id

    resp = await client.post(f"/api/v1/students/{s_id}/predict", headers=headers)
    assert resp.status_code == 422
    err_body = resp.json()
    assert err_body["error"]["code"] == "LEAKAGE_DETECTED"
    assert "final_result" in err_body["error"]["message"]


@pytest.mark.asyncio
async def test_student_predict_tenancy_isolation_and_security(client: AsyncClient, setup_scoring_env):
    """Verifies cross-campus 404, leadership role 403, and unauthenticated 401."""
    env = setup_scoring_env
    headers_campus_a = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }

    # 1. Student in Campus B queried from Campus A -> MUST return 404 (non-leaking)
    resp = await client.post(f"/api/v1/students/{env['student_campus_b'].id}/predict", headers=headers_campus_a)
    assert resp.status_code == 404

    # 2. Unknown student ID -> MUST return 404
    resp = await client.post(f"/api/v1/students/{uuid.uuid4()}/predict", headers=headers_campus_a)
    assert resp.status_code == 404

    # 3. Leadership role -> MUST return 403
    headers_lead = {
        "Authorization": f"Bearer {env['lead_token']}",
        "X-Campus-Id": str(env["campus_a_id"]),
    }
    resp = await client.post(f"/api/v1/students/{env['student_canonical'].id}/predict", headers=headers_lead)
    assert resp.status_code == 403

    # 4. Unauthenticated -> MUST return 401
    resp = await client.post(f"/api/v1/students/{env['student_canonical'].id}/predict")
    assert resp.status_code == 401
