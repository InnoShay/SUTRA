"""
FastAPI application for SUTRA ML Inference Service.

Serves Day-30 early warning risk predictions and structured evidence cards.
"""

from contextlib import asynccontextmanager
import logging
from pathlib import Path
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api.cases import router as cases_router
from backend.app.api.endpoints import router as api_router
from backend.app.api.interventions import router as interventions_router
from backend.app.api.demo_ui import router as demo_ui_router
from backend.app.api.research_explorer import router as research_explorer_router
from backend.app.core.config import settings
from backend.app.orchestration.persistence.db import create_connection, init_db
from sutra_ml.inference.predictor import SutraRiskPredictor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("sutra.backend")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan manager: loads model artifact and initializes database."""
    logger.info("Starting SUTRA ML Inference & Orchestration Service...")
    logger.info("Loading model artifact from: %s", settings.model_path)
    logger.info("Loading metadata from: %s", settings.metadata_path)

    # Initialize SQLite database with WAL mode and schema migration
    try:
        db_conn = create_connection()
        init_db(db_conn)
        app.state.db_conn = db_conn
        logger.info("SQLite Support Evidence Ledger successfully initialized.")
    except Exception as exc:
        logger.error("Failed to initialize database: %s", exc)
        app.state.db_conn = None

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
    if getattr(app.state, "db_conn", None):
        try:
            app.state.db_conn.close()
        except Exception:
            pass
    app.state.predictor = None


def create_app() -> FastAPI:
    """Application factory for FastAPI instance."""
    app = FastAPI(
        title="SUTRA ML Early Warning & Support Evidence Ledger API",
        version="1.0.0",
        description=(
            "Serves real-time academic risk predictions, four-agent triage orchestration, "
            "and durable Support Evidence Ledger case management. "
            "Human-in-the-loop: predictions are decision-support indicators for advisors, not automated verdicts."
        ),
        lifespan=lifespan,
    )

    # Narrow CORS scoped strictly to local development origins (no wildcard with credentials)
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
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

    from backend.app.orchestration.security import AuthorizationError

    @app.exception_handler(AuthorizationError)
    async def authorization_exception_handler(request: Request, exc: AuthorizationError):
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": str(exc)},
        )

    # Mount endpoints at root and under /api/v1
    app.include_router(api_router, prefix=settings.api_prefix)
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(cases_router, prefix="/api/v1")
    app.include_router(interventions_router, prefix="/interventions")
    app.include_router(interventions_router, prefix="/api/v1/interventions")
    app.include_router(demo_ui_router)
    app.include_router(research_explorer_router)

    # Static files for Advisor Review UI
    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/app", StaticFiles(directory=str(static_dir), html=True), name="static_app")

    @app.get("/", include_in_schema=False)
    def root_redirect():
        return RedirectResponse(url="/app/")

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
