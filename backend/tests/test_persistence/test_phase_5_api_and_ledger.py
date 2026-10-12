"""
Integration and persistence tests for Phase 5:
- Communication drafting (Agent 5)
- Follow-up note structuring & confirmation (Agent 6)
- Strict separation of task/follow-up from student outcomes
- Cryptographic SHA-256 audit chain verification
- FastAPI HTTP endpoint integration and role/campus authorization
"""

import os
import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.orchestration.contracts import (
    ActionStep,
    CommunicationDraftStatus,
    StageExecutionRecord,
    StageStatus,
    StructuredNoteStatus,
    SupportPlanDraft,
)
from backend.app.orchestration.persistence.db import create_connection, init_db
from backend.app.orchestration.persistence.models import (
    AdvisorDecisionKind,
    CaseDecisionRequest,
    CommunicationDraftCreateRequest,
    CommunicationDraftUpdateRequest,
    NoteStructureRequest,
    OutcomeStatus,
    StructuredNoteConfirmRequest,
)
from backend.app.orchestration.persistence.repository import CaseRepository


@pytest.fixture
def in_memory_repo():
    """Create in-memory SQLite connection and initialized CaseRepository."""
    conn = create_connection(":memory:")
    init_db(conn)
    return CaseRepository(conn)


@pytest.fixture
def client_with_in_memory_db(tmp_path):
    """FastAPI TestClient backed by an isolated test SQLite database."""
    db_file = str(tmp_path / "test_phase_5_api.db")
    os.environ["SUTRA_DB_PATH"] = db_file
    os.environ["SUTRA_ENV"] = "development"
    os.environ["SUTRA_DEMO_AUTH_ENABLED"] = "true"

    conn = create_connection(db_file)
    init_db(conn)

    app = create_app()
    app.state.db_conn = conn

    with TestClient(app) as test_client:
        yield test_client

    if "SUTRA_DB_PATH" in os.environ:
        del os.environ["SUTRA_DB_PATH"]


def seed_test_case(repo: CaseRepository, case_id: str = "CASE-TEST-01", campus_id: str = "CAMPUS_DEFAULT") -> str:
    """Helper creating a test case with an approved support plan."""
    from backend.app.orchestration.contracts import (
        OrchestrationResult,
        RunStatus,
        ValidationSummary,
    )
    from backend.app.schemas.features import StudentFeatureInput
    from sutra_ml.schemas.evidence_card import build_evidence_card

    record_id = case_id.replace("CASE-", "")
    student_input = StudentFeatureInput(
        record_id=record_id,
        num_of_prev_attempts=0,
        studied_credits=60,
        gender="F",
        region="East Anglian Region",
        highest_education="A Level or Equivalent",
        imd_band="20-30%",
        age_band="0-35",
        disability="N",
        days_registered_before_start=-30,
        has_missing_registration_date=0,
        vle_total_clicks_d30=150,
        vle_active_days_d30=8,
        vle_clicks_precourse=20,
        vle_clicks_poststart_d30=130,
        vle_clicks_last_7d=10,
        vle_days_since_last_click=5.0,
        vle_clicks_forumng_d30=15,
        vle_clicks_oucontent_d30=90,
        vle_clicks_quiz_d30=5,
        vle_clicks_homepage_d30=20,
        vle_clicks_other_d30=0,
        has_vle_activity_d30=1,
        assessments_submitted_d30=0,
        assessment_banked_d30=0,
        has_early_assessment_submission_d30=0,
    )

    evidence_card = build_evidence_card(
        record_id=record_id,
        module_code="BBB",
        presentation_code="2014J",
        risk_prob=0.72,
        top_pos_factors=[{"feature": "vle_clicks_last_7d", "val": "10", "weight": 0.35, "desc": "Low clicks"}],
        top_neg_factors=[],
        model_name="baseline_logistic_regression",
        model_version="1.0.0",
        threshold=0.46,
    )

    plan = SupportPlanDraft(
        plan_title="Academic Check-in & LMS Review",
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Conduct LMS check-in and module walkthrough.",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=7,
                step_id="STEP-1",
            )
        ],
        evidence_requirements=["Walkthrough note"],
        target_window_days=14,
        is_draft=True,
    )

    run_result = OrchestrationResult(
        run_id="RUN-TEST-01",
        record_id=record_id,
        status=RunStatus.SUCCESS,
        evidence_card=evidence_card,
        stages={
            "stage_3_plan": StageExecutionRecord(
                stage_id="stage_3_plan",
                stage_name="Planner",
                status=StageStatus.COMPLETED,
                duration_ms=50.0,
                output=plan,
            )
        },
        validation_summary=ValidationSummary(passed=True, error_count=0, warning_count=0),
        total_duration_ms=15.0,
    )

    repo.create_case_from_run(
        result=run_result,
        campus_id=campus_id,
        student_input_features=student_input.to_feature_dict(),
        actor_id="SYS-SEEDED",
        actor_role="SYSTEM",
    )

    # Approve the plan
    repo.submit_advisor_decision(
        case_id=case_id,
        request=CaseDecisionRequest(
            decision_kind=AdvisorDecisionKind.APPROVE,
            reviewed_plan_version=1,
            notes="Approved by senior advisor.",
        ),
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id=campus_id,
    )

    return case_id


