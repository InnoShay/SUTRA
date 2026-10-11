"""
Integration test for the full dataset audit runner and markdown reporting.
"""

from pathlib import Path
from sutra_ml.data.audit import run_full_dataset_audit, generate_markdown_report


def test_end_to_end_audit_pipeline(sample_data_dir: Path, sample_config: dict):
    # Run audit on sample fixture directory
    summary = run_full_dataset_audit(data_dir=sample_data_dir, config=sample_config)

    assert summary.dataset_name == "Open University Learning Analytics Dataset (OULAD)"
    assert len(summary.table_audits) == 7
    assert "courses.csv" in summary.table_audits
    assert "studentVle.csv" in summary.table_audits

    # Check referential integrity outputs
    assert len(summary.referential_checks) >= 4
    for rc in summary.referential_checks:
        assert rc["passed"] is True

    # Generate Markdown Report
    md = generate_markdown_report(summary)
    assert "# SUTRA ML — OULAD DATA AUDIT & QUALITY REPORT" in md
    assert "## 1. Dataset Provenance & Acquisition Verification" in md
    assert "## 2. Table Inventory & Row Counts" in md
    assert "courses.csv" in md
    assert "studentInfo.csv" in md
    assert "Raw Outcome Distribution Warning" in md
