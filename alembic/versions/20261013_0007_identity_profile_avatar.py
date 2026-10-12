"""Persist the selected raster avatar on the SUTRA identity.

Revision ID: 0007_identity_profile_avatar
Revises: 0006_identity_sqlite_timestamp_defaults
Create Date: 2026-10-13 02:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0007_identity_profile_avatar"
down_revision: Union[str, None] = "0006_identity_sqlite_timestamp_defaults"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("student_identities", sa.Column("profile_avatar_url", sa.String(length=256), nullable=True))


def downgrade() -> None:
    op.drop_column("student_identities", "profile_avatar_url")
