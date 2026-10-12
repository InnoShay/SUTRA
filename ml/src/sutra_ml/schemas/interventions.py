"""
SUTRA Intervention Orchestration Workflow Schemas.

Defines Pydantic v2 schemas and state machine definitions for the CODEX 3.0 PS6
Student Success and Intervention Orchestration Engine.

MANDATORY ETHICAL & GOVERNANCE PRINCIPLES:
1. Strict Separation: A recommended action != an approved action != an assigned task != a completed intervention.
2. Mandatory Human Review: No automated outreach or intervention assignment without authorized human review.
3. Non-Punitive: All interventions are supportive resources; punitive disciplinary actions are prohibited.
4. Confidentiality Routing: Financial-aid signals and sensitive cases are strictly restricted to authorized roles.
5. Zero External Side Effects: All assignees, actions, follow-ups, and outcomes are simulated.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from sutra_ml.schemas.multisource import AssignedRole, SignalCategory, SignalSeverity


class CaseStatus(str, Enum):
    """Explicit lifecycle states for an intervention case."""
    RECOMMENDED = "RECOMMENDED"                   # System-generated rule proposal from risk signals
    AWAITING_REVIEW = "AWAITING_REVIEW"           # Queued for advisor / specialist review
    APPROVED = "APPROVED"                         # Human reviewer agreed support is warranted
    ASSIGNED = "ASSIGNED"                         # Assigned to designated role/staff with due date
    IN_PROGRESS = "IN_PROGRESS"                   # Outreach or supportive session initiated
    FOLLOW_UP_RECORDED = "FOLLOW_UP_RECORDED"     # Contact attempt and delivery notes recorded
    CLOSED = "CLOSED"                             # Case concluded with documented outcome
    REJECTED = "REJECTED"                         # Human reviewer declined recommendation with rationale
    CANCELLED = "CANCELLED"                       # Case cancelled prior to completion with recorded reason


class InterventionType(str, Enum):
    """Categorized supportive intervention workflows."""
    ADVISOR_CHECK_IN = "ADVISOR_CHECK_IN"                     # Holistic obstacle identification
    ACADEMIC_TUTORING = "ACADEMIC_TUTORING"                   # Coursework, quiz, or midterm support
    ATTENDANCE_SUPPORT_MEETING = "ATTENDANCE_SUPPORT_MEETING" # Non-punitive attendance problem solving
    FINANCIAL_AID_REFERRAL = "FINANCIAL_AID_REFERRAL"         # Bursar / scholarship / payment plan consultation
    CAREER_COACHING = "CAREER_COACHING"                       # Resume review, interview prep, skill building
    WELLBEING_REFERRAL = "WELLBEING_REFERRAL"                 # Non-diagnostic student counseling liaison


class CasePriority(str, Enum):
    """Intervention case priority ranking."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class OutcomeCategory(str, Enum):
    """Standardized outcome categories for completed or reviewed interventions."""
    SUPPORT_DELIVERED_FOLLOW_UP_REQUIRED = "SUPPORT_DELIVERED_FOLLOW_UP_REQUIRED"
    STUDENT_ENGAGEMENT_IMPROVED = "STUDENT_ENGAGEMENT_IMPROVED"
    NO_MEASURABLE_CHANGE = "NO_MEASURABLE_CHANGE"
    UNABLE_TO_CONTACT = "UNABLE_TO_CONTACT"
    REFERRED_TO_ANOTHER_SERVICE = "REFERRED_TO_ANOTHER_SERVICE"
    CASE_CLOSED_AFTER_REVIEW = "CASE_CLOSED_AFTER_REVIEW"


class EscalationLevel(str, Enum):
    """Internal workflow escalation levels for overdue tasks."""
    NORMAL = "NORMAL"
    OVERDUE_FLAGGED = "OVERDUE_FLAGGED"
    SUPERVISOR_NOTIFIED = "SUPERVISOR_NOTIFIED"


