import uuid
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CampusMembershipContext, get_campus_membership
from app.models.case import InterventionCatalog
from app.schemas.intervention import InterventionItem

router = APIRouter(prefix="/interventions", tags=["Interventions"])

DEFAULT_INTERVENTIONS = [
    {
        "intervention_key": "mentor_check_in",
        "display_label": "Academic Mentor Check-In",
        "domain": "mentor",
        "recipient_role": "mentor",
        "required_purpose_key": "academic_support",
        "description": "Informal check-in with assigned mentor to identify study obstacles and attendance hurdles.",
    },
    {
        "intervention_key": "academic_tutoring_offer",
        "display_label": "Subject Tutoring Referral",
        "domain": "academic",
        "recipient_role": "faculty",
        "required_purpose_key": "academic_support",
        "description": "Targeted tutorial support session focusing on missed assignments and core modules.",
    },
    {
        "intervention_key": "fee_emergency_counselling",
        "display_label": "Emergency Financial Aid Consultation",
        "domain": "finance",
        "recipient_role": "finance",
        "required_purpose_key": "fee_support",
        "description": "Restricted consultation with student finance team regarding institutional hardship assistance.",
    },
    {
        "intervention_key": "counselling_referral",
        "display_label": "Student Wellbeing Referral",
        "domain": "counselling",
        "recipient_role": "counsellor",
        "required_purpose_key": "wellbeing_support",
        "description": "Confidential appointment referral with institutional counselling service.",
    },
]


@router.get("", response_model=List[InterventionItem])
@router.get("/catalog", response_model=List[InterventionItem])
async def list_interventions(
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Lists available interventions from the controlled catalog."""
    query = select(InterventionCatalog).where(
        InterventionCatalog.institution_id == membership.campus_id,
        InterventionCatalog.active.is_(True),
    )
    result = await db.execute(query)
    items = result.scalars().all()

    if not items:
        # Seed default catalog for this campus
        seeded = []
        for d in DEFAULT_INTERVENTIONS:
            item = InterventionCatalog(
                id=uuid.uuid4(),
                institution_id=membership.campus_id,
                intervention_key=d["intervention_key"],
                display_label=d["display_label"],
                domain=d["domain"],
                recipient_role=d["recipient_role"],
                required_purpose_key=d["required_purpose_key"],
                description=d["description"],
                requires_human_approval=True,
                active=True,
                version=1,
            )
            db.add(item)
            seeded.append(item)
        await db.commit()
        items = seeded

    return [
        InterventionItem(
            id=i.id,
            intervention_key=i.intervention_key,
            display_label=i.display_label,
            domain=i.domain,
            recipient_role=i.recipient_role,
            required_purpose_key=i.required_purpose_key,
            requires_human_approval=i.requires_human_approval,
            description=i.description,
        )
        for i in items
    ]
