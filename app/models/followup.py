import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FollowUp(Base):
    __tablename__ = "follow_ups"
    __table_args__ = (
        UniqueConstraint("institution_id", "idempotency_key", name="uq_followups_inst_idemp_key"),
        Index("idx_followups_case_time", "institution_id", "case_id", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    follow_up_type: Mapped[str] = mapped_column(String, nullable=False)
    contact_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    proof_kind: Mapped[str] = mapped_column(String, nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recorded_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    sanitized_note: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    proof_ref: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class CaseOutcome(Base):
    __tablename__ = "case_outcomes"
    __table_args__ = (
        Index("idx_outcomes_status_time", "institution_id", "outcome_status", "recorded_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False
    )
    outcome_status: Mapped[str] = mapped_column(String, nullable=False)
    follow_up_window_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    follow_up_window_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    rationale: Mapped[str] = mapped_column(String, nullable=False)
    evidence_kind: Mapped[str] = mapped_column(String, nullable=False, default="staff_review")
    recorded_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
