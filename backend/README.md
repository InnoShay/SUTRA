# SUTRA ML Inference API — Backend Service

**Service:** `sutra-ml-backend`  
**Version:** `1.0.0`  
**Framework:** FastAPI 0.115+ / Uvicorn / Pydantic v2  
**Selected Model:** Regularized Logistic Regression Baseline (`ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`)  
**Operational Review Threshold:** `0.46` (targeted for $\ge 70\%$ recall on vulnerable students)

---

## 1. Overview & Architectural Boundaries

The SUTRA backend provides real-time model inference and explainable Evidence Card generation for academic risk monitoring. 

### What this service does:
1. Loads the pre-trained, validated scikit-learn pipeline and its metadata once at application startup.
2. Validates incoming student requests strictly against the **25-feature Day-30 contract**.
3. Decomposes model output using exact linear log-odds attribution into top risk drivers and top protective factors.
4. Generates a structured, human-interpretable **SUTRA Evidence Card** for academic advisor review.

### Human Review & Safety Boundaries:
- **A probability is not a verdict:** An alert (`review_recommended: true`) indicates only that a student case warrants proactive human review.
- **No autonomous interventions:** The API does not assign staff, message students, create disciplinary actions, or alter enrollment records.
- **Purely stateless & idempotent:** Calling `/predict` does not create database alerts or trigger duplicate tickets.
- **Score exclusion:** Predictors strictly exclude assessment marks due to grading latency.

---

## 2. The 25-Feature Input Contract (Day-30 Cutoff)

The model expects **engineered Day-30 features**, representing observable platform presence and demographic context observable on or before Day 30 relative to course start. Extraneous attributes, target outcomes, or post-Day-30 data are forbidden and rejected with HTTP `422`.

### 2.1 Numerical Predictors (19 Features)

All numerical values must be finite (no `NaN`, `Inf`, or non-numeric types).

| Field Name | Type | Range / Constraints | Description |
| :--- | :--- | :--- | :--- |
| `num_of_prev_attempts` | `int` | $\ge 0$ | Count of previous attempts at this module |
| `studied_credits` | `int` | $\ge 0$ | Total academic credits currently studied |
| `days_registered_before_start` | `float` | Finite float | Registration lead time (negative = registered prior to Day 0) |
| `has_missing_registration_date` | `int` | `0` or `1` | Binary flag: 1 if registration timestamp was absent |
| `vle_total_clicks_d30` | `float` | $\ge 0.0$ | Cumulative VLE interaction clicks up to Day 30 |
| `vle_active_days_d30` | `float` | $\ge 0.0$ | Distinct calendar days with logged activity up to Day 30 |
| `vle_clicks_precourse` | `float` | $\ge 0.0$ | Pre-course orientation clicks ($date < 0$) |
| `vle_clicks_poststart_d30` | `float` | $\ge 0.0$ | Post-start course engagement clicks ($0 \le date \le 30$) |
| `vle_clicks_last_7d` | `float` | $\ge 0.0$ | Activity velocity: clicks in the 7 days prior to Day 30 ($24 \le date \le 30$) |
| `vle_days_since_last_click` | `float` | $\ge 0.0$ | Days elapsed since most recent platform click as of Day 30 |
| `vle_clicks_forumng_d30` | `float` | $\ge 0.0$ | Discussion forum resource clicks up to Day 30 |
| `vle_clicks_oucontent_d30` | `float` | $\ge 0.0$ | Core course content reading clicks up to Day 30 |
| `vle_clicks_quiz_d30` | `float` | $\ge 0.0$ | Formative/practice quiz clicks up to Day 30 |
| `vle_clicks_homepage_d30` | `float` | $\ge 0.0$ | Module homepage visits up to Day 30 |
| `vle_clicks_other_d30` | `float` | $\ge 0.0$ | Supplementary study resource clicks up to Day 30 |
| `has_vle_activity_d30` | `int` | `0` or `1` | Binary flag: 1 if student had any VLE interactions by Day 30 |
| `assessments_submitted_d30` | `float` | $\ge 0.0$ | Count of early assessment submissions by Day 30 (marks excluded) |
| `assessment_banked_d30` | `float` | $\ge 0.0$ | Count of banked/transferred prior assessment submissions |
| `has_early_assessment_submission_d30` | `int` | `0` or `1` | Binary flag: 1 if $\ge 1$ assessment was submitted by Day 30 |

### 2.2 Categorical Predictors (6 Features)

Validated strictly against institutional categories:

| Field Name | Type | Allowed Values |
| :--- | :--- | :--- |
| `gender` | `string` | `"F"`, `"M"` |
| `region` | `string` | `"East Anglian Region"`, `"East Midlands Region"`, `"Ireland"`, `"London Region"`, `"North Region"`, `"North Western Region"`, `"Scotland"`, `"South East Region"`, `"South Region"`, `"South West Region"`, `"Wales"`, `"West Midlands Region"`, `"Yorkshire Region"` |
| `highest_education` | `string` | `"A Level or Equivalent"`, `"HE Qualification"`, `"Lower Than A Level"`, `"No Formal quals"`, `"Post Graduate Qualification"` |
| `imd_band` | `string` | `"0-10%"`, `"10-20"`, `"20-30%"`, `"30-40%"`, `"40-50%"`, `"50-60%"`, `"60-70%"`, `"70-80%"`, `"80-90%"`, `"90-100%"`, `"Unknown"` |
| `age_band` | `string` | `"0-35"`, `"35-55"`, `"55<="` |
| `disability` | `string` | `"N"`, `"Y"` |

