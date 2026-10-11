"""
Data loading utilities for SUTRA ML.

Provides memory-safe CSV loaders and streaming chunk iterators for large tables
(e.g., studentVle.csv).
"""

from collections.abc import Generator
from pathlib import Path
from typing import Any, Optional

import pandas as pd


def count_lines_fast(filepath: Path) -> int:
    """
    Count the number of non-empty lines in a file rapidly using binary chunk streaming.
    Returns total data rows (excluding header line).
    """
    if not filepath.is_file():
        raise FileNotFoundError(f"File not found: {filepath}")

    lines = 0
    with open(filepath, "rb") as f:
        buf_size = 1024 * 1024
        buf = f.read(buf_size)
        while buf:
            lines += buf.count(b"\n")
            buf = f.read(buf_size)

    # Exclude header line if file has lines
    return max(0, lines - 1)


def load_csv(
    filepath: Path,
    dtype: Optional[dict[str, Any]] = None,
    nrows: Optional[int] = None,
    usecols: Optional[list[str]] = None,
    na_values: Optional[list[str]] = None,
) -> pd.DataFrame:
    """
    Load a CSV file with error handling and parameterization.
    """
    if not filepath.is_file():
        raise FileNotFoundError(f"Requested dataset file does not exist: {filepath}")

    default_na = ["", "NA", "null", "NULL", "\\N", "NaN"]
    combined_na = list(set(default_na + (na_values or [])))

    try:
        df = pd.read_csv(
            filepath,
            dtype=dtype,
            nrows=nrows,
            usecols=usecols,
            na_values=combined_na,
            keep_default_na=True,
            low_memory=False,
        )
        return df
    except Exception as e:
        raise IOError(f"Failed to load CSV at {filepath}: {e}") from e


def iter_csv_chunks(
    filepath: Path,
    chunksize: int = 200_000,
    dtype: Optional[dict[str, Any]] = None,
    usecols: Optional[list[str]] = None,
) -> Generator[pd.DataFrame, None, None]:
    """
    Stream chunks from large CSV files (e.g. studentVle.csv) to prevent memory exhaustion.
    """
    if not filepath.is_file():
        raise FileNotFoundError(f"File not found for chunk streaming: {filepath}")

    default_na = ["", "NA", "null", "NULL", "\\N", "NaN"]
    reader = pd.read_csv(
        filepath,
        chunksize=chunksize,
        dtype=dtype,
        usecols=usecols,
        na_values=default_na,
        keep_default_na=True,
        low_memory=False,
    )
    for chunk in reader:
        yield chunk


def load_table(
    table_filename: str,
    raw_dir: Path,
    nrows: Optional[int] = None,
) -> pd.DataFrame:
    """
    Convenience loader to fetch a specific table from raw directory.
    """
    target = raw_dir / table_filename
    return load_csv(target, nrows=nrows)
