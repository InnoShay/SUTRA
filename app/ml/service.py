import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import joblib
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ServiceUnavailableError, UnprocessableEntityError
from app.core.logging import logger
from app.models.ml import MLInferenceLog
from app.schemas.ml import (
    DAY30_REQUIRED_FEATURES,
    FORBIDDEN_LEAKED_FEATURES,
    MLAttribution,
    MLEvidenceCard,
    MLModelInfo,
    MLPredictBatchRequest,
    MLPredictRequest,
    MLPredictResponse,
)


class MLService:
    """Internal service wrapper for ML model lifecycle, inference, and Evidence Card generation."""

    def __init__(self, artifact_path: Optional[str] = None):
        self.artifact_path = artifact_path or settings.ML_MODEL_ARTIFACT_PATH
        self.model: Optional[Any] = None
        self._status: str = "uncalibrated"
        self._model_version: str = "1.0.0"
        self._model_name: str = "logistic_regression_baseline"
        self._threshold: float = settings.ML_DECISION_THRESHOLD
        self._cutoff_days: int = settings.ML_DAY30_CUTOFF_DAYS
        self.load_model()

    def load_model(self) -> None:
        """Inspects and loads model estimator from disk or serving baseline."""
        try:
            from sutra_ml.models.baseline import LogisticRegressionBaseline
            self.model = LogisticRegressionBaseline(
                threshold=self._threshold,
                model_version=self._model_version,
            )
            self._status = "ready"
            logger.info("Loaded ML serving baseline: LogisticRegressionBaseline")
        except Exception as exc:
            self._status = "corrupt"
            self.model = None
            logger.error(f"Failed to load ML baseline: {exc}")

    def get_status(self) -> str:
        """Returns current ML service status: 'ready', 'uncalibrated', or 'corrupt'."""
        return self._status

    def get_metadata(self) -> Dict[str, Any]:
        """Returns baseline governance metadata conforming to MLModelInfo and backwards compatibility."""
        return {
            "model_name": "Logistic Regression",
            "model_version": self._model_version,
            "status": self.get_status(),
            "threshold": self._threshold,
            "decision_threshold": self._threshold,
            "cutoff_days": self._cutoff_days,
            "features": list(DAY30_REQUIRED_FEATURES),
            "candidate_model": {
                "name": "Constrained XGBoost",
                "version": "0.1.0-research",
                "status": "research_only",
                "rationale": "Research-only candidate; requires formal calibration and fairness promotion review.",
            },
            "active_policy_key": settings.ACTIVE_POLICY_KEY,
            "artifact_path": self.artifact_path,
        }

    def predict_single(
        self,
        request: MLPredictRequest,
        institution_id: Optional[uuid.UUID] = None,
    ) -> MLPredictResponse:
        """
        Executes single student Day-30 early warning inference and formats Evidence Card.
        """
        # 1. Check model availability
        if self._status == "corrupt":
            raise ServiceUnavailableError(
                "Model artifact is corrupt or unreadable.",
                code="MODEL_ARTIFACT_CORRUPT",
            )
        if self._status == "uncalibrated" or self.model is None:
            raise ServiceUnavailableError(
                "Model artifact is unavailable. Expected baseline Logistic Regression v1.0.0 in ml/artifacts/models.",
                code="MODEL_ARTIFACT_UNAVAILABLE",
            )

        # 2. Hard Anti-Leakage and input feature validation
        f = request.features
        for leaked in FORBIDDEN_LEAKED_FEATURES:
            if leaked in f:
                raise UnprocessableEntityError(
                    f"Forbidden leakage feature '{leaked}' detected in feature payload. "
                    "Target outcomes and post-cutoff assessment scores must never enter inference.",
                    code="LEAKAGE_DETECTED",
                )

        missing = [k for k in DAY30_REQUIRED_FEATURES if k not in f]
        if missing:
            raise UnprocessableEntityError(
                f"Missing {len(missing)} required Day-30 feature(s): {missing[:5]}. "
                "Feature vector must contain all 25 canonical features.",
                code="INVALID_INPUT_SCHEMA",
            )

        # 3. Model inference execution
        try:
            if hasattr(self.model, "predict_proba"):
                prob_raw = self.model.predict_proba(f)
            else:
                raise RuntimeError("Loaded model has no predict_proba method.")

            prob = float(prob_raw)
        except Exception as exc:
            logger.error(f"Inference execution failed: {exc}")
            raise ServiceUnavailableError(
                f"Inference execution failed: {str(exc)}",
                code="INFERENCE_RUNTIME_ERROR",
            )

        classification = "At_Risk" if prob >= self._threshold else "On_Track"

        # 4. Generate explainability attributions
        raw_attributions = []
        if hasattr(self.model, "explain"):
            raw_attributions = self.model.explain(f, top_n=5)

        attributions = [
            MLAttribution(
                feature=item["feature"],
                value=float(item["value"]),
                attribution=float(item["attribution"]),
                direction=item["direction"],
            )
            for item in raw_attributions
        ]

        # 5. Format Evidence Card
        evidence_card = MLEvidenceCard(
            card_type="ml_early_warning_evidence",
            model_name=self._model_name,
            model_version=self._model_version,
            prediction_cutoff=f"Day {self._cutoff_days}",
            risk_probability=round(prob, 4),
            threshold=self._threshold,
            classification=classification,
            calibration_status="platt_calibrated",
            top_attributions=attributions,
            limitations=[
                "Trained on historical Open University course registrations; not calibrated for non-modular curricula.",
                "Early assessment grades were excluded to avoid temporal leakage.",
                "Represents statistical correlation, not causal certainty or personal diagnosis.",
                "Predictions must be reviewed by authorized educators before taking any supportive action.",
            ],
        )

        return MLPredictResponse(
            external_student_ref=request.external_student_ref,
            risk_probability=round(prob, 4),
            threshold=self._threshold,
            classification=classification,
            evidence_card=evidence_card,
        )

    def predict_batch(
        self,
        request: MLPredictBatchRequest,
        institution_id: Optional[uuid.UUID] = None,
    ) -> List[MLPredictResponse]:
        """
        Executes batch early warning inference across multiple student feature vectors.
        """
        return [self.predict_single(inst, institution_id=institution_id) for inst in request.instances]

    async def log_inference(
        self,
        db: AsyncSession,
        institution_id: uuid.UUID,
        prediction: MLPredictResponse,
        signal_id: Optional[uuid.UUID] = None,
        student_id: Optional[uuid.UUID] = None,
        latency_ms: Optional[float] = None,
    ) -> MLInferenceLog:
        """
        Audits ML prediction into ml_inference_logs table.
        """
        log = MLInferenceLog(
            id=uuid.uuid4(),
            institution_id=institution_id,
            signal_id=signal_id,
            student_id=student_id,
            external_student_ref=prediction.external_student_ref,
            model_name=self._model_name,
            model_version=self._model_version,
            prediction_cutoff=f"Day {self._cutoff_days}",
            risk_probability=prediction.risk_probability,
            threshold=prediction.threshold,
            classification=prediction.classification,
            top_attributions=[attr.model_dump() for attr in prediction.evidence_card.top_attributions],
            latency_ms=latency_ms,
            created_at=datetime.now(timezone.utc),
        )
        db.add(log)
        await db.flush()
        return log


ml_service = MLService()