class AuditEvent(BaseModel):
    """Immutable audit trail entry documenting each transition."""
    model_config = ConfigDict(extra="forbid")

    event_id: str = Field(..., description="Unique event ID, e.g. 'EVT-001'")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp")
    from_status: CaseStatus = Field(..., description="Prior state")
    to_status: CaseStatus = Field(..., description="New state")
    actor_role: str = Field(..., description="Role of person who made the change")
    actor_id: str = Field(..., description="Identifier of the actor, e.g. 'STAFF-ADV-01'")
    action: str = Field(..., description="Action name, e.g. 'APPROVE_RECOMMENDATION'")
    rationale: str = Field(..., description="Documented justification for the transition")


class InterventionCase(BaseModel):
    """Comprehensive intervention case record."""
    model_config = ConfigDict(extra="forbid")

    case_id: str = Field(..., description="Unique case key, e.g. 'CASE-2026-001'")
    student_key: str = Field(..., description="Target synthetic student key, e.g. 'SYNTH-360-001'")
    scenario_name: Optional[str] = Field(default=None, description="Synthetic demonstration scenario name")

    # Source Signal Context
    source_signal_id: str = Field(..., description="Originating RiskSignal ID")
    source_signal_category: SignalCategory = Field(...)
    source_signal_severity: SignalSeverity = Field(...)
    evidence_summary: dict[str, Any] = Field(..., description="Snapshot of empirical evidence at creation")

    # Intervention Details
    intervention_type: InterventionType = Field(...)
    priority: CasePriority = Field(default=CasePriority.MEDIUM)
    status: CaseStatus = Field(default=CaseStatus.RECOMMENDED)

    # Human Review Gate
    is_human_reviewed: bool = Field(default=False)
    reviewer_role: Optional[str] = Field(default=None)
    reviewer_id: Optional[str] = Field(default=None)
    review_notes: Optional[str] = Field(default=None)
    reviewed_at: Optional[str] = Field(default=None)

    # Assignment & Deadlines
    assigned_role: Optional[AssignedRole] = Field(default=None)
    assignee_id: Optional[str] = Field(default=None, description="Synthetic staff ID, e.g. 'STAFF-ADV-02'")
    created_at: str = Field(..., description="ISO timestamp")
    due_date: Optional[str] = Field(default=None, description="ISO date YYYY-MM-DD")
    is_overdue: bool = Field(default=False)
    escalation_level: EscalationLevel = Field(default=EscalationLevel.NORMAL)

    # Follow-Up Recording
    follow_up_notes: Optional[str] = Field(default=None)
    follow_up_timestamp: Optional[str] = Field(default=None)
    follow_up_method: Optional[str] = Field(default=None, description="Simulated modality: In-Person, Video, LMS Note")

    # Outcome Recording
    outcome_category: Optional[OutcomeCategory] = Field(default=None)
    outcome_notes: Optional[str] = Field(default=None)
    outcome_date: Optional[str] = Field(default=None)
    next_review_date: Optional[str] = Field(default=None)

    # Rejection / Cancellation
    decision_rationale: Optional[str] = Field(default=None)

    # Governance & Privacy Boundaries
    is_confidential: bool = Field(default=False, description="Whether restricted to financial aid role")
    is_synthetic: bool = Field(default=True, description="Strict synthetic marker")

    # Audit Trail
    audit_history: List[AuditEvent] = Field(default_factory=list)

    @field_validator("student_key")
    @classmethod
    def validate_synthetic_key(cls, v: str) -> str:
        if not v.startswith("SYNTH-"):
            raise ValueError(f"Student key '{v}' must begin with 'SYNTH-'.")
        return v


# =========================================================================
# Request and Mutation Models
# =========================================================================

class CreateCaseRequest(BaseModel):
    """Payload to instantiate a case from a risk signal."""
    model_config = ConfigDict(extra="forbid")

    student_key: str
    signal_id: str
    intervention_type: InterventionType
    priority: CasePriority = CasePriority.MEDIUM
    created_by_role: str = "SYSTEM_RECOMMENDER"
    created_by_id: str = "SYS-ENGINE"
    notes: Optional[str] = "Generated from explainable risk signal rule."


class ReviewCaseRequest(BaseModel):
    """Reviewer decision: approve or reject recommendation."""
    model_config = ConfigDict(extra="forbid")

    reviewer_role: str = Field(..., description="Role of reviewer, e.g. 'ACADEMIC_ADVISOR'")
    reviewer_id: str = Field(..., description="Identifier of reviewer, e.g. 'STAFF-ADV-01'")
    approved: bool = Field(..., description="True to approve, False to reject")
    rationale: str = Field(..., min_length=5, description="Required justification for decision")
    override_intervention_type: Optional[InterventionType] = None
    override_priority: Optional[CasePriority] = None


