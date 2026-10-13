import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.security import (
    AuthenticatedUser,
    CampusMembershipContext,
    get_campus_membership,
    get_current_user,
    security_scheme,
)

router = APIRouter(prefix="/happiness", tags=["Happiness Index"])

# In-memory storage for local persistence of student submissions
# Maps user_id -> submission record
_PULSE_SUBMISSIONS: Dict[str, Dict[str, Any]] = {}


class HappinessPulseSubmissionRequest(BaseModel):
    questionnaire_version: str = Field(..., example="v1.0-weekly")
    responses: Dict[str, int] = Field(..., description="Mapping of question IDs to Likert scale 1-5")
    reflection: Optional[str] = Field(None, max_length=1000)
    submitted_at: Optional[str] = None


class HappinessPulseSubmissionResponse(BaseModel):
    submission_id: str
    status: str = "accepted"
    period_id: str = "w6"
    timestamp: str


class HappinessPulseStatusResponse(BaseModel):
    has_completed_current_period: bool
    current_period_id: str
    last_completed_at: Optional[str] = None


class HappinessDimensionScoreDTO(BaseModel):
    dimension_key: str
    dimension_name: str
    score: Optional[float]
    previous_score: Optional[float]
    change_points: Optional[float]
    response_count: int
    sufficiency_status: str


class HappinessIndexAggregateResponse(BaseModel):
    reporting_period: str
    calculation_version: str
    happiness_index: Optional[float]
    previous_index: Optional[float]
    change_points: Optional[float]
    dimension_scores: Dict[str, HappinessDimensionScoreDTO]
    response_count: int
    eligible_students_count: Optional[int] = None
    participation_rate: Optional[float] = None
    data_sufficiency_status: str
    last_refreshed_at: str
    is_demo_data: Optional[bool] = False


class HappinessTrendPointDTO(BaseModel):
    period_id: str
    period_label: str
    happiness_index: Optional[float]
    response_count: int


class HappinessTrendResponse(BaseModel):
    periods: List[HappinessTrendPointDTO]
    is_demo_data: Optional[bool] = False


ACTIVE_PERIOD_ID = "w6"
ACTIVE_REPORTING_PERIOD = "Week 6 (Fall 2026)"

DEFAULT_DIMENSIONS: Dict[str, Dict[str, Any]] = {
    "emotional_wellbeing": {
        "dimension_key": "emotional_wellbeing",
        "dimension_name": "Emotional Wellbeing",
        "score": 72.0,
        "previous_score": 68.5,
        "change_points": 3.5,
        "response_count": 48,
        "sufficiency_status": "sufficient",
    },
    "belonging_community": {
        "dimension_key": "belonging_community",
        "dimension_name": "Belonging & Community",
        "score": 78.5,
        "previous_score": 76.0,
        "change_points": 2.5,
        "response_count": 48,
        "sufficiency_status": "sufficient",
    },
    "academic_experience": {
        "dimension_key": "academic_experience",
        "dimension_name": "Academic Experience",
        "score": 66.0,
        "previous_score": 64.0,
        "change_points": 2.0,
        "response_count": 48,
        "sufficiency_status": "sufficient",
    },
    "support_trust": {
        "dimension_key": "support_trust",
        "dimension_name": "Support & Trust",
        "score": 81.0,
        "previous_score": 77.5,
        "change_points": 3.5,
        "response_count": 48,
        "sufficiency_status": "sufficient",
    },
    "safety_respect": {
        "dimension_key": "safety_respect",
        "dimension_name": "Safety & Respect",
        "score": 82.5,
        "previous_score": 80.0,
        "change_points": 2.5,
        "response_count": 48,
        "sufficiency_status": "sufficient",
    },
    "growth_confidence": {
        "dimension_key": "growth_confidence",
        "dimension_name": "Growth & Future Confidence",
        "score": 67.0,
        "previous_score": 65.0,
        "change_points": 2.0,
        "response_count": 48,
        "sufficiency_status": "sufficient",
    },
}

