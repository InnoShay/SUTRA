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


# ==============================================================================
# Phase 7: Historical Risk Trends & Performance Monitoring Domain Models
# ==============================================================================

class HistoricalSnapshotPoint(BaseModel):
    snapshot_id: str = Field(..., description="Date or snapshot identifier (e.g. 2026-10-01)")
    snapshot_timestamp: datetime = Field(..., description="Timestamp of the snapshot evaluation")
    model_version: str = Field(..., description="Model version associated with this snapshot")
    model_name: str = Field(..., description="Model identifier")
    prediction_cutoff: str = Field(..., description="Operational cutoff window, e.g. Day 30")
    feature_schema_version: str = Field("v1_25features", description="Feature schema definition")
    total_prediction_runs: int = Field(..., description="Total inference records in this snapshot")
    unique_students_evaluated: int = Field(..., description="Distinct students evaluated in this snapshot")
    repeated_rescores_count: int = Field(0, description="Number of repeat inferences on previously seen students")
    at_risk_count: Optional[int] = Field(None, description="Unique students >= 0.46 threshold (null if suppressed)")
    at_risk_percentage: Optional[float] = Field(None, description="Percentage of evaluated students At_Risk (null if suppressed)")
    on_track_count: Optional[int] = Field(None, description="Unique students < 0.46 threshold (null if suppressed)")
    on_track_percentage: Optional[float] = Field(None, description="Percentage of evaluated students On_Track (null if suppressed)")
    low_risk_count: Optional[int] = Field(None, description="Unique students < 0.30")
    moderate_risk_count: Optional[int] = Field(None, description="Unique students [0.30, 0.46)")
    elevated_risk_count: Optional[int] = Field(None, description="Unique students >= 0.46")
    mean_risk_probability: float = Field(..., description="Average predicted risk probability across unique students")
    is_privacy_suppressed: bool = Field(False, description="Whether counts are suppressed due to small group size (< 5)")
    suppression_reason: Optional[str] = None
    is_comparable: bool = Field(True, description="Whether this snapshot is comparable to the reference model baseline")
    incompatibility_reason: Optional[str] = None


class CohortRiskTrendResponse(BaseModel):
    campus_id: uuid.UUID
    cohort_code: Optional[str] = None
    reference_model_version: str = Field("v1.0.0", description="Reference baseline model version")
    reference_cutoff: str = Field("Day 30", description="Reference prediction cutoff")
    total_historical_runs: int = Field(..., description="Total inference runs across all evaluated snapshots")
    total_unique_students: int = Field(..., description="Total unique students evaluated across time")
    rescore_frequency: float = Field(..., description="Average predictions per student (total runs / unique students)")
    has_comparable_history: bool = Field(..., description="True if at least 2 comparable snapshots exist")
    snapshots: List[HistoricalSnapshotPoint] = Field(default_factory=list)
    incompatible_snapshots_detected: int = Field(0, description="Count of snapshots with incompatible versions or schemas")
    data_gap_notice: Optional[str] = Field(None, description="Notice explaining lack of historical data without fabrication")
    causality_disclaimer: str = Field(
        "Changes in cohort-level predicted risk distribution over time indicate shifts in model scoring and input behavioral features, NOT verified proof that actual student academic outcomes have changed. Realized student outcomes require post-semester registrar confirmation.",
        description="Mandatory governance disclaimer regarding prediction changes vs causal outcomes"
    )
    retention_applied_days: Optional[int] = Field(None, description="Retention horizon applied in query filter")
    governance_disclaimers: List[str] = Field(default_factory=list)


class StudentRiskTrajectoryPoint(BaseModel):
    prediction_id: uuid.UUID
    timestamp: datetime
    model_version: str
    model_name: str
    prediction_cutoff: str
    risk_probability: float
    threshold: float
    classification: str
    score_delta_from_previous: Optional[float] = None
    is_comparable_to_previous: bool = True
    incompatibility_note: Optional[str] = None


class StudentRiskTrajectoryResponse(BaseModel):
    campus_id: uuid.UUID
    student_id: Optional[uuid.UUID] = None
    external_student_ref: str
    total_evaluations: int
    unique_timestamps_count: int
    trajectory: List[StudentRiskTrajectoryPoint]
    is_stale: bool = False
    causality_notice: str = Field(
        "Individual risk score trajectory reflects updated academic and engagement observations over time. A decrease in score does not guarantee course completion; an increase does not ensure academic difficulty.",
        description="Non-causal interpretation policy notice"
    )


class CohortOutcomeEvaluationPoint(BaseModel):
    cohort_label: str
    model_version: str
    evaluation_date: datetime
    labeled_sample_size: int
    ground_truth_status: str = Field(..., description="AVAILABLE_HISTORICAL or PENDING_TERM_COMPLETION")
    realized_accuracy: Optional[float] = None
    realized_recall: Optional[float] = None
    realized_precision: Optional[float] = None
    realized_fpr: Optional[float] = None
    realized_roc_auc: Optional[float] = None
    realized_brier: Optional[float] = None
    drift_status: str = Field(..., description="STABLE, DEGRADED, or LABELS_PENDING")
    drift_warning: Optional[str] = None


class HistoricalPerformanceMonitoringResponse(BaseModel):
    campus_id: uuid.UUID
    monitoring_status: str = Field(..., description="Status of longitudinal outcome tracking")
    outcome_definition: str = Field(..., description="Authoritative definition of ground-truth target")
    total_labeled_cohorts: int
    evaluations: List[CohortOutcomeEvaluationPoint] = Field(default_factory=list)
    evaluation_protocol_notice: str
    governance_disclaimers: List[str] = Field(default_factory=list)

