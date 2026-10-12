"""
Data models and lifecycle schemas for SUTRA Support Evidence Ledger (Phase 4).
"""

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.orchestration.contracts import (
    ActionStep,
    CommunicationDraft,
    CommunicationDraftStatus,
    EvidenceChallengeReport,
    InterventionProposal,
    OrchestrationResult,
    RunStatus,
    SignalInterpretation,
    StructuredNoteDraft,
    StructuredNoteStatus,
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
    draft_id: Optional[str] = None
    is_structured: bool = False
    structured_data: Optional[dict[str, Any]] = None


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
    communication_drafts: list["CommunicationDraftRecord"] = Field(default_factory=list)
    structured_note_drafts: list["StructuredNoteDraftRecord"] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Phase 5: Communication Draft & Note Structuring Persistence Schemas
# -----------------------------------------------------------------------------

class CommunicationDraftRecord(BaseModel):
    """Persisted communication draft record."""
    model_config = ConfigDict(extra="forbid")

    draft_id: str
    case_id: str
    plan_version: int
    intended_role: str
    communication_purpose: str
    template_id: str
    subject: str
    message_body: str
    source_references: list[str] = Field(default_factory=list)
    missing_information_or_limitations: list[str] = Field(default_factory=list)
    human_review_status: CommunicationDraftStatus
    generation_metadata: dict[str, Any] = Field(default_factory=dict)
    created_by: str
    created_at: str
    updated_at: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    review_notes: Optional[str] = None
    idempotency_key: Optional[str] = None


class StructuredNoteDraftRecord(BaseModel):
    """Persisted structured follow-up note draft record."""
    model_config = ConfigDict(extra="forbid")

    draft_id: str
    case_id: str
    task_id: Optional[str] = None
    raw_note_content: str
    source_note_hash: str
    reported_actions_taken: list[str] = Field(default_factory=list)
    staff_observations: list[str] = Field(default_factory=list)
    attributed_student_statements: list[str] = Field(default_factory=list)
    documented_evidence_references: list[str] = Field(default_factory=list)
    unresolved_questions_or_concerns: list[str] = Field(default_factory=list)
    missing_or_contradictory_information: list[str] = Field(default_factory=list)
    potential_follow_up_evidence_required: list[str] = Field(default_factory=list)
    claims_requiring_confirmation: list[str] = Field(default_factory=list)
    human_confirmation_status: StructuredNoteStatus
    generation_metadata: dict[str, Any] = Field(default_factory=dict)
    submitted_by: str
    submitted_by_role: str
    created_at: str
    confirmed_by: Optional[str] = None
    confirmed_at: Optional[str] = None
    idempotency_key: Optional[str] = None


class CommunicationDraftCreateRequest(BaseModel):
    """Payload to request Agent 5 draft communication generation."""
    template_id: str
    intended_role: str
    untrusted_advisor_notes: Optional[str] = None
    idempotency_key: Optional[str] = None


class CommunicationDraftUpdateRequest(BaseModel):
    """Payload to edit, approve for future use, or discard a communication draft."""
    subject: Optional[str] = None
    message_body: Optional[str] = None
    review_status: Optional[CommunicationDraftStatus] = None
    review_notes: Optional[str] = None


class NoteStructureRequest(BaseModel):
    """Payload to invoke Agent 6 follow-up note structuring."""
    raw_note: str
    task_id: Optional[str] = None
    idempotency_key: Optional[str] = None


class StructuredNoteConfirmRequest(BaseModel):
    """Payload to confirm an edited/reviewed structured note into durable ledger."""
    draft_id: str
    task_id: Optional[str] = None
    reported_actions_taken: list[str] = Field(default_factory=list)
    staff_observations: list[str] = Field(default_factory=list)
    attributed_student_statements: list[str] = Field(default_factory=list)
    documented_evidence_references: list[str] = Field(default_factory=list)
    unresolved_questions_or_concerns: list[str] = Field(default_factory=list)
    evidence_reference: Optional[str] = None
    confirmation_notes: Optional[str] = None
    idempotency_key: Optional[str] = None


# -----------------------------------------------------------------------------
# Phase 6 Models: Cohort Analytics & Support Evidence Ledger Export
# -----------------------------------------------------------------------------

class CohortInsightReportRecord(BaseModel):
    """Durable record of an Agent 7 cohort learning insight report."""
    model_config = ConfigDict(extra="forbid")

    report_id: str
    snapshot_id: str
    campus_id: str
    is_synthetic: bool = True
    summary_narrative: str
    observed_patterns: list[str] = Field(default_factory=list)
    metric_references: list[str] = Field(default_factory=list)
    missing_or_insufficient_evidence: list[str] = Field(default_factory=list)
    limitations_and_caveats: list[str] = Field(default_factory=list)
    institutional_review_questions: list[str] = Field(default_factory=list)
    human_review_status: str = "DRAFT_AWAITING_REVIEW"
    agent_version: str
    provider_mode: str
    created_by: str
    created_at: str


class CohortReportGenerateRequest(BaseModel):
    """Request payload to generate a new Agent 7 cohort insight report."""
    campus_id: Optional[str] = None
    min_cohort_threshold: int = Field(default=5, ge=1)
    grouping_dimension: str = Field(default="ALL_CAMPUS_CASES")


class AuditExportEventItem(BaseModel):
    """Single canonical audit ledger event in an export package."""
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


class AuditExportPackage(BaseModel):
    """
    Export package of the Support Evidence Ledger for institutional audit review.
    Contains canonical event ordering, cryptographic backward hash pointers, and verification status.
    """
    model_config = ConfigDict(extra="forbid")

    export_schema_version: str = "3.0"
    exported_at: str
    exported_by: str
    campus_filter: Optional[str] = None
    total_events: int
    is_chain_valid: bool
    chain_verification_message: str
    events: list[AuditExportEventItem]



