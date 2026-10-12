"""Phase 4 Reliability, Idempotency, and Failure Recovery Hardening

Revision ID: 0003_reliability_hardening
Revises: 0002_ml_inference_logs
Create Date: 2026-10-12 03:45:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0003_reliability_hardening"
down_revision: Union[str, None] = "0002_ml_inference_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create idempotency_records table
    op.create_table(
        "idempotency_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=255), nullable=False),
        sa.Column("request_path", sa.String(length=255), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("response_status_code", sa.Integer(), nullable=False, server_default="200"),
        sa.Column("response_json", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "idempotency_key", name="uq_idemp_inst_key"),
    )
    op.create_index("idx_idemp_created", "idempotency_records", ["institution_id", "created_at"])

    # 2. Add unique constraint on cases for institution_id + originating_signal_id
    with op.batch_alter_table("cases") as batch_op:
        batch_op.create_unique_constraint(
            "uq_cases_inst_originating_signal",
            ["institution_id", "originating_signal_id"],
        )


def downgrade() -> None:
    with op.batch_alter_table("cases") as batch_op:
        batch_op.drop_constraint("uq_cases_inst_originating_signal", type_="unique")
    op.drop_index("idx_idemp_created", table_name="idempotency_records")
    op.drop_table("idempotency_records")
