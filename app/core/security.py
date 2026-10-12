import uuid
from typing import Any, Dict, List, Optional
import jwt
from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import AuthenticationError, CampusAccessDeniedError, PermissionDeniedError
from app.core.logging import logger

security_scheme = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    id: uuid.UUID
    email: Optional[str] = None
    claims: Dict[str, Any] = Field(default_factory=dict)


class CampusMembershipContext(BaseModel):
    user: AuthenticatedUser
    campus_id: uuid.UUID
    roles: List[str]
    is_active: bool


# Thread-safe cached PyJWKClient for JWKS key retrieval and rotation
_jwks_client: Optional[jwt.PyJWKClient] = None
_jwks_client_url: Optional[str] = None


def get_jwks_client() -> Optional[jwt.PyJWKClient]:
    """Returns or lazily creates a cached PyJWKClient pointing to the Supabase JWKS endpoint."""
    global _jwks_client, _jwks_client_url
    target_url = settings.SUPABASE_JWKS_URL
    if not target_url and settings.SUPABASE_URL and settings.SUPABASE_URL.startswith("http"):
        target_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"

    if not target_url:
        return None

    if _jwks_client is None or _jwks_client_url != target_url:
        _jwks_client_url = target_url
        _jwks_client = jwt.PyJWKClient(target_url, cache_keys=True, max_cached_keys=16)

    return _jwks_client


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """Verifies a Supabase JWT signature and claims server-side.

    Supports:
    - Asymmetric ECDSA tokens (ES256) signed by Supabase Auth (via JWKS with key rotation, or public key)
    - Asymmetric RSA tokens (RS256) if used by Supabase Auth
    - Symmetric HMAC tokens (HS256) used for local development, tests, or legacy secrets

    Strictly prevents algorithm switching / confusion attacks by enforcing
    distinct key verification paths per allowed algorithm.
    """
    if not token or not isinstance(token, str):
        raise AuthenticationError("JWT token is empty or invalid format", code="INVALID_CREDENTIALS")

    # 1. Safely extract unverified header to determine signing algorithm & kid
    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception as e:
        raise AuthenticationError(f"Invalid JWT token: Malformed token header ({str(e)})", code="INVALID_CREDENTIALS")

    alg = unverified_header.get("alg")
    kid = unverified_header.get("kid")

    # 2. Enforce algorithm allowlist (never permit arbitrary algorithms or 'none')
    allowed_algorithms = set(settings.SUPABASE_JWT_ALLOWED_ALGORITHMS or ["HS256", "ES256", "RS256"])
    if settings.SUPABASE_JWT_ALGORITHM:
        allowed_algorithms.add(settings.SUPABASE_JWT_ALGORITHM)

    if not alg or alg not in allowed_algorithms or alg.lower() == "none":
        raise AuthenticationError(
            f"Invalid JWT token: The specified alg value '{alg}' is not allowed",
            code="UNSUPPORTED_ALGORITHM",
        )

    # 3. Verify based on algorithm family
    try:
        if alg == "HS256":
            # Symmetric verification using shared secret
            if not settings.SUPABASE_JWT_SECRET:
                raise AuthenticationError(
                    "Server configuration error: missing SUPABASE_JWT_SECRET for HS256",
                    code="SERVER_CONFIG_ERROR",
                )
            decode_kwargs: Dict[str, Any] = {
                "key": settings.SUPABASE_JWT_SECRET,
                "algorithms": ["HS256"],
                "options": {"verify_exp": True, "verify_signature": True},
            }
            if settings.SUPABASE_JWT_AUDIENCE:
                decode_kwargs["audience"] = settings.SUPABASE_JWT_AUDIENCE
            if settings.SUPABASE_JWT_ISSUER:
                decode_kwargs["issuer"] = settings.SUPABASE_JWT_ISSUER
                decode_kwargs["options"]["verify_iss"] = True

            return jwt.decode(token, **decode_kwargs)

        elif alg in ("ES256", "RS256"):
            # Asymmetric verification using Supabase JWKS or configured public key
            verification_key = None

            # Check for explicitly configured static public key
            if settings.SUPABASE_JWT_PUBLIC_KEY:
                verification_key = settings.SUPABASE_JWT_PUBLIC_KEY
            else:
                jwks_client = get_jwks_client()
                if jwks_client:
                    try:
                        signing_key = jwks_client.get_signing_key_from_jwt(token)
                        verification_key = signing_key.key
                    except (jwt.PyJWKClientError, Exception) as jwks_err:
                        logger.warning(f"JWKS key resolution failed for kid='{kid}': {jwks_err}")
                        # Fallback to configured public key fallback if available (e.g. offline testing)
                        if settings.SUPABASE_JWT_PUBLIC_KEY_FALLBACK:
                            verification_key = settings.SUPABASE_JWT_PUBLIC_KEY_FALLBACK
                        else:
                            raise AuthenticationError(
                                f"Invalid JWT token: Signing key '{kid}' not found in authentication provider JWKS",
                                code="INVALID_KEY",
                            )
                elif settings.SUPABASE_JWT_PUBLIC_KEY_FALLBACK:
                    verification_key = settings.SUPABASE_JWT_PUBLIC_KEY_FALLBACK
                else:
                    raise AuthenticationError(
                        "Asymmetric JWT validation requires SUPABASE_URL, SUPABASE_JWKS_URL, or SUPABASE_JWT_PUBLIC_KEY",
                        code="SERVER_CONFIG_ERROR",
                    )

            decode_kwargs = {
                "key": verification_key,
                "algorithms": [alg],
                "options": {"verify_exp": True, "verify_signature": True},
            }
            if settings.SUPABASE_JWT_AUDIENCE:
                decode_kwargs["audience"] = settings.SUPABASE_JWT_AUDIENCE

            # Determine expected issuer
            expected_issuer = settings.SUPABASE_JWT_ISSUER or (
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1" if settings.SUPABASE_URL and settings.SUPABASE_URL.startswith("http") else None
            )
            if settings.SUPABASE_JWT_ISSUER:
                decode_kwargs["issuer"] = settings.SUPABASE_JWT_ISSUER
                decode_kwargs["options"]["verify_iss"] = True
            elif expected_issuer:
                # If unverified claims contain iss, ensure it strictly matches expected_issuer
                try:
                    unverified_payload = jwt.decode(token, options={"verify_signature": False, "verify_exp": False})
                    if "iss" in unverified_payload:
                        decode_kwargs["issuer"] = expected_issuer
                        decode_kwargs["options"]["verify_iss"] = True
                except Exception:
                    pass

            return jwt.decode(token, **decode_kwargs)

        else:
            raise AuthenticationError(
                f"Invalid JWT token: Unsupported signing algorithm '{alg}'",
                code="UNSUPPORTED_ALGORITHM",
            )

    except jwt.ExpiredSignatureError:
        raise AuthenticationError("JWT token has expired", code="TOKEN_EXPIRED")
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Invalid JWT token: {str(e)}", code="INVALID_CREDENTIALS")
    except AuthenticationError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error validating JWT: {str(e)}")
        raise AuthenticationError("Could not validate authentication credentials", code="AUTHENTICATION_FAILED")


