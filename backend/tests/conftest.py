"""
Pytest configuration and test fixtures for SUTRA inference backend.
"""

from typing import Any, Generator
from fastapi.testclient import TestClient
import pandas as pd
import pytest

from backend.app.core.config import PROJECT_ROOT
from backend.app.main import create_app


@pytest.fixture(scope="session")
def valid_student_record() -> dict[str, Any]:
    """A realistic, synthetic valid student record for Day-30 inference."""
    return {
        "num_of_prev_attempts": 0,
        "studied_credits": 60,
        "days_registered_before_start": -30.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 180.0,
        "vle_active_days_d30": 15.0,
        "vle_clicks_precourse": 25.0,
        "vle_clicks_poststart_d30": 155.0,
        "vle_clicks_last_7d": 40.0,
        "vle_days_since_last_click": 1.0,
        "vle_clicks_forumng_d30": 30.0,
        "vle_clicks_oucontent_d30": 75.0,
        "vle_clicks_quiz_d30": 15.0,
        "vle_clicks_homepage_d30": 35.0,
        "vle_clicks_other_d30": 5.0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 1.0,
        "assessment_banked_d30": 0.0,
        "has_early_assessment_submission_d30": 1,
        "gender": "F",
        "region": "London Region",
        "highest_education": "A Level or Equivalent",
        "imd_band": "40-50%",
        "age_band": "0-35",
        "disability": "N",
        "record_id": "SYNTH-001",
        "code_module": "BBB",
        "code_presentation": "2014J",
    }


@pytest.fixture(scope="session")
def elevated_risk_student_record() -> dict[str, Any]:
    """A valid student record with behavioral signals indicating elevated risk."""
    return {
        "num_of_prev_attempts": 2,
        "studied_credits": 120,
        "days_registered_before_start": -2.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 10.0,
        "vle_active_days_d30": 2.0,
        "vle_clicks_precourse": 0.0,
        "vle_clicks_poststart_d30": 10.0,
        "vle_clicks_last_7d": 0.0,
        "vle_days_since_last_click": 21.0,
        "vle_clicks_forumng_d30": 0.0,
        "vle_clicks_oucontent_d30": 5.0,
        "vle_clicks_quiz_d30": 0.0,
        "vle_clicks_homepage_d30": 5.0,
        "vle_clicks_other_d30": 0.0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 0.0,
        "assessment_banked_d30": 0.0,
        "has_early_assessment_submission_d30": 0,
        "gender": "M",
        "region": "North Western Region",
        "highest_education": "Lower Than A Level",
        "imd_band": "0-10%",
        "age_band": "0-35",
        "disability": "N",
        "record_id": "SYNTH-AT-RISK-002",
        "code_module": "FFF",
        "code_presentation": "2014J",
    }


@pytest.fixture(scope="session")
def authentic_held_out_record() -> dict[str, Any]:
    """
    Extract one de-identified feature row from the 2014J held-out test dataset.
    Strictly strips target, unregistration date, and student IDs.
    """
    processed_path = PROJECT_ROOT / "ml" / "data" / "processed" / "day30_features.csv"
    if not processed_path.exists():
        pytest.skip("Processed dataset day30_features.csv not found.")

    df = pd.read_csv(processed_path)
    test_rows = df[df["code_presentation"] == "2014J"]
    if test_rows.empty:
        pytest.skip("No 2014J rows found in day30_features.csv.")

    row = test_rows.iloc[0].to_dict()

    # Extract strictly the 25 allowed features and safe metadata
    safe_record = {
        "num_of_prev_attempts": int(row["num_of_prev_attempts"]),
        "studied_credits": int(row["studied_credits"]),
        "days_registered_before_start": float(row["days_registered_before_start"]),
        "has_missing_registration_date": int(row["has_missing_registration_date"]),
        "vle_total_clicks_d30": float(row["vle_total_clicks_d30"]),
        "vle_active_days_d30": float(row["vle_active_days_d30"]),
        "vle_clicks_precourse": float(row["vle_clicks_precourse"]),
        "vle_clicks_poststart_d30": float(row["vle_clicks_poststart_d30"]),
        "vle_clicks_last_7d": float(row["vle_clicks_last_7d"]),
        "vle_days_since_last_click": float(row["vle_days_since_last_click"]),
        "vle_clicks_forumng_d30": float(row["vle_clicks_forumng_d30"]),
        "vle_clicks_oucontent_d30": float(row["vle_clicks_oucontent_d30"]),
        "vle_clicks_quiz_d30": float(row["vle_clicks_quiz_d30"]),
        "vle_clicks_homepage_d30": float(row["vle_clicks_homepage_d30"]),
        "vle_clicks_other_d30": float(row["vle_clicks_other_d30"]),
        "has_vle_activity_d30": int(row["has_vle_activity_d30"]),
        "assessments_submitted_d30": float(row["assessments_submitted_d30"]),
        "assessment_banked_d30": float(row["assessment_banked_d30"]),
        "has_early_assessment_submission_d30": int(row["has_early_assessment_submission_d30"]),
        "gender": str(row["gender"]),
        "region": str(row["region"]),
        "highest_education": str(row["highest_education"]),
        "imd_band": str(row["imd_band"]),
        "age_band": str(row["age_band"]),
        "disability": str(row["disability"]),
        "record_id": "DEID-2014J-HOLD-001",
        "code_module": str(row["code_module"]),
        "code_presentation": str(row["code_presentation"]),
    }
    return safe_record


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Test client running with application lifespan per test function."""
    fresh_app = create_app()
    with TestClient(fresh_app) as test_client:
        yield test_client
