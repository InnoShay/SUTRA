import time
import uuid
from typing import Callable
from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.health import router as health_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import SutraException
from app.core.logging import logger, redact_sensitive_data
from app.schemas.errors import ErrorDetail, ErrorEnvelope, ErrorPayload


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="SUTRA: Student Success and Intervention Orchestration Engine",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_origin_regex=r"^(https:\/\/.*\.vercel\.app|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Structured request logging middleware
    @app.middleware("http")
    async def logging_middleware(request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        request.state.request_id = request_id
        start_time = time.time()

        # Sanitize headers for logging
        headers_log = {k: v for k, v in request.headers.items() if k.lower() != "authorization"}

        logger.info(
            f"Request started | id={request_id} | method={request.method} | path={request.url.path} | headers={headers_log}"
        )

        try:
            response = await call_next(request)
            duration_ms = round((time.time() - start_time) * 1000, 2)
            response.headers["X-Request-Id"] = request_id
            logger.info(
                f"Request completed | id={request_id} | status={response.status_code} | duration={duration_ms}ms"
            )
            return response
        except Exception as exc:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            logger.error(
                f"Request failed | id={request_id} | duration={duration_ms}ms | error={str(exc)}"
            )
            raise

    # Custom SutraException handler
    @app.exception_handler(SutraException)
    async def sutra_exception_handler(request: Request, exc: SutraException):
        request_id = getattr(request.state, "request_id", None)
        error_payload = ErrorPayload(
            code=exc.code,
            message=exc.message,
            request_id=request_id,
            details=[ErrorDetail(message=str(d)) for d in exc.details] if exc.details else [],
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorEnvelope(error=error_payload).model_dump(),
        )

    # Request validation error handler
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", None)
        details = []
        for err in exc.errors():
            loc = ".".join(str(p) for p in err.get("loc", []))
            details.append(
                ErrorDetail(
                    field=loc,
                    message=err.get("msg", "Validation error"),
                    code=err.get("type", "value_error"),
                )
            )
        error_payload = ErrorPayload(
            code="VALIDATION_FAILED",
            message="Request input validation failed",
            request_id=request_id,
            details=details,
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=ErrorEnvelope(error=error_payload).model_dump(),
        )

    # Generic unhandled exception handler
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", None)
        logger.exception(f"Unhandled server error: {str(exc)}")
        error_payload = ErrorPayload(
            code="INTERNAL_SERVER_ERROR",
            message="An unexpected internal server error occurred",
            request_id=request_id,
            details=[],
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorEnvelope(error=error_payload).model_dump(),
        )

    # Mount top-level health and readiness probes
    app.include_router(health_router)

    # Mount API v1 router
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Root-level backwards compatibility route aliases (ADR-005, ADR-001)
    # Secured per Phase 3B.1: Root compatibility routes delegate to the canonical
    # ML route handlers to guarantee identical authentication, campus scoping,
    # role authorization, and audit logging.
    from typing import Any, Dict, List
    from app.api.v1.ml import get_model_info, predict_batch, predict_single
    from app.schemas.ml import MLPredictResponse

    app.add_api_route(
        "/model-info",
        get_model_info,
        methods=["GET"],
        response_model=Dict[str, Any],
        tags=["ML Compatibility"],
        summary="Root compatibility alias for ML model info",
    )
    app.add_api_route(
        "/predict",
        predict_single,
        methods=["POST"],
        response_model=MLPredictResponse,
        tags=["ML Compatibility"],
        summary="Root compatibility alias for ML single prediction",
    )
    app.add_api_route(
        "/predict/batch",
        predict_batch,
        methods=["POST"],
        response_model=List[MLPredictResponse],
        tags=["ML Compatibility"],
        summary="Root compatibility alias for ML batch prediction",
    )

    return app


app = create_application()
