"""
Unit tests for data loaders and audit calculation engine.
"""

from pathlib import Path
import pytest
import pandas as pd

from sutra_ml.data.loaders import count_lines_fast, load_csv, iter_csv_chunks
from sutra_ml.data.audit import audit_in_memory_table, audit_chunked_table


def test_count_lines_fast(sample_data_dir: Path):
    courses_path = sample_data_dir / "courses.csv"
    # Header + 3 data rows
    line_count = count_lines_fast(courses_path)
    assert line_count == 3


def test_count_lines_missing_file(tmp_path: Path):
    non_existent = tmp_path / "does_not_exist.csv"
    with pytest.raises(FileNotFoundError):
        count_lines_fast(non_existent)


def test_load_csv_valid(sample_data_dir: Path):
    df = load_csv(sample_data_dir / "courses.csv")
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 3
    assert list(df.columns) == ["code_module", "code_presentation", "module_presentation_length"]


def test_load_csv_missing_file(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        load_csv(tmp_path / "missing.csv")


def test_iter_csv_chunks(sample_data_dir: Path):
    vle_path = sample_data_dir / "studentVle.csv"
    chunks = list(iter_csv_chunks(vle_path, chunksize=2))
    assert len(chunks) == 3  # 6 rows / chunksize 2 = 3 chunks
    assert sum(len(c) for c in chunks) == 6


def test_audit_in_memory_table(sample_data_dir: Path):
    audit = audit_in_memory_table(
        sample_data_dir / "studentInfo.csv",
        key_cols=["code_module", "code_presentation", "id_student"],
    )
    assert audit.row_count == 5
    assert audit.column_count == 12
    assert audit.duplicate_rows_count == 0

    # Verify IMD band missingness: 1 out of 5 is empty (20.0%)
    imd_audit = next(c for c in audit.columns if c.name == "imd_band")
    assert imd_audit.null_count == 1
    assert imd_audit.null_percentage == 20.0


def test_audit_chunked_table(sample_data_dir: Path):
    audit = audit_chunked_table(sample_data_dir / "studentVle.csv", chunk_size=2)
    assert audit.row_count == 6
    assert audit.column_count == 6
    assert "date" in audit.date_ranges
    assert audit.date_ranges["date"] == (-10.0, 35.0)
