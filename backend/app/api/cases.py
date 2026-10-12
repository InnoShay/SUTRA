"""
FastAPI Endpoints for SUTRA Phase 4:
Case Review Queue, Case Detail, Advisor Decisions, Task Management,
Follow-up Records, Distinct Student Outcomes, and Audit Verification.
"""

import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel

from backend.app.orchestration.auth.demo_auth import (
    DEMO_PERSONAS,
    DemoPersona,
    get_current_security_context,
)
from backend.app.orchestration.catalog import SyntheticDemoCatalog
from backend.app.orchestration.contracts import (
    ActionStep,
    ChallengeFinding,
    ClaimKind,
    EvidenceChallengeReport,
    EvidencePacket,
    EvidenceReference,
    InterventionProposal,
    SignalInterpretation,
    SupportPlanDraft,
    ValidationSeverity,
)
from backend.app.orchestration.coordinator import OrchestrationCoordinator
from backend.app.orchestration.persistence.db import create_connection, init_db
from backend.app.orchestration.persistence.models import (
    AuditVerificationResult,
    CaseDecisionRequest,
    CaseDetailResponse,
    CaseRecord,
    CaseStatus,
    CaseSummaryItem,
    FollowUpCreateRequest,
    FollowUpRecord,
    OutcomeRecordRequest,
    TaskRecord,
    TaskStatusUpdateRequest,
)
from backend.app.orchestration.persistence.repository import CaseRepository
from backend.app.orchestration.provider import MockLLMClient
from backend.app.orchestration.security import SecurityContext, SecurityRole
from backend.app.schemas.features import StudentFeatureInput
from sutra_ml.inference.predictor import SutraRiskPredictor

router = APIRouter(tags=["cases"])


def get_case_repo(request: Request) -> CaseRepository:
    """Dependency injecting initialized CaseRepository with application database connection."""
    conn = getattr(request.app.state, "db_conn", None)
    if conn is None:
        conn = create_connection()
        init_db(conn)
        request.app.state.db_conn = conn
    return CaseRepository(conn)


# -----------------------------------------------------------------------------
# Auth & Personas
# -----------------------------------------------------------------------------

@router.get("/auth/me", response_model=DemoPersona)
def get_current_user(ctx: SecurityContext = Depends(get_current_security_context)) -> DemoPersona:
    """Return identity of current authenticated demo actor."""
    persona = DEMO_PERSONAS.get(ctx.actor_id)
    if not persona:
        return DemoPersona(
            actor_id=ctx.actor_id,
            display_name=ctx.actor_id,
            role=ctx.role,
            campus_id=ctx.campus_id,
            description="Active security context",
        )
    return persona


@router.get("/auth/demo-users", response_model=list[DemoPersona])
def list_demo_users() -> list[DemoPersona]:
    """Return available synthetic demo personas for testing and role-switching."""
    return list(DEMO_PERSONAS.values())


# -----------------------------------------------------------------------------
# Screen A: Review Queue
# -----------------------------------------------------------------------------

