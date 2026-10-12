import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.service import ai_service
from app.api.v1.students import check_leadership_access
from app.core.database import get_db
from app.core.security import (
    AuthenticatedUser,
    CampusMembershipContext,
    get_campus_membership,
    get_current_user,
    require_role,
)
from app.schemas.ai import (
    AIReviewBriefRequest,
    AIServiceStatusResponse,
    AIStructuredReviewBriefResponse,
    AISuggestInterventionsRequest,
    AISuggestInterventionsResponse,
    AISummarizeEvidenceRequest,
    AISummarizeEvidenceResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Orchestration"])


@router.get("/status", response_model=AIServiceStatusResponse)
async def get_ai_status(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns AI service readiness, active provider, model name, and safety governance boundaries."""
    return ai_service.get_status()


@router.post("/review-brief", response_model=AIStructuredReviewBriefResponse)
async def generate_review_brief(
    payload: AIReviewBriefRequest,
    membership: CampusMembershipContext = Depends(
        require_role("faculty", "hod", "mentor", "institution_admin", "counsellor", "superadmin")
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Synthesizes multi-domain student evidence and Evidence Card into an explainable review brief.
    Identifies observed facts, model predictions, uncertainties, neutral questions, and candidate interventions.
    Strictly advisory. Never executes interventions automatically.
    """
    check_leadership_access(membership)

    return await ai_service.generate_review_brief(
        db=db,
        institution_id=membership.campus_id,
        user_id=membership.user.id,
        signal_id=payload.signal_id,
    )


@router.post("/summarize-evidence", response_model=AISummarizeEvidenceResponse)
async def summarize_evidence(
    payload: AISummarizeEvidenceRequest,
    membership: CampusMembershipContext = Depends(
        require_role("faculty", "hod", "mentor", "institution_admin", "counsellor", "superadmin")
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Summarizes authorized multi-domain student telemetry without full intervention planning.
    Strictly omits student financial records per ADR-003.
    """
    check_leadership_access(membership)

    return await ai_service.summarize_evidence(
        db=db,
        institution_id=membership.campus_id,
        user_id=membership.user.id,
        student_id=payload.student_id,
        student_ref=payload.student_ref,
        signal_id=payload.signal_id,
    )


@router.post("/suggest-interventions", response_model=AISuggestInterventionsResponse)
async def suggest_interventions(
    payload: AISuggestInterventionsRequest,
    membership: CampusMembershipContext = Depends(
        require_role("faculty", "hod", "mentor", "institution_admin", "counsellor", "superadmin")
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Suggests candidate interventions strictly restricted to the campus-controlled catalogue.
    Does NOT assign, schedule, or mutate any intervention.
    """
    check_leadership_access(membership)

    return await ai_service.suggest_interventions(
        db=db,
        institution_id=membership.campus_id,
        user_id=membership.user.id,
        student_id=payload.student_id,
        signal_id=payload.signal_id,
        max_suggestions=payload.max_suggestions or 3,
    )
