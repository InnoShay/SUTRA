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


def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """Verifies a Supabase JWT signature and expiry server-side."""
    try:
        # PyJWT verification using the shared secret
        decode_kwargs = {
            "key": settings.SUPABASE_JWT_SECRET,
            "algorithms": [settings.SUPABASE_JWT_ALGORITHM],
            "options": {"verify_exp": True, "verify_signature": True},
        }
        if settings.SUPABASE_JWT_AUDIENCE:
            decode_kwargs["audience"] = settings.SUPABASE_JWT_AUDIENCE

        payload = jwt.decode(token, **decode_kwargs)
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("JWT token has expired", code="TOKEN_EXPIRED")
    except jwt.InvalidTokenError as e:
        raise AuthenticationError(f"Invalid JWT token: {str(e)}", code="INVALID_CREDENTIALS")
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
