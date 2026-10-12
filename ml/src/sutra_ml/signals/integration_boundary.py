"""
SUTRA ML Integration Boundary & Orchestration Container.

Defines the explicit architectural boundary separating:
1. Frozen OULAD ML Baseline (Logistic Regression v1.0.0, 25 features, threshold 0.46)
2. Multisource Synthetic Risk Signals (Transparent, rule-based heuristics)
3. Future Multimodal ML Models (Explicitly unbuilt; requires future governance authorization)

MANDATORY SAFEGUARDS:
- The OULAD model probability is NEVER combined with rule scores to fabricate a "new trained model".
- The prototype composite score is strictly labeled as a heuristic triage index, not a probability.
"""

from dataclasses import dataclass
from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.core.config import DEFAULT_METADATA_PATH, DEFAULT_MODEL_PATH
from backend.app.schemas.features import StudentFeatureInput
from sutra_ml.inference.predictor import PredictionResult, SutraRiskPredictor
from sutra_ml.schemas.multisource import StudentSuccess360Profile
from sutra_ml.signals.risk_signal_engine import (
    RiskSignal,
    RiskSignalEngine,
    RiskSignalEvaluationResult,
)


class MLComponentBoundaryStatus(BaseModel):
    """Integrity audit confirming isolation between ML model and rule signals."""
    model_config = ConfigDict(extra="forbid")

    ml_component_active: bool = True
    ml_model_name: str = "Regularized Logistic Regression Baseline"
    ml_model_version: str = "v1.0.0"
    ml_decision_threshold: float = 0.46
    ml_input_feature_count: int = 25
    ml_has_access_to_multisource_features: bool = False  # NEVER allowed
    rule_engine_active: bool = True
    future_multimodal_model_authorized: bool = False


class PrototypeCompositeRiskScore(BaseModel):
    """
    Configurable prototype priority index for dashboard triage.
    
    WARNING: THIS IS A HEURISTIC RULE SUMMATION, NOT A TRAINED ML PROBABILITY.
    """
    model_config = ConfigDict(extra="forbid")

    composite_score_0_to_100: float = Field(..., ge=0.0, le=100.0)
    priority_level: str = Field(..., description="'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'")
    points_breakdown: dict[str, float]
    disclaimer: str = Field(
        default=(
            "HEURISTIC OPERATIONAL SCORE ONLY. This composite score is a prototype weighted "
            "rule summation for queue prioritization, NOT a statistical ML probability. "
            "It must never be described as a trained or validated predictive model."
        )
    )


class IntegratedStudentSuccessCard(BaseModel):
    """
    Unified 360-degree student success evidence card for human advisors.
    
    Integrates OULAD ML prediction (if 25 OULAD features are present),
    multisource risk signals, and sensitive confidential routing.
    """
    model_config = ConfigDict(extra="forbid")

    student_key: str
    academic_term: str
    department: str
    program_year: int
    snapshot_timestamp: str

    # Component 1: Production OULAD ML Baseline (Isolated)
    oulad_ml_prediction: Optional[dict[str, Any]] = None

    # Component 2: Multisource Rule-Based Signals
    active_risk_signals: List[RiskSignal]
    confidential_support_signals: List[RiskSignal]

    # Component 3: Prototype Composite Heuristic Score
    prototype_composite: PrototypeCompositeRiskScore

    # Component 4: Architecture Boundary Contract
    boundary_contract: MLComponentBoundaryStatus = Field(default_factory=MLComponentBoundaryStatus)

    # Human-in-the-Loop Disclaimers
    governance_mandates: dict[str, str] = Field(
        default_factory=lambda: {
            "human_in_the_loop": "All signals require verification by an authorized advisor before outreach.",
            "non_punitive": "No disciplinary, punitive, or grading sanctions may be triggered by these signals.",
            "confidentiality": "Financial aid signals are restricted to authorized financial counselors only.",
            "non_causal": "Signals reflect correlational indicators and administrative milestones, not diagnostic verdicts.",
        }
    )


