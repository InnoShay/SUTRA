from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser, get_current_user
from app.models.institution import Institution, InstitutionMembership
from app.schemas.campus import AuthMeResponse, CampusMembershipItem

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.get("/me", response_model=AuthMeResponse)
async def get_current_user_profile(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns the authenticated user's ID, email, and campus memberships."""
    # Query memberships for this user
    query = (
        select(InstitutionMembership, Institution.name)
        .join(Institution, Institution.id == InstitutionMembership.institution_id)
        .where(InstitutionMembership.user_id == user.id)
    )
    result = await db.execute(query)
    rows = result.all()

    # Group roles per campus
    campus_map = {}
    for membership, inst_name in rows:
        cid = membership.institution_id
        if cid not in campus_map:
            campus_map[cid] = {
                "institution_id": cid,
                "institution_name": inst_name,
                "roles": [],
                "is_active": membership.is_active,
            }
        campus_map[cid]["roles"].append(membership.role)
        if membership.is_active:
            campus_map[cid]["is_active"] = True

    memberships = [CampusMembershipItem(**data) for data in campus_map.values()]

    return AuthMeResponse(
        user_id=user.id,
        email=user.email,
        memberships=memberships,
    )
