import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class ObservationItem(BaseModel):
    external_student_ref: str = Field(..., description="External pseudonymous student reference (e.g. SYN-1007)")
    domain: str = Field(..., description="One of: attendance, academic, participation, skills, faculty_feedback")
    metric_key: str = Field(..., description="Metric key (e.g. attendance_rate, missing_assignments_count)")
    value: Any = Field(..., description="Observed numeric, categorical, or boolean value")
    unit: Optional[str] = Field(None, description="Optional unit of measurement (e.g. ratio, count)")
    quality_state: str = Field("valid", description="Data quality state: valid, stale, missing, conflicting")
    event_at: datetime = Field(..., description="UTC timestamp when the physical event occurred")
    available_at: Optional[datetime] = Field(None, description="UTC timestamp when the record became available to decision-makers")
    source_system: str = Field(..., description="Source system identifier (e.g. canvas_lms_v2, biometric_gate)")
    source_record_ref: str = Field(..., description="Source system record reference for deduplication")
    source_version: int = Field(1, description="Source record version")


class FinanceObservationItem(BaseModel):
    external_student_ref: str = Field(..., description="External pseudonymous student reference")
    fee_support_status: str = Field(..., description="Status: review_requested, support_in_progress, resolved, unknown")
    quality_state: str = Field("valid", description="Data quality state")
    event_at: datetime = Field(..., description="UTC timestamp when event occurred")
    available_at: Optional[datetime] = Field(None, description="UTC timestamp when available to decision-makers")
    source_system: str = Field(..., description="Source system identifier")
    source_record_ref: str = Field(..., description="Source system record reference")
    source_version: int = Field(1, description="Source record version")


class ImportBatchRequest(BaseModel):
    source_system: str = Field(..., description="Source system submitting the import batch")
    schema_version: str = Field("1.0", description="Import schema version")
    observations: List[ObservationItem] = Field(default_factory=list, description="General student observations (5 domains)")
    finance_observations: List[FinanceObservationItem] = Field(default_factory=list, description="Fee-related support observations (segregated domain)")


class ImportErrorItem(BaseModel):
    row_index: int
    code: str
    message: str
    ref: Optional[str] = None


class ImportBatchResponse(BaseModel):
    import_id: uuid.UUID
    status: str
    rows_received: int
    rows_accepted: int
    rows_duplicate: int
    rows_rejected: int
    row_errors: List[ImportErrorItem] = Field(default_factory=list)
