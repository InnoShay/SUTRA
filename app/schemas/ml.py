from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator
import math

DAY30_REQUIRED_FEATURES: List[str] = [
    "num_of_prev_attempts",
    "studied_credits",
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
    "days_registered_before_start",
    "has_missing_registration_date",
    "vle_total_clicks_d30",
    "vle_active_days_d30",
    "vle_clicks_precourse",
    "vle_clicks_poststart_d30",
    "vle_clicks_last_7d",
    "vle_days_since_last_click",
    "vle_clicks_forumng_d30",
    "vle_clicks_oucontent_d30",
    "vle_clicks_quiz_d30",
    "vle_clicks_homepage_d30",
    "vle_clicks_other_d30",
    "has_vle_activity_d30",
    "assessments_submitted_d30",
    "assessment_banked_d30",
    "has_early_assessment_submission_d30",
]

FORBIDDEN_LEAKED_FEATURES: List[str] = [
    "final_result",
    "is_at_risk",
    "at_risk",
    "date_unregistration",
    "score",
    "assessment_score",
    "early_assessment_score",
    "student_id",
    "id_student",
]


class MLAttribution(BaseModel):
    feature: str
    value: float
    attribution: float
    direction: Literal["increases_risk", "decreases_risk"]


class MLEvidenceCard(BaseModel):
    card_type: Literal["ml_early_warning_evidence"] = "ml_early_warning_evidence"
    model_name: str
    model_version: str
    prediction_cutoff: str = "Day 30"
    risk_probability: float
    threshold: float = 0.46
    classification: Literal["At_Risk", "On_Track"]
    calibration_status: Optional[str] = "platt_calibrated"
    top_attributions: List[MLAttribution]
    limitations: List[str] = Field(
        default_factory=lambda: [
            "Trained on historical Open University course registrations; not calibrated for non-modular curricula.",
            "Early assessment grades were excluded to avoid temporal leakage.",
            "Represents statistical correlation, not causal certainty or personal diagnosis.",
        ]
    )


class MLModelInfo(BaseModel):
    model_name: str = "Logistic Regression"
    model_version: str = "1.0.0"
    status: Literal["serving", "research_only", "uncalibrated", "ready"] = "serving"
    threshold: float = 0.46
    cutoff_days: int = 30
    features: List[str] = Field(default_factory=lambda: list(DAY30_REQUIRED_FEATURES))
    candidate_model: Optional[Dict[str, Any]] = Field(
        default_factory=lambda: {
            "name": "Constrained XGBoost",
            "version": "0.1.0-research",
            "status": "research_only",
            "rationale": "Research-only candidate; requires formal calibration and fairness promotion review.",
        }
    )
    decision_threshold: Optional[float] = 0.46
    active_policy_key: Optional[str] = "ug_attendance_academic_v1"
    artifact_path: Optional[str] = None


class MLPredictRequest(BaseModel):
    external_student_ref: str
    cutoff_days: int = 30
    features: Dict[str, Any]

    @field_validator("cutoff_days")
    @classmethod
    def validate_cutoff(cls, v: int) -> int:
        if v != 30:
            raise ValueError(f"ML early-warning model only supports Day-30 predictions; got cutoff_days={v}")
        return v

    @field_validator("features")
    @classmethod
    def validate_features_dict(cls, f: Dict[str, Any]) -> Dict[str, Any]:
        # 1. Anti-leakage checks: reject target or post-cutoff information
        for leaked in FORBIDDEN_LEAKED_FEATURES:
            if leaked in f:
                raise ValueError(
                    f"Forbidden leakage feature '{leaked}' detected in feature payload. "
                    "Target outcomes and post-cutoff assessment scores must never enter inference."
                )

        # 2. Check for missing required features
        missing = [k for k in DAY30_REQUIRED_FEATURES if k not in f]
        if missing:
            raise ValueError(
                f"Missing {len(missing)} required Day-30 feature(s): {missing[:5]}. "
                "Feature vector must contain all 25 canonical features."
            )

        # 3. Check feature types and finite values
        numeric_features = {
            "num_of_prev_attempts",
            "studied_credits",
            "days_registered_before_start",
            "has_missing_registration_date",
            "vle_total_clicks_d30",
            "vle_active_days_d30",
            "vle_clicks_precourse",
            "vle_clicks_poststart_d30",
            "vle_clicks_last_7d",
            "vle_days_since_last_click",
            "vle_clicks_forumng_d30",
            "vle_clicks_oucontent_d30",
            "vle_clicks_quiz_d30",
            "vle_clicks_homepage_d30",
            "vle_clicks_other_d30",
            "has_vle_activity_d30",
            "assessments_submitted_d30",
            "assessment_banked_d30",
            "has_early_assessment_submission_d30",
        }

        for k in numeric_features:
            if k in f:
                val = f[k]
                if isinstance(val, bool) or not isinstance(val, (int, float)):
                    raise ValueError(
                        f"Numeric feature '{k}' must be integer or float; got {type(val).__name__} ({val})"
                    )
                if math.isnan(val) or math.isinf(val):
                    raise ValueError(f"Non-finite value '{val}' detected for feature '{k}'. Values must be finite.")

        return f