# -----------------------------------------------------------------------------
# Agent 5: Communication Drafting Repository Tests
# -----------------------------------------------------------------------------

def test_communication_draft_creation_and_update(in_memory_repo):
    """Test generating, updating, and approving a communication draft in the ledger."""
    case_id = seed_test_case(in_memory_repo)

    req = CommunicationDraftCreateRequest(
        template_id="TPL_STUDENT_SUPPORT_CHECKIN",
        intended_role="STUDENT",
        idempotency_key="IDEMP-COMM-01",
    )

    draft_record = in_memory_repo.create_communication_draft(
        case_id=case_id,
        request=req,
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_DEFAULT",
    )

    assert draft_record.case_id == case_id
    assert draft_record.template_id == "TPL_STUDENT_SUPPORT_CHECKIN"
    assert draft_record.human_review_status == CommunicationDraftStatus.DRAFT_AWAITING_REVIEW
    assert "settling into" in draft_record.message_body

    # Idempotent replay with same key returns identical record
    replay = in_memory_repo.create_communication_draft(
        case_id=case_id,
        request=req,
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_DEFAULT",
    )
    assert replay.draft_id == draft_record.draft_id

    # Same key with different payload fails
    with pytest.raises(ValueError) as exc_info:
        in_memory_repo.create_communication_draft(
            case_id=case_id,
            request=CommunicationDraftCreateRequest(
                template_id="TPL_STUDENT_RESOURCE_GUIDE",  # different template
                intended_role="STUDENT",
                idempotency_key="IDEMP-COMM-01",
            ),
            actor_id="ADV-USER-01",
            actor_role="ACADEMIC_ADVISOR",
            campus_id="CAMPUS_DEFAULT",
        )
    assert "Idempotency key reused with different request payload" in str(exc_info.value)

    # Human Advisor edits and approves draft for future use
    updated = in_memory_repo.update_communication_draft(
        case_id=case_id,
        draft_id=draft_record.draft_id,
        request=CommunicationDraftUpdateRequest(
            subject="Personalized Check-in: How are studies going?",
            review_status=CommunicationDraftStatus.APPROVED_FOR_USE,
            review_notes="Approved for advisor outreach reference.",
        ),
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_DEFAULT",
    )

    assert updated.human_review_status == CommunicationDraftStatus.APPROVED_FOR_USE
    assert updated.subject == "Personalized Check-in: How are studies going?"
    assert updated.reviewed_by == "ADV-USER-01"


