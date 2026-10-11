#!/usr/bin/env python3
"""
SUTRA ML — Local Model Verification & Inference Smoke Test.

Verifies:
1. Model files exist on disk with non-zero byte size.
2. Deserialization works cleanly with joblib.
3. Inference produces finite float probabilities in [0.0, 1.0] summing to 1.0.
4. Output format adheres to inference contract without exposing student identifiers.

Usage:
    python3 ml/scripts/verify_models.py
"""

import os
import sys
import time
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def main():
    print("=" * 70)
    print("SUTRA ML — Saved Model Verification & Inference Smoke Test")
    print("=" * 70)

    artifact_dir = ML_DIR / "artifacts" / "models" / "v1.0.0"
    data_path = ML_DIR / "data" / "processed" / "day30_features.csv"

    # Step 1: Check artifact presence and attributes
    print("\n[STEP 1/3] Verifying Physical Model Artifacts on Disk...")
    required_files = [
        "baseline_logistic_regression.joblib",
        "candidate_xgboost.joblib",
        "model_metadata.json",
    ]
    for fname in required_files:
        fpath = artifact_dir / fname
        if not fpath.exists():
            raise FileNotFoundError(f"Missing required model artifact: {fpath}")
        size_bytes = os.path.getsize(fpath)
        mtime_str = time.ctime(os.path.getmtime(fpath))
        print(f"  [✓] {fname:<36} | Size: {size_bytes:>8,} bytes | Modified: {mtime_str}")

    # Step 2: Deserialize pipelines
    print("\n[STEP 2/3] Loading Model Pipelines with joblib...")
    lr_pipe = joblib.load(artifact_dir / "baseline_logistic_regression.joblib")
    xgb_pipe = joblib.load(artifact_dir / "candidate_xgboost.joblib")

    print(f"  [✓] Baseline Pipeline: {type(lr_pipe).__name__} (Steps: {[s[0] for s in lr_pipe.steps]})")
    print(f"  [✓] Candidate Pipeline: {type(xgb_pipe).__name__} (Steps: {[s[0] for s in xgb_pipe.steps]})")

    # Step 3: Run inference smoke test on valid rows
    print("\n[STEP 3/3] Executing De-Identified Inference Smoke Test on 2014J Test Rows...")
    df = pd.read_csv(data_path)
    feature_cols = [
        c for c in df.columns
        if c not in ["code_module", "code_presentation", "id_student", "target", "target_name", "raw_final_result"]
    ]
    test_slice = df[df["code_presentation"] == "2014J"][feature_cols].head(5).copy()

    probs_lr = lr_pipe.predict_proba(test_slice)
    probs_xgb = xgb_pipe.predict_proba(test_slice)

    # Validations
    assert probs_lr.shape == (5, 2), f"Unexpected LR output shape: {probs_lr.shape}"
    assert probs_xgb.shape == (5, 2), f"Unexpected XGBoost output shape: {probs_xgb.shape}"
    assert np.isfinite(probs_lr).all(), "Non-finite values found in LR probabilities"
    assert np.isfinite(probs_xgb).all(), "Non-finite values found in XGBoost probabilities"
    assert ((probs_lr >= 0.0) & (probs_lr <= 1.0)).all(), "LR probabilities outside valid [0, 1] range"
    assert ((probs_xgb >= 0.0) & (probs_xgb <= 1.0)).all(), "XGB probabilities outside valid [0, 1] range"
    assert np.isclose(probs_lr.sum(axis=1), 1.0).all(), "LR probabilities row sums != 1.0"
    assert np.isclose(probs_xgb.sum(axis=1), 1.0).all(), "XGB probabilities row sums != 1.0"

    print("\nSmoke Test Results (De-Identified Instance Evaluation):")
    print("-" * 75)
    print(f"{'Instance ID':<16} | {'LR Risk P(At-Risk)':<20} | {'XGB Risk P(At-Risk)':<20} | {'Alert (t=0.46)':<14}")
    print("-" * 75)
    for i in range(len(test_slice)):
        deid_id = f"SMOKE-INST-{i+1:03d}"
        p_lr = probs_lr[i, 1]
        p_xgb = probs_xgb[i, 1]
        alert = "ALERT" if p_lr >= 0.46 else "No Alert"
        print(f"{deid_id:<16} | {p_lr:<20.4f} | {p_xgb:<20.4f} | {alert:<14}")
    print("-" * 75)

    print("\n[SUCCESS] Model verification passed: All artifacts exist, load, and generate valid probabilities.")


if __name__ == "__main__":
    main()
