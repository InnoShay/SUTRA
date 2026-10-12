"""Stop treating simulated document anchors as finalized integrity proofs.

Revision ID: 0008_document_integrity_live_mode
Revises: 0007_identity_profile_avatar
Create Date: 2026-10-13 12:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0008_document_integrity_live_mode"
down_revision: Union[str, None] = "0007_identity_profile_avatar"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Old simulated rows stay in history as unverified finalized records. Their
    # transaction/block metadata cannot be trusted as proof and is cleared.
    op.execute(
        sa.text(
            "UPDATE document_records "
            "SET anchoring_mode = 'unavailable', status = 'finalized', "
            "tx_hash = NULL, block_number = NULL, anchored_at = NULL, "
            "verification_status = 'unverified' "
            "WHERE anchoring_mode = 'simulated'"
        )
    )
    with op.batch_alter_table("document_records") as batch_op:
        batch_op.alter_column(
            "anchoring_mode",
            existing_type=sa.String(length=32),
            existing_nullable=False,
            server_default="unavailable",
        )


def downgrade() -> None:
    # Cannot recover simulation labels without falsely recreating proof claims.
    with op.batch_alter_table("document_records") as batch_op:
        batch_op.alter_column(
            "anchoring_mode",
            existing_type=sa.String(length=32),
            existing_nullable=False,
            server_default="simulated",
        )