def test_communication_draft_requires_approved_plan(in_memory_repo):
    """Cases without an approved plan cannot create communication drafts."""
    case_id = "CASE-UNAPPROVED-01"
    # Seed case but do not approve it
    from backend.app.orchestration.contracts import (
        ActionStep,
        OrchestrationResult,
        RunStatus,
        StageExecutionRecord,
        StageStatus,
        SupportPlanDraft,
        ValidationSummary,
    )
    from backend.app.schemas.features import StudentFeatureInput
    from sutra_ml.schemas.evidence_card import build_evidence_card

    student_input = StudentFeatureInput(
        record_id="UNAPPROVED-01",
        num_of_prev_attempts=0, studied_credits=60, gender="M", region="North Region",
        highest_education="HE Qualification", imd_band="50-60%", age_band="0-35", disability="N",
        days_registered_before_start=-20, has_missing_registration_date=0,
        vle_total_clicks_d30=200, vle_active_days_d30=10, vle_clicks_precourse=10,
        vle_clicks_poststart_d30=190, vle_clicks_last_7d=15, vle_days_since_last_click=2.0,
        vle_clicks_forumng_d30=20, vle_clicks_oucontent_d30=100, vle_clicks_quiz_d30=5,
        vle_clicks_homepage_d30=30, vle_clicks_other_d30=5, has_vle_activity_d30=1,
        assessments_submitted_d30=1, assessment_banked_d30=0, has_early_assessment_submission_d30=1,
    )
    card = build_evidence_card(
        record_id="UNAPPROVED-01",
        module_code="BBB",
        presentation_code="2014J",
        risk_prob=0.30,
        top_pos_factors=[],
        top_neg_factors=[],
        model_name="baseline",
        model_version="1.0.0",
        threshold=0.46,
    )
    plan = SupportPlanDraft(
        plan_title="Check-in",
        action_steps=[
            ActionStep(
                step_number=1,
                action_description="Outreach",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=7,
                step_id="STEP-1",
            )
        ],
        evidence_requirements=["Note"],
        target_window_days=14,
        is_draft=True,
    )
    in_memory_repo.create_case_from_run(
        result=OrchestrationResult(
            run_id="RUN-UNAPP",
            record_id="UNAPPROVED-01",
            status=RunStatus.SUCCESS,
            evidence_card=card,
            stages={
                "stage_3_plan": StageExecutionRecord(
                    stage_id="stage_3_plan",
                    stage_name="Planner",
                    status=StageStatus.COMPLETED,
                    duration_ms=20.0,
                    output=plan,
                )
            },
            validation_summary=ValidationSummary(passed=True, error_count=0, warning_count=0),
            total_duration_ms=10.0,
        ),
        campus_id="CAMPUS_DEFAULT",
        student_input_features=student_input.to_feature_dict(),
        actor_id="SYS",
        actor_role="SYSTEM",
    )

    # Attempting to draft communication should raise ValueError
    with pytest.raises(ValueError) as exc_info:
        in_memory_repo.create_communication_draft(
            case_id="CASE-UNAPPROVED-01",
            request=CommunicationDraftCreateRequest(
                template_id="TPL_STUDENT_SUPPORT_CHECKIN",
                intended_role="STUDENT",
            ),
            actor_id="ADV-01", actor_role="ACADEMIC_ADVISOR", campus_id="CAMPUS_DEFAULT",
        )
    assert "case does not have an approved support plan" in str(exc_info.value)


# -----------------------------------------------------------------------------
# Agent 6: Follow-up Note Structuring & Confirmation Tests
# -----------------------------------------------------------------------------

