"""
Pydantic v2 schemas for health, readiness, and model metadata inspection endpoints.
"""

from typing import Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Process health status."""
    status: str = Field(default="healthy", description="Service health state")
    timestamp: str = Field(description="Current server timestamp")
    service: str = Field(default="sutra-ml-backend", description="Service identifier")
    version: str = Field(default="1.0.0", description="Backend service version")


class ReadyResponse(BaseModel):
    """Model pipeline and metadata readiness status."""
    status: str = Field(description="'ready' when model is loaded, 'not_ready' otherwise")
    model_loaded: bool = Field(description="True if model artifact is in memory")
    model_name: str = Field(description="Approved model algorithm")
    model_version: str = Field(description="Model artifact version")
    operational_threshold: float = Field(description="Decision threshold for review recommendation")
    feature_count: int = Field(description="Total required feature dimensions")


class FeatureCatalog(BaseModel):
    """Breakdown of feature dimensions."""
    total_count: int = Field(default=25)
    numerical_count: int = Field(default=19)
    categorical_count: int = Field(default=6)
    numerical: list[str]
    categorical: list[str]


class SafetyGovernance(BaseModel):
    """Human-in-the-loop and ethical boundaries."""
    human_in_the_loop_mandate: str = Field(
        default="A risk probability is not a verdict. No alert or support action is taken without advisor review."
    )
    assessment_latency_exclusion: str = Field(
        default="Assessment marks are excluded from predictors due to grading latency; observable submissions only."
    )
    non_causal_disclaimer: str = Field(
        default="Predictions represent empirical statistical associations, not causal diagnosis or ability ratings."
    )


class ModelInfoResponse(BaseModel):
    """Comprehensive model configuration contract."""
    model_name: str
    model_version: str
    model_type: str
    target_definition: str = Field(
        default="Binary academic outcome: 1 = At-Risk (Withdrawn or Fail), 0 = On-Track (Pass or Distinction)"
    )
    observation_window: str = Field(
        default="Observable activities up to Day 30 relative to course start date"
    )
    decision_threshold: float
    features: FeatureCatalog
    training_cohort: str = Field(
        default="Historical Open University presentations: 2013B, 2013J, 2014B"
    )
    evaluation_holdout: str = Field(
        default="Temporal future presentation: 2014J (disjoint student holdout verified)"
    )
    safety_governance: SafetyGovernance = Field(default_factory=SafetyGovernance)
