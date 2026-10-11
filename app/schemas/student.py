import uuid
from datetime import datetime
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class StudentSummary(BaseModel):
    id: uuid.UUID
    external_ref: str
    display_name: str
    cohort_code: Optional[str] = None
    enrollment_status: str


class ObservationDTO(BaseModel):
    id: uuid.UUID
    domain: str
    metric_key: str
    value: Any
    unit: Optional[str] = None
    quality_state: str
    event_at: datetime
    available_at: Optional[datetime] = None
    ingested_at: datetime
    source_system: str


class FinanceObservationDTO(BaseModel):
    id: uuid.UUID
    fee_support_status: str
    quality_state: str
    event_at: datetime
    available_at: Optional[datetime] = None
    ingested_at: datetime
    source_system: str


class FreshnessMetricsDTO(BaseModel):
    total_observations: int
    domains_represented: List[str]
    last_observation_event_at: Optional[datetime] = None
    last_observation_available_at: Optional[datetime] = None
    is_stale: bool = False


class SupportViewResponse(BaseModel):
    student: StudentSummary
    freshness_metrics: FreshnessMetricsDTO
    active_signals_count: int
    active_cases_count: int
    recent_observations: List[ObservationDTO]


class FinanceViewResponse(BaseModel):
    student: StudentSummary
    finance_observations: List[FinanceObservationDTO]
