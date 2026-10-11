from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.campuses import router as campuses_router
from app.api.v1.ml import router as ml_router

api_router = APIRouter()

# Include health routes at root of API v1 (and also top level in main)
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(campuses_router)
api_router.include_router(ml_router)
