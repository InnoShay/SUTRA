import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class InterventionCatalog(Base):
    __tablename__ = "intervention_catalog"
    __table_args__ = (
        UniqueConstraint("institution_id", "intervention_key", "version", name="uq_catalog_inst_key_ver"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    intervention_key: Mapped[str] = mapped_column(String, nullable=False)
    domain: Mapped[str] = mapped_column(String, nullable=False)
    display_label: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(String, nullable=False)
    recipient_role: Mapped[str] = mapped_column(String, nullable=False)
    required_purpose_key: Mapped[str] = mapped_column(String, nullable=False)
    requires_human_approval: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Case(Base):
    __tablename__ = "cases"
    __table_args__ = (
        UniqueConstraint("institution_id", "id", name="uq_cases_inst_id"),
        Index("idx_cases_queue", "institution_id", "state", "due_at"),
        Index("idx_cases_owner", "institution_id", "primary_owner_user_id", "state"),
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
    originating_signal_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("signals.id", ondelete="RESTRICT"), nullable=False
    )
    selected_intervention_key: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False, default="suggested")
    primary_owner_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    tasks: Mapped[list["CaseTask"]] = relationship("CaseTask", back_populates="case", cascade="all, delete-orphan")
    events: Mapped[list["CaseEvent"]] = relationship("CaseEvent", back_populates="case", cascade="all, delete-orphan")


class CaseTask(Base):
    __tablename__ = "case_tasks"
    __table_args__ = (
        UniqueConstraint("institution_id", "idempotency_key", name="uq_tasks_inst_idemp_key"),
        UniqueConstraint("institution_id", "id", name="uq_tasks_inst_id"),
        Index("idx_tasks_due", "institution_id", "state", "due_at"),
        Index("idx_tasks_assignee", "institution_id", "assignee_user_id", "state"),
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
    domain: Mapped[str] = mapped_column(String, nullable=False)
    generic_label: Mapped[str] = mapped_column(String, nullable=False)
    state: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    assignee_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deadline_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    case: Mapped["Case"] = relationship("Case", back_populates="tasks")


class RestrictedTaskDetail(Base):
    __tablename__ = "restricted_task_details"
    __table_args__ = (
        UniqueConstraint("institution_id", "task_id", name="uq_restricted_inst_task_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False
    )
    task_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("case_tasks.id", ondelete="CASCADE"), nullable=False
    )
    restricted_domain: Mapped[str] = mapped_column(String, nullable=False)
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    purpose_key: Mapped[str] = mapped_column(String, nullable=False)
    retention_class: Mapped[str] = mapped_column(String, nullable=False, default="restricted_short_lived")
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class CaseEvent(Base):
    __tablename__ = "case_events"
    __table_args__ = (
        UniqueConstraint("institution_id", "idempotency_key", name="uq_case_events_inst_idemp_key"),
        Index("idx_case_events_history", "institution_id", "case_id", "created_at"),
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
    actor_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, nullable=True)
    actor_kind: Mapped[str] = mapped_column(String, nullable=False, default="user")
    event_type: Mapped[str] = mapped_column(String, nullable=False)
    from_state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    to_state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    reason_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    event_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, nullable=False, default=dict)
    request_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    case: Mapped["Case"] = relationship("Case", back_populates="events")