def test_follow_up_note_structuring_and_confirmation(in_memory_repo):
    """Test full cycle: structuring note draft -> advisor confirmation -> ledger."""
    case_id = seed_test_case(in_memory_repo)

    # 1. Staff submits unstructured follow-up note
    struct_req = NoteStructureRequest(
        raw_note="Conducted 15-minute introductory check-in via LMS messaging. Student accessed module page but not Quiz 1.",
        task_id=None,
        idempotency_key="IDEMP-NOTE-01",
    )
    draft_record = in_memory_repo.structure_follow_up_note(
        case_id=case_id,
        request=struct_req,
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_DEFAULT",
    )

    assert draft_record.case_id == case_id
    assert draft_record.human_confirmation_status == StructuredNoteStatus.DRAFT_AWAITING_CONFIRMATION
    assert len(draft_record.reported_actions_taken) > 0

    # Case outcome MUST remain UNOBSERVED
    case_before = in_memory_repo.get_case(case_id)
    assert case_before.outcome_status == OutcomeStatus.UNOBSERVED

    # 2. Advisor reviews, edits, and confirms structured note
    confirm_req = StructuredNoteConfirmRequest(
        draft_id=draft_record.draft_id,
        reported_actions_taken=draft_record.reported_actions_taken,
        staff_observations=draft_record.staff_observations,
        attributed_student_statements=draft_record.attributed_student_statements,
        documented_evidence_references=draft_record.documented_evidence_references,
        unresolved_questions_or_concerns=["Advise tutor drop-in hours next week"],
        confirmation_notes="Confirmed by academic advisor.",
    )

    confirmed_fu = in_memory_repo.confirm_structured_note(
        case_id=case_id,
        request=confirm_req,
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_DEFAULT",
    )

    assert confirmed_fu.is_structured is True
    assert confirmed_fu.draft_id == draft_record.draft_id
    assert "Confirmed by academic advisor" in confirmed_fu.observation_note

    # Draft status must now be CONFIRMED
    draft_after = in_memory_repo.get_structured_note_draft(case_id, draft_record.draft_id)
    assert draft_after.human_confirmation_status == StructuredNoteStatus.CONFIRMED

    # 3. CRITICAL: Student outcome MUST STILL be UNOBSERVED
    case_after = in_memory_repo.get_case(case_id)
    assert case_after.outcome_status == OutcomeStatus.UNOBSERVED

    # 4. Verify cryptographic SHA-256 audit chain includes all Phase 5 events
    audit_res = in_memory_repo.verify_audit_ledger(case_id)
    assert audit_res.is_valid is True
    assert audit_res.verified_events >= 4  # CREATED, APPROVED, STRUCTURED, CONFIRMED


def test_structured_note_rejection(in_memory_repo):
    """Test rejecting an AI-structured note draft."""
    case_id = seed_test_case(in_memory_repo)

    draft_record = in_memory_repo.structure_follow_up_note(
        case_id=case_id,
        request=NoteStructureRequest(raw_note="Staff check-in completed."),
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_DEFAULT",
    )

    rejected = in_memory_repo.reject_structured_note(
        case_id=case_id,
        draft_id=draft_record.draft_id,
        actor_id="ADV-USER-01",
        actor_role="ACADEMIC_ADVISOR",
        campus_id="CAMPUS_DEFAULT",
        rejection_reason="Misclassified informal comment.",
    )

    assert rejected.human_confirmation_status == StructuredNoteStatus.REJECTED


def test_cross_campus_isolation_enforced(in_memory_repo):
    """Attempting cross-campus access to draft communications or structure notes is denied."""
    case_id = seed_test_case(in_memory_repo, campus_id="CAMPUS_A")

    # Draft communication from CAMPUS_B must fail
    with pytest.raises(PermissionError):
        in_memory_repo.create_communication_draft(
            case_id=case_id,
            request=CommunicationDraftCreateRequest(
                template_id="TPL_STUDENT_SUPPORT_CHECKIN",
                intended_role="STUDENT",
            ),
            actor_id="USER-B",
            actor_role="ACADEMIC_ADVISOR",
            campus_id="CAMPUS_B",
        )

    # Note structuring from CAMPUS_B must fail
    with pytest.raises(PermissionError):
        in_memory_repo.structure_follow_up_note(
            case_id=case_id,
            request=NoteStructureRequest(raw_note="Hello"),
            actor_id="USER-B",
            actor_role="ACADEMIC_ADVISOR",
            campus_id="CAMPUS_B",
        )


# -----------------------------------------------------------------------------
# FastAPI HTTP Endpoint Integration Tests
# -----------------------------------------------------------------------------

