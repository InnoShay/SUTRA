"""Phase 3 ML Inference Logs Table

Revision ID: 0002_ml_inference_logs
Revises: 0001_core_schema
Create Date: 2026-10-12 03:00:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0002_ml_inference_logs"
down_revision: Union[str, None] = "0001_core_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ml_inference_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("signal_id", sa.Uuid(), nullable=True),
        sa.Column("student_id", sa.Uuid(), nullable=True),
        sa.Column("external_student_ref", sa.String(length=100), nullable=False),
        sa.Column("model_name", sa.String(length=100), nullable=False),
        sa.Column("model_version", sa.String(length=50), nullable=False),
        sa.Column("prediction_cutoff", sa.String(length=50), nullable=False),
        sa.Column("risk_probability", sa.Float(), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("classification", sa.String(length=50), nullable=False),
        sa.Column("top_attributions", sa.JSON(), nullable=False),
        sa.Column("latency_ms", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["signal_id"], ["signals.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ml_logs_inst_time", "ml_inference_logs", ["institution_id", "created_at"])
    op.create_index("idx_ml_logs_student_ref", "ml_inference_logs", ["institution_id", "external_student_ref"])


def downgrade() -> None:
    op.drop_index("idx_ml_logs_student_ref", table_name="ml_inference_logs")
    op.drop_index("idx_ml_logs_inst_time", table_name="ml_inference_logs")
    op.drop_table("ml_inference_logs")
