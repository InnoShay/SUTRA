from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.campuses import router as campuses_router
from app.api.v1.ml import router as ml_router
from app.api.v1.imports import router as imports_router
from app.api.v1.students import router as students_router
from app.api.v1.signals import router as signals_router
from app.api.v1.interventions import router as interventions_router
from app.api.v1.cases import router as cases_router
from app.api.v1.ai import router as ai_router
from app.api.v1.counselors import router as counselors_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.documents import router as documents_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.identity import router as identity_router

api_router = APIRouter()

# Mount all canonical v1 routers
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(campuses_router)
api_router.include_router(ml_router)
api_router.include_router(imports_router)
api_router.include_router(students_router)
api_router.include_router(signals_router)
api_router.include_router(interventions_router)
api_router.include_router(cases_router)
api_router.include_router(ai_router)
api_router.include_router(counselors_router)
api_router.include_router(datasets_router)
api_router.include_router(documents_router)
api_router.include_router(analytics_router)
api_router.include_router(identity_router)
