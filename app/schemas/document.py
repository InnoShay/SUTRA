import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DocumentCreateRequest(BaseModel):
    title: str = Field(..., description="Human-readable title of the document")
    doc_type: str = Field(
        "intervention_plan",
        description="Type of document (intervention_plan, student_summary, case_decision, retention_contract)",
    )
    student_ref: Optional[str] = Field(None, description="Pseudonymous student reference (e.g. SYN-1007)")
    student_name: Optional[str] = Field(None, description="Display name for generated PDF")
    content_text: Optional[str] = Field(None, description="Optional custom text or intervention goals")
    metadata_payload: Dict[str, Any] = Field(
        default_factory=dict,
        description="Non-PII institutional metadata (academic term, department code, catalog tags)",
    )


class DocumentDTO(BaseModel):
    id: uuid.UUID
    institution_id: uuid.UUID
    document_ref: str
    title: str
    doc_type: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    sha256_hash: str
    status: str
    created_by: uuid.UUID
    finalized_by: Optional[uuid.UUID] = None
    finalized_at: Optional[datetime] = None
    chain_id: int = 84532
    contract_address: Optional[str] = None
    tx_hash: Optional[str] = None
    block_number: Optional[int] = None
    anchored_at: Optional[datetime] = None
    anchoring_mode: str = "simulated"
    last_verified_at: Optional[datetime] = None
    verification_status: Optional[str] = None
    explorer_url: Optional[str] = None
    metadata_payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class DocumentFinalizeResponse(BaseModel):
    id: uuid.UUID
    document_ref: str
    sha256_hash: str
    status: str
    finalized_at: datetime
    message: str = "Document successfully finalized and byte-level SHA-256 fingerprint generated."


class DocumentAnchorResponse(BaseModel):
    id: uuid.UUID
    document_ref: str
    sha256_hash: str
    status: str
    chain_id: int
    contract_address: Optional[str] = None
    tx_hash: Optional[str] = None
    explorer_url: Optional[str] = None
    anchoring_mode: str
    anchored_at: datetime
    message: str


class DocumentVerifyResponse(BaseModel):
    id: uuid.UUID
    document_ref: str
    anchored_hash: str
    candidate_hash: str
    is_match: bool
    verification_status: str
    verified_at: datetime
    chain_id: int
    contract_address: Optional[str] = None
    tx_hash: Optional[str] = None
    explorer_url: Optional[str] = None
    anchoring_mode: str
    legal_disclaimer: str = (
        "Document Integrity Guarantee: Cryptographic proof that uploaded file bytes match the anchored "
        "record. Does NOT certify external factual truth, legal enforceability, or institutional authorization."
    )


class DocumentListResponse(BaseModel):
    documents: List[DocumentDTO]
    total: int
    network: str = "Base Sepolia (Chain ID 84532)"
