"""Student Identity, Avatar Studio, and Collectible Metadata Registry

Revision ID: 0005_student_identity_and_avatar
Revises: 0004_document_integrity_registry
Create Date: 2026-10-13 00:30:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0005_student_identity_and_avatar"
down_revision: Union[str, None] = "0004_document_integrity_registry"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_identities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("sutra_id", sa.String(length=64), nullable=False),
        sa.Column("display_name", sa.String(length=128), nullable=False, server_default="Sutra Scholar"),
        sa.Column("avatar_config", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("collectible_status", sa.String(length=32), nullable=False, server_default="unminted"),
        sa.Column("collectible_token_id", sa.BigInteger(), nullable=True),
        sa.Column("collectible_tx_hash", sa.String(length=128), nullable=True),
        sa.Column("wallet_address", sa.String(length=64), nullable=True),
        sa.Column("minted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_student_identity_user_id"),
        sa.UniqueConstraint("sutra_id", name="uq_student_identity_sutra_id"),
        sa.ForeignKeyConstraint(["institution_id"], ["institutions.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_student_identity_user", "student_identities", ["user_id"])
    op.create_index("idx_student_identity_sutra", "student_identities", ["sutra_id"])
    op.create_index("idx_student_identity_inst_user", "student_identities", ["institution_id", "user_id"])


def downgrade() -> None:
    op.drop_index("idx_student_identity_inst_user", table_name="student_identities")
    op.drop_index("idx_student_identity_sutra", table_name="student_identities")
    op.drop_index("idx_student_identity_user", table_name="student_identities")
    op.drop_table("student_identities")
