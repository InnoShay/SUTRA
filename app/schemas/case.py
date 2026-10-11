import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class CaseTaskDTO(BaseModel):
    id: uuid.UUID
    domain: str
    generic_label: str
    state: str
    assignee_user_id: Optional[uuid.UUID] = None
    due_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    deadline_version: int = 1


class CaseEventDTO(BaseModel):
    id: uuid.UUID
    event_type: str
    actor_user_id: Optional[uuid.UUID] = None
    actor_kind: str
    from_state: Optional[str] = None
    to_state: Optional[str] = None
    reason_code: Optional[str] = None
    event_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class FollowUpDTO(BaseModel):
    id: uuid.UUID
    follow_up_type: str
    contact_status: Optional[str] = None
    proof_kind: str
    occurred_at: datetime
    recorded_by: Optional[uuid.UUID] = None
    sanitized_note: Optional[str] = None
    proof_ref: Optional[str] = None
    created_at: datetime


class CaseOutcomeDTO(BaseModel):
    id: uuid.UUID
    outcome_status: str
    rationale: str
    evidence_kind: str
    follow_up_window_start: Optional[datetime] = None
    follow_up_window_end: Optional[datetime] = None
    recorded_by: Optional[uuid.UUID] = None
    recorded_at: datetime


class CaseDetailDTO(BaseModel):
    id: uuid.UUID
    institution_id: uuid.UUID
    student_id: uuid.UUID
    external_student_ref: str
    student_display_name: str
    originating_signal_id: uuid.UUID
    selected_intervention_key: str
    state: str
    primary_owner_user_id: Optional[uuid.UUID] = None
    due_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    is_escalated: bool = False
    version: int = 1
    created_at: datetime
    updated_at: datetime
    tasks: List[CaseTaskDTO] = Field(default_factory=list)
    events: List[CaseEventDTO] = Field(default_factory=list)
    follow_ups: List[FollowUpDTO] = Field(default_factory=list)
    outcome: Optional[CaseOutcomeDTO] = None


class CaseTransitionRequest(BaseModel):
    to_state: str = Field(..., description="Target state in canonical state machine")
    reason_code: Optional[str] = Field(None, description="Standard reason code justifying state transition")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Contextual event metadata")
    expected_version: Optional[int] = Field(None, description="Optimistic concurrency control: expected current case version")


class CaseAssignmentRequest(BaseModel):
    primary_owner_user_id: uuid.UUID = Field(..., description="Accountable owner user UUID")
    due_at: Optional[datetime] = Field(None, description="Enforceable due date for the support case")
    reason_code: Optional[str] = Field(None, description="Optional assignment/reassignment reason code")
    expected_version: Optional[int] = Field(None, description="Optimistic concurrency control: expected current case version")


class AcceptAssignmentRequest(BaseModel):
    acceptance_note: Optional[str] = Field(None, description="Optional note acknowledged by primary owner")


class CreateTaskRequest(BaseModel):
    domain: str = Field(..., description="Domain: academic, mentor, finance, placement, counselling")
    generic_label: str = Field(..., description="Generic non-sensitive label displayed to non-specialists")
    assignee_user_id: Optional[uuid.UUID] = Field(None, description="Specialist user UUID")
    due_at: Optional[datetime] = Field(None, description="Task deadline")
    restricted_details: Optional[Dict[str, Any]] = Field(
        None, description="Sensitive domain context (kept in restricted_task_details, accessible only to specialist)"
    )


class FollowUpRequest(BaseModel):
    follow_up_type: str = Field(..., description="contact_attempt, student_response, support_delivered, follow_up_check")
    contact_status: Optional[str] = Field(None, description="attempted, student_reached, unreachable, declined")
    proof_kind: str = Field(..., description="staff_attestation, student_confirmation, appointment_record, service_provider_confirmation, none")
    occurred_at: datetime = Field(..., description="UTC timestamp when outreach or contact occurred")
    note: Optional[str] = Field(None, description="Sanitized factual summary of the contact")
    proof_ref: Optional[str] = Field(None, description="Reference ID to institutional proof document or calendar")


class OutcomeRequest(BaseModel):
    outcome_status: Literal["helped", "not_helped", "mixed", "unknown"] = Field(
        ..., description="Post-support observed student outcome"
    )
    rationale: str = Field(..., description="Factual rationale for outcome determination")
    evidence_kind: Literal["staff_review", "student_feedback", "academic_record", "service_record", "insufficient_evidence"] = Field(
        "staff_review", description="Kind of evidence supporting the outcome"
    )
    follow_up_window_end: Optional[datetime] = Field(None, description="Scheduled date for future outcome evaluation")


class CaseOverrideRequest(BaseModel):
    override_action: str = Field(..., description="Override action (e.g. expedited_close, manual_state_set)")
    to_state: str = Field(..., description="Target case state")
    reason_code: str = Field(..., description="Mandatory reason code for authorized override")
    rationale: str = Field(..., description="Detailed justification")


class CaseReopenRequest(BaseModel):
    reopen_reason_code: str = Field(..., description="Mandatory reason code for reopening closed case")
    next_action: str = Field(..., description="Immediate support action planned upon reopen")
