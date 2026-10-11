from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    field: Optional[str] = None
    message: str
    code: Optional[str] = None


class ErrorPayload(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error description")
    request_id: Optional[str] = Field(None, description="Correlated trace request ID")
    details: List[ErrorDetail] = Field(default_factory=list, description="Optional parameter-level details")


class ErrorEnvelope(BaseModel):
    error: ErrorPayload
