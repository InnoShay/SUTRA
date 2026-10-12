"""Add a private, stable seed for deterministic identity artwork.

Revision ID: 0009_identity_art_seed
Revises: 0008_document_integrity_live_mode
Create Date: 2026-10-13 13:00:00.000000
"""

import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0009_identity_art_seed"
down_revision: Union[str, None] = "0008_document_integrity_live_mode"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "student_identities",
        sa.Column("collectible_error", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "student_identities",
        sa.Column("art_seed", sa.String(length=64), nullable=True),
    )
    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id FROM student_identities")).fetchall()
    for row in rows:
        connection.execute(
            sa.text("UPDATE student_identities SET art_seed = :seed WHERE id = :id"),
            {"seed": secrets.token_hex(32), "id": row[0]},
        )
    with op.batch_alter_table("student_identities") as batch_op:
        batch_op.alter_column(
            "art_seed",
            existing_type=sa.String(length=64),
            nullable=False,
        )

    # Remove legacy simulated rows. No database row may claim a token exists
    # without a confirmed chain transaction hash.
    connection.execute(
        sa.text(
            "UPDATE student_identities SET collectible_status = 'unminted', "
            "collectible_token_id = NULL, collectible_tx_hash = NULL, "
            "minted_at = NULL WHERE collectible_status = 'minted' "
            "AND collectible_tx_hash IS NULL"
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("student_identities") as batch_op:
        batch_op.drop_column("art_seed")
        batch_op.drop_column("collectible_error")
