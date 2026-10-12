"""
Unit tests for ModelPackageValidator in SUTRA Phase 1.

Tests reproducible model artifact packaging, SHA-256 checksum verification,
metadata integrity, and fail-closed error handling.
"""

import json
from pathlib import Path
import pytest

from backend.app.orchestration.packaging import (
    EXPECTED_PRODUCTION_SHA256,
    ModelPackagingError,
    ModelPackageValidator,
)


@pytest.fixture
def temp_packaging_dirs(tmp_path: Path):
    """Fixture providing isolated temporary directories for packaging tests."""
    source_dir = tmp_path / "source"
    dest_dir = tmp_path / "dest"
    source_dir.mkdir()
    dest_dir.mkdir()

    # Create dummy artifact with dummy content
    model_file = source_dir / "test_model.joblib"
    model_file.write_bytes(b"dummy serialized scikit-learn model binary")

    # Create valid metadata file
    metadata_file = source_dir / "model_metadata.json"
    valid_metadata = {
        "features": {
            "numerical": [f"num_{i}" for i in range(19)],
            "categorical": [f"cat_{i}" for i in range(6)],
        },
        "model_type": "LogisticRegression",
        "version": "v1.0.0",
    }
    metadata_file.write_text(json.dumps(valid_metadata), encoding="utf-8")

    return source_dir, dest_dir, model_file, metadata_file


def test_package_production_model_success(temp_packaging_dirs):
    """Packaging succeeds when artifact exists, checksum matches, and metadata is valid."""
    source_dir, dest_dir, model_file, metadata_file = temp_packaging_dirs

    actual_hash = ModelPackageValidator.compute_sha256(model_file)

    dest_path = ModelPackageValidator.package_production_model(
        source_model_path=model_file,
        source_metadata_path=metadata_file,
        destination_dir=dest_dir,
        expected_sha256=actual_hash,
    )

    assert dest_path.exists()
    assert (dest_dir / "baseline_logistic_regression.joblib").exists()
    assert (dest_dir / "model_metadata.json").exists()
    assert ModelPackageValidator.compute_sha256(dest_path) == actual_hash


def test_package_production_model_checksum_mismatch(temp_packaging_dirs):
    """Packaging fails with clear error when SHA-256 hash does not match expected checksum."""
    source_dir, dest_dir, model_file, metadata_file = temp_packaging_dirs

    with pytest.raises(ModelPackagingError) as exc_info:
        ModelPackageValidator.package_production_model(
            source_model_path=model_file,
            source_metadata_path=metadata_file,
            destination_dir=dest_dir,
            expected_sha256="0000000000000000000000000000000000000000000000000000000000000000",
        )

    assert "Checksum mismatch" in str(exc_info.value)
    # Target directory should not contain copied files
    assert not (dest_dir / "baseline_logistic_regression.joblib").exists()


def test_package_production_model_missing_source(temp_packaging_dirs):
    """Packaging fails when source model binary does not exist."""
    source_dir, dest_dir, _, metadata_file = temp_packaging_dirs
    non_existent_model = source_dir / "missing.joblib"

    with pytest.raises(ModelPackagingError) as exc_info:
        ModelPackageValidator.package_production_model(
            source_model_path=non_existent_model,
            source_metadata_path=metadata_file,
            destination_dir=dest_dir,
        )

    assert "Source model artifact not found" in str(exc_info.value)


def test_package_production_model_missing_metadata(temp_packaging_dirs):
    """Packaging fails when metadata file is missing."""
    source_dir, dest_dir, model_file, _ = temp_packaging_dirs
    non_existent_metadata = source_dir / "missing_meta.json"
    actual_hash = ModelPackageValidator.compute_sha256(model_file)

    with pytest.raises(ModelPackagingError) as exc_info:
        ModelPackageValidator.package_production_model(
            source_model_path=model_file,
            source_metadata_path=non_existent_metadata,
            destination_dir=dest_dir,
            expected_sha256=actual_hash,
        )

    assert "Model metadata file not found" in str(exc_info.value)


def test_package_production_model_invalid_metadata_feature_count(temp_packaging_dirs):
    """Packaging fails when metadata feature count does not match 19 numerical + 6 categorical."""
    source_dir, dest_dir, model_file, metadata_file = temp_packaging_dirs
    actual_hash = ModelPackageValidator.compute_sha256(model_file)

    # Incomplete metadata with only 2 numerical features
    invalid_metadata = {
        "features": {
            "numerical": ["feat_1", "feat_2"],
            "categorical": ["cat_1"],
        }
    }
    metadata_file.write_text(json.dumps(invalid_metadata), encoding="utf-8")

    with pytest.raises(ModelPackagingError) as exc_info:
        ModelPackageValidator.package_production_model(
            source_model_path=model_file,
            source_metadata_path=metadata_file,
            destination_dir=dest_dir,
            expected_sha256=actual_hash,
        )

    assert "Feature catalog mismatch" in str(exc_info.value)
