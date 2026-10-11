import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.database import Base

JSONType = JSON().with_variant(JSONB, "postgresql")


class MLInferenceLog(Base):
    """Audit log for ML model inference predictions and Evidence Card generation."""

    __tablename__ = "ml_inference_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    institution_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False, index=True)
    signal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("signals.id", ondelete="SET NULL"), nullable=True
    )
    student_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("students.id", ondelete="SET NULL"), nullable=True
    )
    external_student_ref: Mapped[str] = mapped_column(String(100), nullable=False)
    model_name: Mapped[str] = mapped_column(String(100), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)
    prediction_cutoff: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_probability: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    classification: Mapped[str] = mapped_column(String(50), nullable=False)
    top_attributions: Mapped[Dict[str, Any]] = mapped_column(JSONType, nullable=False, default=list)
    latency_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, default=lambda: datetime.now(timezone.utc)
    )
