import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class AISummarizeEvidenceRequest(BaseModel):
    student_id: uuid.UUID = Field(..., description="Target student UUID")
    signal_id: Optional[uuid.UUID] = Field(None, description="Optional associated policy signal UUID")


class AISuggestInterventionsRequest(BaseModel):
    student_id: uuid.UUID = Field(..., description="Target student UUID")
    signal_id: Optional[uuid.UUID] = Field(None, description="Optional associated policy signal UUID")
    max_suggestions: Optional[int] = Field(3, ge=1, le=5, description="Maximum suggestions to return")


class AIReviewBriefRequest(BaseModel):
    signal_id: uuid.UUID = Field(..., description="Target policy signal UUID to analyze")
    student_id: Optional[uuid.UUID] = Field(None, description="Optional student UUID")


class AICandidateInterventionItem(BaseModel):
    intervention_key: str = Field(..., description="Controlled catalog key (must exist in intervention_catalog)")
    display_label: str = Field(..., description="Human-readable intervention title")
    domain: str = Field(..., description="Intervention domain (academic, mentor, counselling, finance)")
    recipient_role: str = Field(..., description="Authorized recipient role")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Advisory confidence score")
    evidence_grounding: str = Field(..., description="Specific facts and observations grounding this recommendation")
    caveats: str = Field(..., description="Missing data, limitations, or prerequisites")


class AIExecutionMetadata(BaseModel):
    model_name: str
    provider: str
    latency_ms: Optional[float] = None
    is_mock: bool = False
    timestamp: datetime
    disclaimer: str = (
        "AI-generated advisory synthesis. Requires authorized human educator verification and confirmation per SUTRA policy."
    )


class AIStructuredReviewBriefResponse(BaseModel):
    target_student_ref: str
    signal_id: Optional[uuid.UUID] = None
    summary: str
    observed_facts: List[str]
    model_predictions: List[str]
    uncertainties: List[str]
    review_questions: List[str]
    candidate_interventions: List[AICandidateInterventionItem]
    limitations: List[str]
    metadata: AIExecutionMetadata


class AISummarizeEvidenceResponse(BaseModel):
    target_student_ref: str
    summary: str
    observed_facts: List[str]
    uncertainties: List[str]
    limitations: List[str]
    metadata: AIExecutionMetadata


class AISuggestInterventionsResponse(BaseModel):
    target_student_ref: str
    candidate_interventions: List[AICandidateInterventionItem]
    metadata: AIExecutionMetadata


class AIServiceStatusResponse(BaseModel):
    enabled: bool
    provider: str
    model_name: str
    timeout_seconds: float
    governance_invariants: List[str]
