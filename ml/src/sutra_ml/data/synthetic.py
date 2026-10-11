"""
SUTRA Synthetic Dataset Generator.

Generates deterministic, schema-compliant synthetic student presentation records
for offline developer testing, demonstration scenarios, and negative validation.

IMPORTANT SAFEGUARDS:
1. Synthetic records are strictly labeled as synthetic (e.g. record_id='SYNTH-...').
2. Synthetic records must NEVER be represented as authentic students.
3. Model accuracy, precision, recall, or ROC-AUC must NEVER be evaluated or claimed
   using fabricated synthetic labels.
"""

from dataclasses import dataclass
import json
import math
from pathlib import Path
from typing import Any, Optional
import numpy as np
import pandas as pd

from app.schemas.features import (
    AgeBandEnum,
    DisabilityEnum,
    GenderEnum,
    HighestEducationEnum,
    ImdBandEnum,
    RegionEnum,
    StudentFeatureInput,
)

# Ordered 25 features expected by the SUTRA production model
ORDERED_NUMERICAL_FEATURES = [
    "num_of_prev_attempts",
    "studied_credits",
    "days_registered_before_start",
    "has_missing_registration_date",
    "vle_total_clicks_d30",
    "vle_active_days_d30",
    "vle_clicks_precourse",
    "vle_clicks_poststart_d30",
    "vle_clicks_last_7d",
    "vle_days_since_last_click",
    "vle_clicks_forumng_d30",
    "vle_clicks_oucontent_d30",
    "vle_clicks_quiz_d30",
    "vle_clicks_homepage_d30",
    "vle_clicks_other_d30",
    "has_vle_activity_d30",
    "assessments_submitted_d30",
    "assessment_banked_d30",
    "has_early_assessment_submission_d30",
]

ORDERED_CATEGORICAL_FEATURES = [
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
]

ALL_25_FEATURES = ORDERED_NUMERICAL_FEATURES + ORDERED_CATEGORICAL_FEATURES


