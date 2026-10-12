#!/usr/bin/env python3
"""
CLI script to package verified production ML model artifacts into release directory.

Usage:
    python3 scripts/package_model.py
"""

import sys
from pathlib import Path

# Add project root to sys.path
REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from backend.app.orchestration.packaging import (
    ModelPackageValidator,
    EXPECTED_PRODUCTION_SHA256,
)

DEFAULT_SOURCE_MODEL = REPO_ROOT / "ml" / "artifacts" / "experiments" / "phase_eight_observability" / "baseline_logistic_regression.joblib"
DEFAULT_SOURCE_METADATA = REPO_ROOT / "ml" / "reports" / "metrics" / "model_comparison.json"
DEFAULT_DEST_DIR = REPO_ROOT / "ml" / "artifacts" / "models" / "v1.0.0"


def main():
    print("=" * 70)
    print("SUTRA — Production Model Packaging and Verification")
    print("=" * 70)

    try:
        print(f"Source Model:    {DEFAULT_SOURCE_MODEL}")
        print(f"Source Metadata: {DEFAULT_SOURCE_METADATA}")
        print(f"Destination:     {DEFAULT_DEST_DIR}")
        print(f"Expected SHA256: {EXPECTED_PRODUCTION_SHA256}")

        dest_path = ModelPackageValidator.package_production_model(
            source_model_path=DEFAULT_SOURCE_MODEL,
            source_metadata_path=DEFAULT_SOURCE_METADATA,
            destination_dir=DEFAULT_DEST_DIR,
            expected_sha256=EXPECTED_PRODUCTION_SHA256,
        )

        print(f"\n[✓] Successfully verified and packaged model to: {dest_path}")
        print("[✓] Model v1.0.0 is ready for inference service.")
        sys.exit(0)

    except Exception as exc:
        print(f"\n[✗] Model packaging failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
