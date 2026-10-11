# SUTRA Phase Sixteen — Interactive ML Testing Playground Guide

**Status:** Operational & Documented  
**Role:** Senior ML Engineer (Inference Testing & Explainable ML)  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Active Production Model:** Regularized Logistic Regression Baseline (`v1.0.0`) at threshold `0.46`

---

## 1. Overview & Objectives

Phase Sixteen provides developers and reviewers with an observable, transparent, and easy-to-use testing environment for the SUTRA early-warning ML inference engine. Rather than relying on opaque background scripts, developers can now:
1. Manually test individual student profiles and see real model predictions and explainable evidence cards.
2. Select curated demonstration scenarios illustrating high engagement, low engagement, mixed signals, edge cases, and unseen modules.
3. Batch-test synthetic student records and inspect summary distributions and latency statistics.
4. Verify fail-closed schema validation on negative/malformed inputs.
5. Evaluate frozen production models on approved labeled historical datasets with explicit separation of threshold-dependent and threshold-independent metrics.

---

## 2. Active Model Identification & Governance Guardrails

The inference engine strictly serves the approved production baseline:
- **Algorithm:** Regularized Logistic Regression (L2 penalty, `class_weight='balanced'`)
- **Artifact File:** `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`
- **Artifact SHA-256:** `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`
- **File Size:** 7,105 bytes
- **Serving Threshold:** `0.46` (P(At-Risk) $\ge 0.46 \implies$ Review Recommended)
- **Candidate Candidate Isolation:** The Phase Nine module-relative candidate (`experimental_module_relative_lr.joblib`) remains quarantined in shadow mode with execution gate closed (`candidate_provenance_verified = False`).

---

## 3. Input & Output Contract (25 Features)

### 3.1 Input Contract (`StudentFeatureInput`)
The model requires exactly 25 observable student engagement features observable on or before Day 30 (`t <= 30`). Extraneous fields (such as target labels, final grades, or post-Day-30 metrics) are strictly forbidden (`extra="forbid"`).

#### 19 Numerical Features (All require finite values, `ge=0.0` except registration lead time):
1. `num_of_prev_attempts` (int $\ge 0$): Count of prior attempts in this module.
2. `studied_credits` (int $\ge 0$): Total academic credit load.
3. `days_registered_before_start` (float, finite): Days enrolled relative to Day 0 (negative indicates registration before start).
4. `has_missing_registration_date` (int $\in \{0, 1\}$): Binary flag for missing registration timestamp.
5. `vle_total_clicks_d30` (float $\ge 0.0$): Cumulative LMS clicks up to Day 30.
6. `vle_active_days_d30` (float $\ge 0.0$): Distinct days with logged LMS access up to Day 30.
7. `vle_clicks_precourse` (float $\ge 0.0$): Clicks recorded before Day 0.
8. `vle_clicks_poststart_d30` (float $\ge 0.0$): Clicks recorded between Day 0 and Day 30.
9. `vle_clicks_last_7d` (float $\ge 0.0$): Clicks in the 7 days prior to Day 30 (study velocity).
10. `vle_days_since_last_click` (float $\ge 0.0$): Days elapsed since last recorded LMS interaction.
11. `vle_clicks_forumng_d30` (float $\ge 0.0$): Discussion forum clicks.
12. `vle_clicks_oucontent_d30` (float $\ge 0.0$): Core course material reading clicks.
13. `vle_clicks_quiz_d30` (float $\ge 0.0$): Formative quiz interactions.
14. `vle_clicks_homepage_d30` (float $\ge 0.0$): Course homepage visits.
15. `vle_clicks_other_d30` (float $\ge 0.0$): Supplementary resource clicks.
16. `has_vle_activity_d30` (int $\in \{0, 1\}$): Binary flag indicating any LMS clicks by Day 30.
17. `assessments_submitted_d30` (float $\ge 0.0$): Count of assessments submitted by Day 30 (marks excluded).
18. `assessment_banked_d30` (float $\ge 0.0$): Transferred/banked assessment count.
19. `has_early_assessment_submission_d30` (int $\in \{0, 1\}$): Binary flag for submission by Day 30.

#### 6 Categorical Features (Strict Enum Whitelist):
1. `gender`: `"F"`, `"M"`
2. `region`: 13 administrative regions (e.g. `"South Region"`, `"London Region"`, `"Scotland"`)
3. `highest_education`: `"A Level or Equivalent"`, `"HE Qualification"`, `"Lower Than A Level"`, `"No Formal quals"`, `"Post Graduate Qualification"`
4. `imd_band`: Decile bands `"0-10%"`, `"10-20"`, ..., `"90-100%"`, `"Unknown"`
5. `age_band`: `"0-35"`, `"35-55"`, `"55<="`
6. `disability`: `"N"`, `"Y"`

#### Optional Non-Feature Identifiers:
- `record_id`: De-identified string (e.g. `"SYNTH-001"`)
- `code_module`: Module code (e.g. `"BBB"`)
- `code_presentation`: Semester code (e.g. `"2014J"`)

---

## 4. Manual Prediction via Swagger UI (`/docs`)

If the local FastAPI server is running, the developer can inspect and test the API directly in a web browser.

