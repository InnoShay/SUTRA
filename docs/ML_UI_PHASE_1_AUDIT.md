# SUTRA ML–UI Phase 1 — Integration Audit and Branch Setup Report

**Date:** 2026-10-12  
**Branch:** `ml-integration-ui` (branched from `main` @ `e47fb5b`)  
**Status:** AUDIT COMPLETE & VERIFIED  

---

## 1. Executive Summary

This phase conducts a comprehensive, code-level and live runtime audit of the machine learning model, backend inference endpoints, and frontend user interface in SUTRA.

### Core Audit Verdict
1. **The trained ML model is verified, calibrated, and operational:**
   * Deployed baseline: Regularized Logistic Regression `v1.0.0` with Platt-calibrated log-odds.
   * Decision threshold: `0.46` (Day-30 early warning).
   * Feature schema: Frozen 25 canonical features (19 numerical, 6 categorical).
2. **The reported API routes exist and are strictly enforced:**
   * `POST /api/v1/ml/predict` successfully scores raw feature payloads and returns the canonical Evidence Card.
   * `POST /api/v1/students/{student_id}/predict` exists, is role-gated, campus-scoped, and audit-logged to `ml_inference_logs`.
3. **Key Finding on Student Scoring Parity:**
   * Calling `POST /api/v1/students/SYN-1007/predict` against the seeded local database `sutra_dev.db` returns **`422 Unprocessable Entity (INSUFFICIENT_FEATURES)`**.
   * **Root Cause:** In `sutra_dev.db`, `SYN-1007` was seeded with only 6 institutional SIS observations (`attendance_rate`, `missing_assignments_count`, etc.) from `demo_seed.json`. The remaining 19 fine-grained Day-30 VLE clickstream features (e.g., `vle_total_clicks_d30`, `vle_active_days_d30`) were not seeded into the `student_observations` table.
   * The backend correctly refuses inference to prevent model corruption, rather than hallucinating or imputing missing features.
4. **Frontend UI Readiness:**
   * Student 360 (`/students/[id]`) already features a rich ML Early-Warning Card with a risk probability gauge, threshold marker, top drivers, and a "Run Live Inference" button.
   * When live inference returns 422, the UI displays the error banner. When the backend is offline, the UI falls back to deterministic synthetic fixtures.

---

## 2. Git Workflow & Branch Topology

| Parameter | Value |
| :--- | :--- |
| **Repository Root** | `/Users/neemaysmac/Desktop/Sutra` |
| **Remote URL** | `https://github.com/InnoShay/SUTRA.git` |
| **Previous Branch** | `main` |
| **Remote Upstream HEAD** | `e47fb5b0d309800f730d8da5de84aadca8b42497` (`origin/main`) |
| **Active Feature Branch** | `ml-integration-ui` |
| **Branch Base Commit** | `e47fb5b0d309800f730d8da5de84aadca8b42497` |

* **Working Tree:** Clean; all untracked files preserved.
* **Persistent Branch:** `ml-integration-ui` created from latest `origin/main`.

---

## 3. ML Model Artifact & Serving Pipeline Audit

### 3.1 Model Artifacts on Disk
Located in `ml/artifacts/models/v1.0.0/`:
* `baseline_logistic_regression.joblib` (7,105 bytes, SHA256 verified)
* `candidate_xgboost.joblib` (270,054 bytes, research candidate)
* `model_metadata.json` (6,758 bytes)

### 3.2 Model Metadata & Governance
* **Selected Model:** `Regularized Logistic Regression Baseline`
* **Operational Threshold:** `0.46` (calibrated for high recall at early Day-30 milestone)
* **Cutoff:** Day 30 post-course start
* **Feature Schema (25 Features):**
  * **Numerical (19):** `num_of_prev_attempts`, `studied_credits`, `days_registered_before_start`, `has_missing_registration_date`, `vle_total_clicks_d30`, `vle_active_days_d30`, `vle_clicks_precourse`, `vle_clicks_poststart_d30`, `vle_clicks_last_7d`, `vle_days_since_last_click`, `vle_clicks_forumng_d30`, `vle_clicks_oucontent_d30`, `vle_clicks_quiz_d30`, `vle_clicks_homepage_d30`, `vle_clicks_other_d30`, `has_vle_activity_d30`, `assessments_submitted_d30`, `assessment_banked_d30`, `has_early_assessment_submission_d30`
  * **Categorical (6):** `gender`, `region`, `highest_education`, `imd_band`, `age_band`, `disability`