class MLPredictBatchRequest(BaseModel):
    instances: List[MLPredictRequest] = Field(..., min_length=1)


class MLPredictResponse(BaseModel):
    external_student_ref: str
    risk_probability: float
    threshold: float = 0.46
    classification: Literal["At_Risk", "On_Track"]
    evidence_card: MLEvidenceCard


# ==========================================
# Phase 6: Model Performance Dashboard Schemas
# ==========================================

class ModelDatasetProvenance(BaseModel):
    dataset_label: str = "OULAD Day-30 Processed Dataset"
    partition: str = "Presentation 2014J (Temporal Holdout)"
    evaluation_date: str = "2026-10-12"
    sample_size: int = 9203
    unique_students: int = 8857
    raw_rows_examined: int = 27466
    outcome_definition: str = "Binary early withdrawal or academic failure (target=1 for At-Risk, 0 for On-Track)"
    class_prevalence: float = 0.4070
    actual_at_risk_count: int = 3746
    actual_on_track_count: int = 5457
    provenance_type: Literal["offline_held_out_benchmark", "live_production_telemetry"] = "offline_held_out_benchmark"
    provenance_warning: Optional[str] = (
        "HISTORICAL PARTITION NOTICE: Presentation 2014J represents previously inspected "
        "development evidence. It must NEVER be reported as an untouched prospective test set. "
        "Real-world generalization must be assessed on authentic, prospectively collected cohorts."
    )


class ConfusionMatrixDTO(BaseModel):
    tp: int = Field(..., description="True Positives (actual at-risk correctly caught)")
    fp: int = Field(..., description="False Positives (actual on-track flagged as at-risk)")
    tn: int = Field(..., description="True Negatives (actual on-track correctly identified)")
    fn: int = Field(..., description="False Negatives (actual at-risk missed)")


class OperationalWorkloadDTO(BaseModel):
    total_alerts_fired: int = 4705
    alert_rate_pct: float = 51.12
    false_alarms_advisor_burden: int = 2091
    missed_at_risk_students: int = 1132
    successful_proactive_catches: int = 2614


class ReliabilityBinDTO(BaseModel):
    bin_range: str
    samples_count: int
    mean_predicted_prob: float
    observed_positive_rate: float
    calibration_gap: float


class SubgroupMetricDTO(BaseModel):
    dimension: str
    subgroup: str
    sample_size: int
    confidence_flag: Literal["STABLE", "LOW_CONFIDENCE (<100)"]
    positives_count: int
    negatives_count: int
    prevalence: float
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    recall: float
    precision: float
    specificity: float
    false_positive_rate: float
    f1_score: float
    roc_auc: float
    pr_auc: float
    is_suppressed: bool = False


class ThresholdIndependentMetricsDTO(BaseModel):
    roc_auc: float = 0.7216
    pr_auc: float = 0.6502
    brier_score: float = 0.2103
    expected_calibration_error_ece: float = 0.0681
    maximum_calibration_error_mce: float = 0.0967


class ThresholdDependentMetricsDTO(BaseModel):
    threshold: float = 0.46
    accuracy: float = 0.6498
    balanced_accuracy: float = 0.6573
    precision: float = 0.5556
    recall: float = 0.6978
    specificity: float = 0.6168
    false_positive_rate: float = 0.3832
    f1_score: float = 0.6186
    confusion_matrix: ConfusionMatrixDTO
    operational_workload: OperationalWorkloadDTO


