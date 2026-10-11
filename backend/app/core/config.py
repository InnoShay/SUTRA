"""
Configuration settings for the SUTRA backend application.
"""

import os
from pathlib import Path
from pydantic import BaseModel, Field


def find_project_root() -> Path:
    """Find the root directory containing ml/ and backend/."""
    current = Path(__file__).resolve().parent
    for _ in range(5):
        if (current / "ml").exists() or (current / "backend").exists():
            return current
        current = current.parent
    return Path.cwd()


PROJECT_ROOT = find_project_root()
DEFAULT_MODEL_PATH = PROJECT_ROOT / "ml" / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
DEFAULT_METADATA_PATH = PROJECT_ROOT / "ml" / "artifacts" / "models" / "v1.0.0" / "model_metadata.json"


class Settings(BaseModel):
    """Application runtime settings."""
    app_name: str = "SUTRA ML Inference API"
    app_version: str = "1.0.0"
    api_prefix: str = ""
    model_path: Path = Field(
        default_factory=lambda: Path(os.getenv("SUTRA_MODEL_PATH", str(DEFAULT_MODEL_PATH)))
    )
    metadata_path: Path = Field(
        default_factory=lambda: Path(os.getenv("SUTRA_METADATA_PATH", str(DEFAULT_METADATA_PATH)))
    )
    max_batch_size: int = 100
    default_threshold: float = 0.46


settings = Settings()
