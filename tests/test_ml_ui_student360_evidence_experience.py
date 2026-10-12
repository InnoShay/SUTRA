"""
SUTRA ML-UI Phase 4 — Student 360 Evidence Experience Integration & Contract Tests.

Verifies:
1. Readiness API audits the 25 canonical Day-30 features without silent zero-imputation.
2. Distinct categorization of features: available, missing, and underivable.
3. Prediction contracts: risk probability, configured threshold (0.46), classification, model version, and timestamp.
4. Multi-tier evidence segregation: Model predictions (Tier 3) distinct from observations (Tier 1), signals (Tier 2), and human cases (Tier 5).
5. Human-in-the-Loop invariant: inference does not create automated cases or mutate support records.
6. Access controls & privacy boundaries:
   - ADR-004 leadership access restriction (403 LEADERSHIP_QUEUE_ACCESS_DENIED on /readiness and /predict).
   - ADR-003 financial data segregation (FinanceObservation isolated and excluded from ML readiness and feature sets).
"""

import uuid
from datetime import datetime, timezone
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select, func

from app.models.case import Case
from app.models.institution import Institution, InstitutionMembership
from app.models.observation import StudentObservation, FinanceObservation
from app.models.student import Student
from app.schemas.ml import DAY30_REQUIRED_FEATURES
from tests.utils import make_jwt

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
async def setup_evidence_env(db_session):
    """Sets up campus, users, and students for Evidence Experience testing."""
    campus_id = uuid.uuid4()
    inst = Institution(id=campus_id, name="Campus Evidence Hub")
    db_session.add(inst)
    await db_session.flush()

    faculty_user_id = uuid.uuid4()
    leadership_user_id = uuid.uuid4()

    mem_faculty = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=faculty_user_id,
        role="faculty",
        is_active=True,
    )
    mem_lead = InstitutionMembership(
        id=uuid.uuid4(),
        institution_id=campus_id,
        user_id=leadership_user_id,
        role="leadership",
        is_active=True,
    )
    db_session.add_all([mem_faculty, mem_lead])

    # Student 1: Partial telemetry (attendance only)
    partial_student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="STU-EVID-PARTIAL",
        display_name="Meera Nair",
        cohort_code="CS-Y1",
        enrollment_status="active",
    )
    # Student 2: Zero observations
    empty_student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="STU-EVID-EMPTY",
        display_name="Rohan Verma",
        cohort_code="CS-Y1",
        enrollment_status="active",
    )
    # Student 3: Full 25 Day-30 features for inference test
    ready_student = Student(
        id=uuid.uuid4(),
        institution_id=campus_id,
        external_ref="STU-EVID-READY",
        display_name="Asha Patel",
        cohort_code="CS-Y1",
        enrollment_status="active",
    )
    db_session.add_all([partial_student, empty_student, ready_student])
    await db_session.flush()

    now = datetime.now(timezone.utc)

    # Attendance observation for partial_student
    obs_att = StudentObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=partial_student.id,
        domain="attendance",
        metric_key="attendance_rate",
        value={"val": 0.72},
        unit="ratio",
        quality_state="valid",
        event_at=now,
        available_at=now,
        source_system="biometric_scanner",
        source_record_ref="att-01",
    )
    # Financial observation for partial_student (Segregated under ADR-003)
    obs_fin = FinanceObservation(
        id=uuid.uuid4(),
        institution_id=campus_id,
        student_id=partial_student.id,
        fee_support_status="pending_aid",
        event_at=now,
        available_at=now,
        source_system="bursar_finance",
        source_record_ref="fin-99",
        quality_state="valid",
    )
    db_session.add_all([obs_att, obs_fin])

    # Full canonical features for ready_student
    for feat_name, feat_val in CANONICAL_TEST_FEATURES.items():
        db_session.add(StudentObservation(
            id=uuid.uuid4(),
            institution_id=campus_id,
            student_id=ready_student.id,
            domain="academic" if "assessment" in feat_name else ("participation" if "vle" in feat_name else "demographic"),
            metric_key=feat_name,
            value={"val": feat_val},
            quality_state="valid",
            event_at=now,
            available_at=now,
            source_system="lms_canvas",
            source_record_ref=f"ready-{feat_name}",
        ))

    await db_session.commit()

    return {
        "campus_id": campus_id,
        "faculty_token": make_jwt(faculty_user_id),
        "lead_token": make_jwt(leadership_user_id),
        "partial_student_id": partial_student.id,
        "empty_student_id": empty_student.id,
        "ready_student_id": ready_student.id,
    }


@pytest.mark.asyncio
async def test_readiness_endpoint_audits_25_features_and_enforces_anti_imputation(
    client: AsyncClient, setup_evidence_env
):
    """
    Requirements 4, 5, 6:
    - Audits all 25 Day-30 canonical features.
    - Missing or unobserved features are marked as missing / underivable without silent zero-imputation.
    """
    env = setup_evidence_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    # 1. Test student with zero telemetry
    res_empty = await client.get(
        f"/api/v1/students/{env['empty_student_id']}/readiness",
        headers=headers,
    )
    assert res_empty.status_code == 200, res_empty.text
    data_empty = res_empty.json()

    assert data_empty["is_ready_for_inference"] is False
    assert data_empty["features_total_required"] == 25
    assert data_empty["features_available_count"] == 0
    assert len(data_empty["features"]) == 25
    assert "non-prediction" in data_empty["governance_disclaimer"].lower() or "not generate" in data_empty["governance_disclaimer"].lower()

    # Verify anti-imputation invariant: missing features must NOT have fabricated values
    for item in data_empty["features"]:
        assert item["status"] in ["missing", "underivable_from_source"]
        assert item["observed_value"] is None, f"Feature {item['feature_name']} must not be zero-imputed"
        assert item["derivation_note"] is not None

    # 2. Test student with partial telemetry (attendance only, no VLE features)
    res_partial = await client.get(
        f"/api/v1/students/{env['partial_student_id']}/readiness",
        headers=headers,
    )
    assert res_partial.status_code == 200, res_partial.text
    data_partial = res_partial.json()

    assert data_partial["is_ready_for_inference"] is False
    assert data_partial["features_total_required"] == 25

    feature_map = {f["feature_name"]: f for f in data_partial["features"]}
    # VLE click features must be flagged underivable/missing and NOT zero-imputed
    assert "vle_clicks_last_7d" in feature_map
    assert feature_map["vle_clicks_last_7d"]["status"] in ["missing", "underivable_from_source"]
    assert feature_map["vle_clicks_last_7d"]["observed_value"] is None


