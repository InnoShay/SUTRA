#!/usr/bin/env python3
"""
CLI script to generate SUTRA synthetic data artifacts.

Generates:
1. ml/data/synthetic/synthetic_batch_100.json
2. ml/data/synthetic/synthetic_batch_100.csv
3. ml/data/synthetic/named_scenarios.json
4. ml/data/synthetic/negative_test_cases.json
5. ml/data/synthetic/README.md

Usage:
    python3 ml/pipelines/generate_synthetic_data.py --seed 42 --count 100
"""

import argparse
import json
from pathlib import Path
import sys
import pandas as pd

# Path setup
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sutra_ml.data.synthetic import SyntheticDataGenerator


def main():
    parser = argparse.ArgumentParser(description="Generate SUTRA synthetic evaluation data")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducibility")
    parser.add_argument("--count", type=int, default=100, help="Number of batch records to generate")
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(ML_DIR / "data" / "synthetic"),
        help="Target output directory",
    )
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Initializing SyntheticDataGenerator with seed={args.seed}...")
    gen = SyntheticDataGenerator(seed=args.seed)

    # 1. Batch 100 records
    print(f"[*] Generating {args.count} batch records...")
    batch_records = gen.generate_batch(n=args.count)
    batch_json_path = out_dir / f"synthetic_batch_{args.count}.json"
    batch_csv_path = out_dir / f"synthetic_batch_{args.count}.csv"

    with open(batch_json_path, "w", encoding="utf-8") as f:
        json.dump(batch_records, f, indent=2)

    df_batch = pd.DataFrame(batch_records)
    df_batch.to_csv(batch_csv_path, index=False)
    print(f"    -> Saved {len(batch_records)} records to {batch_json_path}")
    print(f"    -> Saved {len(batch_records)} records to {batch_csv_path}")

    # 2. Named demonstration scenarios
    print("[*] Generating named demonstration scenarios...")
    named_scenarios = gen.generate_named_scenarios()
    named_path = out_dir / "named_scenarios.json"
    with open(named_path, "w", encoding="utf-8") as f:
        json.dump(named_scenarios, f, indent=2)
    print(f"    -> Saved {len(named_scenarios)} named scenarios to {named_path}")

    # 3. Negative validation test cases
    print("[*] Generating negative validation test cases...")
    negative_cases = gen.generate_negative_cases()
    negative_path = out_dir / "negative_test_cases.json"
    with open(negative_path, "w", encoding="utf-8") as f:
        json.dump(negative_cases, f, indent=2)
    print(f"    -> Saved {len(negative_cases)} negative cases to {negative_path}")

    # 4. Write README.md documenting synthetic nature and strict limitations
    readme_path = out_dir / "README.md"
    readme_content = f"""# SUTRA Synthetic Dataset Directory

This directory contains synthetically generated student engagement records created specifically for **developer testing, inference pipeline verification, and interactive playground demonstrations**.

## Generated Artifacts (Seed: {args.seed})
- `synthetic_batch_{args.count}.json`: {args.count} schema-compliant synthetic student records formatted as JSON.
- `synthetic_batch_{args.count}.csv`: Same {args.count} records formatted as CSV.
- `named_scenarios.json`: Curated scenarios illustrating distinct engagement archetypes:
  1. `HIGH_ENGAGEMENT_ON_TRACK`: High LMS clicks, active study velocity, early submission.
  2. `LOW_ENGAGEMENT_AT_RISK`: Low/negligible LMS engagement, inactivity, no early submission.
  3. `MIXED_SIGNALS_MODERATE`: High pre-course clicks followed by post-start disengagement.
  4. `EDGE_CASE_ZERO_VALUES`: Minimal valid boundary values (0 clicks, 0 submissions).
  5. `EDGE_CASE_MAX_VALUES`: Upper valid boundary values (3,200 clicks, 240 credits).
  6. `UNSEEN_MODULE_FALLBACK`: Novel module code (`XXX`) testing graceful pipeline fallback.
- `negative_test_cases.json`: Explicitly invalid records testing schema gate rejections (missing fields, NaN/Inf, extra leakage attributes, invalid categoricals).

## CRITICAL METHODOLOGICAL SAFEGUARDS
1. **Strict Synthetic Identity**: All records are generated pseudo-randomly using empirical Day-30 parameter bounds. All identifiers are prefixed with `SYNTH-` and do **NOT** correspond to any real individuals.
2. **Absence of Real Target Labels**: These records do **NOT** possess authentic academic outcomes. No ground-truth outcomes are assigned.
3. **PROHIBITION OF ACCURACY/PERFORMANCE CLAIMS**: Model accuracy, precision, recall, F1-score, ROC-AUC, PR-AUC, and calibration statistics **MUST NEVER** be computed or claimed using synthetic data. Synthetic records exist strictly to test software mechanics, schema compliance, latency, and explanation presentation.
4. **Non-Causal Representation**: The feature correlations in synthetic data are mathematical approximations and do not reflect real-world causal psychological or behavioral dynamics.
"""
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(readme_content)
    print(f"    -> Saved documentation to {readme_path}")
    print("[+] Synthetic dataset generation complete.")


if __name__ == "__main__":
    main()
