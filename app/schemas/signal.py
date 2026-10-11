import uuid
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class EvidenceCardItem(BaseModel):
    feature: str
    value: Any
    attribution: Optional[float] = None
    direction: Optional[str] = None


class EvidenceCardDTO(BaseModel):
    card_type: str = "deterministic_rule_evidence"
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    prediction_cutoff: Optional[str] = None
    risk_probability: Optional[float] = None
    threshold: Optional[float] = None
    classification: Optional[str] = None
    attributions: List[EvidenceCardItem] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)


class SignalDTO(BaseModel):
    id: uuid.UUID
    institution_id: uuid.UUID
    student_id: uuid.UUID
    external_student_ref: str
    student_display_name: str
    rule_key: str
    result: str
    quality_state: str
    explanation: Dict[str, Any]
    evaluated_at: datetime
    reviewed_decision: Optional[str] = None
    reviewed_by: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    review_reason_code: Optional[str] = None
    evidence_digest: str
    evidence_card: Optional[EvidenceCardDTO] = None


class SignalReviewRequest(BaseModel):
    decision: Literal["approve", "modify", "dismiss", "request_more_data"] = Field(
        ..., description="Review action taken by authorized educator"
    )
    selected_intervention_key: Optional[str] = Field(
        None, description="Approved or modified intervention key from catalog"
    )
    reason_code: Optional[str] = Field(
        None, description="Standard reason code (e.g. REVIEWER_APPROVED_RECOMMENDATION, REVIEWER_SELECTED_ALTERNATIVE)"
    )
    rationale: Optional[str] = Field(
        None, description="Human reviewer justification for the decision"
    )


class SignalReviewResponse(BaseModel):
    signal_id: uuid.UUID
    decision: str
    case_id: Optional[uuid.UUID] = None
    status: str
    message: str


class EvaluateStudentRequest(BaseModel):
    as_of_at: Optional[datetime] = Field(None, description="Temporal cutoff timestamp. Defaults to UTC now.")
    policy_version_id: Optional[uuid.UUID] = Field(None, description="Optional specific policy version ID.")
