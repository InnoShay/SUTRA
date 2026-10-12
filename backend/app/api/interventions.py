"""
FastAPI endpoints for SUTRA Intervention Orchestration Workflow.

Provides REST API endpoints for:
1. Browsing 360-degree synthetic student profiles and risk signals.
2. Reviewing, approving, assigning, tracking, and closing intervention cases.
3. Overdue detection and internal escalation.
4. Role-based confidentiality filtering for sensitive financial-aid data.
5. Cohort-level dynamic metrics aggregation.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Header, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse, JSONResponse

from sutra_ml.interventions.engine import (
    DEFAULT_SIMULATION_DATE,
    InterventionWorkflowEngine,
)
from sutra_ml.interventions.store import InterventionCaseStore
from sutra_ml.schemas.interventions import (
    AssignCaseRequest,
    AuditEvent,
    CancelCaseRequest,
    CasePriority,
    CaseStatus,
    CreateCaseRequest,
    EscalateCaseRequest,
    InterventionCase,
    InterventionType,
    OutcomeCategory,
    RecordFollowUpRequest,
    RecordOutcomeRequest,
    ReviewCaseRequest,
    StartProgressRequest,
)
from sutra_ml.schemas.multisource import (
    AssignedRole,
    StudentSuccess360Profile,
)
from sutra_ml.signals.risk_signal_engine import RiskSignal, RiskSignalEngine

logger = logging.getLogger("sutra.api.interventions")

router = APIRouter(tags=["Interventions"])

# Singleton engine & store instances for the demonstration backend
_store = InterventionCaseStore()
_engine = InterventionWorkflowEngine(store=_store)
_signal_engine = RiskSignalEngine()


def _get_profiles_cache() -> Dict[str, StudentSuccess360Profile]:
    """Load synthetic profiles from disk."""
    cache: Dict[str, StudentSuccess360Profile] = {}
    scenarios_path = Path("ml/data/synthetic/multisource_scenarios.json")
    if scenarios_path.exists():
        with open(scenarios_path, "r", encoding="utf-8") as f:
            scenarios_raw = json.load(f)
        for name, data in scenarios_raw.items():
            profile = StudentSuccess360Profile.model_validate(data)
            cache[profile.student_key] = profile

    batch_path = Path("ml/data/synthetic/multisource_batch_100.json")
    if batch_path.exists():
        with open(batch_path, "r", encoding="utf-8") as f:
            batch_raw = json.load(f)
        for data in batch_raw:
            profile = StudentSuccess360Profile.model_validate(data)
            cache[profile.student_key] = profile
    return cache


@router.get("/profiles", summary="List Synthetic Student Profiles")
def list_profiles(
    scenario: Optional[str] = Query(None, description="Filter by scenario name"),
    user_role: str = Query("ACADEMIC_ADVISOR", description="Current user role for confidentiality check"),
) -> List[Dict[str, Any]]:
    """
    List synthetic student profiles with evaluated risk summaries.
    """
    profiles = _get_profiles_cache()
    results = []

    for key, p in profiles.items():
        if scenario and p.scenario_name != scenario:
            continue

        eval_res = _signal_engine.evaluate_profile(p)
        active_signals = eval_res.signals
        if user_role == AssignedRole.FINANCIAL_AID_COUNSELOR.value:
            active_signals = active_signals + eval_res.confidential_signals

        summary = {
            "student_key": p.student_key,
            "scenario_name": p.scenario_name,
            "department": p.department,
            "program_year": p.program_year,
            "academic_term": p.academic_term,
            "overall_attendance_pct": p.attendance.overall_attendance_pct,
            "cumulative_gpa": p.academics.cumulative_gpa,
            "active_learning_days": p.participation.active_learning_days_d30,
            "placement_tier": p.skills_placement.placement_readiness_tier.value,
            "signals_count": len(active_signals),
            "requires_urgent_review": eval_res.requires_urgent_human_review,
            "is_synthetic": True,
        }
        results.append(summary)

    return results


@router.get("/profiles/{student_key}", summary="Get Full 360 Student Profile with Signals")
def get_profile(
    student_key: str,
    user_role: str = Query("ACADEMIC_ADVISOR", description="Current user role for confidentiality check"),
) -> Dict[str, Any]:
    """
    Fetch a complete 360 profile with evaluated risk signals.
    RESTRICTED: Sensitive fee details and confidential signals are masked unless user_role is FINANCIAL_AID_COUNSELOR.
    """
    profiles = _get_profiles_cache()
    if student_key not in profiles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Synthetic student profile '{student_key}' not found."
        )

    profile = profiles[student_key]
    eval_res = _signal_engine.evaluate_profile(profile)

    p_dict = profile.model_dump(mode="json")

    # Confidentiality gating: mask fee information if not authorized
    is_financial_role = (user_role == AssignedRole.FINANCIAL_AID_COUNSELOR.value)
    if not is_financial_role:
        p_dict["fee_status"] = {
            "status": "RESTRICTED",
            "access_restriction_level": "RESTRICTED_FINANCIAL_AID_ONLY",
            "note": "Fee status and financial hold information are confidential to Financial Aid Counselors.",
            "has_financial_hold": False,
            "days_past_due": 0,
            "financial_aid_status": "RESTRICTED",
            "bursary_eligibility_flag": False,
        }
        visible_signals = eval_res.signals
    else:
        visible_signals = eval_res.signals + eval_res.confidential_signals

    return {
        "profile": p_dict,
        "risk_signals": [s.model_dump(mode="json") for s in visible_signals],
        "confidential_signals_count": len(eval_res.confidential_signals),
        "requires_urgent_review": eval_res.requires_urgent_human_review,
        "user_role_context": user_role,
        "is_synthetic": True,
    }


@router.get("/cases", summary="List Intervention Cases")
def list_cases(
    status_filter: Optional[CaseStatus] = Query(None, alias="status"),
    student_key: Optional[str] = Query(None),
    assigned_role: Optional[AssignedRole] = Query(None),
    is_overdue: Optional[bool] = Query(None),
    user_role: str = Query("ACADEMIC_ADVISOR"),
) -> List[InterventionCase]:
    """
    List intervention cases with filtering and role-based confidentiality gating.
    """
    _engine.check_and_update_overdue_statuses()
    cases = _store.load_all()

    is_financial = (user_role == AssignedRole.FINANCIAL_AID_COUNSELOR.value)

    results = []
    for c in cases:
        if c.is_confidential and not is_financial:
            continue
        if status_filter and c.status != status_filter:
            continue
        if student_key and c.student_key != student_key:
            continue
        if assigned_role and c.assigned_role != assigned_role:
            continue
        if is_overdue is not None and c.is_overdue != is_overdue:
            continue
        results.append(c)

    return results


@router.get("/cases/{case_id}", summary="Get Intervention Case Details")
def get_case(
    case_id: str,
    user_role: str = Query("ACADEMIC_ADVISOR"),
) -> InterventionCase:
    """
    Retrieve single intervention case with full audit trail.
    """
    case = _store.get_by_id(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intervention case '{case_id}' not found."
        )

    is_financial = (user_role == AssignedRole.FINANCIAL_AID_COUNSELOR.value)
    if case.is_confidential and not is_financial:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Case is classified confidential and restricted to Financial Aid Counselors."
        )

    return case


@router.post("/cases", summary="Create Intervention Case from Signal", status_code=status.HTTP_201_CREATED)
def create_case(payload: CreateCaseRequest) -> InterventionCase:
    """
    Instantiate a new intervention recommendation from a signal.
    """
    profiles = _get_profiles_cache()
    if payload.student_key not in profiles:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Synthetic student profile '{payload.student_key}' not found."
        )

    profile = profiles[payload.student_key]
    eval_res = _signal_engine.evaluate_profile(profile)
    all_signals = eval_res.signals + eval_res.confidential_signals

    matching_signal = next((s for s in all_signals if s.signal_id == payload.signal_id), None)
    if not matching_signal:
        # Fallback synthesis for demo custom signal
        matching_signal = RiskSignal(
            signal_id=payload.signal_id,
            category=SignalCategory.ATTENDANCE,
            severity=SignalSeverity.HIGH,
            title="Advisory Attention Needed",
            evidence={"student_key": payload.student_key},
            rule_description="Manual signal selection from profile",
            observation_freshness="1d",
            confidence_limitation="Simulated scenario rule",
            recommended_action="Supportive check-in",
            assigned_role=AssignedRole.ACADEMIC_ADVISOR,
            is_confidential=False,
        )

    case = _engine.create_case_from_signal(
        student_key=payload.student_key,
        signal=matching_signal,
        scenario_name=profile.scenario_name,
        override_type=payload.intervention_type,
        priority=payload.priority,
        actor_role=payload.created_by_role,
        actor_id=payload.created_by_id,
    )
    return case


@router.post("/cases/{case_id}/review", summary="Review Intervention Proposal (Approve/Reject)")
def review_case(case_id: str, payload: ReviewCaseRequest) -> InterventionCase:
    """
    Human reviewer gate: approve or reject recommendation with mandatory rationale.
    """
    try:
        case = _engine.review_case(
            case_id=case_id,
            reviewer_role=payload.reviewer_role,
            reviewer_id=payload.reviewer_id,
            approved=payload.approved,
            rationale=payload.rationale,
            override_intervention_type=payload.override_intervention_type,
            override_priority=payload.override_priority,
        )
        return case
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/cases/{case_id}/assign", summary="Assign Case to Stakeholder with Deadline")
def assign_case(case_id: str, payload: AssignCaseRequest) -> InterventionCase:
    """
    Assign an approved case to a stakeholder role with synthetic assignee ID and due date.
    SAFEGUARD: Fails closed if case has not been reviewed and approved by a human.
    """
    try:
        case = _engine.assign_case(
            case_id=case_id,
            assigned_by_role=payload.assigned_by_role,
            assigned_by_id=payload.assigned_by_id,
            assigned_role=payload.assigned_role,
            assignee_id=payload.assignee_id,
            due_date=payload.due_date,
            assignment_notes=payload.assignment_notes,
        )
        return case
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/cases/{case_id}/progress", summary="Transition Case to In-Progress")
def start_progress(case_id: str, payload: StartProgressRequest) -> InterventionCase:
    """
    Mark that stakeholder outreach or supportive work has begun.
    """
    try:
        case = _engine.start_progress(
            case_id=case_id,
            actor_role=payload.actor_role,
            actor_id=payload.actor_id,
            notes=payload.notes,
        )
        return case
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/cases/{case_id}/follow-up", summary="Record Follow-Up Notes and Delivery")
def record_follow_up(case_id: str, payload: RecordFollowUpRequest) -> InterventionCase:
    """
    Document interaction details, student barriers identified, and delivered support.
    """
    try:
        case = _engine.record_follow_up(
            case_id=case_id,
            actor_role=payload.actor_role,
            actor_id=payload.actor_id,
            follow_up_notes=payload.follow_up_notes,
            follow_up_method=payload.follow_up_method,
            follow_up_timestamp=payload.follow_up_timestamp,
        )
        return case
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/cases/{case_id}/outcome", summary="Record Case Outcome and Conclude")
def record_outcome(case_id: str, payload: RecordOutcomeRequest) -> InterventionCase:
    """
    Record observed synthetic outcome, human assessment, and conclude case or schedule review.
    """
    try:
        case = _engine.record_outcome(
            case_id=case_id,
            actor_role=payload.actor_role,
            actor_id=payload.actor_id,
            outcome_category=payload.outcome_category,
            outcome_notes=payload.outcome_notes,
            close_case=payload.close_case,
            outcome_date=payload.outcome_date,
            next_review_date=payload.next_review_date,
        )
        return case
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/cases/{case_id}/cancel", summary="Cancel Active Case")
def cancel_case(case_id: str, payload: CancelCaseRequest) -> InterventionCase:
    """
    Cancel an active case with recorded rationale.
    """
    try:
        case = _engine.cancel_case(
            case_id=case_id,
            actor_role=payload.actor_role,
            actor_id=payload.actor_id,
            cancellation_reason=payload.cancellation_reason,
        )
        return case
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/cases/{case_id}/escalate", summary="Escalate Overdue Case (Internal Triage Flag)")
def escalate_case(case_id: str, payload: EscalateCaseRequest) -> InterventionCase:
    """
    Escalate an overdue case according to explicit escalation policy.
    SAFEGUARD: Sets internal workflow triage flags only; never contacts real individuals.
    """
    try:
        case = _engine.escalate_case(
            case_id=case_id,
            actor_role=payload.actor_role,
            actor_id=payload.actor_id,
            escalation_reason=payload.escalation_reason,
        )
        return case
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/cohort-metrics", summary="Dynamic Cohort-Level Aggregated Metrics")
def get_cohort_metrics(
    user_role: str = Query("ACADEMIC_ADVISOR", description="Role requesting cohort aggregates"),
) -> Dict[str, Any]:
    """
    Dynamic aggregated cohort metrics calculated from actual case records and synthetic profiles.
    Never hardcoded. Automatically reflects state changes.
    """
    return _engine.compute_cohort_metrics(user_role=user_role)


@router.post("/reset", summary="Reset Demonstration Store to Seed")
def reset_store() -> Dict[str, Any]:
    """
    Reset intervention storage to standard demonstration state.
    """
    cases = _store.reset_to_seed()
    return {
        "message": "Intervention demonstration store reset to initial seed.",
        "case_count": len(cases),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
