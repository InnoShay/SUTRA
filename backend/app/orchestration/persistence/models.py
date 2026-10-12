"""
Data models and lifecycle schemas for SUTRA Support Evidence Ledger (Phase 4).
"""

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.orchestration.contracts import (
    ActionStep,
    EvidenceChallengeReport,
    InterventionProposal,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    SupportPlanDraft,
    ValidationSummary,
)
from sutra_ml.schemas.evidence_card import SutraEvidenceCard


class CaseStatus(str, Enum):
    """Lifecycle status of a student support case."""
    DRAFT_AWAITING_REVIEW = "DRAFT_AWAITING_REVIEW"
    INFORMATION_REQUESTED = "INFORMATION_REQUESTED"
    REJECTED = "REJECTED"
    APPROVED = "APPROVED"
    IN_PROGRESS = "IN_PROGRESS"
    TASKS_COMPLETED = "TASKS_COMPLETED"
    CLOSED = "CLOSED"


class AdvisorDecisionKind(str, Enum):
    """Decision action submitted by human advisor."""
    APPROVE = "APPROVE"
    MODIFY = "MODIFY"
    REJECT = "REJECT"
    REQUEST_INFO = "REQUEST_INFO"


class TaskStatus(str, Enum):
    """Execution status of an authorized support task."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class OutcomeStatus(str, Enum):
    """Student course outcome status (strictly distinct from task execution)."""
    UNOBSERVED = "UNOBSERVED"
    IN_PROGRESS = "IN_PROGRESS"
    RECORDED = "RECORDED"


# -----------------------------------------------------------------------------
# Persistence Record Schemas
# -----------------------------------------------------------------------------

class CaseRecord(BaseModel):
    """Authoritative case header record."""
    model_config = ConfigDict(extra="forbid")

    case_id: str
    record_id: str
    campus_id: str
    status: CaseStatus
    current_plan_version: int = 1
    evidence_fingerprint: str
    run_id: str
    risk_probability: float
    risk_tier: str
    operational_threshold: float = 0.46
    review_recommended: bool = True
    outcome_status: OutcomeStatus = OutcomeStatus.UNOBSERVED
    outcome_summary: Optional[str] = None
    outcome_recorded_at: Optional[str] = None
    outcome_recorded_by: Optional[str] = None
    created_at: str
    updated_at: str


class PlanVersionRecord(BaseModel):
    """Versioned draft or approved support plan."""
    model_config = ConfigDict(extra="forbid")

    plan_id: str
    case_id: str
    version_number: int
    plan_hash: str
    is_advisor_modified: bool = False
    plan_title: str
    target_window_days: int
    rationale: str = ""
    action_steps: list[ActionStep]
    evidence_requirements: list[str] = Field(default_factory=list)
    limitations_and_questions: list[str] = Field(default_factory=list)
    created_by: str
    created_at: str


class CaseDecisionRecord(BaseModel):
    """Immutable record of an advisor review decision."""
    model_config = ConfigDict(extra="forbid")

    decision_id: str
    case_id: str
    decision_kind: AdvisorDecisionKind
    actor_id: str
    actor_role: str
    reviewed_plan_version: int
    approved_plan_version: Optional[int] = None
    notes: str
    idempotency_key: Optional[str] = None
    created_at: str


class TaskRecord(BaseModel):
    """Authorized actionable task created upon plan approval."""
    model_config = ConfigDict(extra="forbid")

    task_id: str
    case_id: str
    plan_version: int
    step_number: int
    step_id: Optional[str] = None
    action_description: str
    assigned_role: str
    target_days: int
    due_date: Optional[str] = None
    status: TaskStatus = TaskStatus.PENDING
    evidence_reference: Optional[str] = None
    follow_up_evidence_required: Optional[str] = None
    completion_note: Optional[str] = None
    completed_at: Optional[str] = None
    completed_by: Optional[str] = None
    created_at: str


class FollowUpRecord(BaseModel):
    """Documented observation note or contact follow-up."""
    model_config = ConfigDict(extra="forbid")

    follow_up_id: str
    case_id: str
    task_id: Optional[str] = None
    actor_id: str
    actor_role: str
    observation_note: str
    evidence_reference: Optional[str] = None
    created_at: str


class AuditEventRecord(BaseModel):
    """Tamper-evident audit ledger event with cryptographic link."""
    model_config = ConfigDict(extra="forbid")

    seq_id: int
    event_id: str
    case_id: str
    event_type: str
    actor_id: str
    actor_role: str
    payload_canonical_json: str
    prev_entry_hash: str
    entry_hash: str
    timestamp: str


# -----------------------------------------------------------------------------
# API Request / Response Schemas
# -----------------------------------------------------------------------------

class CaseDecisionRequest(BaseModel):
    """Request payload for submitting an advisor decision."""
    decision_kind: AdvisorDecisionKind
    reviewed_plan_version: int
    notes: str
    modified_plan: Optional[SupportPlanDraft] = None
    idempotency_key: Optional[str] = None


class TaskStatusUpdateRequest(BaseModel):
    """Request payload for updating task execution status."""
    status: TaskStatus
    completion_note: Optional[str] = None


class FollowUpCreateRequest(BaseModel):
    """Request payload for recording a follow-up observation."""
    task_id: Optional[str] = None
    observation_note: str
    evidence_reference: Optional[str] = None


class OutcomeRecordRequest(BaseModel):
    """Request payload for recording student course outcome."""
    outcome_status: OutcomeStatus
    outcome_summary: str


class AuditVerificationResult(BaseModel):
    """Outcome of audit ledger integrity check."""
    is_valid: bool
    total_events: int
    verified_events: int
    corrupted_seq_id: Optional[int] = None
    message: str


class PipelineRunRecord(BaseModel):
    """Authoritative snapshot of four-stage pipeline run."""
    model_config = ConfigDict(extra="forbid")

    run_id: str
    case_id: str
    record_id: str
    status: RunStatus
    evidence_card_json: str
    signal_interpretation_json: Optional[str] = None
    intervention_proposal_json: Optional[str] = None
    support_plan_json: Optional[str] = None
    evidence_challenge_json: Optional[str] = None
    validation_summary_json: str
    created_at: str


class CaseSummaryItem(BaseModel):
    """Synthetic case summary item for Screen A Review Queue."""
    case_id: str
    record_id: str
    campus_id: str
    status: CaseStatus
    current_plan_version: int
    risk_probability: float
    risk_tier: str
    validation_passed: bool
    challenge_flags_count: int
    has_information_requests: bool
    outcome_status: OutcomeStatus
    created_at: str
    updated_at: str


class CaseDetailResponse(BaseModel):
    """Comprehensive case payload for Screen B (Review) and Screen D (Ledger)."""
    case: CaseRecord
    evidence_card: SutraEvidenceCard
    signal_interpretation: Optional[SignalInterpretation] = None
    intervention_proposal: Optional[InterventionProposal] = None
    current_plan: PlanVersionRecord
    plan_versions: list[PlanVersionRecord]
    evidence_challenge: Optional[EvidenceChallengeReport] = None
    validation_summary: ValidationSummary
    decisions: list[CaseDecisionRecord]
    tasks: list[TaskRecord]
    follow_ups: list[FollowUpRecord]
    audit_events: list[AuditEventRecord]

