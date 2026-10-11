"""
Data quality and validation unit tests.
"""

from pathlib import Path
import pandas as pd
import pytest

from sutra_ml.data.validation import (
    validate_table_presence,
    validate_columns,
    validate_primary_key,
    validate_foreign_key,
    Severity,
)


def test_validate_table_presence_success(sample_data_dir: Path):
    expected = ["courses.csv", "studentInfo.csv", "vle.csv"]
    res = validate_table_presence(sample_data_dir, expected)
    assert res.is_valid
    assert len(res.errors) == 0


def test_validate_table_presence_failure(tmp_path: Path):
    expected = ["non_existent_table.csv"]
    res = validate_table_presence(tmp_path, expected)
    assert not res.is_valid
    assert len(res.errors) == 1
    assert res.errors[0].severity == Severity.ERROR


def test_validate_columns_success():
    df = pd.DataFrame({"a": [1, 2], "b": ["x", "y"]})
    res = validate_columns(df, "test_table", ["a", "b"])
    assert res.is_valid


def test_validate_columns_missing():
    df = pd.DataFrame({"a": [1, 2]})
    res = validate_columns(df, "test_table", ["a", "b", "c"])
    assert not res.is_valid
    assert len(res.errors) == 1
    assert "b" in res.errors[0].message
    assert "c" in res.errors[0].message


def test_validate_primary_key_unique():
    df = pd.DataFrame({
        "mod": ["A", "B", "C"],
        "pres": ["2013J", "2013J", "2013J"],
    })
    res = validate_primary_key(df, "test_table", ["mod", "pres"])
    assert res.is_valid


def test_validate_primary_key_duplicate():
    df = pd.DataFrame({
        "mod": ["A", "A"],
        "pres": ["2013J", "2013J"],
    })
    res = validate_primary_key(df, "test_table", ["mod", "pres"])
    assert not res.is_valid
    assert "duplicate" in res.errors[0].message.lower()


def test_validate_primary_key_nulls():
    df = pd.DataFrame({
        "id": [1, None],
        "val": ["x", "y"],
    })
    res = validate_primary_key(df, "test_table", ["id"])
    assert not res.is_valid
    assert "null" in res.errors[0].message.lower()


def test_validate_foreign_key_intact():
    parent = pd.DataFrame({"id": [1, 2, 3]})
    child = pd.DataFrame({"id": [1, 2]})
    res = validate_foreign_key(child, parent, "child", "parent", ["id"])
    assert res.is_valid


def test_validate_foreign_key_orphan():
    parent = pd.DataFrame({"id": [1, 2]})
    child = pd.DataFrame({"id": [1, 999]})  # 999 does not exist in parent
    res = validate_foreign_key(child, parent, "child", "parent", ["id"])
    assert not res.is_valid
    assert len(res.warnings) == 1
    assert "orphan" in res.warnings[0].message.lower()