class AssignCaseRequest(BaseModel):
    """Assign an approved case to a stakeholder with a deadline."""
    model_config = ConfigDict(extra="forbid")

    assigned_by_role: str = Field(...)
    assigned_by_id: str = Field(...)
    assigned_role: AssignedRole = Field(...)
    assignee_id: str = Field(..., min_length=2, description="Synthetic assignee ID, e.g. 'STAFF-ADV-05'")
    due_date: str = Field(..., description="Target completion date YYYY-MM-DD")
    assignment_notes: str = Field(default="Standard supportive follow-up assignment.")


class StartProgressRequest(BaseModel):
    """Transition assigned case to IN_PROGRESS."""
    model_config = ConfigDict(extra="forbid")

    actor_role: str
    actor_id: str
    notes: str = Field(default="Outreach initiated with student in simulated scenario.")


class RecordFollowUpRequest(BaseModel):
    """Document completed outreach or supportive meeting."""
    model_config = ConfigDict(extra="forbid")

    actor_role: str
    actor_id: str
    follow_up_notes: str = Field(..., min_length=10, description="Detailed notes on discussion and obstacles")
    follow_up_method: str = Field(default="In-Person Advising Session")
    follow_up_timestamp: Optional[str] = None


class RecordOutcomeRequest(BaseModel):
    """Conclude case with documented outcome and rationale."""
    model_config = ConfigDict(extra="forbid")

    actor_role: str
    actor_id: str
    outcome_category: OutcomeCategory
    outcome_notes: str = Field(..., min_length=10, description="Observations and next supportive recommendations")
    outcome_date: Optional[str] = None
    next_review_date: Optional[str] = None
    close_case: bool = Field(default=True, description="Whether to transition to CLOSED")


class CancelCaseRequest(BaseModel):
    """Cancel an active case with recorded rationale."""
    model_config = ConfigDict(extra="forbid")

    actor_role: str
    actor_id: str
    cancellation_reason: str = Field(..., min_length=5)


class EscalateCaseRequest(BaseModel):
    """Manually or rule-escalate an overdue case."""
    model_config = ConfigDict(extra="forbid")

    actor_role: str
    actor_id: str
    escalation_reason: str = Field(default="Intervention due date elapsed without documented follow-up.")


# =========================================================================
# State Machine Validation Helper
# =========================================================================

VALID_STATE_TRANSITIONS: dict[CaseStatus, set[CaseStatus]] = {
    CaseStatus.RECOMMENDED: {
        CaseStatus.AWAITING_REVIEW,
        CaseStatus.APPROVED,
        CaseStatus.REJECTED,
        CaseStatus.CANCELLED,
    },
    CaseStatus.AWAITING_REVIEW: {
        CaseStatus.APPROVED,
        CaseStatus.REJECTED,
        CaseStatus.CANCELLED,
    },
    CaseStatus.APPROVED: {
        CaseStatus.ASSIGNED,
        CaseStatus.CANCELLED,
    },
    CaseStatus.ASSIGNED: {
        CaseStatus.IN_PROGRESS,
        CaseStatus.FOLLOW_UP_RECORDED,
        CaseStatus.CANCELLED,
    },
    CaseStatus.IN_PROGRESS: {
        CaseStatus.FOLLOW_UP_RECORDED,
        CaseStatus.CLOSED,
        CaseStatus.CANCELLED,
    },
    CaseStatus.FOLLOW_UP_RECORDED: {
        CaseStatus.CLOSED,
        CaseStatus.IN_PROGRESS,  # If further follow-up sessions are required
        CaseStatus.CANCELLED,
    },
    CaseStatus.CLOSED: set(),     # Terminal state
    CaseStatus.REJECTED: set(),   # Terminal state
    CaseStatus.CANCELLED: set(),  # Terminal state
}


def is_valid_transition(from_state: CaseStatus, to_state: CaseStatus) -> bool:
    """Validate whether requested transition is legal according to workflow state machine."""
    allowed = VALID_STATE_TRANSITIONS.get(from_state, set())
    return to_state in allowed