* **Anti-Leakage Forbidden Features:** `final_result`, `date_unregistered`, `assessment_score_d30`, `exam_score` (enforced via `FORBIDDEN_LEAKED_FEATURES`)

### 3.3 Serving Engine Implementation
* **Backend Service:** `app/ml/service.py` (`MLService`)
* **Serving Estimator:** `sutra_ml.models.baseline.LogisticRegressionBaseline`
* **Inference Method:** Platt-calibrated log-odds via `predict_proba(features)`
* **Explainability:** Feature attribution decomposition via `explain(features, top_n=5)`
* **Evidence Card:** Formats `MLEvidenceCard` containing probability, threshold, classification, attributions, calibration status, and mandatory limitations disclaimer.

---

## 4. Backend API Route & Security Parity Audit

### 4.1 Route Catalog

| Route | Method | Authentication | Role Authorization | Scope / Tenancy | Behavior / Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/ml/model-info` | `GET` | Bearer JWT | Authenticated user | Global / Tenancy | **200 OK**: Returns metadata, 25 feature keys, threshold `0.46` |
| `/api/v1/ml/predict` | `POST` | Bearer JWT | Authenticated user | Campus header (`X-Campus-Id`) | **200 OK**: Takes raw 25-feature JSON payload, returns `MLPredictResponse` |
| `/api/v1/ml/predict/batch` | `POST` | Bearer JWT | Authenticated user | Campus header (`X-Campus-Id`) | **200 OK**: Scores list of feature instances |
| `/api/v1/students/{id}/predict` | `POST` | Bearer JWT | `faculty`, `hod`, `mentor`, `institution_admin`, `counsellor` | Strict campus scoping | **Live Server-Side Scoring**: Pulls student telemetry from DB. Returns **422** if features are incomplete |
| `/api/v1/ml/predict/student/{id}` | `POST` | Bearer JWT | Educator roles | Strict campus scoping | **Alias** to `/api/v1/students/{id}/predict` |
| `/api/v1/students/{id}/support-view` | `GET` | Bearer JWT | Educator roles (blocks leadership) | Strict campus scoping | **200 OK**: Returns Student 360 telemetry and cached latest ML prediction |

### 4.2 Security & Role Parity
* **ADR-004 Leadership Privacy:** Calling `/students/{id}/predict` or `/students/{id}/support-view` with a leadership token raises `403 Forbidden` (`LEADERSHIP_INDIVIDUAL_ACCESS_FORBIDDEN`), protecting individual student confidentiality.
* **Campus Isolation:** Enforces `Institution.id == membership.campus_id`. Students from other campuses return `404 Not Found` without leaking data across institutions.
* **Audit Logging:** Every successful student prediction writes an immutable record to `ml_inference_logs` with latency, risk score, threshold, and student UUID.

---

## 5. Live Runtime Audit: Student `SYN-1007` Scoring

An automated live audit was executed against the FastAPI application runtime using authenticated credentials:

```text
GET /health:
  Status: 200 OK (version: 0.1.0)

GET /api/v1/ml/model-info:
  Status: 200 OK
  Model: Logistic Regression v1.0.0 | Threshold: 0.46 | Status: ready

POST /api/v1/ml/predict (Payload: valid_sample.json):
  Status: 200 OK
  Risk Probability: 0.1891 | Threshold: 0.46 | Classification: On_Track
  Attributions: 5 top risk/protective drivers returned

POST /api/v1/students/SYN-1007/predict:
  Status: 422 Unprocessable Entity
  Code: INSUFFICIENT_FEATURES
  Message: "Student 'SYN-1007' has insufficient canonical data for Day-30 inference.
            Missing 25 of 25 required features, including 12 fine-grained VLE clickstream
            interactions that cannot be derived from institutional attendance.
            Run `sutra students readiness <ID>` to inspect feature availability."
