"""
Pytest configuration and shared fixtures for SUTRA ML test suite.
"""

from pathlib import Path
import pytest
import yaml

TESTS_DIR = Path(__file__).resolve().parent
ML_DIR = TESTS_DIR.parent
SAMPLE_DIR = ML_DIR / "data" / "sample"
CONFIG_PATH = ML_DIR / "configs" / "data.yaml"


@pytest.fixture
def sample_data_dir() -> Path:
    """Returns path to offline test fixtures directory."""
    assert SAMPLE_DIR.is_dir(), f"Sample directory missing: {SAMPLE_DIR}"
    return SAMPLE_DIR


@pytest.fixture
def sample_config(sample_data_dir: Path) -> dict:
    """Returns sample configuration dictionary for testing."""
    with open(CONFIG_PATH) as f:
        cfg = yaml.safe_load(f)
    # Redirect paths to sample fixtures
    cfg["paths"]["raw_dir"] = str(sample_data_dir)
    return cfg
