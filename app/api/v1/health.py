from fastapi import APIRouter, Response, status
from app.core.config import settings
from app.core.database import check_database_health
from app.ml.service import ml_service
from app.schemas.health import HealthResponse, ReadinessChecks, ReadinessResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """Liveness probe: returns 200 OK if FastAPI process is responsive."""
    return HealthResponse(
        status="ok",
        app="sutra",
        version=settings.VERSION,
    )


@router.get("/ready", response_model=ReadinessResponse)
async def get_readiness(response: Response):
    """Readiness probe: validates database connectivity and ML service state."""
    db_ok = await check_database_health()
    ml_status = ml_service.get_status()

    checks = ReadinessChecks(
        database="ok" if db_ok else "error",
        ml_model=ml_status if ml_status in ("ready", "uncalibrated", "disabled") else "error",
    )

    if not db_ok:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(
            status="degraded",
            app="sutra",
            version=settings.VERSION,
            checks=checks,
        )

    return ReadinessResponse(
        status="ready",
        app="sutra",
        version=settings.VERSION,
        checks=checks,
    )
