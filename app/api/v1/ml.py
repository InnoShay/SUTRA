import time
import uuid
from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import AuthenticatedUser, get_current_user, require_role, require_campus_access
from app.ml.service import ml_service
from app.schemas.ml import (
    MLModelInfo,
    MLPredictBatchRequest,
    MLPredictRequest,
    MLPredictResponse,
)

router = APIRouter(prefix="/ml", tags=["ML"])


@router.get("/model-info", response_model=Dict[str, Any])
async def get_model_info(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns baseline model governance metadata and current readiness status."""
    return ml_service.get_metadata()


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