```

### Analysis of the 422 Error
* Student `SYN-1007` in `sutra_dev.db` has only 6 observation records:
  `['attendance_rate', 'missing_assignments_count', 'latest_score', 'weekly_activity_count', 'skill_rubric_status', 'support_check_requested']`
* The Day-30 ML model requires the 25 OULAD feature definitions.
* The backend strictly refuses to score students who lack the required features, preventing invalid predictions.

---

## 6. Frontend UI Audit (`frontend/`)

### 6.1 Student 360 Detail Page (`frontend/app/students/[id]/page.tsx`)
* **Component:** `ML Early-Warning Assessment` Evidence Card.
* **Visual Elements:**
  * Risk Probability display with dynamic color (`text-rose-400` when at risk, `text-emerald-400` when on track).
  * Horizontal progress bar with a dedicated vertical **threshold marker line at 46%**.
  * Status badge: `AT RISK • REVIEW RECOMMENDED` vs. `ON TRACK • STANDARD MONITORING`.
  * Top Risk Drivers table (log-odds impact, observed values, feature labels).
  * Protective Factors table.
  * Model governance limitations disclaimer.
* **Interactive Button:** "Run Live Inference" executes `api.students.predict(studentId)`.
* **Error Handling:** Renders error banner (`mlInferenceError`) when the backend returns 422.

### 6.2 Cohort Analytics Page (`frontend/app/analytics/page.tsx`)
* **Components:** `LearningProgressChart`, `EngagementChart`, `RadialProgressGauge`, `ActivityHeatmap`.
* **Data Sources:** Computes live aggregations across active cases, signals, and intervention catalog via `analytics-selectors.ts`.
* **Current Gap:** Does not currently display dedicated ML governance charts (e.g., ROC curve, PR curve, calibration reliability diagram).

### 6.3 API Client & Fallback Engine (`frontend/lib/api.ts`)
* Uses `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'`.
* Implements `getOfflineFallback` for offline demo mode or backend disconnects.

---

## 7. Verification Test Suite Matrix

| Test Suite | Scope | Tests Run | Result | Exit Code |
| :--- | :--- | :--- | :--- | :--- |
| **Rust CLI** | `cargo test --manifest-path cli/Cargo.toml` | 55 | **55 passed** | `0` |
| **Backend Core** | `pytest tests/` | 139 | **139 passed** | `0` |
| **Student Predict Tests** | `pytest tests/test_student_predict.py` | 6 | **6 passed** | `0` |
| **ML Unit & Quality** | `pytest ml/tests/` | 161 | **161 passed** | `0` |
| **Frontend Contracts** | `npm --prefix frontend test` | 13 suites | **13 passed** | `0` |
| **TOTAL** | | **374** | **374 PASSED** | `0` |

---

## 8. Prioritised Implementation Plan for Subsequent Phases

Based on this audit, the following phased enhancements are recommended:

1. **Phase 2 — Telemetry Enrichment & Live Scoring Enablement:**
   * Seed the 25 canonical Day-30 feature observations for demonstration students (`SYN-1007`, `SYN-1008`) into `sutra_dev.db` using the existing `demo_seed.json` `ml_day30_test_vector`.
   * Verify that clicking "Run Live Inference" on `SYN-1007` in the UI produces a live `200 OK` prediction and updates the card dynamically.
2. **Phase 3 — Interactive SHAP / Feature Attribution Graphs in Student 360:**
   * Replace the text-based attribution table with an interactive horizontal bar chart / waterfall plot visualizing positive risk drivers and negative protective factors.
3. **Phase 4 — Model Governance & Calibration Dashboard in Analytics:**
   * Add an ML Governance tab in `/analytics` displaying the ROC curve (AUC 0.72), Precision-Recall curve, and Platt calibration curve.
4. **Phase 5 — "What-If" Intervention Simulation Sandbox:**
   * Add interactive sliders on the student profile allowing counselors to simulate the projected risk impact of potential interventions.
