"""
Schema and relational integrity validation for SUTRA ML datasets.
"""

from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import pandas as pd


class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


@dataclass
class ValidationIssue:
    severity: Severity
    table: str
    check_name: str
    message: str
    details: Optional[dict[str, Any]] = None


@dataclass
class ValidationResult:
    is_valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    @property
    def errors(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.ERROR]

    @property
    def warnings(self) -> list[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.WARNING]


def validate_table_presence(data_dir: Path, expected_tables: list[str]) -> ValidationResult:
    """Verify that all expected CSV table files exist in the target directory."""
    result = ValidationResult(is_valid=True)
    for table_name in expected_tables:
        table_path = data_dir / table_name
        if not table_path.is_file():
            result.is_valid = False
            result.issues.append(
                ValidationIssue(
                    severity=Severity.ERROR,
                    table=table_name,
                    check_name="file_presence",
                    message=f"Required table file '{table_name}' was not found in {data_dir}",
                )
            )
    return result


def validate_columns(
    df: pd.DataFrame, table_name: str, required_columns: list[str]
) -> ValidationResult:
    """Verify that all required columns are present in the table."""
    result = ValidationResult(is_valid=True)
    present_cols = set(df.columns)
    missing = [c for c in required_columns if c not in present_cols]
    if missing:
        result.is_valid = False
        result.issues.append(
            ValidationIssue(
                severity=Severity.ERROR,
                table=table_name,
                check_name="required_columns",
                message=f"Table '{table_name}' is missing required columns: {missing}",
                details={"missing_columns": missing, "present_columns": list(df.columns)},
            )
        )
    return result


def validate_primary_key(
    df: pd.DataFrame, table_name: str, key_columns: list[str]
) -> ValidationResult:
    """Verify that the designated primary key columns uniquely identify rows."""
    result = ValidationResult(is_valid=True)
    for col in key_columns:
        if col not in df.columns:
            result.is_valid = False
            result.issues.append(
                ValidationIssue(
                    severity=Severity.ERROR,
                    table=table_name,
                    check_name="primary_key_presence",
                    message=f"Key column '{col}' missing from table '{table_name}'",
                )
            )
            return result

    # Check for nulls in primary key
    null_counts = df[key_columns].isnull().sum().to_dict()
    has_nulls = any(cnt > 0 for cnt in null_counts.values())
    if has_nulls:
        result.is_valid = False
        result.issues.append(
            ValidationIssue(
                severity=Severity.ERROR,
                table=table_name,
                check_name="primary_key_nulls",
                message=f"Primary key columns contain null values in '{table_name}'",
                details={"null_counts": null_counts},
            )
        )

    # Check duplicate combinations
    duplicates_count = df.duplicated(subset=key_columns).sum()
    if duplicates_count > 0:
        result.is_valid = False
        result.issues.append(
            ValidationIssue(
                severity=Severity.ERROR,
                table=table_name,
                check_name="primary_key_uniqueness",
                message=(
                    f"Found {duplicates_count} duplicate primary key entries in '{table_name}' "
                    f"for key combination {key_columns}"
                ),
                details={"duplicates_count": int(duplicates_count), "key_columns": key_columns},
            )
        )

    return result


def validate_foreign_key(
    child_df: pd.DataFrame,
    parent_df: pd.DataFrame,
    child_table: str,
    parent_table: str,
    key_columns: list[str],
) -> ValidationResult:
    """Verify that foreign key values in the child table exist in the parent table."""
    result = ValidationResult(is_valid=True)

    # Drop nulls in foreign key (optional foreign keys are valid, e.g. unregistration)
    child_clean = child_df.dropna(subset=key_columns)
    if child_clean.empty:
        return result

    child_keys = set(tuple(x) for x in child_clean[key_columns].to_numpy())
    parent_keys = set(tuple(x) for x in parent_df[key_columns].to_numpy())

    orphans = child_keys - parent_keys
    if orphans:
        result.is_valid = False
        orphan_sample = list(orphans)[:5]
        result.issues.append(
            ValidationIssue(
                severity=Severity.WARNING,
                table=child_table,
                check_name="foreign_key_integrity",
                message=(
                    f"Found {len(orphans)} orphan key combination(s) in '{child_table}' "
                    f"referencing '{parent_table}' on {key_columns}"
                ),
                details={"orphan_count": len(orphans), "sample_orphans": [str(o) for o in orphan_sample]},
            )
        )

    return result
