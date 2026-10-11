#!/usr/bin/env python3
"""
SUTRA Evaluation Pipeline on Labeled Datasets.

CLI entrypoint to evaluate the approved production model against real, approved,
labeled datasets with verified binary target semantics.

SAFEGUARDS:
1. Target column must be explicitly provided and strictly binary {0, 1}.
2. Strips identifiers, targets, and leakage columns before inference.
3. Uses frozen production pipeline (no refitting or post-hoc threshold tuning).
4. Rejects unlabeled datasets with clear actionable error.
5. Flags previously inspected historical partitions (e.g. 2014J) as development evidence,
   never as an untouched prospective test set.

Usage:
    PYTHONPATH=ml/src:. python3 ml/pipelines/run_evaluate_labeled_data.py \\
        --data-path ml/data/processed/day30_features.csv \\
        --target-col target \\
        --presentation 2014J \\
        --threshold 0.46
"""

import argparse
import json
from pathlib import Path
import sys

# Path setup
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sutra_ml.evaluation.dataset_evaluator import (
    display_evaluation_report,
    evaluate_dataset,
)


def main():
    parser = argparse.ArgumentParser(description="Evaluate SUTRA Production Model on Labeled Dataset")
    parser.add_argument(
        "--data-path",
        type=str,
        default=str(ML_DIR / "data" / "processed" / "day30_features.csv"),
        help="Path to CSV dataset",
    )
    parser.add_argument("--target-col", type=str, default="target", help="Name of ground truth target column")
    parser.add_argument("--presentation", type=str, default=None, help="Filter by presentation partition (e.g. 2014J)")
    parser.add_argument("--threshold", type=float, default=0.46, help="Decision threshold")
    parser.add_argument("--dataset-label", type=str, default="OULAD Day-30 Processed Dataset", help="Dataset name label")
    parser.add_argument(
        "--output-json",
        type=str,
        default=str(ML_DIR / "reports" / "metrics" / "evaluation_labeled_run.json"),
        help="Path to export metrics as JSON",
    )
    args = parser.parse_args()

    print(f"[*] Starting evaluation on {args.data_path}...")
    report = evaluate_dataset(
        data_path=args.data_path,
        target_col=args.target_col,
        presentation=args.presentation,
        threshold=args.threshold,
        dataset_label=args.dataset_label,
    )

    display_evaluation_report(report)

    out_file = Path(args.output_json)
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"[+] Evaluation report exported to {out_file}")


if __name__ == "__main__":
    main()
