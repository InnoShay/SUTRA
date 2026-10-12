#!/usr/bin/env python3
"""
SUTRA ML Phase Twenty-Two — Dual-Cutoff Dataset Preparation Pipeline.

Generates separate, strictly time-bounded feature matrices for:
- Day-30 Academic Early-Warning Milestone
- Day-60 Mid-Semester Academic Forecasting Milestone

Enforces:
1. Complete omission of assessment marks/scores (due to unrecorded grading turnaround in OULAD).
2. Elimination of pre-cutoff withdrawals from active cohorts.
3. Strict point-in-time censoring of VLE events and submissions.
4. Independent dataset versioning and SHA-256 cryptographic hashing.

Usage:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_dual_cutoff_prep.py
"""

import hashlib
import json
import sys
import time
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from sutra_ml.features.build_dual_cutoff_features import assemble_dual_cutoff_dataset


def compute_sha256(file_path: Path) -> str:
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def run_dual_cutoff_prep():
    print("=" * 80)
    print("SUTRA ML Phase Twenty-Two — Dual-Cutoff Dataset Preparation Pipeline")
    print("=" * 80)

    raw_dir = ML_DIR / "data" / "raw"
    processed_dir = ML_DIR / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    out_d30 = processed_dir / "phase22_day30_features.csv"
    out_d60 = processed_dir / "phase22_day60_features.csv"

    # 1. Day-30 Dataset Generation
    print("\n[*] Assembling Day-30 Feature Matrix (t <= 30)...")
    t0 = time.time()
    df30, meta30 = assemble_dual_cutoff_dataset(raw_dir=raw_dir, cutoff_day=30)
    df30.to_csv(out_d30, index=False)
    t30_elapsed = time.time() - t0
    hash_d30 = compute_sha256(out_d30)
    meta30["sha256"] = hash_d30
    meta30["file_size_bytes"] = out_d30.stat().st_size
    meta30["assembly_time_seconds"] = round(t30_elapsed, 2)
    print(f"[✓] Day-30 Saved: {out_d30.name} ({meta30['file_size_bytes'] / (1024*1024):.2f} MB)")
    print(f"    Rows: {meta30['active_records']:,} | Students: {meta30['unique_students']:,} | At-Risk: {meta30['at_risk_prevalence'] * 100:.2f}% | SHA256: {hash_d30[:16]}...")

    # 2. Day-60 Dataset Generation
    print("\n[*] Assembling Day-60 Feature Matrix (t <= 60)...")
    t0 = time.time()
    df60, meta60 = assemble_dual_cutoff_dataset(raw_dir=raw_dir, cutoff_day=60)
    df60.to_csv(out_d60, index=False)
    t60_elapsed = time.time() - t0
    hash_d60 = compute_sha256(out_d60)
    meta60["sha256"] = hash_d60
    meta60["file_size_bytes"] = out_d60.stat().st_size
    meta60["assembly_time_seconds"] = round(t60_elapsed, 2)
    print(f"[✓] Day-60 Saved: {out_d60.name} ({meta60['file_size_bytes'] / (1024*1024):.2f} MB)")
    print(f"    Rows: {meta60['active_records']:,} | Students: {meta60['unique_students']:,} | At-Risk: {meta60['at_risk_prevalence'] * 100:.2f}% | SHA256: {hash_d60[:16]}...")

    # 3. Summary Metadata
    summary_path = processed_dir / "phase22_dataset_summary.json"
    summary_data = {
        "pipeline_version": "v22.0.0",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "day30": meta30,
        "day60": meta60,
    }
    with open(summary_path, "w") as f:
        json.dump(summary_data, f, indent=2)
    print(f"\n[✓] Saved Dataset Summary: {summary_path}")
    print("=" * 80)
    return summary_data


if __name__ == "__main__":
    run_dual_cutoff_prep()
