import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class StudentSummary(BaseModel):
    id: uuid.UUID
    external_ref: str
    display_name: str
    cohort_code: Optional[str] = None
    enrollment_status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None



class ObservationDTO(BaseModel):
    id: uuid.UUID
    domain: str
    metric_key: str
    value: Any
    unit: Optional[str] = None
    quality_state: str
    event_at: datetime
    available_at: Optional[datetime] = None
    ingested_at: datetime
    source_system: str


class FinanceObservationDTO(BaseModel):
    id: uuid.UUID
    fee_support_status: str
    quality_state: str
    event_at: datetime
    available_at: Optional[datetime] = None
    ingested_at: datetime
    source_system: str


class FreshnessMetricsDTO(BaseModel):
    total_observations: int
    domains_represented: List[str]
    last_observation_event_at: Optional[datetime] = None
    last_observation_available_at: Optional[datetime] = None
    is_stale: bool = False


from app.schemas.ml import MLPredictResponse


class SupportViewResponse(BaseModel):
    student: StudentSummary
    freshness_metrics: FreshnessMetricsDTO
    active_signals_count: int
    active_cases_count: int
    recent_observations: List[ObservationDTO]
    ml_prediction: Optional[MLPredictResponse] = None


class FinanceViewResponse(BaseModel):
    student: StudentSummary
    finance_observations: List[FinanceObservationDTO]


class FeatureReadinessItem(BaseModel):
    feature_name: str
    category: str
    status: str
    observed_value: Optional[Any] = None
    source_domain: Optional[str] = None
    derivation_note: str


class ObservationTelemetryAudit(BaseModel):
    total_observations: int
    domains_present: List[str]
    quality_state_counts: dict[str, int]
    last_event_at: Optional[datetime] = None
    last_available_at: Optional[datetime] = None
    is_stale: bool = False
    unsupported_sources: List[str]


class StudentReadinessResponse(BaseModel):
    student: StudentSummary
    model_name: str = "Logistic Regression Baseline"
    model_version: str = "1.0.0"
    target_cutoff: str = "Day 30"
    is_ready_for_inference: bool
    applicability_status: str
    applicability_rationale: str
    features_total_required: int = 25
    features_available_count: int
    features_missing_count: int
    features_underivable_count: int
    features_stale_count: int
    features: List[FeatureReadinessItem]
    telemetry_audit: ObservationTelemetryAudit
    governance_disclaimer: str
