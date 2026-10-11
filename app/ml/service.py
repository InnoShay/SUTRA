import os
from typing import Any, Dict, Optional
from app.core.config import settings
from app.core.logging import logger


class MLService:
    """Internal service wrapper for ML model lifecycle and readiness detection."""

    def __init__(self, artifact_path: Optional[str] = None):
        self.artifact_path = artifact_path or settings.ML_MODEL_ARTIFACT_PATH
        self.model = None
        self._status: str = "uncalibrated"
        self._model_version: str = "1.0.0"
        self._check_artifact_availability()

    def _check_artifact_availability(self) -> None:
        """Inspects whether serialized model artifacts exist on disk."""
        if not os.path.exists(self.artifact_path):
            self._status = "uncalibrated"
            return

        model_files = [
            f for f in os.listdir(self.artifact_path)
            if f.endswith((".pkl", ".joblib", ".json")) and not f.startswith(".")
        ]
        if not model_files:
            self._status = "uncalibrated"
        else:
            self._status = "ready"

    def get_status(self) -> str:
        """Returns current ML service status: 'ready', 'uncalibrated', or 'disabled'."""
        self._check_artifact_availability()
        return self._status

    def get_metadata(self) -> Dict[str, Any]:
        """Returns baseline governance metadata without mutating state."""
        return {
            "status": self.get_status(),
            "model_version": self._model_version,
            "decision_threshold": settings.ML_DECISION_THRESHOLD,
            "cutoff_days": settings.ML_DAY30_CUTOFF_DAYS,
            "active_policy_key": settings.ACTIVE_POLICY_KEY,
            "artifact_path": self.artifact_path,
        }


ml_service = MLService()
