import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Index, Integer, JSON, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NotificationOutbox(Base):
    __tablename__ = "notification_outbox"
    __table_args__ = (
        UniqueConstraint("institution_id", "idempotency_key", name="uq_outbox_inst_idemp_key"),
        Index("idx_outbox_pending", "status", "next_attempt_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False
    )
    case_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("cases.id", ondelete="CASCADE"), nullable=True
    )
    task_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("case_tasks.id", ondelete="CASCADE"), nullable=True
    )
    adapter_key: Mapped[str] = mapped_column(String, nullable=False, default="in_app_demo")
    template_key: Mapped[str] = mapped_column(String, nullable=False)
    destination_ref: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    safe_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String, nullable=False, default="pending")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    next_attempt_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    last_error_code: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
