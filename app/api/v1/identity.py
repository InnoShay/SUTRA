import secrets
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.core.errors import PermissionDeniedError, ResourceNotFoundError
from app.core.security import AuthenticatedUser, get_current_user
from app.models.institution import Institution, InstitutionMembership
from app.models.student_identity import StudentIdentity
from app.schemas.identity import (
    AvatarConfigDTO,
    MintNFTRequest,
    NFTMetadataAttribute,
    NFTMetadataResponse,
    StudentIdentityResponse,
    UpdateAvatarRequest,
)
from app.services.blockchain import base_sepolia_service
from app.services.identity_art import artwork_traits, render_identity_art

router = APIRouter(prefix="/identity", tags=["Student Identity & Avatar Studio"])


def _identity_response(identity: StudentIdentity) -> StudentIdentityResponse:
    tx_hash = identity.collectible_tx_hash
    onchain_enabled = base_sepolia_service.nft_mint_ready()
    return StudentIdentityResponse(
        sutra_id=identity.sutra_id,
        display_name=identity.display_name,
        avatar_config=AvatarConfigDTO(**identity.avatar_config),
        avatar_url=identity.profile_avatar_url,
        collectible_status=identity.collectible_status,
        collectible_token_id=identity.collectible_token_id,
        collectible_tx_hash=tx_hash,
        collectible_error=identity.collectible_error,
        wallet_address=identity.wallet_address,
        minted_at=identity.minted_at,
        created_at=identity.created_at,
        mint_mode="onchain" if tx_hash else "none",
        contract_address=settings.BASE_SEPOLIA_NFT_CONTRACT_ADDRESS,
        explorer_url=f"https://sepolia.basescan.org/tx/{tx_hash}" if tx_hash else None,
        onchain_enabled=onchain_enabled,
        artwork_url=f"/identity/art/{identity.sutra_id}.png",
    )


def generate_cryptographic_sutra_id() -> str:
    """
    Generates a cryptographically random, non-PII public identifier.
    Format: SUTRA-XXXX-XXXX-XXXX (e.g. SUTRA-A8F2-3B7C-9E41)
    """
    raw = secrets.token_hex(6).upper()
    part1 = raw[:4]
    part2 = raw[4:8]
    part3 = raw[8:12]
    return f"SUTRA-{part1}-{part2}-{part3}"


def get_default_avatar_config() -> AvatarConfigDTO:
    """Returns the canonical, inclusive default avatar configuration."""
    return AvatarConfigDTO(
        preset="scholar",
        skin_tone="golden",
        hair_style="curls",
        hair_color="midnight",
        expression="confident",
        facial_feature="none",
        clothing_style="academic_blazer",
        clothing_color="navy",
        accessory="none",
        background="aurora",
    )


async def _get_or_create_identity(
    user_id: uuid.UUID,
    institution_id: uuid.UUID,
    db: AsyncSession,
) -> StudentIdentity:
    """
    Idempotently retrieves or creates the persistent SUTRA identity for an authenticated student.
    Guarantees exactly one identity per user_id through database uniqueness constraints.
    """
    query = select(StudentIdentity).where(StudentIdentity.user_id == user_id)
    result = await db.execute(query)
    identity = result.scalars().first()

    if identity:
        return identity

    # Provision fresh identity with cryptographically random ID
    sutra_id = generate_cryptographic_sutra_id()
    default_config = get_default_avatar_config().model_dump()

    identity = StudentIdentity(
        id=uuid.uuid4(),
        user_id=user_id,
        institution_id=institution_id,
        sutra_id=sutra_id,
        display_name="Sutra Scholar",
        avatar_config=default_config,
        collectible_status="unminted",
        art_seed=secrets.token_hex(32),
    )

    db.add(identity)
    try:
        await db.commit()
        await db.refresh(identity)
    except Exception:
        await db.rollback()
        # Handle potential race condition retry
        retry_query = select(StudentIdentity).where(StudentIdentity.user_id == user_id)
        retry_res = await db.execute(retry_query)
        identity = retry_res.scalars().first()
        if not identity:
            raise

    return identity


