from datetime import datetime
from typing import Dict, Literal
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    app: str = "sutra"
    version: str = "0.1.0"


class ReadinessChecks(BaseModel):
    database: Literal["ok", "error"] = "ok"
    ml_model: Literal["ready", "uncalibrated", "disabled", "error"] = "uncalibrated"


class ReadinessResponse(BaseModel):
    status: Literal["ready", "degraded"]
    app: str = "sutra"
    version: str = "0.1.0"
    checks: ReadinessChecks
    timestamp: datetime = Field(default_factory=datetime.utcnow)
