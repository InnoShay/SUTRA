#!/usr/bin/env python3
"""
Deterministic pipeline entrypoint for auditing the authentic OULAD dataset.

Usage:
    python3 ml/pipelines/run_audit.py
    PYTHONPATH=ml/src python3 ml/pipelines/run_audit.py
"""

import sys
import time
from pathlib import Path

import yaml

# Add src to path if running directly
REPO_ROOT = Path(__file__).resolve().parent.parent.parent
ML_DIR = REPO_ROOT / "ml"
SRC_DIR = ML_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from sutra_ml.data.audit import generate_markdown_report, run_full_dataset_audit


def main():
    print("=" * 70)
    print("SUTRA ML — OULAD Dataset Quality & Relational Integrity Audit")
    print("=" * 70)

    config_path = ML_DIR / "configs" / "data.yaml"
    if not config_path.is_file():
        print(f"[ERROR] Config file not found at: {config_path}", file=sys.stderr)
        sys.exit(1)

    with open(config_path) as f:
        config = yaml.safe_load(f)

    raw_dir = ML_DIR / config["paths"]["raw_dir"]
    report_output_path = ML_DIR / config["paths"]["audit_report"]

    print(f"[*] Raw data directory: {raw_dir}")
    print(f"[*] Audit report destination: {report_output_path}")

    start_time = time.time()
    try:
        summary = run_full_dataset_audit(data_dir=raw_dir, config=config)
        markdown_content = generate_markdown_report(summary)

        report_output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(report_output_path, "w") as f:
            f.write(markdown_content)

        elapsed = time.time() - start_time
        print(f"\n[✓] Audit completed successfully in {elapsed:.2f} seconds.")
        print(f"[✓] Report written to: {report_output_path}")
        print("\n--- Summary Table Counts ---")
        for fname, ta in summary.table_audits.items():
            print(f"  • {fname:25s}: {ta.row_count:10,d} rows | {ta.column_count:2d} cols")

    except Exception as e:
        print(f"\n[ERROR] Audit pipeline failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
