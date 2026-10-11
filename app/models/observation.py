import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SourceImport(Base):
    __tablename__ = "source_imports"
    __table_args__ = (
        UniqueConstraint("institution_id", "idempotency_key", name="uq_imports_inst_idemp_key"),
        UniqueConstraint("institution_id", "id", name="uq_imports_inst_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    source_system: Mapped[str] = mapped_column(String, nullable=False)
    schema_version: Mapped[str] = mapped_column(String, nullable=False)
    file_digest: Mapped[str] = mapped_column(String, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="received")
    received_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rows_received: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_accepted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_duplicate: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rows_rejected: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    row_errors: Mapped[list[Dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)


class StudentObservation(Base):
    """Non-finance observations (attendance, academic, participation, skills, faculty_feedback)."""
    __tablename__ = "student_observations"
    __table_args__ = (
        UniqueConstraint(
            "institution_id", "source_system", "source_record_ref", "source_version",
            name="uq_obs_inst_source_rec_ver"
        ),
        UniqueConstraint("institution_id", "id", name="uq_obs_inst_id"),
        Index("idx_obs_student_time", "institution_id", "student_id", "available_at", "event_at"),
        Index("idx_obs_domain_time", "institution_id", "domain", "available_at"),
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
    domain: Mapped[str] = mapped_column(String, nullable=False)
    metric_key: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    available_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    source_system: Mapped[str] = mapped_column(String, nullable=False)
    source_record_ref: Mapped[str] = mapped_column(String, nullable=False)
    source_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    quality_state: Mapped[str] = mapped_column(String, nullable=False, default="valid")
    supersedes_observation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, nullable=True
    )
    import_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("source_imports.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    student: Mapped["Student"] = relationship("Student")


class FinanceObservation(Base):
    """Separated finance observation entity (strictly segregated per ADR-003)."""
    __tablename__ = "finance_observations"
    __table_args__ = (
        UniqueConstraint(
            "institution_id", "source_system", "source_record_ref", "source_version",
            name="uq_fin_obs_inst_source_rec_ver"
        ),
        UniqueConstraint("institution_id", "id", name="uq_fin_obs_inst_id"),
        Index("idx_finance_obs_student_time", "institution_id", "student_id", "available_at"),
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
    fee_support_status: Mapped[str] = mapped_column(String, nullable=False)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    available_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    source_system: Mapped[str] = mapped_column(String, nullable=False)
    source_record_ref: Mapped[str] = mapped_column(String, nullable=False)
    source_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    quality_state: Mapped[str] = mapped_column(String, nullable=False, default="valid")
    import_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("source_imports.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    student: Mapped["Student"] = relationship("Student")
