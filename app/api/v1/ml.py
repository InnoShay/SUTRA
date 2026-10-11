from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.core.security import AuthenticatedUser, get_current_user
from app.ml.service import ml_service

router = APIRouter(prefix="/ml", tags=["ML"])


@router.get("/model-info", response_model=Dict[str, Any])
async def get_model_info(
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns baseline model governance metadata and current readiness status."""
    return ml_service.get_metadata()
