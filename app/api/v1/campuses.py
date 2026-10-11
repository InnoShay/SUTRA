import uuid
from typing import List
from fastapi import APIRouter, Depends, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    AuthenticatedUser,
    CampusMembershipContext,
    get_campus_membership,
    get_current_user,
)
from app.models.institution import Institution, InstitutionMembership
from app.schemas.campus import CampusResponse

router = APIRouter(prefix="/campuses", tags=["Campuses"])


@router.get("/active", response_model=List[CampusResponse])
async def get_active_campuses(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns list of all campuses where the user holds an active membership."""
    query = (
        select(InstitutionMembership, Institution.name, Institution.status)
        .join(Institution, Institution.id == InstitutionMembership.institution_id)
        .where(
            InstitutionMembership.user_id == user.id,
            InstitutionMembership.is_active.is_(True),
        )
    )
    result = await db.execute(query)
    rows = result.all()

    campuses_map = {}
    for membership, name, status_val in rows:
        cid = membership.institution_id
        if cid not in campuses_map:
            campuses_map[cid] = {
                "id": cid,
                "name": name,
                "status": status_val,
                "roles": [],
            }
        campuses_map[cid]["roles"].append(membership.role)

    return [CampusResponse(**data) for data in campuses_map.values()]


@router.get("/{campus_id}", response_model=CampusResponse)
async def get_campus_details(
    campus_id: uuid.UUID = Path(..., description="Target campus UUID"),
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Returns details for a specific campus, enforcing that user is an active member."""
    # Verify campus_id matches the membership context
    if membership.campus_id != campus_id:
        from app.core.errors import CampusAccessDeniedError
        raise CampusAccessDeniedError("Cross-campus isolation violation", code="CAMPUS_MISMATCH")

    inst = await db.get(Institution, campus_id)
    if not inst:
        from app.core.errors import ResourceNotFoundError
        raise ResourceNotFoundError("Campus not found", code="CAMPUS_NOT_FOUND")

    return CampusResponse(
        id=inst.id,
        name=inst.name,
        status=inst.status,
        roles=membership.roles,
    )