class ROCCurvePointDTO(BaseModel):
    fpr: float
    tpr: float
    threshold: float


class PRCurvePointDTO(BaseModel):
    precision: float
    recall: float
    threshold: float


class LiveMonitoringTelemetryDTO(BaseModel):
    total_inferences_logged: int
    average_latency_ms: float
    active_campus_count: int
    monitoring_window: str = "Last 30 Days"
    status: Literal["healthy", "degraded", "idle"] = "healthy"
    telemetry_notice: str = (
        "Live telemetry monitors real-time system throughput and execution latency. "
        "It does not represent measured model accuracy until student outcomes are confirmed."
    )


class ModelPerformanceResponse(BaseModel):
    model_name: str = "Regularized Logistic Regression Baseline"
    model_version: str = "v1.0.0"
    operational_threshold: float = 0.46
    evaluation_environment: Literal["offline_held_out_benchmark", "live_production_telemetry"] = "offline_held_out_benchmark"
    dataset_provenance: ModelDatasetProvenance
    threshold_independent_metrics: ThresholdIndependentMetricsDTO
    threshold_dependent_metrics: ThresholdDependentMetricsDTO
    reliability_table: List[ReliabilityBinDTO]
    roc_curve_points: Optional[List[ROCCurvePointDTO]] = None
    pr_curve_points: Optional[List[PRCurvePointDTO]] = None
    subgroup_metrics: List[SubgroupMetricDTO]
    live_telemetry: Optional[LiveMonitoringTelemetryDTO] = None
    fairness_disclaimer: str = (
        "FAIRNESS & PARITY NOTICE: Disaggregated subgroup metrics highlight performance differences "
        "across courses, demographics, and prior education. The presence of this dashboard does NOT "
        "demonstrate that the model is fair, unbiased, or suitable for automated high-stakes decisions. "
        "Differences in recall and false alarm burden reflect historical institutional patterns."
    )
    non_causal_disclaimer: str = (
        "NON-CAUSAL GOVERNANCE NOTICE: Statistical risk estimates reflect retrospective correlations "
        "in historical data. Predictions must never be treated as diagnostic certainties or proof of "
        "future student failure. All alerts require human professional judgement."
    )
    limitations: List[str] = Field(
        default_factory=lambda: [
            "Evaluated on historical Open University course registrations (Presentation 2014J); generalization to prospective cohorts remains unverified.",
            "Cutoff fixed at Day 30 post-start; early assessment marks are excluded to prevent temporal data leakage.",
            "ROC curves require genuine per-record scores and labels; they are not fabricated from aggregate single-point values.",
            "Cell counts under 5 are suppressed to protect student privacy in disaggregated views.",
        ]
    )


# ==========================================
# Phase 8: Governed What-If Scenario Schemas
# ==========================================

SUPPORTED_HYPOTHETICAL_FEATURES: Dict[str, Dict[str, Any]] = {
    "vle_active_days_d30": {
        "min": 0.0,
        "max": 30.0,
        "type": "int",
        "label": "VLE Active Days (Day 0–30)",
        "unit": "days",
        "default": 8.0,
        "description": "Number of distinct calendar days the student accessed the virtual learning environment within the first 30 days.",
    },
    "vle_total_clicks_d30": {
        "min": 0.0,
        "max": 5000.0,
        "type": "float",
        "label": "Total VLE Interactions (Day 0–30)",
        "unit": "clicks",
        "default": 142.0,
        "description": "Cumulative count of interactions across all online course components by Day 30.",
    },
    "vle_clicks_last_7d": {
        "min": 0.0,
        "max": 2000.0,
        "type": "float",
        "label": "Recent Activity (Days 24–30)",
        "unit": "clicks",
        "default": 12.0,
        "description": "Interaction count within the final 7 days leading to the Day 30 evaluation boundary.",
    },
    "vle_days_since_last_click": {
        "min": 0.0,
        "max": 30.0,
        "type": "float",
        "label": "Days Since Last Interaction",
        "unit": "days",
        "default": 6.0,
        "description": "Elapsed days between the student's most recent interaction and Day 30 (0 = active on Day 30, 30 = inactive since start).",
    },
    "assessments_submitted_d30": {
        "min": 0.0,
        "max": 10.0,
        "type": "int",
        "label": "Assessments Submitted by Day 30",
        "unit": "submissions",
        "default": 1.0,
        "description": "Number of course assessment items submitted prior to Day 30.",
    },
    "has_early_assessment_submission_d30": {
        "min": 0.0,
        "max": 1.0,
        "type": "int",
        "label": "Early Assessment Submission",
        "unit": "binary",
        "default": 1.0,
        "description": "Binary indicator of whether an early diagnostic assessment was submitted by Day 30 (1 = Yes, 0 = No).",
    },
    "has_vle_activity_d30": {
        "min": 0.0,
        "max": 1.0,
        "type": "int",
        "label": "Any VLE Activity by Day 30",
        "unit": "binary",
        "default": 1.0,
        "description": "Binary indicator of whether the student had any recorded VLE engagement by Day 30 (1 = Yes, 0 = No).",
    },
}