def test_api_communication_draft_endpoints(client_with_in_memory_db):
    """Test Phase 5 HTTP endpoints for communication drafting."""
    # Seed case via demo-case seed endpoint
    seed_res = client_with_in_memory_db.post(
        "/api/v1/cases/seed",
        json={"scenario_name": "LOW_ENGAGEMENT_AT_RISK", "campus_id": "CAMPUS-MAIN"},
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert seed_res.status_code == 200
    case_data = seed_res.json()
    case_id = case_data["case"]["case_id"]

    # Approve the case so it has an approved plan
    appr_res = client_with_in_memory_db.post(
        f"/api/v1/cases/{case_id}/decision",
        json={
            "decision_kind": "APPROVE",
            "reviewed_plan_version": 1,
            "notes": "Plan approved for student.",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert appr_res.status_code == 200

    # 1. Fetch available templates
    tpl_res = client_with_in_memory_db.get(
        f"/api/v1/cases/{case_id}/communication-templates",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert tpl_res.status_code == 200
    templates = tpl_res.json()
    assert len(templates) >= 4

    # 2. Generate communication draft
    draft_res = client_with_in_memory_db.post(
        f"/api/v1/cases/{case_id}/communication-drafts",
        json={
            "template_id": "TPL_STUDENT_SUPPORT_CHECKIN",
            "intended_role": "STUDENT",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert draft_res.status_code == 200
    draft_data = draft_res.json()
    draft_id = draft_data["draft_id"]
    assert draft_data["human_review_status"] == "DRAFT_AWAITING_REVIEW"

    # 3. List drafts
    list_res = client_with_in_memory_db.get(
        f"/api/v1/cases/{case_id}/communication-drafts",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 4. Patch draft
    patch_res = client_with_in_memory_db.patch(
        f"/api/v1/cases/{case_id}/communication-drafts/{draft_id}",
        json={
            "subject": "Customized Subject Line",
            "review_status": "APPROVED_FOR_USE",
            "review_notes": "Advisor approved for future guidance.",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["human_review_status"] == "APPROVED_FOR_USE"
    assert patch_res.json()["subject"] == "Customized Subject Line"


def test_api_note_structuring_endpoints(client_with_in_memory_db):
    """Test Phase 5 HTTP endpoints for note structuring and confirmation."""
    seed_res = client_with_in_memory_db.post(
        "/api/v1/cases/seed",
        json={"scenario_name": "LOW_ENGAGEMENT_AT_RISK", "campus_id": "CAMPUS-MAIN"},
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert seed_res.status_code == 200
    case_id = seed_res.json()["case"]["case_id"]

    # 1. Structure note
    struct_res = client_with_in_memory_db.post(
        f"/api/v1/cases/{case_id}/follow-ups/structure-note",
        json={
            "raw_note": "Advisor met student on campus. Student is reviewing chapter 2 slides.",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert struct_res.status_code == 200
    struct_data = struct_res.json()
    draft_id = struct_data["draft_id"]
    assert struct_data["human_confirmation_status"] == "DRAFT_AWAITING_CONFIRMATION"

    # 2. Confirm structured note
    confirm_res = client_with_in_memory_db.post(
        f"/api/v1/cases/{case_id}/follow-ups/confirm-structured",
        json={
            "draft_id": draft_id,
            "reported_actions_taken": struct_data["reported_actions_taken"],
            "staff_observations": struct_data["staff_observations"],
            "attributed_student_statements": struct_data["attributed_student_statements"],
            "documented_evidence_references": ["Chapter 2 slides"],
            "unresolved_questions_or_concerns": [],
            "confirmation_notes": "All verified.",
        },
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert confirm_res.status_code == 200
    fu_data = confirm_res.json()
    assert fu_data["is_structured"] is True

    # 3. Verify case detail includes drafts and confirmed follow-up
    detail_res = client_with_in_memory_db.get(
        f"/api/v1/cases/{case_id}",
        headers={"Authorization": "Bearer demo-token-ADV-MAIN-01"},
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["follow_ups"]) >= 1
    assert detail["case"]["outcome_status"] == "UNOBSERVED"