async def _resolve_user_institution(
    user_id: uuid.UUID,
    db: AsyncSession,
) -> uuid.UUID:
    """Resolves primary campus ID for user membership."""
    mem_query = select(InstitutionMembership.institution_id).where(
        InstitutionMembership.user_id == user_id,
        InstitutionMembership.is_active.is_(True),
    ).limit(1)
    mem_res = await db.execute(mem_query)
    campus_id = mem_res.scalar_one_or_none()

    if not campus_id:
        inst_query = select(Institution.id).where(Institution.status == "active").limit(1)
        inst_res = await db.execute(inst_query)
        campus_id = inst_res.scalar_one_or_none()

    if not campus_id:
        campus_id = uuid.uuid4()

    return campus_id


@router.get("/me", response_model=StudentIdentityResponse)
async def get_my_identity(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the persistent SUTRA Identity for the currently authenticated student.
    Idempotent: Automatically provisions default identity and avatar if not yet created.
    Zero PII: Exposes zero database IDs, email addresses, or academic records.
    """
    campus_id = await _resolve_user_institution(user.id, db)
    identity = await _get_or_create_identity(user.id, campus_id, db)

    return _identity_response(identity)


@router.post("/provision", response_model=StudentIdentityResponse)
async def provision_student_identity(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Explicit idempotent provisioning endpoint.
    Safe on retries, page refreshes, and duplicate requests.
    """
    campus_id = await _resolve_user_institution(user.id, db)
    identity = await _get_or_create_identity(user.id, campus_id, db)

    return _identity_response(identity)


@router.put("/avatar", response_model=StudentIdentityResponse)
async def update_my_avatar(
    payload: UpdateAvatarRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the student's avatar configuration from the approved catalogue.
    Strictly validates every trait and enforces server-side user ownership.
    """
    campus_id = await _resolve_user_institution(user.id, db)
    identity = await _get_or_create_identity(user.id, campus_id, db)

    # Server-side ownership guard
    if identity.user_id != user.id:
        raise PermissionDeniedError("Cannot modify another student's avatar configuration.")

    if payload.display_name:
        identity.display_name = payload.display_name.strip()

    if payload.avatar_config is not None:
        identity.avatar_config = payload.avatar_config.model_dump()
    if payload.avatar_url is not None:
        identity.profile_avatar_url = payload.avatar_url
    identity.updated_at = datetime.now(timezone.utc)

    db.add(identity)
    await db.commit()
    await db.refresh(identity)

    return _identity_response(identity)


@router.post("/mint", response_model=StudentIdentityResponse)
async def mint_identity_nft(
    payload: MintNFTRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Requests a real, soulbound Base Sepolia NFT for the pseudonymous profile.
    A wallet, live contract, funded relayer, and immutable IPFS metadata must all
    be available. This endpoint never fabricates a simulated mint.
    """
    campus_id = await _resolve_user_institution(user.id, db)
    identity = await _get_or_create_identity(user.id, campus_id, db)

    if identity.collectible_status == "minted" and identity.collectible_tx_hash:
        return _identity_response(identity)
    if identity.collectible_status == "pending":
        return _identity_response(identity)

    if payload.wallet_address:
        identity.wallet_address = payload.wallet_address
    identity.collectible_error = None

    # Profile provisioning is independent of wallet and chain readiness. Without
    # every live dependency, leave the NFT honestly unminted and available to retry.
    if not payload.wallet_address or not base_sepolia_service.nft_mint_ready():
        db.add(identity)
        await db.commit()
        await db.refresh(identity)
        return _identity_response(identity)

    identity.collectible_status = "pending"
    identity.collectible_token_id = None
    identity.collectible_tx_hash = None
    identity.minted_at = None

    db.add(identity)
    await db.commit()

    try:
        token_metadata_uri = await base_sepolia_service.pin_identity_artwork(
            identity.sutra_id, identity.art_seed
        )
        mint_result = await base_sepolia_service.mint_identity_nft(
            sutra_id=identity.sutra_id,
            recipient_address=identity.wallet_address,
            token_uri=token_metadata_uri,
        )
    except Exception as exc:
        mint_result = {"success": False, "message": str(exc)}

    if mint_result.get("success"):
        identity.collectible_status = "minted"
        identity.collectible_token_id = mint_result.get("token_id")
        identity.collectible_tx_hash = mint_result.get("tx_hash")
        identity.minted_at = mint_result.get("minted_at", datetime.now(timezone.utc))
        identity.collectible_error = None
    else:
        identity.collectible_status = "failed"
        identity.collectible_token_id = None
        identity.collectible_tx_hash = None
        identity.minted_at = None
        identity.collectible_error = (mint_result.get("message") or "The live NFT mint failed.")[:512]

    db.add(identity)
    await db.commit()
    await db.refresh(identity)

    return _identity_response(identity)


@router.get("/art/{sutra_id}.png", response_class=Response)
async def get_nft_identity_art(
    sutra_id: str = Path(..., description="Public cryptographic SUTRA ID"),
    db: AsyncSession = Depends(get_db),
):
    """Return the profile's deterministic 2D raster identity painting."""
    result = await db.execute(
        select(StudentIdentity.art_seed).where(StudentIdentity.sutra_id == sutra_id)
    )
    art_seed = result.scalar_one_or_none()
    if not art_seed:
        raise ResourceNotFoundError(f"Identity artwork for '{sutra_id}' not found.")
    artwork = render_identity_art(art_seed)
    etag = hashlib.sha256(artwork).hexdigest()
    return Response(
        content=artwork,
        media_type="image/png",
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": f'"{etag}"',
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/metadata/{sutra_id}", response_model=NFTMetadataResponse)
async def get_nft_token_metadata(
    sutra_id: str = Path(..., description="Public cryptographic SUTRA ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Public ERC-721 token metadata standard endpoint.
    Exposes zero personal information, emails, or internal database keys.
    """
    query = select(StudentIdentity).where(StudentIdentity.sutra_id == sutra_id)
    result = await db.execute(query)
    identity = result.scalars().first()

    if not identity:
        raise ResourceNotFoundError(f"Identity metadata for '{sutra_id}' not found.")

    attributes = [
        NFTMetadataAttribute(trait_type="Identity Type", value="SUTRA Verified Student"),
        NFTMetadataAttribute(trait_type="Credential", value="SUTRA Student Identity"),
        NFTMetadataAttribute(trait_type="Network", value="Base Sepolia (84532)"),
        NFTMetadataAttribute(trait_type="Asset Category", value="Educational Test Asset"),
    ]
    attributes.extend(
        NFTMetadataAttribute(trait_type=key, value=value)
        for key, value in artwork_traits(identity.art_seed).items()
    )
    artwork_url = (
        f"{settings.PUBLIC_APP_URL.rstrip('/')}/api/v1/identity/art/{identity.sutra_id}.png"
        if settings.PUBLIC_APP_URL
        else f"/api/v1/identity/art/{identity.sutra_id}.png"
    )

    return NFTMetadataResponse(
        name=f"SUTRA Identity {identity.sutra_id}",
        description=(
            "Unique SUTRA identity artwork, independent of the profile avatar. "
            "This non-transferable Base Sepolia credential contains no profile name, "
            "academic record, or other personal data."
        ),
        image=artwork_url,
        external_url=(
            settings.PUBLIC_APP_URL.rstrip("/")
            if settings.PUBLIC_APP_URL
            else "http://localhost:3000"
        ),
        attributes=attributes,
    )
