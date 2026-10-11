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
