import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import BigInteger, DateTime, Index, Integer, JSON, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DocumentRecord(Base):
    """
    Tracks immutable educational documents and their cryptographic SHA-256 anchoring
    to Base Sepolia (Chain ID 84532).
    
    Adheres strictly to ADR-003 and privacy invariants:
    - Never stores PII on-chain.
    - Tenant-isolated by institution_id.
    - Preserves immutable versioning (editing generates a new version).
    """
    __tablename__ = "document_records"
    __table_args__ = (
        UniqueConstraint("institution_id", "document_ref", name="uq_doc_inst_ref"),
        Index("idx_doc_inst_status", "institution_id", "status"),
        Index("idx_doc_inst_hash", "institution_id", "sha256_hash"),
        Index("idx_doc_created", "institution_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    
    # Internal unique reference (e.g. DOC-2026-SYN1007-001)
    document_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[str] = mapped_column(
        String(64), nullable=False, default="intervention_plan"
    )  # intervention_plan, support_summary, case_decision, uploaded_proof

    # File and hash metadata
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False, default="application/pdf")
    
    # Exact byte-level SHA-256 fingerprint (hex lowercase, 64 chars)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    # Lifecycle states: draft, finalized, anchor_pending, anchored, anchor_failed, verification_mismatch
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")

    # Author and Approver references
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    finalized_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Base Sepolia Blockchain Anchoring
    chain_id: Mapped[int] = mapped_column(Integer, nullable=False, default=84532)
    contract_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tx_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    block_number: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    anchored_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    anchoring_mode: Mapped[str] = mapped_column(
        String(32), nullable=False, default="simulated"
    )  # simulated, onchain

    # Verification status
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    verification_status: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True
    )  # verified_match, mismatch, unanchored
    last_verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)

    # Opaque non-PII metadata & audit failure info
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
