"""
Pydantic v2 schemas for prediction requests and responses.
"""

from typing import Optional
from pydantic import BaseModel, Field

from backend.app.schemas.features import StudentFeatureInput
from sutra_ml.schemas.evidence_card import RiskTier, SutraEvidenceCard


class PredictResponse(BaseModel):
    """Prediction outcome for an individual student presentation record."""
    record_id: str = Field(description="De-identified record identifier")
    risk_probability: float = Field(ge=0.0, le=1.0, description="Estimated risk probability P(At-Risk)")
    review_recommended: bool = Field(description="Whether the estimated probability meets or exceeds operational threshold")
    risk_tier: RiskTier = Field(description="Institutional risk categorization")
    operational_threshold: float = Field(description="Operational decision boundary (default: 0.46)")
    model_name: str = Field(description="Selected model architecture")
    model_version: str = Field(description="Model artifact version")
    evidence_card: SutraEvidenceCard = Field(description="Structured evidence attribution card for human advisor review")


class BatchPredictRequest(BaseModel):
    """Bounded batch prediction request."""
    records: list[StudentFeatureInput] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="List of student records to score (bounded between 1 and 100 records)"
    )


class BatchPredictResponse(BaseModel):
    """Aggregated batch prediction response."""
    total_records: int = Field(description="Total records processed in batch")
    review_recommended_count: int = Field(description="Count of records meeting review recommendation threshold")
    predictions: list[PredictResponse] = Field(description="Individual prediction results")