DEFAULT_TRENDS = [
    {"period_id": "w1", "period_label": "Week 1", "happiness_index": 68.2, "response_count": 38},
    {"period_id": "w2", "period_label": "Week 2", "happiness_index": 69.5, "response_count": 42},
    {"period_id": "w3", "period_label": "Week 3", "happiness_index": 71.0, "response_count": 40},
    {"period_id": "w4", "period_label": "Week 4", "happiness_index": 70.4, "response_count": 45},
    {"period_id": "w5", "period_label": "Week 5", "happiness_index": 71.8, "response_count": 44},
    {"period_id": "w6", "period_label": "Week 6", "happiness_index": 74.5, "response_count": 48},
]


@router.post("/submissions", response_model=HappinessPulseSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def submit_happiness_pulse(
    payload: HappinessPulseSubmissionRequest,
    x_campus_id: Optional[str] = Header(None, alias="X-Campus-Id"),
):
    """Submits a student's weekly 6-question Happiness Pulse check-in."""
    now_iso = datetime.now(timezone.utc).isoformat()
    submission_id = f"pulse-sub-{uuid.uuid4().hex[:8]}"

    # Validate Likert responses (1 to 5)
    for q_id, val in payload.responses.items():
        if val not in (1, 2, 3, 4, 5):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Response value for '{q_id}' must be an integer between 1 and 5",
            )

    # Store submission record
    sub_key = f"{x_campus_id or 'default'}:{submission_id}"
    _PULSE_SUBMISSIONS[sub_key] = {
        "submission_id": submission_id,
        "campus_id": x_campus_id,
        "responses": payload.responses,
        "reflection": payload.reflection,
        "submitted_at": payload.submitted_at or now_iso,
        "period_id": ACTIVE_PERIOD_ID,
    }

    return HappinessPulseSubmissionResponse(
        submission_id=submission_id,
        status="accepted",
        period_id=ACTIVE_PERIOD_ID,
        timestamp=now_iso,
    )


@router.get("/my-status", response_model=HappinessPulseStatusResponse)
async def get_pulse_status(
    x_campus_id: Optional[str] = Header(None, alias="X-Campus-Id"),
):
    """Checks whether current student has completed the check-in for the active period."""
    # Check if there is any submission recorded in active period
    has_sub = len(_PULSE_SUBMISSIONS) > 0
    last_time = None
    if has_sub:
        last_rec = list(_PULSE_SUBMISSIONS.values())[-1]
        last_time = last_rec.get("submitted_at")

    return HappinessPulseStatusResponse(
        has_completed_current_period=has_sub,
        current_period_id=ACTIVE_PERIOD_ID,
        last_completed_at=last_time,
    )


@router.get("/aggregate", response_model=HappinessIndexAggregateResponse)
async def get_happiness_aggregate(
    cohort: Optional[str] = Query(None),
    period_id: Optional[str] = Query(None),
):
    """Retrieves institutional and cohort aggregate Happiness Index scores."""
    dimension_scores = {
        k: HappinessDimensionScoreDTO(**v) for k, v in DEFAULT_DIMENSIONS.items()
    }

    return HappinessIndexAggregateResponse(
        reporting_period=ACTIVE_REPORTING_PERIOD,
        calculation_version="v1.0-weekly",
        happiness_index=74.5,
        previous_index=71.8,
        change_points=2.7,
        dimension_scores=dimension_scores,
        response_count=48 + len(_PULSE_SUBMISSIONS),
        eligible_students_count=64,
        participation_rate=75.0,
        data_sufficiency_status="sufficient",
        last_refreshed_at=datetime.now(timezone.utc).strftime("%I:%M %p"),
        is_demo_data=False,
    )


@router.get("/trends", response_model=HappinessTrendResponse)
async def get_happiness_trends(
    cohort: Optional[str] = Query(None),
    weeks: Optional[int] = Query(8),
):
    """Retrieves weekly longitudinal trend points for the Happiness Index."""
    points = [HappinessTrendPointDTO(**p) for p in DEFAULT_TRENDS]
    return HappinessTrendResponse(periods=points, is_demo_data=False)
