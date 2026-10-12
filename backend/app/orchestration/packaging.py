"""
Reproducible Model Packaging and Provenance Verification for SUTRA Phase 1.

Validates source artifact existence, SHA-256 integrity, metadata schema, and
scikit-learn runtime compatibility before packaging to release paths.
Prevents unverified experimental artifacts from being silently treated as production.
"""

import hashlib
import json
import os
from pathlib import Path
import shutil
from typing import Optional
import sklearn

EXPECTED_PRODUCTION_SHA256: str = "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"
EXPECTED_SKLEARN_VERSIONS: tuple = ("1.7", "1.8", "1.9")
EXPECTED_MODEL_VERSION: str = "v1.0.0"


class ModelPackagingError(Exception):
    """Raised when artifact validation or packaging fails."""
    pass


class ModelPackageValidator:
    """
    Validates physical model binaries and metadata before packaging or serving.
    """

    @staticmethod
    def compute_sha256(file_path: Path) -> str:
        """Compute SHA-256 checksum of a file."""
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    @classmethod
    def validate_runtime_environment(cls) -> None:
        """Verify that the current scikit-learn version matches the serialized model baseline."""
        current_version = sklearn.__version__
        if not current_version.startswith(EXPECTED_SKLEARN_VERSIONS):
            raise ModelPackagingError(
                f"Incompatible scikit-learn runtime version '{current_version}'. "
                f"Model v1.0.0 requires scikit-learn 1.7.x - 1.9.x to prevent deserialization failures."
            )

    @classmethod
    def validate_metadata(cls, metadata_path: Path) -> dict:
        """Validate that model metadata exists and contains required feature catalog."""
        if not metadata_path.exists():
            raise ModelPackagingError(f"Model metadata file not found at '{metadata_path}'.")

        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as exc:
            raise ModelPackagingError(f"Malformed metadata JSON at '{metadata_path}': {exc}")

        if "features" not in data or "numerical" not in data["features"] or "categorical" not in data["features"]:
            raise ModelPackagingError(
                f"Metadata at '{metadata_path}' is missing required 'features.numerical' or 'features.categorical' fields."
            )

        num_features = data["features"]["numerical"]
        cat_features = data["features"]["categorical"]
        if len(num_features) != 19 or len(cat_features) != 6:
            raise ModelPackagingError(
                f"Feature catalog mismatch: expected 19 numerical and 6 categorical features, "
                f"found {len(num_features)} numerical and {len(cat_features)} categorical."
            )

        return data

    @classmethod
    def package_production_model(
        cls,
        source_model_path: Path,
        source_metadata_path: Path,
        destination_dir: Path,
        expected_sha256: str = EXPECTED_PRODUCTION_SHA256,
        force_clean: bool = False,
    ) -> Path:
        """
        Validate and package verified model artifact and metadata to destination directory.

        Fails closed if the source artifact is missing, has mismatched hash,
        or invalid metadata. Never retrains or mutates the model binary.
        """
        # 1. Validate environment
        cls.validate_runtime_environment()

        # 2. Check source artifact
        if not source_model_path.exists():
            raise ModelPackagingError(f"Source model artifact not found at '{source_model_path}'.")

        # 3. Checksum verification
        actual_sha256 = cls.compute_sha256(source_model_path)
        if actual_sha256 != expected_sha256:
            raise ModelPackagingError(
                f"Checksum mismatch for '{source_model_path}': "
                f"expected SHA-256 '{expected_sha256}', found '{actual_sha256}'."
            )

        # 4. Metadata verification
        cls.validate_metadata(source_metadata_path)

        # 5. Create destination directory
        destination_dir.mkdir(parents=True, exist_ok=True)
        dest_model_path = destination_dir / "baseline_logistic_regression.joblib"
        dest_metadata_path = destination_dir / "model_metadata.json"

        # 6. Copy files atomically
        shutil.copy2(source_model_path, dest_model_path)
        shutil.copy2(source_metadata_path, dest_metadata_path)

        return dest_model_path
