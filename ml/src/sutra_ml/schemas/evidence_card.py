"""
Pydantic v2 schema and builder for the SUTRA Evidence Card.

Defines the structured, model-independent data contract for presenting
explainable risk evidence to human support staff (advisors and tutors).
"""

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class RiskTier(str, Enum):
    LOW = "LOW"            # p < 0.30
    MODERATE = "MODERATE"  # 0.30 <= p < 0.46
    ELEVATED = "ELEVATED"  # 0.46 <= p < 0.65 (Crosses operational alert threshold)
    HIGH = "HIGH"          # p >= 0.65


class CourseContext(BaseModel):
    module_code: str = Field(description="Academic module code, e.g. 'BBB' or 'FFF'")
    presentation_code: str = Field(description="Semester presentation, e.g. '2014J'")
    snapshot_day: int = Field(default=30, description="Observation cutoff day relative to course start")


class ModelMetadata(BaseModel):
    model_name: str = Field(description="Approved model algorithm")
    model_version: str = Field(description="Semantic version of model artifact, e.g. 'v1.0.0'")
    training_cohort: str = Field(description="Historical presentations used for training")


class EvidenceFactor(BaseModel):
    factor_title: str = Field(description="Human-readable title of the evidence driver")
    observed_raw_value: str = Field(description="Actual observed student attribute or metric")
    contribution_weight: float = Field(description="Log-odds or SHAP feature attribution weight")
    plain_english_summary: str = Field(description="Contextual explanation for advisor review")


class GovernanceNotices(BaseModel):
    non_causal_disclaimer: str = Field(
        default=(
            "Empirical risk estimate based on historical patterns. "
            "Does NOT represent causation or a diagnostic assessment of ability."
        )
    )
    data_boundary_caveat: str = Field(
        default=(
            "Assessment marks are excluded due to grading latency. "
            "Evidence reflects only observable submissions and activity up to Day 30."
        )
    )
    human_in_the_loop_mandate: str = Field(
        default=(
            "No Alert Without Action: Requires verified review by an assigned academic "
            "advisor before any support case or outreach is confirmed."
        )
    )


class SutraEvidenceCard(BaseModel):
    record_id: str = Field(description="De-identified prediction instance identifier")
    course_context: CourseContext
    model_metadata: ModelMetadata
    risk_probability: float = Field(ge=0.0, le=1.0, description="Calibrated risk probability P(At-Risk)")
    risk_tier: RiskTier
    operational_threshold: float = Field(description="Threshold used for proactive alert triggering")
    alert_triggered: bool = Field(description="Whether the prediction crosses the alert threshold")
    top_risk_drivers: list[EvidenceFactor]
    top_protective_factors: list[EvidenceFactor]
    governance_notices: GovernanceNotices = Field(default_factory=GovernanceNotices)


def determine_risk_tier(prob: float, threshold: float = 0.46) -> RiskTier:
    """Classify risk probability into standardized institutional tiers."""
    if prob < 0.30:
        return RiskTier.LOW
    elif prob < threshold:
        return RiskTier.MODERATE
    elif prob < 0.65:
        return RiskTier.ELEVATED
    else:
        return RiskTier.HIGH


