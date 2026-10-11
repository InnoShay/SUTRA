"""
FastAPI endpoints for SUTRA ML inference.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from backend.app.schemas.features import StudentFeatureInput
from backend.app.schemas.predict import (
    BatchPredictRequest,
    BatchPredictResponse,
    PredictResponse,
)
from backend.app.schemas.system import (
    FeatureCatalog,
    HealthResponse,
    ModelInfoResponse,
    ReadyResponse,
    SafetyGovernance,
)
from sutra_ml.inference.predictor import SutraRiskPredictor

router = APIRouter()


def get_predictor(request: Request) -> SutraRiskPredictor:
    """Dependency to retrieve loaded predictor or raise 503 Service Unavailable."""
    predictor: Optional[SutraRiskPredictor] = getattr(request.app.state, "predictor", None)
    if predictor is None or not predictor.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model pipeline is not ready or has not finished loading."
        )
    return predictor


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Process Health Check",
    tags=["System"],
)
def get_health() -> HealthResponse:
    """Check process health and liveness."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now(timezone.utc).isoformat(),
        service="sutra-ml-backend",
        version="1.0.0",
    )


@router.get(
    "/ready",
    summary="Model Readiness Check",
    tags=["System"],
)
def get_ready(request: Request):
    """
    Check whether model artifacts are loaded in memory and ready for inference.
    Returns HTTP 200 if ready, HTTP 503 if not ready.
    """
    predictor: Optional[SutraRiskPredictor] = getattr(request.app.state, "predictor", None)
    if predictor is None or not predictor.is_ready:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "model_loaded": False,
                "detail": "Model pipeline or metadata not loaded into application state."
            }
        )

    return ReadyResponse(
        status="ready",
        model_loaded=True,
        model_name=predictor.model_name,
        model_version=predictor.model_version,
        operational_threshold=predictor.operational_threshold,
        feature_count=len(predictor.feature_cols),
    )


@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Model Metadata & Governance Contract",
    tags=["Model"],
)
def get_model_info(
    predictor: SutraRiskPredictor = Depends(get_predictor),
) -> ModelInfoResponse:
    """
    Inspect model version, target definition, feature catalog, and governance guardrails.
    """
    return ModelInfoResponse(
        model_name=predictor.model_name,
        model_version=predictor.model_version,
        model_type="LogisticRegression (L2 regularized, class_weight='balanced')",
        target_definition="Binary academic outcome: 1 = At-Risk (Withdrawn or Fail), 0 = On-Track (Pass or Distinction)",
        observation_window="Observable student engagement and enrollment attributes up to Day 30",
        decision_threshold=predictor.operational_threshold,
        features=FeatureCatalog(
            total_count=len(predictor.feature_cols),
            numerical_count=len(predictor.numerical_features),
            categorical_count=len(predictor.categorical_features),
            numerical=predictor.numerical_features,
            categorical=predictor.categorical_features,
        ),
        training_cohort="Historical Open University presentations: 2013B, 2013J, 2014B",
        evaluation_holdout="Temporal future presentation: 2014J (disjoint student holdout verified)",
        safety_governance=SafetyGovernance(),
    )


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Score Single Student Record",
    tags=["Inference"],
)
def predict_student(
    payload: StudentFeatureInput,
    predictor: SutraRiskPredictor = Depends(get_predictor),
) -> PredictResponse:
    """
    Score a single student-course presentation record using Day-30 features.

    Returns:
    - risk_probability: P(At-Risk)
    - review_recommended: True if risk_probability >= 0.46 (human review recommendation only)
    - evidence_card: Decomposed feature attributions and governance notices
    """
    feature_dict = payload.to_feature_dict()
    result = predictor.predict_single(
        feature_data=feature_dict,
        record_id=payload.record_id,
        module_code=payload.code_module,
        presentation_code=payload.code_presentation,
    )

    return PredictResponse(
        record_id=result.record_id,
        risk_probability=result.risk_probability,
        review_recommended=result.review_recommended,
        risk_tier=result.risk_tier,
        operational_threshold=result.operational_threshold,
        model_name=result.model_name,
        model_version=result.model_version,
        evidence_card=result.evidence_card,
    )


@router.post(
    "/predict/batch",
    response_model=BatchPredictResponse,
    summary="Score Bounded Batch of Student Records",
    tags=["Inference"],
)
def predict_batch(
    payload: BatchPredictRequest,
    predictor: SutraRiskPredictor = Depends(get_predictor),
) -> BatchPredictResponse:
    """
    Score a bounded batch of up to 100 student records.
    """
    predictions: list[PredictResponse] = []
    review_count = 0

    for i, record in enumerate(payload.records):
        feature_dict = record.to_feature_dict()
        record_id = record.record_id or f"ANON-BATCH-{i+1:03d}"
        res = predictor.predict_single(
            feature_data=feature_dict,
            record_id=record_id,
            module_code=record.code_module,
            presentation_code=record.code_presentation,
        )
        if res.review_recommended:
            review_count += 1

        predictions.append(
            PredictResponse(
                record_id=res.record_id,
                risk_probability=res.risk_probability,
                review_recommended=res.review_recommended,
                risk_tier=res.risk_tier,
                operational_threshold=res.operational_threshold,
                model_name=res.model_name,
                model_version=res.model_version,
                evidence_card=res.evidence_card,
            )
        )

    return BatchPredictResponse(
        total_records=len(predictions),
        review_recommended_count=review_count,
        predictions=predictions,
    )
