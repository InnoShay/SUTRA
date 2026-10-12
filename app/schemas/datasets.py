from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DataSourceProvenance(BaseModel):
    name: str
    description: str
    entity_type: str
    key_schema: str
    record_count: Optional[int] = None
    storage_location: str
    purpose: str
    licensing: str
    isolation_rule: str


class ProvenanceOverviewResponse(BaseModel):
    status: str
    governance_framework: str
    sources: Dict[str, DataSourceProvenance]


class ResearchRecordResponse(BaseModel):
    source: str
    record_identifier: str
    entity_type: str
    provenance_label: str
    licensing: str
    purpose: str
    disclaimer: str
    enrollment_context: Optional[Dict[str, Any]] = None
    features: Dict[str, Any]
    is_synthetic: bool = False
    is_research: bool = False
    is_institutional: bool = False
