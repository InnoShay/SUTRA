import time
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    AuthenticatedUser,
    CampusMembershipContext,
    get_campus_membership,
    get_current_user,
    require_role,
    require_campus_access,
)
from app.ml.service import ml_service
from app.schemas.ml import (
    MLModelInfo,
    MLPredictBatchRequest,
    MLPredictRequest,
    MLPredictResponse,
    ModelPerformanceResponse,
    SupportedFeatureMetaDTO,
    WhatIfScenarioRequest,
    WhatIfScenarioResponse,
)

router = APIRouter(prefix="/ml", tags=["ML"])


@router.get("/model-info", response_model=Dict[str, Any])
async def get_model_info(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns baseline model governance metadata and current readiness status."""
    return ml_service.get_metadata()


@router.get("/supported-scenario-features", response_model=List[SupportedFeatureMetaDTO])
async def get_supported_scenario_features_endpoint(
    user: AuthenticatedUser = Depends(
        require_role("leadership", "faculty", "hod", "mentor", "institution_admin", "counsellor")
    ),
):
    """Returns verified metadata and bounds for supported Day-30 what-if simulation features."""
    return ml_service.get_supported_scenario_features()


@router.post("/simulate-scenario", response_model=WhatIfScenarioResponse)
async def simulate_scenario_endpoint(
    payload: WhatIfScenarioRequest,
    user: AuthenticatedUser = Depends(
        require_role("leadership", "faculty", "hod", "mentor", "institution_admin", "counsellor")
    ),
):
    """
    Executes in-memory hypothetical scenario calculation.
    Never writes back to student records, telemetry databases, or ml_inference_logs.
    Validates features against canonical Day-30 bounds and rejects future events.
    """
    return ml_service.simulate_scenario(
        base_features=payload.base_features,
        hypothetical_modifications=payload.hypothetical_modifications,
        student_ref=payload.external_student_ref or "SIMULATED_STUDENT",
    )


@router.get("/performance", response_model=ModelPerformanceResponse)
async def get_model_performance_endpoint(
    model_version: Optional[str] = "v1.0.0",
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(
        require_role("leadership", "faculty", "hod", "mentor", "institution_admin", "counsellor")
    ),
):
    """
    Returns verified evaluation metrics for the specified model version.
    Distinguishes offline held-out benchmark evaluation from live production telemetry.
    """
    resp = ml_service.get_model_performance(model_version=model_version)
    telemetry = await ml_service.get_live_monitoring_telemetry(db=db)
    resp.live_telemetry = telemetry
    return resp


@router.post("/predict", response_model=MLPredictResponse)
async def predict_single(
    payload: MLPredictRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(
        require_role("faculty", "hod", "mentor", "institution_admin")
    ),
    campus_id: uuid.UUID = Depends(require_campus_access),
):
    """
    Executes single student Day-30 early warning inference with strict schema validation.
    Generates Evidence Card for human review and audits execution to ml_inference_logs.
    """
    start_time = time.time()
    response = ml_service.predict_single(payload, institution_id=campus_id)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    # Persist inference audit log
    await ml_service.log_inference(
        db=db,
        institution_id=campus_id,
        prediction=response,
        latency_ms=duration_ms,
    )
    await db.commit()

    return response


@router.post("/predict/batch", response_model=List[MLPredictResponse])
async def predict_batch(
    payload: MLPredictBatchRequest,
    db: AsyncSession = Depends(get_db),
    user: AuthenticatedUser = Depends(
        require_role("hod", "institution_admin", "faculty")
    ),
    campus_id: uuid.UUID = Depends(require_campus_access),
):
    """
    Executes batch Day-30 early warning predictions across multiple student feature vectors.
    """
    start_time = time.time()
    responses = ml_service.predict_batch(payload, institution_id=campus_id)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    for resp in responses:
        await ml_service.log_inference(
            db=db,
            institution_id=campus_id,
            prediction=resp,
            latency_ms=duration_ms,
        )
    await db.commit()

    return responses


@router.post("/predict/student/{student_id}", response_model=MLPredictResponse)
async def predict_student_alias(
    student_id: str,
    membership: CampusMembershipContext = Depends(get_campus_membership),
    db: AsyncSession = Depends(get_db),
):
    """Alias for /api/v1/students/{student_id}/predict."""
    from app.api.v1.students import predict_student_single
    return await predict_student_single(student_id=student_id, membership=membership, db=db)

