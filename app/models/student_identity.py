import secrets
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, UniqueConstraint, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class StudentIdentity(Base):
    """
    SUTRA Persistent Student Identity.
    
    Guarantees:
    1. Exactly one persistent identity per authenticated student (uq_student_identity_user_id).
    2. Cryptographically random, non-PII public identifier 'sutra_id' (e.g. SUTRA-7F3A-8C21-9B04).
    3. Validated JSON avatar configuration from approved cosmetic catalogue.
    4. Off-chain collectible and optional Base Sepolia NFT status tracking.
    5. Zero PII: No student email, real name or academic records stored in public metadata.
    """
    __tablename__ = "student_identities"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_student_identity_user_id"),
        UniqueConstraint("sutra_id", name="uq_student_identity_sutra_id"),
        Index("idx_student_identity_inst_user", "institution_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, nullable=False, index=True
    )
    institution_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False
    )
    # Cryptographic public non-PII identifier: SUTRA-XXXX-XXXX-XXXX
    sutra_id: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True, index=True
    )
    # Pseudonymous display handle / avatar name chosen by student
    display_name: Mapped[str] = mapped_column(
        String(128), nullable=False, default="Sutra Scholar"
    )
    # Validated avatar cosmetic configuration dictionary
    avatar_config: Mapped[Dict[str, Any]] = mapped_column(
        JSON, nullable=False, default=dict
    )
    profile_avatar_url: Mapped[Optional[str]] = mapped_column(
        String(256), nullable=True
    )
    # Private, stable 256-bit seed for the identity artwork. Never derive the
    # artwork from the chosen avatar or expose this seed in metadata.
    art_seed: Mapped[str] = mapped_column(
        String(64), nullable=False, default=lambda: secrets.token_hex(32)
    )
    # Collectible status: 'unminted', 'pending', 'minted', 'failed'
    collectible_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="unminted"
    )
    collectible_token_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True
    )
    collectible_tx_hash: Mapped[Optional[str]] = mapped_column(
        String(128), nullable=True
    )
    collectible_error: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    wallet_address: Mapped[Optional[str]] = mapped_column(
        String(64), nullable=True
    )
    minted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.current_timestamp(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=func.current_timestamp(),
        onupdate=lambda: datetime.now(timezone.utc),
    )