async def get_current_user(
    auth_header: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> AuthenticatedUser:
    """Dependency that extracts and validates the JWT from Authorization header."""
    if not auth_header or not auth_header.credentials:
        raise AuthenticationError("Authorization header is missing or empty", code="AUTHENTICATION_REQUIRED")

    payload = verify_supabase_jwt(auth_header.credentials)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("JWT payload is missing 'sub' claim", code="INVALID_CLAIMS")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationError("Invalid user ID UUID format in token", code="INVALID_USER_ID")

    return AuthenticatedUser(
        id=user_uuid,
        email=payload.get("email"),
        claims=payload,
    )


async def get_campus_membership(
    x_campus_id: Optional[str] = Header(None, alias="X-Campus-Id"),
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CampusMembershipContext:
    """Validates that the authenticated user has an active membership for the requested campus."""
    if not x_campus_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Campus-Id' is required for campus-scoped operations",
        )

    try:
        campus_uuid = uuid.UUID(x_campus_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Campus-Id' must be a valid UUID",
        )

    # In Phase 1, import models dynamically to avoid circular dependencies
    from app.models.institution import Institution, InstitutionMembership

    query = select(InstitutionMembership).where(
        InstitutionMembership.institution_id == campus_uuid,
        InstitutionMembership.user_id == user.id,
    )
    result = await db.execute(query)
    memberships = result.scalars().all()

    if not memberships:
        # Only JIT provision brand-new users who have zero memberships anywhere
        any_membership_query = select(InstitutionMembership).where(
            InstitutionMembership.user_id == user.id
        )
        any_res = await db.execute(any_membership_query)
        if not any_res.scalars().first():
            campus_query = select(Institution).where(
                Institution.id == campus_uuid,
                Institution.status == "active",
            )
            campus_res = await db.execute(campus_query)
            campus_obj = campus_res.scalar_one_or_none()
            if campus_obj:
                new_membership = InstitutionMembership(
                    id=uuid.uuid4(),
                    institution_id=campus_uuid,
                    user_id=user.id,
                    role="faculty",
                    is_active=True,
                )
                db.add(new_membership)
                await db.commit()
                memberships = [new_membership]

        if not memberships:
            raise CampusAccessDeniedError(
                f"User {user.id} does not have membership in campus {campus_uuid}",
                code="CAMPUS_MEMBERSHIP_NOT_FOUND",
            )

    active_memberships = [m for m in memberships if m.is_active]
    if not active_memberships:
        raise PermissionDeniedError(
            f"User {user.id} has no active roles in campus {campus_uuid}",
            code="INACTIVE_MEMBERSHIP",
        )

    roles = [m.role for m in active_memberships]
    return CampusMembershipContext(
        user=user,
        campus_id=campus_uuid,
        roles=roles,
        is_active=True,
    )


def require_roles(allowed_roles: List[str]):
    """Returns a dependency checker verifying that user has at least one of the required roles."""
    async def role_checker(
        membership: CampusMembershipContext = Depends(get_campus_membership),
    ) -> CampusMembershipContext:
        if not any(r in allowed_roles for r in membership.roles):
            raise PermissionDeniedError(
                f"Role required: one of {allowed_roles}. User possesses: {membership.roles}",
                code="INSUFFICIENT_ROLE_PERMISSIONS",
            )
        return membership

    return role_checker


def require_role(*roles: str):
    """Convenience variadic alias for require_roles."""
    return require_roles(list(roles))


async def require_campus_access(
    membership: CampusMembershipContext = Depends(get_campus_membership),
) -> uuid.UUID:
    """Dependency that verifies active campus membership and returns the campus UUID."""
    return membership.campus_id

