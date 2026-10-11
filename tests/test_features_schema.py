import math
import pytest
from pydantic import ValidationError

from app.schemas.features import (
    StudentFeatureInput,
    GenderEnum,
    RegionEnum,
    HighestEducationEnum,
    ImdBandEnum,
    AgeBandEnum,
    DisabilityEnum,
    NUMERICAL_FEATURE_KEYS,
)


def get_valid_payload():
    return {
        "num_of_prev_attempts": 0,
        "studied_credits": 60,
        "days_registered_before_start": -30.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 150.0,
        "vle_active_days_d30": 12.0,
        "vle_clicks_precourse": 20.0,
        "vle_clicks_poststart_d30": 130.0,
        "vle_clicks_last_7d": 40.0,
        "vle_days_since_last_click": 2.0,
        "vle_clicks_forumng_d30": 15.0,
        "vle_clicks_oucontent_d30": 80.0,
        "vle_clicks_quiz_d30": 10.0,
        "vle_clicks_homepage_d30": 20.0,
        "vle_clicks_other_d30": 5.0,
        "has_vle_activity_d30": 1,
        "assessments_submitted_d30": 1.0,
        "assessment_banked_d30": 0.0,
        "has_early_assessment_submission_d30": 1,
        "gender": GenderEnum.M,
        "region": RegionEnum.LONDON,
        "highest_education": HighestEducationEnum.A_LEVEL,
        "imd_band": ImdBandEnum.BAND_20_30,
        "age_band": AgeBandEnum.BAND_0_35,
        "disability": DisabilityEnum.N,
    }


def test_student_feature_input_valid():
    payload = get_valid_payload()
    model = StudentFeatureInput(**payload)
    feature_dict = model.to_feature_dict()
    assert len(feature_dict) == 25
    assert feature_dict["gender"] == "M"
    assert feature_dict["region"] == "London Region"
    assert feature_dict["num_of_prev_attempts"] == 0


def test_student_feature_input_extra_forbid():
    payload = get_valid_payload()
    payload["extra_leaked_target"] = 1.0
    with pytest.raises(ValidationError):
        StudentFeatureInput(**payload)


def test_student_feature_input_nan_rejected():
    payload = get_valid_payload()
    payload["vle_total_clicks_d30"] = float("nan")
    with pytest.raises(ValidationError):
        StudentFeatureInput(**payload)


def test_numerical_feature_keys_count():
    assert len(NUMERICAL_FEATURE_KEYS) == 19