# Explicit terms representing prospective interventions or future post-cutoff occurrences
FORBIDDEN_FUTURE_INTERVENTION_TERMS: List[str] = [
    "tutoring",
    "tutoring_sessions",
    "tutoring_hours",
    "tutor_attendance",
    "future_attendance",
    "future_tutoring",
    "counseling_attendance",
    "coaching_sessions",
    "mentor_meetings",
    "intervention",
    "week_8",
    "week_12",
    "final_exam",
    "final_grade",
]

# Protected demographic and historical registration attributes forbidden from being manipulated as hypothetical interventions
IMMUTABLE_STUDENT_ATTRIBUTES: List[str] = [
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
    "num_of_prev_attempts",
    "studied_credits",
    "days_registered_before_start",
    "has_missing_registration_date",
]


class SupportedFeatureMetaDTO(BaseModel):
    feature_name: str
    min_value: float
    max_value: float
    feature_type: str
    label: str
    unit: str
    default_value: float
    description: str


class HypotheticalFeatureModificationDTO(BaseModel):
    feature: str
    label: str
    original_value: float
    hypothetical_value: float
    unit: str
    delta: float


class WhatIfScenarioRequest(BaseModel):
    external_student_ref: Optional[str] = "STUDENT-WHATIF-EXPLORATION"
    base_features: Optional[Dict[str, Any]] = None
    hypothetical_modifications: Dict[str, Any] = Field(..., min_length=1)

    @field_validator("hypothetical_modifications")
    @classmethod
    def validate_scenario_modifications(cls, mods: Dict[str, Any]) -> Dict[str, Any]:
        if not mods:
            raise ValueError("At least one hypothetical feature modification must be specified.")

        for key, val in mods.items():
            key_lower = key.lower()
            # 1. Reject future events / prospective interventions
            for term in FORBIDDEN_FUTURE_INTERVENTION_TERMS:
                if term in key_lower:
                    raise ValueError(
                        f"Forbidden future event or prospective intervention '{key}' cannot enter a Day-30 prediction. "
                        "The frozen baseline observes telemetry strictly up to Day 30 (t ≤ 30). "
                        "Simulating future tutoring sessions or prospective interventions as historical Day-30 evidence "
                        "violates temporal validity and causal integrity."
                    )

            # 2. Reject leakage features
            for leaked in FORBIDDEN_LEAKED_FEATURES:
                if leaked == key_lower:
                    raise ValueError(
                        f"Forbidden leakage feature '{key}' detected. "
                        "Target outcomes and post-cutoff grades cannot be simulated."
                    )

            # 3. Reject immutable / demographic attributes
            if key_lower in IMMUTABLE_STUDENT_ATTRIBUTES:
                raise ValueError(
                    f"Student attribute '{key}' is an immutable or demographic trait. "
                    "Protected demographic characteristics cannot be simulated as hypothetical intervention changes."
                )

            # 4. Check whether key is supported
            if key not in SUPPORTED_HYPOTHETICAL_FEATURES:
                raise ValueError(
                    f"Feature '{key}' is not a supported actionable Day-30 simulation parameter. "
                    f"Supported features: {list(SUPPORTED_HYPOTHETICAL_FEATURES.keys())}"
                )

            # 5. Type and bounds checking
            if isinstance(val, bool) or not isinstance(val, (int, float)):
                raise ValueError(
                    f"Hypothetical value for '{key}' must be numeric; got {type(val).__name__} ({val})"
                )
            if math.isnan(val) or math.isinf(val):
                raise ValueError(f"Hypothetical value for '{key}' must be finite.")

            meta = SUPPORTED_HYPOTHETICAL_FEATURES[key]
            if val < meta["min"] or val > meta["max"]:
                raise ValueError(
                    f"Hypothetical value {val} for '{key}' is outside permitted Day-30 bounds "
                    f"[{meta['min']}, {meta['max']}] {meta['unit']}."
                )

        return mods


