import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Index, JSON, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EvidencePacket(Base):
    __tablename__ = "evidence_packets"
    __table_args__ = (
        UniqueConstraint("institution_id", "id", name="uq_evidence_inst_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False
    )
    policy_version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("policy_versions.id", ondelete="RESTRICT"), nullable=False
    )
    schema_version: Mapped[str] = mapped_column(String, nullable=False)
    as_of_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    digest: Mapped[str] = mapped_column(String, nullable=False)
    retention_class: Mapped[str] = mapped_column(String, nullable=False, default="demo_short_lived")
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Signal(Base):
    __tablename__ = "signals"
    __table_args__ = (
        UniqueConstraint("institution_id", "id", name="uq_signals_inst_id"),
        Index("idx_signals_queue", "institution_id", "result", "evaluated_at"),
        Index("idx_signals_student", "institution_id", "student_id", "evaluated_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="CASCADE"), nullable=False
    )
    policy_version_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("policy_versions.id", ondelete="RESTRICT"), nullable=False
    )
    evidence_packet_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("evidence_packets.id", ondelete="RESTRICT"), nullable=False
    )
    rule_key: Mapped[str] = mapped_column(String, nullable=False)
    result: Mapped[str] = mapped_column(String, nullable=False)
    quality_state: Mapped[str] = mapped_column(String, nullable=False)
    explanation: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reviewed_decision: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    review_reason_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    supersedes_signal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("signals.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    student: Mapped["Student"] = relationship("Student")
    evidence_packet: Mapped["EvidencePacket"] = relationship("EvidencePacket")
    policy_version: Mapped["PolicyVersion"] = relationship("PolicyVersion")