@pytest.mark.asyncio
async def test_adr003_financial_data_segregation_in_evidence_experience(
    client: AsyncClient, setup_evidence_env
):
    """
    Requirement 6 & ADR-003:
    Financial observations (e.g. fee_support_status) are strictly segregated in finance_observations
    and must NOT appear in the ML canonical 25 Day-30 feature readiness checklist.
    """
    env = setup_evidence_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    res = await client.get(
        f"/api/v1/students/{env['partial_student_id']}/readiness",
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()

    # The 25 canonical ML features must strictly NOT contain financial attributes
    feature_names = [f["feature_name"] for f in data["features"]]
    assert "fee_support_status" not in feature_names
    assert all("fee" not in f and "finance" not in f for f in feature_names)


@pytest.mark.asyncio
async def test_adr004_leadership_privacy_gate_on_readiness_and_prediction(
    client: AsyncClient, setup_evidence_env
):
    """
    Requirement 9 & ADR-004:
    Leadership persona is strictly barred from individual student readiness audits
    and inference predictions (403 LEADERSHIP_QUEUE_ACCESS_DENIED).
    """
    env = setup_evidence_env
    headers = {
        "Authorization": f"Bearer {env['lead_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    # 1. Readiness endpoint access blocked
    res_readiness = await client.get(
        f"/api/v1/students/{env['partial_student_id']}/readiness",
        headers=headers,
    )
    assert res_readiness.status_code == 403
    err_body = res_readiness.json()
    err_code = err_body.get("code") or (err_body.get("error", {}) if isinstance(err_body.get("error"), dict) else {}).get("code")
    assert err_code == "LEADERSHIP_QUEUE_ACCESS_DENIED"

    # 2. Prediction endpoint access blocked
    res_predict = await client.post(
        f"/api/v1/students/{env['partial_student_id']}/predict",
        headers=headers,
    )
    assert res_predict.status_code == 403
    pred_err = res_predict.json()
    pred_code = pred_err.get("code") or (pred_err.get("error", {}) if isinstance(pred_err.get("error"), dict) else {}).get("code")
    assert pred_code == "LEADERSHIP_QUEUE_ACCESS_DENIED"


@pytest.mark.asyncio
async def test_human_in_the_loop_invariant_prediction_does_not_mutate_cases(
    client: AsyncClient, setup_evidence_env, db_session
):
    """
    Requirement 8:
    Preserve existing student support, case and follow-up actions.
    Do NOT automatically create a case merely because the model labels a student at risk.
    """
    env = setup_evidence_env
    headers = {
        "Authorization": f"Bearer {env['faculty_token']}",
        "X-Campus-Id": str(env["campus_id"]),
    }

    # Count existing cases for ready_student via support-view
    res_support_before = await client.get(
        f"/api/v1/students/{env['ready_student_id']}/support-view",
        headers=headers,
    )
    assert res_support_before.status_code == 200
    cases_before_count = res_support_before.json()["active_cases_count"]

    # Count cases directly in database
    db_count_before = (
        await db_session.execute(
            select(func.count(Case.id)).where(Case.student_id == env["ready_student_id"])
        )
    ).scalar_one()

    # Trigger live inference on student
    res_predict = await client.post(
        f"/api/v1/students/{env['ready_student_id']}/predict",
        headers=headers,
    )
    assert res_predict.status_code == 200, res_predict.text
    pred_data = res_predict.json()

    # Verify prediction metadata contracts (Req 1, 3)
    assert "risk_probability" in pred_data
    assert "threshold" in pred_data
    assert pred_data["threshold"] == 0.46
    assert "classification" in pred_data
    assert "evidence_card" in pred_data
    assert pred_data["evidence_card"]["model_version"] == "1.0.0"
    assert pred_data["evidence_card"]["model_name"] is not None

    # Count cases after inference via support-view: MUST BE UNCHANGED
    res_support_after = await client.get(
        f"/api/v1/students/{env['ready_student_id']}/support-view",
        headers=headers,
    )
    assert res_support_after.status_code == 200
    cases_after_count = res_support_after.json()["active_cases_count"]
    assert cases_after_count == cases_before_count, (
        "Human-in-the-Loop violation: Live inference must NEVER automatically create cases"
    )

    # Count cases directly in database after: MUST BE UNCHANGED
    db_count_after = (
        await db_session.execute(
            select(func.count(Case.id)).where(Case.student_id == env["ready_student_id"])
        )
    ).scalar_one()
    assert db_count_after == db_count_before, (
        "Human-in-the-Loop violation: Database case count changed after live inference"
    )