def compute_prototype_composite_score(signals: List[RiskSignal], confidential_signals: List[RiskSignal]) -> PrototypeCompositeRiskScore:
    """
    Compute transparent heuristic priority index (0-100) from detected signals.
    
    Weighting:
    - CRITICAL: 30 pts each
    - HIGH: 20 pts each
    - MEDIUM: 10 pts each
    - LOW: 5 pts each
    - INFO: 0 pts
    Capped at 100.0.
    """
    all_sig = signals + confidential_signals
    points = 0.0
    breakdown = {"critical": 0.0, "high": 0.0, "medium": 0.0, "low": 0.0}

    for s in all_sig:
        if s.severity.value == "CRITICAL":
            points += 30.0
            breakdown["critical"] += 30.0
        elif s.severity.value == "HIGH":
            points += 20.0
            breakdown["high"] += 20.0
        elif s.severity.value == "MEDIUM":
            points += 10.0
            breakdown["medium"] += 10.0
        elif s.severity.value == "LOW":
            points += 5.0
            breakdown["low"] += 5.0

    total_score = min(100.0, points)

    if total_score >= 50.0:
        level = "CRITICAL"
    elif total_score >= 30.0:
        level = "HIGH"
    elif total_score >= 15.0:
        level = "MEDIUM"
    else:
        level = "LOW"

    return PrototypeCompositeRiskScore(
        composite_score_0_to_100=total_score,
        priority_level=level,
        points_breakdown=breakdown,
    )


class MultisourceOrchestrator:
    """
    Orchestration service combining the frozen OULAD ML baseline and RiskSignalEngine.
    """

    def __init__(self, model_path: Optional[str] = None, metadata_path: Optional[str] = None):
        self.signal_engine = RiskSignalEngine()
        self.predictor = SutraRiskPredictor(
            model_path=model_path or DEFAULT_MODEL_PATH,
            metadata_path=metadata_path or DEFAULT_METADATA_PATH,
        )

    def process_student_360(self, profile: StudentSuccess360Profile) -> IntegratedStudentSuccessCard:
        """
        Evaluate multisource signals and optional OULAD ML prediction in strict isolation.
        """
        # 1. Evaluate Multisource Rules
        sig_result: RiskSignalEvaluationResult = self.signal_engine.evaluate_profile(profile)

        # 2. Compute Prototype Heuristic Score
        composite = compute_prototype_composite_score(
            signals=sig_result.signals,
            confidential_signals=sig_result.confidential_signals,
        )

        # 3. Optional OULAD ML Prediction (Strict Feature Boundary)
        ml_pred_payload = None
        if profile.oulad_features and self.predictor.is_ready:
            # Validate against strict 25-feature schema
            oulad_input = StudentFeatureInput(**profile.oulad_features)
            ml_res: PredictionResult = self.predictor.predict_single(
                feature_data=oulad_input.to_feature_dict(),
                record_id=profile.student_key,
                module_code="360-MODULE",
                presentation_code="2026-FALL",
            )
            card = ml_res.evidence_card
            ml_pred_payload = {
                "model_name": ml_res.model_name,
                "model_version": ml_res.model_version,
                "operational_threshold": ml_res.operational_threshold,
                "risk_probability": ml_res.risk_probability,
                "review_recommended": ml_res.review_recommended,
                "risk_tier": ml_res.risk_tier.value,
                "top_risk_drivers": [
                    {"factor": d.factor_title, "weight": round(d.contribution_weight, 4)}
                    for d in card.top_risk_drivers
                ],
                "top_protective_factors": [
                    {"factor": p.factor_title, "weight": round(p.contribution_weight, 4)}
                    for p in card.top_protective_factors
                ],
                "boundary_note": "Score based SOLELY on 25 Day-30 OULAD features; has zero knowledge of attendance/fee/skills.",
            }

        return IntegratedStudentSuccessCard(
            student_key=profile.student_key,
            academic_term=profile.academic_term,
            department=profile.department,
            program_year=profile.program_year,
            snapshot_timestamp=profile.snapshot_timestamp,
            oulad_ml_prediction=ml_pred_payload,
            active_risk_signals=sig_result.signals,
            confidential_support_signals=sig_result.confidential_signals,
            prototype_composite=composite,
        )