class SyntheticDataGenerator:
    """
    Deterministic synthetic data generator using exact SUTRA production schema.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)

    def generate_record(
        self,
        record_id: str,
        code_module: str = "BBB",
        code_presentation: str = "2014J",
        archetype: str = "random",
    ) -> dict[str, Any]:
        """
        Generate a single plausible, schema-compliant synthetic student record.
        """
        if archetype == "high_engagement":
            vle_active_days = float(self.rng.integers(18, 29))
            vle_clicks_poststart = float(self.rng.integers(300, 950))
            vle_clicks_precourse = float(self.rng.integers(50, 180))
            vle_days_since_last = float(self.rng.integers(0, 3))
            vle_clicks_last_7d = float(self.rng.integers(60, 220))
            assessments_submitted = float(self.rng.integers(1, 3))
            has_early_sub = 1
            has_vle = 1
            credits = int(self.rng.choice([60, 90, 120]))
            prev_attempts = 0
            days_reg = float(-1 * self.rng.integers(30, 120))
        elif archetype == "low_engagement":
            has_vle = int(self.rng.choice([0, 1], p=[0.35, 0.65]))
            if has_vle == 0:
                vle_active_days = 0.0
                vle_clicks_poststart = 0.0
                vle_clicks_precourse = 0.0
                vle_days_since_last = 30.0
                vle_clicks_last_7d = 0.0
            else:
                vle_active_days = float(self.rng.integers(1, 4))
                vle_clicks_poststart = float(self.rng.integers(5, 35))
                vle_clicks_precourse = float(self.rng.integers(0, 15))
                vle_days_since_last = float(self.rng.integers(18, 30))
                vle_clicks_last_7d = float(self.rng.integers(0, 8))
            assessments_submitted = 0.0
            has_early_sub = 0
            credits = int(self.rng.choice([60, 120, 180]))
            prev_attempts = int(self.rng.integers(0, 3))
            days_reg = float(-1 * self.rng.integers(0, 25))
        elif archetype == "mixed_engagement":
            has_vle = 1
            vle_active_days = float(self.rng.integers(5, 12))
            vle_clicks_precourse = float(self.rng.integers(60, 140))
            vle_clicks_poststart = float(self.rng.integers(50, 150))
            vle_days_since_last = float(self.rng.integers(10, 20))
            vle_clicks_last_7d = float(self.rng.integers(0, 20))
            assessments_submitted = float(self.rng.choice([0.0, 1.0]))
            has_early_sub = int(assessments_submitted >= 1.0)
            credits = int(self.rng.choice([60, 120]))
            prev_attempts = int(self.rng.integers(0, 2))
            days_reg = float(-1 * self.rng.integers(15, 60))
        else:  # random plausible
            has_vle = int(self.rng.choice([1, 0], p=[0.88, 0.12]))
            if has_vle == 1:
                vle_active_days = float(self.rng.integers(1, 28))
                vle_clicks_poststart = float(self.rng.integers(10, 600))
                vle_clicks_precourse = float(self.rng.integers(0, 100))
                vle_days_since_last = float(self.rng.integers(0, 28))
                vle_clicks_last_7d = float(self.rng.integers(0, min(150, int(vle_clicks_poststart) + 1)))
            else:
                vle_active_days = 0.0
                vle_clicks_poststart = 0.0
                vle_clicks_precourse = 0.0
                vle_days_since_last = 30.0
                vle_clicks_last_7d = 0.0

            has_early_sub = int(self.rng.choice([0, 1], p=[0.45, 0.55]))
            assessments_submitted = float(self.rng.integers(1, 3)) if has_early_sub else 0.0
            credits = int(self.rng.choice([30, 60, 90, 120, 150, 180, 240]))
            prev_attempts = int(self.rng.choice([0, 1, 2, 3], p=[0.80, 0.12, 0.05, 0.03]))
            days_reg = float(-1 * self.rng.integers(0, 180))

        vle_total_clicks = vle_clicks_precourse + vle_clicks_poststart

        # Sub-activity breakdown
        if vle_total_clicks > 0:
            p_homepage = 0.25
            p_oucontent = 0.40
            p_forumng = 0.20
            p_quiz = 0.08
            p_other = 0.07
            c_home = round(vle_total_clicks * p_homepage, 1)
            c_ou = round(vle_total_clicks * p_oucontent, 1)
            c_forum = round(vle_total_clicks * p_forumng, 1)
            c_quiz = round(vle_total_clicks * p_quiz, 1)
            c_other = max(0.0, round(vle_total_clicks - (c_home + c_ou + c_forum + c_quiz), 1))
        else:
            c_home = c_ou = c_forum = c_quiz = c_other = 0.0

        # Sample valid categoricals
        gender = str(self.rng.choice([e.value for e in GenderEnum]))
        region = str(self.rng.choice([e.value for e in RegionEnum]))
        education = str(self.rng.choice([e.value for e in HighestEducationEnum]))
        imd = str(self.rng.choice([e.value for e in ImdBandEnum]))
        age = str(self.rng.choice([e.value for e in AgeBandEnum]))
        disability = str(self.rng.choice([e.value for e in DisabilityEnum]))

        record = {
            "record_id": record_id,
            "code_module": code_module,
            "code_presentation": code_presentation,
            "num_of_prev_attempts": int(prev_attempts),
            "studied_credits": int(credits),
            "days_registered_before_start": float(days_reg),
            "has_missing_registration_date": 0,
            "vle_total_clicks_d30": float(vle_total_clicks),
            "vle_active_days_d30": float(vle_active_days),
            "vle_clicks_precourse": float(vle_clicks_precourse),
            "vle_clicks_poststart_d30": float(vle_clicks_poststart),
            "vle_clicks_last_7d": float(vle_clicks_last_7d),
            "vle_days_since_last_click": float(vle_days_since_last),
            "vle_clicks_forumng_d30": float(c_forum),
            "vle_clicks_oucontent_d30": float(c_ou),
            "vle_clicks_quiz_d30": float(c_quiz),
            "vle_clicks_homepage_d30": float(c_home),
            "vle_clicks_other_d30": float(c_other),
            "has_vle_activity_d30": int(has_vle),
            "assessments_submitted_d30": float(assessments_submitted),
            "assessment_banked_d30": 0.0,
            "has_early_assessment_submission_d30": int(has_early_sub),
            "gender": gender,
            "region": region,
            "highest_education": education,
            "imd_band": imd,
            "age_band": age,
            "disability": disability,
        }

        # Validate with pydantic
        StudentFeatureInput(**record)
        return record

    def generate_batch(
        self,
        n: int = 100,
        prefix: str = "SYNTH-BATCH",
    ) -> list[dict[str, Any]]:
        """
        Generate n reproducible synthetic records for batch inference testing.
        """
        records = []
        modules = ["AAA", "BBB", "CCC", "DDD", "EEE", "FFF", "GGG"]
        for i in range(1, n + 1):
            rec_id = f"{prefix}-{i:03d}"
            mod = str(self.rng.choice(modules))
            rec = self.generate_record(
                record_id=rec_id,
                code_module=mod,
                code_presentation="2014J",
                archetype="random",
            )
            records.append(rec)
        return records

    def generate_named_scenarios(self) -> dict[str, dict[str, Any]]:
        """
        Generate a curated suite of named demonstration scenarios.
        """
        scenarios = {
            "HIGH_ENGAGEMENT_ON_TRACK": {
                "record_id": "SYNTH-SCENARIO-HIGH-01",
                "code_module": "BBB",
                "code_presentation": "2014J",
                "num_of_prev_attempts": 0,
                "studied_credits": 60,
                "days_registered_before_start": -45.0,
                "has_missing_registration_date": 0,
                "vle_total_clicks_d30": 650.0,
                "vle_active_days_d30": 24.0,
                "vle_clicks_precourse": 80.0,
                "vle_clicks_poststart_d30": 570.0,
                "vle_clicks_last_7d": 140.0,
                "vle_days_since_last_click": 0.0,
                "vle_clicks_forumng_d30": 130.0,
                "vle_clicks_oucontent_d30": 280.0,
                "vle_clicks_quiz_d30": 50.0,
                "vle_clicks_homepage_d30": 150.0,
                "vle_clicks_other_d30": 40.0,
                "has_vle_activity_d30": 1,
                "assessments_submitted_d30": 2.0,
                "assessment_banked_d30": 0.0,
                "has_early_assessment_submission_d30": 1,
                "gender": "F",
                "region": "South Region",
                "highest_education": "HE Qualification",
                "imd_band": "80-90%",
                "age_band": "0-35",
                "disability": "N",
                "description": "Consistently active learner with high LMS volume, continuous study, and early assessment submission.",
            },
            "LOW_ENGAGEMENT_AT_RISK": {
                "record_id": "SYNTH-SCENARIO-LOW-02",
                "code_module": "BBB",
                "code_presentation": "2014J",
                "num_of_prev_attempts": 1,
                "studied_credits": 120,
                "days_registered_before_start": -5.0,
                "has_missing_registration_date": 0,
                "vle_total_clicks_d30": 14.0,
                "vle_active_days_d30": 2.0,
                "vle_clicks_precourse": 0.0,
                "vle_clicks_poststart_d30": 14.0,
                "vle_clicks_last_7d": 0.0,
                "vle_days_since_last_click": 22.0,
                "vle_clicks_forumng_d30": 0.0,
                "vle_clicks_oucontent_d30": 5.0,
                "vle_clicks_quiz_d30": 0.0,
                "vle_clicks_homepage_d30": 9.0,
                "vle_clicks_other_d30": 0.0,
                "has_vle_activity_d30": 1,
                "assessments_submitted_d30": 0.0,
                "assessment_banked_d30": 0.0,
                "has_early_assessment_submission_d30": 0,
                "gender": "M",
                "region": "London Region",
                "highest_education": "Lower Than A Level",
                "imd_band": "10-20",
                "age_band": "0-35",
                "disability": "N",
                "description": "Minimal platform engagement: only 14 clicks, inactive for over 3 weeks, and no assessment submission.",
            },
            "MIXED_SIGNALS_MODERATE": {
                "record_id": "SYNTH-SCENARIO-MIXED-03",
                "code_module": "DDD",
                "code_presentation": "2014J",
                "num_of_prev_attempts": 0,
                "studied_credits": 60,
                "days_registered_before_start": -35.0,
                "has_missing_registration_date": 0,
                "vle_total_clicks_d30": 180.0,
                "vle_active_days_d30": 8.0,
                "vle_clicks_precourse": 90.0,
                "vle_clicks_poststart_d30": 90.0,
                "vle_clicks_last_7d": 10.0,
                "vle_days_since_last_click": 11.0,
                "vle_clicks_forumng_d30": 20.0,
                "vle_clicks_oucontent_d30": 70.0,
                "vle_clicks_quiz_d30": 10.0,
                "vle_clicks_homepage_d30": 60.0,
                "vle_clicks_other_d30": 20.0,
                "has_vle_activity_d30": 1,
                "assessments_submitted_d30": 1.0,
                "assessment_banked_d30": 0.0,
                "has_early_assessment_submission_d30": 1,
                "gender": "F",
                "region": "Scotland",
                "highest_education": "A Level or Equivalent",
                "imd_band": "40-50%",
                "age_band": "35-55",
                "disability": "N",
                "description": "High pre-course interest followed by moderate drop-off in post-start activity, with one early submission.",
            },
            "EDGE_CASE_ZERO_VALUES": {
                "record_id": "SYNTH-SCENARIO-ZERO-04",
                "code_module": "FFF",
                "code_presentation": "2014J",
                "num_of_prev_attempts": 0,
                "studied_credits": 30,
                "days_registered_before_start": 0.0,
                "has_missing_registration_date": 0,
                "vle_total_clicks_d30": 0.0,
                "vle_active_days_d30": 0.0,
                "vle_clicks_precourse": 0.0,
                "vle_clicks_poststart_d30": 0.0,
                "vle_clicks_last_7d": 0.0,
                "vle_days_since_last_click": 30.0,
                "vle_clicks_forumng_d30": 0.0,
                "vle_clicks_oucontent_d30": 0.0,
                "vle_clicks_quiz_d30": 0.0,
                "vle_clicks_homepage_d30": 0.0,
                "vle_clicks_other_d30": 0.0,
                "has_vle_activity_d30": 0,
                "assessments_submitted_d30": 0.0,
                "assessment_banked_d30": 0.0,
                "has_early_assessment_submission_d30": 0,
                "gender": "M",
                "region": "Wales",
                "highest_education": "No Formal quals",
                "imd_band": "0-10%",
                "age_band": "0-35",
                "disability": "Y",
                "description": "Valid extreme lower-bound: zero clicks, zero active days, registered on start day, zero submissions.",
            },
            "EDGE_CASE_MAX_VALUES": {
                "record_id": "SYNTH-SCENARIO-MAX-05",
                "code_module": "CCC",
                "code_presentation": "2014J",
                "num_of_prev_attempts": 4,
                "studied_credits": 240,
                "days_registered_before_start": -250.0,
                "has_missing_registration_date": 0,
                "vle_total_clicks_d30": 3200.0,
                "vle_active_days_d30": 30.0,
                "vle_clicks_precourse": 400.0,
                "vle_clicks_poststart_d30": 2800.0,
                "vle_clicks_last_7d": 800.0,
                "vle_days_since_last_click": 0.0,
                "vle_clicks_forumng_d30": 600.0,
                "vle_clicks_oucontent_d30": 1400.0,
                "vle_clicks_quiz_d30": 300.0,
                "vle_clicks_homepage_d30": 700.0,
                "vle_clicks_other_d30": 200.0,
                "has_vle_activity_d30": 1,
                "assessments_submitted_d30": 3.0,
                "assessment_banked_d30": 1.0,
                "has_early_assessment_submission_d30": 1,
                "gender": "F",
                "region": "South West Region",
                "highest_education": "Post Graduate Qualification",
                "imd_band": "90-100%",
                "age_band": "55<=",
                "disability": "N",
                "description": "Valid upper edge-of-range: heavy credit load, 3,200 clicks, daily platform logins, 4 prior attempts.",
            },
            "UNSEEN_MODULE_FALLBACK": {
                "record_id": "SYNTH-SCENARIO-UNSEEN-06",
                "code_module": "XXX",
                "code_presentation": "2015B",
                "num_of_prev_attempts": 0,
                "studied_credits": 60,
                "days_registered_before_start": -30.0,
                "has_missing_registration_date": 0,
                "vle_total_clicks_d30": 240.0,
                "vle_active_days_d30": 12.0,
                "vle_clicks_precourse": 30.0,
                "vle_clicks_poststart_d30": 210.0,
                "vle_clicks_last_7d": 50.0,
                "vle_days_since_last_click": 2.0,
                "vle_clicks_forumng_d30": 40.0,
                "vle_clicks_oucontent_d30": 110.0,
                "vle_clicks_quiz_d30": 20.0,
                "vle_clicks_homepage_d30": 55.0,
                "vle_clicks_other_d30": 15.0,
                "has_vle_activity_d30": 1,
                "assessments_submitted_d30": 1.0,
                "assessment_banked_d30": 0.0,
                "has_early_assessment_submission_d30": 1,
                "gender": "M",
                "region": "North Western Region",
                "highest_education": "A Level or Equivalent",
                "imd_band": "50-60%",
                "age_band": "0-35",
                "disability": "N",
                "description": "Valid record for an unmodeled module 'XXX' demonstrating pipeline handling of novel course codes.",
            },
        }

        # Validate each named scenario against StudentFeatureInput
        for name, data in scenarios.items():
            payload = {k: v for k, v in data.items() if k != "description"}
            StudentFeatureInput(**payload)

        return scenarios

    def generate_negative_cases(self) -> dict[str, dict[str, Any]]:
        """
        Generate invalid records to demonstrate schema validation rejections.
        """
        # Baseline valid record to mutate
        base = self.generate_named_scenarios()["MIXED_SIGNALS_MODERATE"].copy()
        base.pop("description", None)

        cases = {}

        # 1. Missing required numerical feature
        case1 = base.copy()
        case1["record_id"] = "NEG-MISSING-FEATURE"
        del case1["vle_total_clicks_d30"]
        cases["missing_required_feature"] = {
            "record": case1,
            "expected_error": "Field required: 'vle_total_clicks_d30'",
            "description": "Omits mandatory Day-30 cumulative click feature.",
        }

        # 2. Target leakage injection
        case2 = base.copy()
        case2["record_id"] = "NEG-TARGET-LEAKAGE"
        case2["target"] = 1
        case2["raw_final_result"] = "Fail"
        cases["forbidden_target_leakage"] = {
            "record": case2,
            "expected_error": "Extra inputs are not permitted ('target', 'raw_final_result')",
            "description": "Attempts to inject future academic outcomes forbidden at Day 30.",
        }

        # 3. Post-Day-30 assessment grade leakage
        case3 = base.copy()
        case3["record_id"] = "NEG-POST-D30-LEAKAGE"
        case3["assessment_score_d30"] = 85.0
        cases["forbidden_grade_leakage"] = {
            "record": case3,
            "expected_error": "Extra inputs are not permitted ('assessment_score_d30')",
            "description": "Attempts to supply assessment scores which are excluded due to grading latency.",
        }

        # 4. Malformed categorical value
        case4 = base.copy()
        case4["record_id"] = "NEG-MALFORMED-CATEGORICAL"
        case4["gender"] = "NON_BINARY_UNLISTED"
        case4["region"] = "Atlantis Region"
        cases["invalid_categorical_level"] = {
            "record": case4,
            "expected_error": "Input should be 'M' or 'F' and valid RegionEnum value",
            "description": "Supplies non-whitelisted categorical enum entries.",
        }

        # 5. Non-finite float (NaN)
        case5 = base.copy()
        case5["record_id"] = "NEG-NON-FINITE-NAN"
        case5["vle_active_days_d30"] = float("nan")
        cases["non_finite_numeric_nan"] = {
            "record": case5,
            "expected_error": "Numeric feature values must be finite (cannot be NaN or Inf)",
            "description": "Supplies NaN value for numeric active days.",
        }

        # 6. Non-finite float (Infinity)
        case6 = base.copy()
        case6["record_id"] = "NEG-NON-FINITE-INF"
        case6["studied_credits"] = float("inf")
        cases["non_finite_numeric_inf"] = {
            "record": case6,
            "expected_error": "Numeric feature values must be finite (cannot be NaN or Inf)",
            "description": "Supplies positive infinity for studied credits.",
        }

        # 7. Out-of-bounds negative count
        case7 = base.copy()
        case7["record_id"] = "NEG-OUT-OF-BOUNDS-NEGATIVE"
        case7["num_of_prev_attempts"] = -3
        cases["negative_numeric_constraint"] = {
            "record": case7,
            "expected_error": "Input should be greater than or equal to 0",
            "description": "Supplies invalid negative count for previous attempts.",
        }

        return cases