def build_evidence_card(
    record_id: str,
    module_code: str,
    presentation_code: str,
    risk_prob: float,
    top_pos_factors: list[dict[str, Any]],
    top_neg_factors: list[dict[str, Any]],
    model_name: str = "Regularized Logistic Regression Baseline",
    model_version: str = "v1.0.0",
    threshold: float = 0.46,
) -> SutraEvidenceCard:
    """Factory function to build and validate a complete SUTRA Evidence Card."""
    risk_tier = determine_risk_tier(risk_prob, threshold=threshold)
    alert_triggered = risk_prob >= threshold

    def _format_factor(f: dict[str, Any], is_risk: bool) -> EvidenceFactor:
        title = f.get("display_title", f.get("feature_key", "Feature"))
        raw_val = f.get("observed_raw_value", "-")
        weight = float(f.get("log_odds_contribution", f.get("shap_contribution", 0.0)))

        # Generate clear, contextual plain-English summaries
        title_lower = title.lower()
        if "inactive" in title_lower or "days since" in title_lower:
            summary = f"Student has been inactive for {raw_val} days since last platform access."
        elif "active learning days" in title_lower:
            if is_risk:
                summary = f"Recorded low platform presence ({raw_val} active study days logged by Day 30)."
            else:
                summary = f"Demonstrated consistent study routine ({raw_val} active days logged across Day 0-30)."
        elif "missing registration" in title_lower:
            summary = "Registration date missing in institutional records, indicating atypical or late onboarding."
        elif "lead time" in title_lower or "registered_before_start" in title_lower:
            summary = f"Enrolled {raw_val} days relative to course start date."
        elif "virtual learning platform access flag" in title_lower:
            if str(raw_val) in ["0", "0.0"]:
                summary = "Zero virtual learning environment logins detected through Day 30."
            else:
                summary = "Virtual learning platform access established during initial 30 days."
        elif "core course material" in title_lower:
            summary = f"Accessed essential reading and course material {raw_val} times."
        elif "supplementary" in title_lower:
            summary = f"Accessed supplementary study resources {raw_val} times."
        elif "practice quiz" in title_lower:
            summary = f"Engaged with formative practice quizzes {raw_val} times."
        elif "forum" in title_lower:
            summary = f"Interacted with module discussion forums {raw_val} times."
        elif "homepage" in title_lower:
            summary = f"Visited module course homepage {raw_val} times."
        elif "clicks" in title_lower:
            if is_risk:
                summary = f"Recorded low engagement velocity ({raw_val} clicks by Day 30)."
            else:
                summary = f"Consistent platform engagement ({raw_val} clicks by Day 30)."
        elif "prior module attempts" in title_lower:
            summary = f"Student previously attempted this course {raw_val} time(s)."
        elif "credit" in title_lower:
            summary = f"Student is registered for {raw_val} academic credits this term."
        elif "assessment" in title_lower:
            if str(raw_val) in ["0", "0.0"]:
                summary = "Zero early assessment submissions recorded by Day 30."
            else:
                summary = f"{raw_val} formative assessment submission(s) logged by Day 30."
        elif "education" in title_lower:
            summary = f"Highest prior education credential recorded as '{raw_val}'."
        elif "deprivation" in title_lower or "imd" in title_lower:
            summary = f"Area index of multiple deprivation decile band: '{raw_val}'."
        elif "region" in title_lower:
            summary = f"Geographic region recorded as '{raw_val}'."
        elif "age band" in title_lower:
            summary = f"Student age bracket: '{raw_val}'."
        elif "gender" in title_lower:
            summary = f"Recorded demographic context '{raw_val}' (contextual reference only)."
        elif "disability" in title_lower:
            summary = f"Declared disability accommodation status: '{raw_val}'."
        else:
            summary = f"Observed value: {raw_val} (attributing {weight:+.2f} to risk estimate)."

        return EvidenceFactor(
            factor_title=title,
            observed_raw_value=str(raw_val),
            contribution_weight=round(weight, 4),
            plain_english_summary=summary,
        )

    pos_drivers = [_format_factor(f, is_risk=True) for f in top_pos_factors]
    neg_factors = [_format_factor(f, is_risk=False) for f in top_neg_factors]

    return SutraEvidenceCard(
        record_id=record_id,
        course_context=CourseContext(
            module_code=module_code,
            presentation_code=presentation_code,
            snapshot_day=30,
        ),
        model_metadata=ModelMetadata(
            model_name=model_name,
            model_version=model_version,
            training_cohort="2013B, 2013J, 2014B",
        ),
        risk_probability=round(risk_prob, 4),
        risk_tier=risk_tier,
        operational_threshold=round(threshold, 4),
        alert_triggered=alert_triggered,
        top_risk_drivers=pos_drivers,
        top_protective_factors=neg_factors,
    )