### 4.1 Starting the API
```bash
PYTHONPATH=ml/src:. python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Open `http://127.0.0.1:8000/docs` in your browser.

### 4.2 Endpoint: `POST /predict`
Submit a single JSON record:
```json
{
  "record_id": "TEST-STUDENT-01",
  "code_module": "BBB",
  "code_presentation": "2014J",
  "num_of_prev_attempts": 0,
  "studied_credits": 60,
  "days_registered_before_start": -35.0,
  "has_missing_registration_date": 0,
  "vle_total_clicks_d30": 340.0,
  "vle_active_days_d30": 16.0,
  "vle_clicks_precourse": 50.0,
  "vle_clicks_poststart_d30": 290.0,
  "vle_clicks_last_7d": 80.0,
  "vle_days_since_last_click": 1.0,
  "vle_clicks_forumng_d30": 70.0,
  "vle_clicks_oucontent_d30": 140.0,
  "vle_clicks_quiz_d30": 30.0,
  "vle_clicks_homepage_d30": 80.0,
  "vle_clicks_other_d30": 20.0,
  "has_vle_activity_d30": 1,
  "assessments_submitted_d30": 1.0,
  "assessment_banked_d30": 0.0,
  "has_early_assessment_submission_d30": 1,
  "gender": "F",
  "region": "South Region",
  "highest_education": "HE Qualification",
  "imd_band": "70-80%",
  "age_band": "0-35",
  "disability": "N"
}
```

### 4.3 Expected API Response (`PredictResponse`)
```json
{
  "record_id": "TEST-STUDENT-01",
  "risk_probability": 0.1654,
  "review_recommended": false,
  "risk_tier": "LOW",
  "operational_threshold": 0.46,
  "model_name": "Regularized Logistic Regression Baseline",
  "model_version": "v1.0.0",
  "evidence_card": {
    "record_id": "TEST-STUDENT-01",
    "course_context": {
      "module_code": "BBB",
      "presentation_code": "2014J",
      "snapshot_day": 30
    },
    "risk_probability": 0.1654,
    "risk_tier": "LOW",
    "operational_threshold": 0.46,
    "alert_triggered": false,
    "top_risk_drivers": [...],
    "top_protective_factors": [...],
    "governance_notices": {
      "non_causal_disclaimer": "Empirical risk estimate based on historical patterns. Does NOT represent causation or a diagnostic assessment of ability.",
      "data_boundary_caveat": "Assessment marks are excluded due to grading latency. Evidence reflects only observable submissions and activity up to Day 30.",
      "human_in_the_loop_mandate": "No Alert Without Action: Requires verified review by an assigned academic advisor before any support case or outreach is confirmed."
    }
  }
}
```

---

## 5. Interactive Terminal Playground (`run_playground.py`)

For rapid local testing without a browser or HTTP server, SUTRA provides an interactive rich-text CLI runner.

### 5.1 Interactive Menu Mode
Launch the interactive terminal menu:
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py
```
This presents an interactive menu to run any of the demonstration scenarios, view full feature vectors, run the 100-record synthetic batch, or test negative validation cases.

### 5.2 Direct Command-Line Execution
Run specific workflows directly:

1. **Test High-Engagement Scenario:**
   ```bash
   PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --scenario HIGH_ENGAGEMENT_ON_TRACK
   ```

2. **Test Low-Engagement At-Risk Scenario:**
   ```bash
   PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --scenario LOW_ENGAGEMENT_AT_RISK
   ```

3. **Inspect All 25 Input Features:**
   ```bash
   PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --scenario MIXED_SIGNALS_MODERATE --show-features
   ```

4. **Run 100-Record Synthetic Batch & Export Results:**
   ```bash
   PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --batch-synthetic --export ml/reports/playground_results.json
   ```

5. **Run Negative Schema Validation Suite:**
   ```bash
   PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --negative-tests
   ```

6. **Score a Custom Input Record or JSON File:**
   ```bash
   PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --input path/to/record.json --export ml/reports/custom_result.json
   ```

---

## 6. Real Labeled Data Evaluation (`run_evaluate_labeled_data.py`)

To evaluate the production model on approved historical cohorts with verified ground truth:

### 6.1 Command
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_evaluate_labeled_data.py \
    --data-path ml/data/processed/day30_features.csv \
    --presentation 2014J \
    --threshold 0.46 \
    --output-json ml/reports/metrics/evaluation_labeled_run.json
```

### 6.2 Output Structure
- **Threshold-Independent Metrics:** ROC-AUC, PR-AUC, Brier Score, Expected Calibration Error (ECE, 10 bins), Maximum Calibration Error (MCE).
- **Threshold-Dependent Metrics (at 0.46):** Recall (safety), Precision, Specificity, F1, Balanced Accuracy, Alert Rate %, Confusion Matrix (TP, FP, TN, FN).
- **Historical Partition Caveat:** If evaluated on `2014J`, the pipeline automatically issues a mandatory governance warning reminding the reviewer that `2014J` is previously inspected development evidence, not an untouched prospective test set.

---

## 7. Automated Test Suite

To verify that the playground, synthetic generator, schema validation, and safeguards function properly:
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests/unit/test_phase_sixteen_playground.py
```
To run the complete system test suite:
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```
All 131 tests pass cleanly in under 1 second.
