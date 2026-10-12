"""Document Integrity Registry and Base Sepolia Anchoring

Revision ID: 0004_document_integrity_registry
Revises: 0003_reliability_hardening
Create Date: 2026-10-12 18:00:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004_document_integrity_registry"
down_revision: Union[str, None] = "0003_reliability_hardening"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "document_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("institution_id", sa.Uuid(), nullable=False),
        sa.Column("document_ref", sa.String(length=128), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("doc_type", sa.String(length=64), nullable=False, server_default="intervention_plan"),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_path", sa.String(length=512), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False, server_default="0"),
        sa.Column("mime_type", sa.String(length=128), nullable=False, server_default="application/pdf"),
        sa.Column("sha256_hash", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("finalized_by", sa.Uuid(), nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("chain_id", sa.Integer(), nullable=False, server_default="84532"),
        sa.Column("contract_address", sa.String(length=64), nullable=True),
        sa.Column("tx_hash", sa.String(length=128), nullable=True),
        sa.Column("block_number", sa.BigInteger(), nullable=True),
        sa.Column("anchored_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("anchoring_mode", sa.String(length=32), nullable=False, server_default="simulated"),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("verification_status", sa.String(length=32), nullable=True),
        sa.Column("last_verified_by", sa.Uuid(), nullable=True),
        sa.Column("metadata_payload", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("institution_id", "document_ref", name="uq_doc_inst_ref"),
    )
    op.create_index("idx_doc_inst_status", "document_records", ["institution_id", "status"])
    op.create_index("idx_doc_inst_hash", "document_records", ["institution_id", "sha256_hash"])
    op.create_index("idx_doc_created", "document_records", ["institution_id", "created_at"])


def downgrade() -> None:
    op.drop_index("idx_doc_created", table_name="document_records")
    op.drop_index("idx_doc_inst_hash", table_name="document_records")
    op.drop_index("idx_doc_inst_status", table_name="document_records")
    op.drop_table("document_records")