@router.get("/cases", response_model=list[CaseSummaryItem])
def list_cases(
    status_filter: Optional[CaseStatus] = Query(None, alias="status"),
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> list[CaseSummaryItem]:
    """
    List cases accessible to current reviewer.
    Enforces strict campus boundary (or all if SYSTEM_ADMIN).
    """
    campus_filter = None if ctx.role == SecurityRole.SYSTEM_ADMIN else ctx.campus_id
    return repo.list_cases(campus_id=campus_filter, status=status_filter)


# -----------------------------------------------------------------------------
# Screen B & D: Case Detail & Evidence Ledger
# -----------------------------------------------------------------------------

@router.get("/cases/{case_id}", response_model=CaseDetailResponse)
def get_case(
    case_id: str,
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> CaseDetailResponse:
    """Retrieve complete case details, 4-agent evidence lineage, and audit timeline."""
    detail = repo.get_case_detail(case_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")

    ctx.authorize_case_access(detail.case.campus_id, detail.case.record_id)
    return detail


# -----------------------------------------------------------------------------
# Screen C: Advisor Decision
# -----------------------------------------------------------------------------

@router.post("/cases/{case_id}/decision", response_model=CaseDetailResponse)
def submit_decision(
    case_id: str,
    payload: CaseDecisionRequest,
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> CaseDetailResponse:
    """
    Submit human review decision (APPROVE, MODIFY, REJECT, REQUEST_INFO).
    Atomically commits decision, plan versions, created tasks, and audit ledger.
    """
    # Verify case access
    case = repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")
    ctx.authorize_case_access(case.campus_id, case.record_id)

    try:
        updated_detail = repo.submit_advisor_decision(
            case_id=case_id,
            request=payload,
            actor_id=ctx.actor_id,
            actor_role=ctx.role.value,
            campus_id=ctx.campus_id,
        )
        return updated_detail
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


# -----------------------------------------------------------------------------
# Tasks & Follow-up
# -----------------------------------------------------------------------------

@router.get("/cases/{case_id}/tasks", response_model=list[TaskRecord])
def list_case_tasks(
    case_id: str,
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> list[TaskRecord]:
    """Retrieve actionable tasks created for an approved support plan."""
    detail = repo.get_case_detail(case_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")
    ctx.authorize_case_access(detail.case.campus_id, detail.case.record_id)
    return detail.tasks


@router.patch("/tasks/{task_id}/status", response_model=TaskRecord)
def update_task_status(
    task_id: str,
    payload: TaskStatusUpdateRequest,
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> TaskRecord:
    """
    Update execution status of an authorized task.
    CRITICAL: Does not modify or infer student course outcome.
    """
    try:
        updated_task = repo.update_task_status(
            task_id=task_id,
            request=payload,
            actor_id=ctx.actor_id,
            actor_role=ctx.role.value,
            campus_id=ctx.campus_id,
        )
        return updated_task
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.post("/cases/{case_id}/follow-up", response_model=FollowUpRecord)
def create_follow_up(
    case_id: str,
    payload: FollowUpCreateRequest,
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> FollowUpRecord:
    """Record manual advisor note, student check-in, or follow-up observation."""
    case = repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")
    ctx.authorize_case_access(case.campus_id, case.record_id)

    try:
        fu = repo.create_follow_up(
            case_id=case_id,
            request=payload,
            actor_id=ctx.actor_id,
            actor_role=ctx.role.value,
            campus_id=ctx.campus_id,
        )
        return fu
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/cases/{case_id}/outcome", response_model=CaseRecord)
def record_outcome(
    case_id: str,
    payload: OutcomeRecordRequest,
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> CaseRecord:
    """
    Record distinct student course outcome.
    Strictly decoupled from task execution history.
    """
    case = repo.get_case(case_id)
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")
    ctx.authorize_case_access(case.campus_id, case.record_id)

    try:
        updated_case = repo.record_outcome(
            case_id=case_id,
            request=payload,
            actor_id=ctx.actor_id,
            actor_role=ctx.role.value,
            campus_id=ctx.campus_id,
        )
        return updated_case
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# -----------------------------------------------------------------------------
# Audit Ledger Integrity Verification
# -----------------------------------------------------------------------------

@router.get("/audit/verify", response_model=AuditVerificationResult)
def verify_audit(
    case_id: Optional[str] = Query(None),
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> AuditVerificationResult:
    """
    Verify tamper-evident SHA-256 hash chain consistency across the audit ledger.
    Detects any altered event, broken pointer, or payload tampering.
    """
    return repo.verify_audit_ledger(case_id=case_id)


# -----------------------------------------------------------------------------
# Synthetic Scenario Seeding Endpoint
# -----------------------------------------------------------------------------

class SeedCaseRequest(BaseModel):
    scenario_name: str = "LOW_ENGAGEMENT_AT_RISK"
    campus_id: Optional[str] = None


@router.post("/cases/seed", response_model=CaseDetailResponse)
def seed_synthetic_case(
    payload: SeedCaseRequest,
    request: Request,
    repo: CaseRepository = Depends(get_case_repo),
    ctx: SecurityContext = Depends(get_current_security_context),
) -> CaseDetailResponse:
    """
    Seed reproducible synthetic case using real ML model inference & 4-agent triage pipeline.
    """
    campus_id = payload.campus_id or ctx.campus_id

    # 1. Load named scenario
    scenarios_file = Path("ml/data/synthetic/named_scenarios.json")
    if not scenarios_file.exists():
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Synthetic scenarios file not found.")

    with open(scenarios_file, "r") as f:
        named_scenarios = json.load(f)

    scenario_data = named_scenarios.get(payload.scenario_name)
    if not scenario_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Scenario '{payload.scenario_name}' not found. Available: {list(named_scenarios.keys())}",
        )

    # Clean description field if present
    feature_dict = {k: v for k, v in scenario_data.items() if k != "description"}
    student_input = StudentFeatureInput(**feature_dict)

    # 2. Run real ML inference predictor to produce authentic EvidenceCard
    predictor: Optional[SutraRiskPredictor] = getattr(request.app.state, "predictor", None)
    if predictor is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML Risk Predictor is not loaded in application state.",
        )

    prediction_result = predictor.predict_single(
        feature_data=student_input.to_feature_dict(),
        record_id=student_input.record_id,
        module_code=student_input.code_module,
        presentation_code=student_input.code_presentation,
    )

    evidence_packet = EvidencePacket(
        student_input=student_input,
        evidence_card=prediction_result.evidence_card,
        campus_id=campus_id,
        snapshot_day=30,
    )

    # 3. Setup four-stage pipeline mock responses grounded in actual evidence
    mock_provider = MockLLMClient()

    stage_1_interpretation = SignalInterpretation(
        summary=(
            f"Day-30 telemetry for {student_input.record_id} shows severe inactivity. "
            f"The learner logged in on only {student_input.vle_active_days_d30:.0f} active days "
            f"and has had no LMS clicks for {student_input.vle_days_since_last_click:.0f} consecutive days."
        ),
        velocity_assessment="LMS engagement velocity dropped to zero in the past 7 days (0.0 clicks recorded).",
        evidence_references=[
            EvidenceReference(
                feature_name="vle_active_days_d30",
                cited_value=student_input.vle_active_days_d30,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
                rationale="Only 2 active learning days out of 30 expected days",
            ),
            EvidenceReference(
                feature_name="vle_days_since_last_click",
                cited_value=student_input.vle_days_since_last_click,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
                rationale="22-day dormancy indicates near-complete platform disengagement",
            ),
            EvidenceReference(
                feature_name="assessments_submitted_d30",
                cited_value=student_input.assessments_submitted_d30,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
                rationale="Zero early assessment submissions submitted",
            ),
        ],
        missing_or_stale_indicators=[
            "No course forum interactions recorded (vle_clicks_forumng_d30 = 0.0)",
            "Assessment submission window pending confirmation",
        ],
        requires_human_review=True,
        information_requests=[
            "Confirm whether student reported LMS credentials or hardware access barriers",
        ],
    )

    stage_2_proposal = InterventionProposal(
        selected_intervention_id="INT-VLE-ONBOARD-01",
        rationale=(
            "Digital onboarding outreach is policy-aligned for students experiencing early "
            "platform dormancy and zero forum engagement."
        ),
        target_role="ACADEMIC_ADVISOR",
        alternative_intervention_ids=["INT-PEER-CONNECT-01"],
        evidence_references=[
            EvidenceReference(
                feature_name="vle_days_since_last_click",
                cited_value=student_input.vle_days_since_last_click,
                claim_kind=ClaimKind.VERIFIED_OBSERVATION,
            )
        ],
    )

    stage_3_plan = SupportPlanDraft(
        plan_title="[SYNTHETIC DEMO] Proactive LMS Re-engagement & Advisory Check-in",
        target_window_days=14,
        is_draft=True,
        rationale=(
            "Structured three-stage supportive contact: verify login technical status, "
            "provide peer connection, and review upcoming module deadlines."
        ),
        action_steps=[
            ActionStep(
                step_number=1,
                step_id="STEP-1",
                action_description="Conduct 15-minute diagnostic phone/email check-in to verify platform access.",
                suggested_role="ACADEMIC_ADVISOR",
                target_days=3,
                evidence_reference="vle_days_since_last_click",
                follow_up_evidence="Documented contact note recording student's active access status",
            ),
            ActionStep(
                step_number=2,
                step_id="STEP-2",
                action_description="Introduce student to module peer mentor study circle.",
                suggested_role="PEER_MENTOR",
                target_days=7,
                evidence_reference="vle_clicks_forumng_d30",
                follow_up_evidence="Peer circle invitation sent and mentor acknowledgment recorded",
            ),
            ActionStep(
                step_number=3,
                step_id="STEP-3",
                action_description="Academic follow-up to plan submission for first formative assessment.",
                suggested_role="STUDENT_SUCCESS_COACH",
                target_days=14,
                evidence_reference="assessments_submitted_d30",
                follow_up_evidence="Review session completed and submission plan recorded",
            ),
        ],
        evidence_requirements=[
            "Direct advisor contact confirmation within 3 days",
            "Peer mentor outreach acknowledgment within 7 days",
        ],
        limitations_and_questions=[
            "Advisor should confirm if student has external employment or caregiver commitments",
        ],
    )

    stage_4_challenge = EvidenceChallengeReport(
        critique_summary="Plan is policy-compliant. Advisory challenge: assumptions regarding tech access should be explicitly verified.",
        unsupported_claims=[],
        catalog_divergences=[],
        unjustified_certainty_flags=[
            "Plan assumes non-participation is due to navigation rather than personal/health factors."
        ],
        flags_count=1,
        findings=[
            ChallengeFinding(
                target="plan.rationale",
                severity=ValidationSeverity.WARNING,
                reason="Advisory: Advisor should verify external life commitments before assuming LMS difficulty alone.",
                evidence_reference="vle_days_since_last_click",
            )
        ],
    )

    mock_provider.register_response(SignalInterpretation, stage_1_interpretation)
    mock_provider.register_response(InterventionProposal, stage_2_proposal)
    mock_provider.register_response(SupportPlanDraft, stage_3_plan)
    mock_provider.register_response(EvidenceChallengeReport, stage_4_challenge)

    coordinator = OrchestrationCoordinator(provider=mock_provider)
    result = coordinator.run_pipeline(
        evidence_packet=evidence_packet,
        security_context=ctx,
        max_active_stages=4,
    )

    # 4. Atomically persist case
    repo.create_case_from_run(
        result=result,
        campus_id=campus_id,
        student_input_features=student_input.to_feature_dict(),
        actor_id=ctx.actor_id,
        actor_role=ctx.role.value,
    )

    detail = repo.get_case_detail(f"CASE-{student_input.record_id}")
    if not detail:
        raise RuntimeError(f"Failed to retrieve seeded case CASE-{student_input.record_id}")
    return detail
