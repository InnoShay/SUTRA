import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GranularRiskTiers(BaseModel):
    low_risk: int = Field(..., description="Students with risk probability < 0.30")
    moderate_risk: int = Field(..., description="Students with risk probability between 0.30 and 0.46")
    elevated_risk: int = Field(..., description="Students with risk probability >= 0.46 (labeled At_Risk)")


class RiskDistributionDTO(BaseModel):
    at_risk_count: Optional[int] = Field(None, description="Number of unique evaluated students classified At_Risk (null if suppressed)")
    at_risk_percentage: Optional[float] = Field(None, description="Percentage of evaluated students classified At_Risk (null if suppressed)")
    on_track_count: Optional[int] = Field(None, description="Number of unique evaluated students classified On_Track (null if suppressed)")
    on_track_percentage: Optional[float] = Field(None, description="Percentage of evaluated students classified On_Track (null if suppressed)")
    unevaluated_count: int = Field(0, description="Students in cohort without valid Day-30 inference")
    threshold: float = Field(0.46, description="Configured decision threshold")
    granular_tiers: Optional[GranularRiskTiers] = None
    is_privacy_suppressed: bool = Field(False, description="Whether counts are suppressed due to small group size (< 5)")
    suppression_reason: Optional[str] = None


class CohortBreakdownItem(BaseModel):
    cohort_code: str
    total_students: int
    evaluated_count: int
    at_risk_count: Optional[int] = None
    at_risk_percentage: Optional[float] = None
    on_track_count: Optional[int] = None
    on_track_percentage: Optional[float] = None
    is_privacy_suppressed: bool = False
    suppression_reason: Optional[str] = None


class MultiTierTrendPoint(BaseModel):
    date_key: str
    label: str
    prediction_runs: int
    signals_detected: int
    cases_opened: int
    confirmed_outcomes: int


class CaseLifecycleStateCount(BaseModel):
    state: str
    count: int
    is_terminal: bool


class InterventionCategoryCount(BaseModel):
    key: str
    label: str
    count: int
    percentage: float


class CohortAnalyticsSummaryResponse(BaseModel):
    campus_id: uuid.UUID
    as_of_at: datetime
    timeframe: str
    cohort_filter: Optional[str] = None
    total_students_in_scope: int
    evaluated_students_count: int
    total_prediction_runs: int
    coverage_percentage: float
    risk_distribution: RiskDistributionDTO
    cohort_breakdown: List[CohortBreakdownItem]
    trend_timeline: List[MultiTierTrendPoint]
    case_lifecycle_distribution: List[CaseLifecycleStateCount]
    intervention_distribution: List[InterventionCategoryCount]
    governance_disclaimers: List[str]