### 2.3 Optional Context Attributes
- `record_id`: Optional de-identified string (e.g. `"ANON-001"`).
- `code_module`: Optional module code (e.g. `"BBB"`).
- `code_presentation`: Optional semester code (e.g. `"2014J"`).

---

## 3. Setup and Local Execution

### 3.1 Start the API Server

```bash
PYTHONPATH=ml/src:. python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3.2 Interactive API Documentation
- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### 3.3 Running Tests

Execute both the ML and backend test suites (62 tests):
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```

---

## 4. API Endpoints & Example Curl Requests

### 4.1 Process Health Check (`GET /health`)

```bash
curl -s http://127.0.0.1:8000/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-12T00:35:17.898248+00:00",
  "service": "sutra-ml-backend",
  "version": "1.0.0"
}
```

---

### 4.2 Model Readiness Check (`GET /ready`)

```bash
curl -s http://127.0.0.1:8000/ready
```

**Response:**
```json
{
  "status": "ready",
  "model_loaded": true,
  "model_name": "Regularized Logistic Regression Baseline",
  "model_version": "v1.0.0",
  "operational_threshold": 0.46,
  "feature_count": 25
}
```

---

### 4.3 Model Governance & Feature Info (`GET /model-info`)

```bash
curl -s http://127.0.0.1:8000/model-info
```

---

### 4.4 Single Student Prediction (`POST /predict`)

```bash
curl -s -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
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
    "code_presentation": "2014J"
  }'
```

**Response:**
```json
{
  "record_id": "SYNTH-001",
  "risk_probability": 0.2803,
  "review_recommended": false,
  "risk_tier": "LOW",
  "operational_threshold": 0.46,
  "model_name": "Regularized Logistic Regression Baseline",
  "model_version": "v1.0.0",
  "evidence_card": {
    "record_id": "SYNTH-001",
    "course_context": {
      "module_code": "BBB",
      "presentation_code": "2014J",
      "snapshot_day": 30
    },
    "model_metadata": {
      "model_name": "Regularized Logistic Regression Baseline",
      "model_version": "v1.0.0",
      "training_cohort": "2013B, 2013J, 2014B"
    },
    "risk_probability": 0.2803,
    "risk_tier": "LOW",
    "operational_threshold": 0.46,
    "alert_triggered": false,
    "top_risk_drivers": [
      {
        "factor_title": "Registered Credit Load",
        "observed_raw_value": "60",
        "contribution_weight": 0.2075,
        "plain_english_summary": "Student is registered for 60 academic credits this term."
      }
    ],
    "top_protective_factors": [
      {
        "factor_title": "Active Learning Days on Platform",
        "observed_raw_value": "15.0",
        "contribution_weight": -0.8012,
        "plain_english_summary": "Demonstrated consistent study routine (15.0 active days logged across Day 0-30)."
      }
    ],
    "governance_notices": {
      "non_causal_disclaimer": "Empirical risk estimate based on historical patterns. Does NOT represent causation or a diagnostic assessment of ability.",
      "data_boundary_caveat": "Assessment marks are excluded due to grading latency. Evidence reflects only observable submissions and activity up to Day 30.",
      "human_in_the_loop_mandate": "No Alert Without Action: Requires verified review by an assigned academic advisor before any support case or outreach is confirmed."
    }
  }
}
```

---

### 4.5 Bounded Batch Prediction (`POST /predict/batch`)

Supports 1 to 100 student records per request:

```bash
curl -s -X POST http://127.0.0.1:8000/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
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
        "record_id": "BATCH-001"
      },
      {
        "num_of_prev_attempts": 2,
        "studied_credits": 120,
        "days_registered_before_start": -2.0,
        "has_missing_registration_date": 0,
        "vle_total_clicks_d30": 5.0,
        "vle_active_days_d30": 1.0,
        "vle_clicks_precourse": 0.0,
        "vle_clicks_poststart_d30": 5.0,
        "vle_clicks_last_7d": 0.0,
        "vle_days_since_last_click": 28.0,
        "vle_clicks_forumng_d30": 0.0,
        "vle_clicks_oucontent_d30": 5.0,
        "vle_clicks_quiz_d30": 0.0,
        "vle_clicks_homepage_d30": 0.0,
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
        "record_id": "BATCH-002"
      }
    ]
  }'
```

**Response:**
```json
{
  "total_records": 2,
  "review_recommended_count": 1,
  "predictions": [
    {
      "record_id": "BATCH-001",
      "risk_probability": 0.2803,
      "review_recommended": false,
      "risk_tier": "LOW",
      "operational_threshold": 0.46,
      ...
    },
    {
      "record_id": "BATCH-002",
      "risk_probability": 0.9334,
      "review_recommended": true,
      "risk_tier": "HIGH",
      "operational_threshold": 0.46,
      ...
    }
  ]
}
```

---

## 5. Roadmap & Separation of Responsibilities

- **Completed Phases 0–4:** OULAD data audit, Day-30 leakage-free feature engineering, model training (ROC-AUC: 0.7216), threshold tuning ($t=0.46$), calibration, linear log-odds explainability, and Evidence Card generation.
- **Completed Phase 5 (Current):** Standalone FastAPI inference engine serving real predictions with explicit validation, bounded batch scoring, and governance notices.
- **Future Phase 6 (Case Management & Database):** Persisting reviewed alert outcomes to PostgreSQL/Supabase, multi-tenant RBAC, audit logging, and human advisor review UI.
