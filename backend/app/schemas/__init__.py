"""
Pydantic schemas package for SUTRA inference backend.
"""

from backend.app.schemas.features import (
    AgeBandEnum,
    DisabilityEnum,
    GenderEnum,
    HighestEducationEnum,
    ImdBandEnum,
    RegionEnum,
    StudentFeatureInput,
)
from backend.app.schemas.predict import (
    BatchPredictRequest,
    BatchPredictResponse,
    PredictResponse,
)
from backend.app.schemas.system import (
    FeatureCatalog,
    HealthResponse,
    ModelInfoResponse,
    ReadyResponse,
    SafetyGovernance,
)

__all__ = [
    "AgeBandEnum",
    "DisabilityEnum",
    "GenderEnum",
    "HighestEducationEnum",
    "ImdBandEnum",
    "RegionEnum",
    "StudentFeatureInput",
    "PredictResponse",
    "BatchPredictRequest",
    "BatchPredictResponse",
    "HealthResponse",
    "ReadyResponse",
    "ModelInfoResponse",
    "FeatureCatalog",
    "SafetyGovernance",
]
