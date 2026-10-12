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

    # JIT Provisioning for newly authenticated Supabase / Google OAuth users
    if not rows:
        any_membership_query = select(InstitutionMembership).where(InstitutionMembership.user_id == user.id)
        any_membership_res = await db.execute(any_membership_query)
        if not any_membership_res.scalars().first():
            primary_inst_query = select(Institution).where(Institution.status == "active").limit(1)
            primary_inst_res = await db.execute(primary_inst_query)
            primary_inst = primary_inst_res.scalar_one_or_none()
            if primary_inst:
                import uuid
                new_membership = InstitutionMembership(
                    id=uuid.uuid4(),
                    institution_id=primary_inst.id,
                    user_id=user.id,
                    role="faculty",
                    is_active=True,
                )
                db.add(new_membership)
                await db.commit()
                rows = [(new_membership, primary_inst.name)]

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
