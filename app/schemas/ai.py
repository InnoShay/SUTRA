import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AISummarizeEvidenceRequest(BaseModel):
    student_id: Optional[uuid.UUID] = Field(None, description="Target student UUID")
    student_ref: Optional[str] = Field(None, description="Target student external reference")
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


# --- Distinct 5-Tier Evidence Structures (Phase 13) ---

class ObservedDataTier(BaseModel):
    """Tier 1: Real observed student data, verified facts, and telemetry boundaries."""
    total_observations: int = 0
    data_freshness: str = "unknown"
    domains_represented: List[str] = Field(default_factory=list)
    observed_facts: List[str] = Field(default_factory=list)
    contradictions_detected: List[str] = Field(default_factory=list)
    data_limitations: List[str] = Field(default_factory=list)


class RuleSignalTier(BaseModel):
    """Tier 2: Policy engine and deterministic rule-based triggers."""
    rule_key: str
    result: str
    evaluated_at: Optional[datetime] = None
    quality_state: str = "valid"
    explanation: Optional[Dict[str, Any]] = None
    trigger_summary: str = ""


class MLPredictionTier(BaseModel):
    """Tier 3: Quantitative machine learning inference and Platt-calibrated feature attributions."""
    has_ml_prediction: bool = False
    model_name: Optional[str] = None
    model_version: Optional[str] = None
    prediction_cutoff: Optional[str] = None
    risk_probability: Optional[float] = None
    threshold: Optional[float] = None
    classification: Optional[str] = None
    calibration_status: Optional[str] = None
    top_attributions: List[Dict[str, Any]] = Field(default_factory=list)
    ml_limitations: List[str] = Field(default_factory=list)


class AIRecommendationTier(BaseModel):
    """Tier 4: Bounded generative decision support and catalogue-grounded interventions."""
    summary: str
    uncertainties: List[str] = Field(default_factory=list)
    review_questions: List[str] = Field(default_factory=list)
    candidate_interventions: List[AICandidateInterventionItem] = Field(default_factory=list)
    is_advisory: bool = True
    advisory_notice: str = (
        "AI recommendations are decision-support only. They do not constitute a diagnosis, "
        "establish personal causation, or mutate student case state."
    )


class HumanDecisionTier(BaseModel):
    """Tier 5: Human educator decisions, active intervention case states, and recorded outcomes."""
    has_human_review: bool = False
    reviewed_decision: Optional[str] = None
    reviewed_by: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    review_reason_code: Optional[str] = None
    case_id: Optional[uuid.UUID] = None
    case_state: Optional[str] = None
    case_owner_id: Optional[uuid.UUID] = None
    case_due_at: Optional[datetime] = None
    follow_ups_count: int = 0
    outcome_status: Optional[str] = None
    outcome_rationale: Optional[str] = None


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

    # Distinct 5-tier breakdown
    tier1_observed_data: Optional[ObservedDataTier] = None
    tier2_rule_signal: Optional[RuleSignalTier] = None
    tier3_ml_prediction: Optional[MLPredictionTier] = None
    tier4_ai_recommendation: Optional[AIRecommendationTier] = None
    tier5_human_decision: Optional[HumanDecisionTier] = None


class AISummarizeEvidenceResponse(BaseModel):
    target_student_ref: str
    summary: str
    observed_facts: List[str]
    uncertainties: List[str]
    limitations: List[str]
    metadata: AIExecutionMetadata

    # Distinct 5-tier breakdown
    tier1_observed_data: Optional[ObservedDataTier] = None
    tier2_rule_signals: List[RuleSignalTier] = Field(default_factory=list)
    tier3_ml_prediction: Optional[MLPredictionTier] = None
    tier4_ai_recommendation: Optional[AIRecommendationTier] = None
    tier5_human_decision: Optional[HumanDecisionTier] = None


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