class SupportPlanningGuidanceDTO(BaseModel):
    title: str = "Explanatory Non-Predictive Support Planning Guidance"
    why_model_cannot_estimate_causal_interventions: str = (
        "The production early-warning model (LogisticRegressionBaseline v1.0.0) is a correlational classifier "
        "trained on historical observational registration data at Day 30. It evaluates observational correlations "
        "(z = β₀ + ∑ βᵢxᵢ) between early engagement telemetry and completion. It does NOT estimate the causal "
        "treatment effect (ATE) of real-world educator interventions. For example, mandating a student to click "
        "the portal does not causally produce the learning gains of genuine student interest, and prospective tutoring "
        "cannot be entered as past Day-30 evidence without a verified causal evaluation (e.g. RCT or quasi-experimental design)."
    )
    recommended_educator_actions: List[str] = Field(
        default_factory=lambda: [
            "Conduct a personalized, empathetic check-in with the student regarding study routines and obstacles.",
            "Offer optional peer tutoring, academic mentoring, or writing lab support without attributing false statistical guarantees.",
            "Verify whether non-engagement reflects illness, technical access hurdles, or family commitments.",
            "Coordinate with course instructors on clarifying difficult early assessment assignments.",
            "Document support plans qualitatively in Case Management rather than altering official ML logs.",
        ]
    )
    causal_claim_warning: str = (
        "PROHIBITION ON CAUSAL CLAIMS: Do not claim or document to students that attending tutoring or reaching a "
        "specific click threshold will reduce course failure risk by a specific percentage. Such claims are scientifically "
        "unsupported by the correlational model."
    )


class WhatIfScenarioResponse(BaseModel):
    scenario_id: str
    student_ref: str
    model_name: str = "Regularized Logistic Regression Baseline"
    model_version: str = "v1.0.0"
    prediction_cutoff: str = "Day 30"
    threshold: float = 0.46
    baseline_risk_probability: float
    baseline_classification: Literal["At_Risk", "On_Track"]
    baseline_top_attributions: List[MLAttribution]
    hypothetical_risk_probability: float
    hypothetical_classification: Literal["At_Risk", "On_Track"]
    hypothetical_top_attributions: List[MLAttribution]
    delta_probability: float
    delta_percentage_points: float
    tier_transition: str
    modified_features: List[HypotheticalFeatureModificationDTO]
    is_hypothetical: bool = True
    is_official_record: bool = False
    ephemeral_notice: str = (
        "EPHEMERAL SIMULATION: This calculation was evaluated strictly in memory. Hypothetical inputs are NEVER "
        "written to the student's official academic record, telemetry database, or ml_inference_logs. No automated "
        "cases, signals, or disciplinary actions have been triggered."
    )
    non_causal_disclaimer: str = (
        "NON-CAUSAL MODEL CALCULATION NOTICE: The hypothetical score is a mathematical evaluation of the frozen Day-30 "
        "logistic regression model. It is NOT a causal estimate of intervention effectiveness. Statistical correlation "
        "does not equal intervention causality."
    )
    temporal_cutoff_notice: str = (
        "DAY-30 TEMPORAL INTEGRITY NOTICE: Hypothetical adjustments reflect only plausible behavioral variation within "
        "the Day 0–30 window. Unobserved future events (e.g., attending future tutoring or post-cutoff scores) are strictly "
        "prohibited from entering this calculation."
    )
    support_planning_guidance: SupportPlanningGuidanceDTO


