"""
FastAPI application for SUTRA ML Inference Service.

Serves Day-30 early warning risk predictions and structured evidence cards.
"""

from contextlib import asynccontextmanager
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.endpoints import router as api_router
from backend.app.core.config import settings
from sutra_ml.inference.predictor import SutraRiskPredictor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sutra.backend")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan manager: loads model artifact once at application startup."""
    logger.info("Starting SUTRA ML Inference Service...")
    logger.info("Loading model artifact from: %s", settings.model_path)
    logger.info("Loading metadata from: %s", settings.metadata_path)

    try:
        predictor = SutraRiskPredictor(
            model_path=settings.model_path,
            metadata_path=settings.metadata_path,
        )
        app.state.predictor = predictor
        logger.info(
            "Model successfully loaded: '%s' (Version: %s, Threshold: %.2f)",
            predictor.model_name,
            predictor.model_version,
            predictor.operational_threshold,
        )
    except Exception as exc:
        logger.error("Failed to load model artifact at startup: %s", exc)
        app.state.predictor = None

    yield

    logger.info("Shutting down SUTRA ML Inference Service...")
    app.state.predictor = None


def create_app() -> FastAPI:
    """Application factory for FastAPI instance."""
    app = FastAPI(
        title="SUTRA ML Early Warning Inference API",
        version="1.0.0",
        description=(
            "Serves real-time academic risk predictions and structured evidence attribution "
            "cards based on observable Day-30 student engagement features. "
            "Human-in-the-loop: predictions are decision-support indicators for advisors, not automated verdicts."
        ),
        lifespan=lifespan,
    )

    # Permissive CORS for development/demo integration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom validation error handler with clean output
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for err in exc.errors():
            loc = " -> ".join(str(l) for l in err.get("loc", []))
            msg = err.get("msg", "Validation error")
            err_type = err.get("type", "value_error")
            errors.append({
                "field": loc,
                "message": msg,
                "type": err_type,
            })
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": "Validation Error",
                "detail": errors,
                "message": "Input record failed 25-feature schema validation contract.",
            },
        )

    # Mount endpoints at root and under /api/v1
    app.include_router(api_router, prefix=settings.api_prefix)
    app.include_router(api_router, prefix="/api/v1")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
