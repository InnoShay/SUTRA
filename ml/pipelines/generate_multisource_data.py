#!/usr/bin/env python3
"""
CLI script to generate SUTRA 360-degree multisource synthetic datasets.

Generates:
1. ml/data/synthetic/multisource_batch_100.json
2. ml/data/synthetic/multisource_scenarios.json

Usage:
    PYTHONPATH=ml/src:. python3 ml/pipelines/generate_multisource_data.py --seed 42 --count 100
"""

import argparse
import json
from pathlib import Path
import sys

# Setup paths
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from sutra_ml.data.multisource_generator import MultisourceDataGenerator


def main():
    parser = argparse.ArgumentParser(description="Generate SUTRA Multisource Synthetic Datasets")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducibility")
    parser.add_argument("--count", type=int, default=100, help="Number of 360 profiles to generate")
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(ML_DIR / "data" / "synthetic"),
        help="Target output directory",
    )
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Initializing MultisourceDataGenerator with seed={args.seed}...")
    gen = MultisourceDataGenerator(seed=args.seed)

    # 1. Generate Named Scenarios
    print("[*] Generating 9 curated multisource demonstration scenarios...")
    named_scenarios = gen.generate_named_scenarios()
    scenarios_json = {name: prof.model_dump() for name, prof in named_scenarios.items()}
    scenarios_path = out_dir / "multisource_scenarios.json"
    with open(scenarios_path, "w", encoding="utf-8") as f:
        json.dump(scenarios_json, f, indent=2)
    print(f"    -> Saved {len(named_scenarios)} named scenarios to {scenarios_path}")

    # 2. Generate Batch Profiles
    print(f"[*] Generating {args.count} multisource 360 batch profiles...")
    batch_profiles = gen.generate_batch(count=args.count)
    batch_json = [p.model_dump() for p in batch_profiles]
    batch_path = out_dir / f"multisource_batch_{args.count}.json"
    with open(batch_path, "w", encoding="utf-8") as f:
        json.dump(batch_json, f, indent=2)
    print(f"    -> Saved {len(batch_profiles)} profiles to {batch_path}")

    print("[+] Multisource synthetic dataset generation complete.")


if __name__ == "__main__":
    main()
