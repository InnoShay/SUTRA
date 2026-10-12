# SUTRA CLI — Phase 3A: Student Feature Retrieval Audit & Scoring Design

**Date:** 2026-10-12  
**Auditor / Role:** Senior ML & Systems Security Engineer  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Scope:** Read-only architectural and security audit of ML inference endpoints, student data stores, feature provenance, and proposed design for authorized student scoring (`sutra student score <STUDENT_ID>`).  
**Status:** **Audit Completed — No application code, database schema, or production data was modified.**  

---

## 1. Executive Summary & Readiness Verdict

### Verdict: `READY WITH BLOCKERS`

Phase 1 (session management via `~/.sutra/session.json`) and Phase 2 (file-based inference via `sutra predict --file <PATH>`) established a working, authenticated client capable of invoking SUTRA's production Day-30 logistic regression baseline model (`baseline_logistic_regression.joblib`, v1.0.0, threshold `0.46`).

However, before implementing student scoring by identifier (`sutra student score <STUDENT_ID>`), the audit discovered **two fundamental architectural blockers**:

1. **Feature Data Absence in the Application Database:**
   While PostgreSQL defines `students` and `student_observations` tables, the active database models store general educational observations across 5 domains (`attendance_rate`, `missing_assignments_count`, `latest_score`, `weekly_activity_count`, `skill_rubric_status`). The **25 canonical Day-30 OULAD features** (`vle_total_clicks_d30`, `vle_clicks_forumng_d30`, `studied_credits`, `num_of_prev_attempts`, `imd_band`, etc.) required by the production model do **not** exist in PostgreSQL. They exist solely in external training CSVs and within the synthetic test vector in `docs/fixtures/demo_seed.json`. In the policy engine (`app/services/policy_engine.py:258`), evaluating any database student results in `ml_applicability: "insufficient_oulad_features"`.
2. **Security Discrepancy Between Inference Routes:**
   `POST /api/v1/ml/predict` strictly enforces JWT authentication, role authorization, campus scoping (`X-Campus-Id`), and database audit logging. In contrast, the root backwards-compatibility route `POST /predict` (mounted in `app/main.py:135`) has **zero authentication**, **no role checks**, **no campus scoping**, and **no audit logging**.

Student scoring cannot be safely deployed until a server-side student feature-aggregation contract is established and the unauthenticated `/predict` bypass is resolved.

---

## 2. Route-by-Route Security Audit: `/api/v1/ml/predict` vs `/predict`

The backend currently exposes two HTTP routes executing Day-30 inference. They were traced line-by-line from source code:

| Dimension | `POST /api/v1/ml/predict` ([`app/api/v1/ml.py:28`](file:///Users/neemaysmac/Desktop/Sutra/app/api/v1/ml.py#L28)) | `POST /predict` ([`app/main.py:135`](file:///Users/neemaysmac/Desktop/Sutra/app/main.py#L135)) | Security Equivalence |
| :--- | :--- | :--- | :--- |
| **Authentication** | `user: AuthenticatedUser = Depends(require_role(...))` | **None.** No dependency declared. | ❌ **FAILED (Bypass)** |
| **Token Verification** | Validates Supabase JWT signature, claims, and active status. | **None.** Accepts anonymous HTTP requests. | ❌ **FAILED (Bypass)** |
| **Campus Scoping** | `campus_id = Depends(require_campus_access)` validates `X-Campus-Id` against user memberships. | **None.** No tenant boundary or header checked. | ❌ **FAILED (Bypass)** |
| **Role Authorization** | Gated to `"faculty"`, `"hod"`, `"mentor"`, `"institution_admin"`. | **None.** Any caller can invoke. | ❌ **FAILED (Bypass)** |
| **Request Validation** | Pydantic `MLPredictRequest` validates 25 canonical features, finite numbers, cutoff `30`. | Pydantic `MLPredictRequest` validates 25 canonical features, finite numbers, cutoff `30`. | ✅ **Identical** |
| **Anti-Leakage Checks** | Enforced by schema & `MLService.predict_single` (rejects `final_result`, `is_at_risk`, etc.). | Enforced by schema & `MLService.predict_single` (rejects `final_result`, `is_at_risk`, etc.). | ✅ **Identical** |
| **Model Artifact** | `baseline_logistic_regression.joblib` (v1.0.0, threshold `0.46`). | `baseline_logistic_regression.joblib` (v1.0.0, threshold `0.46`). | ✅ **Identical** |
| **Audit Logging** | Persists execution to `ml_inference_logs` table via `ml_service.log_inference`. | **None.** Does not touch the database or create audit logs. | ❌ **FAILED (Unlogged)** |
| **Database Dependency** | Requires active PostgreSQL connection; fails with `500` if DB is down. | Completely decoupled from PostgreSQL; executes purely in-memory. | ⚠️ **Divergent** |

### Critical Finding:
`POST /predict` was created as an ADR-005 backwards-compatibility alias for headless scripts. Because it bypasses all security layers, **an unauthorized client could bypass campus isolation, rate limiting, and audit logging by calling `/predict` directly**. In Phase 3B, `/predict` must either be protected with equivalent security dependencies or restricted strictly to internal service networks.

---

## 3. Student-Data Source & Feature Provenance Mapping

The audit traced how the backend stores and handles student data to determine whether the canonical 25 Day-30 features can be computed from existing database records.

### 3.1 Entity Models in PostgreSQL

1. **`Student` ([`app/models/student.py`](file:///Users/neemaysmac/Desktop/Sutra/app/models/student.py)):**
   - Columns: `id` (UUID PK), `institution_id` (UUID FK), `external_ref` (string, e.g. `"SYN-1007"`), `display_name` (string), `cohort_code` (string, e.g. `"CS-Y2"`), `enrollment_status` (string, e.g. `"active"`), `created_at`, `updated_at`.
   - **Audit Finding:** Contains identity and cohort tags, but **zero demographic attributes** (no `gender`, `region`, `highest_education`, `imd_band`, `age_band`, `disability`, `studied_credits`, or `num_of_prev_attempts`).
2. **`StudentObservation` ([`app/models/observation.py`](file:///Users/neemaysmac/Desktop/Sutra/app/models/observation.py)):**
   - Columns: `id`, `institution_id`, `student_id` (FK `students.id`), `domain` (string), `metric_key` (string), `value` (JSON), `event_at` (datetime), `available_at` (datetime), `quality_state` (string, `"valid"`, `"stale"`, etc.).
   - Domains in SUTRA: 5 categories (`"attendance"`, `"academic"`, `"participation"`, `"skills"`, `"faculty_feedback"`).
   - Observed Metric Keys: `attendance_rate`, `missing_assignments_count`, `latest_score`, `weekly_activity_count`, `skill_rubric_status`, `support_check_requested`.
3. **`FinanceObservation` ([`app/models/observation.py`](file:///Users/neemaysmac/Desktop/Sutra/app/models/observation.py)):**
   - Strictly segregated fee records (`fee_support_status`), protected under ADR-003, never accessible to academic ML.

### 3.2 Canonical 25 Day-30 Feature Mapping Against Live Database

| Feature Name | Feature Type | Database Source in PostgreSQL? | Feature Engineering Logic in Codebase |
| :--- | :--- | :--- | :--- |
| `num_of_prev_attempts` | Numeric | ❌ **Missing** (Not in `students` or `observations`) | `ml/src/sutra_ml/features/build_features.py` from raw `studentInfo.csv` |
| `studied_credits` | Numeric | ❌ **Missing** (Not in `students` or `observations`) | `ml/src/sutra_ml/features/build_features.py` from raw `studentInfo.csv` |
| `days_registered_before_start`| Numeric | ❌ **Missing** (Not in `students` or `observations`) | `ml/src/sutra_ml/features/build_features.py` from `studentRegistration.csv` |
| `has_missing_registration_date`| Numeric | ❌ **Missing** | Imputed binary flag in offline prep pipeline |
| `vle_total_clicks_d30` | Numeric | ❌ **Missing** | `ml/src/sutra_ml/features/build_features.py` aggregated from `studentVle.csv` |
| `vle_active_days_d30` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` |
| `vle_clicks_precourse` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` where `date < 0` |
| `vle_clicks_poststart_d30` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` where `0 <= date <= 30` |
| `vle_clicks_last_7d` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` where `23 < date <= 30` |
| `vle_days_since_last_click` | Numeric | ❌ **Missing** | Calculated from `30 - max(date)` |
| `vle_clicks_forumng_d30` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` joined on `vle.csv` activity type |
| `vle_clicks_oucontent_d30` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` joined on `vle.csv` activity type |
| `vle_clicks_quiz_d30` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` joined on `vle.csv` activity type |
| `vle_clicks_homepage_d30` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` joined on `vle.csv` activity type |
| `vle_clicks_other_d30` | Numeric | ❌ **Missing** | Aggregated from `studentVle.csv` joined on `vle.csv` activity type |
| `has_vle_activity_d30` | Numeric | ❌ **Missing** | Binary flag if `vle_total_clicks_d30 > 0` |
| `assessments_submitted_d30` | Numeric | ❌ **Missing** | Count of submissions in `studentAssessment.csv` where `date_submitted <= 30` |
| `assessment_banked_d30` | Numeric | ❌ **Missing** | Count of banked submissions in `studentAssessment.csv` where `date_submitted <= 30` |
| `has_early_assessment_submission_d30` | Numeric | ❌ **Missing** | Binary flag if `assessments_submitted_d30 > 0` |
| `gender` | Categorical | ❌ **Missing** | Extracted from `studentInfo.csv` |
| `region` | Categorical | ❌ **Missing** | Extracted from `studentInfo.csv` |
| `highest_education` | Categorical | ❌ **Missing** | Extracted from `studentInfo.csv` |
| `imd_band` | Categorical | ❌ **Missing** | Extracted from `studentInfo.csv` |
| `age_band` | Categorical | ❌ **Missing** | Extracted from `studentInfo.csv` |
| `disability` | Categorical | ❌ **Missing** | Extracted from `studentInfo.csv` |

### 3.3 Data Provenance Summary
1. **Live Database Reality:** PostgreSQL holds synthetic demo students (`SYN-1007` to `SYN-1012`) seeded with domain metrics (`attendance_rate`, `latest_score`, etc.). It does **not** store VLE click streams or demographic attributes required by the OULAD model.
2. **Offline Pipeline Reality:** The 25 canonical features are computed by `ml/src/sutra_ml/features/build_features.py` exclusively from raw OULAD CSV dumps (`studentVle.csv`, `studentInfo.csv`, etc.).
3. **Policy Engine Corroboration:** In [`app/services/policy_engine.py:235-260`](file:///Users/neemaysmac/Desktop/Sutra/app/services/policy_engine.py#L235-L260), the policy engine tests `all(k in metrics for k in DAY30_REQUIRED_FEATURES)`. Because the observations in the database do not contain these 25 keys, the policy engine correctly sets:
   `"ml_applicability": "insufficient_oulad_features"` and skips ML inference.

---

## 4. Proposed Backend Contract: Authorized Student Scoring

To support `sutra student score <STUDENT_ID>` without client-side feature fabrication or security vulnerabilities, a new server-side endpoint must be introduced.

### 4.1 Endpoint Specification

- **Method & Path:** `POST /api/v1/students/{student_id}/score`
- **Alternative Path:** `POST /api/v1/ml/predict/student/{student_id}`
- **Recommended Convention:** `POST /api/v1/students/{student_id}/score` (Aligns with existing student resource routes in `app/api/v1/students.py`).

### 4.2 Security & Authorization Invariants

1. **Authentication:**
   - Must depend on `get_current_user` and validate Supabase JWT signature and expiry.
2. **Campus Context & Role Authorization:**
   - Must depend on `get_campus_membership` and `require_role("faculty", "hod", "mentor", "institution_admin")`.
   - Leadership role must be blocked from single-student scoring per existing privacy rules (`check_leadership_access`).
3. **Cross-Campus Isolation (Anti-Enumeration):**
   - Query: `select(Student).where(Student.id == student_id, Student.institution_id == membership.campus_id)`.
   - **Crucial Rule:** If a student ID exists in the database but belongs to another campus, return `404 Not Found` (`"Student not found in active campus"`), **never** `403 Forbidden`. This prevents cross-tenant student identifier enumeration.
4. **Server-Side Feature Retrieval & Aggregation:**
   - The client submits **only** the `student_id` (and optionally an institution-approved course presentation parameter). The client **never** supplies features.
   - The server gathers observations or queries the student feature store strictly enforcing:
     `available_at <= Day 30 cutoff`.
5. **Handling Missing Observations (No Silent Defaults):**
   - If the student lacks required observations to construct the canonical 25 features, the server **must not** synthesize values or guess demographics.
   - Return `422 Unprocessable Entity`:
     ```json
     {
       "error": {
         "code": "INSUFFICIENT_OBSERVATIONS",
         "message": "Student lacks required Day-30 observations for ML early warning.",
         "missing_features": ["vle_total_clicks_d30", "studied_credits", "gender"],
         "available_feature_count": 0,
         "required_feature_count": 25
       }
     }
     ```
6. **Audit Logging & Response:**
   - On successful inference, log to `ml_inference_logs` with `student_id`, `institution_id`, `external_student_ref`, probability, threshold, and latency.
   - Response mirrors canonical `MLPredictResponse` with `student_id` and `evidence_card`.

---

## 5. Proposed CLI Command Behavior: `sutra student score`

### 5.1 Command Syntax
```bash
sutra student score <STUDENT_ID> [--url <URL>] [--campus <CAMPUS_UUID>]
```

### 5.2 Terminal UX & Rendering Specifications

```text
=== SUTRA Student Early Warning Scoring ===
Student ID:   b284e3a1-7c91-4e2b-9801-923f1a64bc29
Campus:       North Campus (00000000-0000-0000-0000-000000000001)

Validating student records and Day-30 observation completeness...
✓ 25 canonical Day-30 features assembled server-side from verified campus records.
Executing production early-warning ML inference...

================================================================================
SUTRA EARLY WARNING PREDICTION (Day-30 Baseline Model)
================================================================================
Student Reference:   SYN-1007 (Display: Asha)
Student UUID:        b284e3a1-7c91-4e2b-9801-923f1a64bc29
Model Pipeline:      logistic_regression_baseline (version: 1.0.0)
Prediction Cutoff:   Day 30 (Strict temporal boundary: event_at <= Day 30)
Calibration:         platt_calibrated

Risk Probability:    [====================          ] 68.0%
Decision Threshold:  46.0%
Classification:      [AT RISK • REVIEW RECOMMENDED]

TOP RISK DRIVERS (Increases Risk Weight):
  ▲ vle_days_since_last_click      observed: 6.0      (weight: +0.0000)
  ▲ vle_clicks_last_7d             observed: 12.0     (weight: +-0.0000)
  ▲ assessments_submitted_d30      observed: 1.0      (weight: +-0.0000)
  ▲ vle_active_days_d30            observed: 8.0      (weight: +-0.0000)
  ▲ vle_total_clicks_d30           observed: 142.0    (weight: +-0.0000)

TOP PROTECTIVE FACTORS (Decreases Risk Weight):
  None observed below baseline.

MODEL GOVERNANCE LIMITATIONS:
  • Trained on historical Open University course registrations; not calibrated for non-modular curricula.
  • Early assessment grades were excluded to avoid temporal leakage.
  • Represents statistical correlation, not causal certainty or personal diagnosis.
  • Predictions must be reviewed by authorized educators before taking any supportive action.

NON-CAUSAL ADVISORY DISCLAIMER:
  • Empirical statistical prediction based on historical Day-30 course interactions.
  • Does NOT constitute a clinical diagnosis, an ability assessment, or certainty of student outcome.
  • Principle 'No Alert Without Action': Any follow-up requires verified educator review.
================================================================================
```

### 5.3 Error & Edge Case Handling in CLI

1. **Student in Different Campus or Unknown ID:**
   - Server returns `404 Not Found`.
   - CLI output:
     `Error: Student 'b284e3a1...' not found in active campus. Please verify the student UUID and your active campus selection.`
2. **Insufficient Observations in Database:**
   - Server returns `422 Unprocessable Entity` with `missing_features`.
   - CLI output:
     `Error: Insufficient Observations: Student record has incomplete Day-30 features (missing 25 of 25 required features). ML early warning cannot run without full canonical data.`
3. **Unauthorized Role (e.g. Student, Leadership-only):**
   - Server returns `403 Forbidden`.
   - CLI output:
     `Error: Access Denied: Your active role does not permit student ML risk scoring. Requires faculty, hod, mentor, or institution_admin role.`
4. **Distinction from Cases & Signals:**
   - The CLI must explicitly print that this prediction is **not an active Case** and **does not open an intervention**. It is an on-demand score for educator review.

---

## 6. Comprehensive Security & Test Plan Matrix

| Scenario / Invariant | Test Description | Current Repository Status | Required Action for Phase 3B |
| :--- | :--- | :--- | :--- |
| **1. Valid Authorized Student in Active Campus** | Faculty requests scoring for valid student in their campus with complete Day-30 features. | ⚠️ **Partial** (Tested with file payload in `test_ml_integration.py` & CLI unit tests; no DB student scoring test). | Add integration test for `POST /api/v1/students/{id}/score` returning 200 and full `MLPredictResponse`. |
| **2. Cross-Campus Student Isolation** | User in Campus A requests scoring for a student belonging to Campus B. Must return 404, not 403. | ⚠️ **Partial** (Campus isolation tested for general routes, not for ML student scoring). | Add test asserting `404 ResourceNotFoundError` to prevent tenant student enumeration. |
| **3. Unauthorized Role Access** | Leadership, student, or unprivileged role requests student score. Must return 403. | ⚠️ **Partial** (Role gating tested on `/predict`, not on student resource scoring). | Add test verifying 403 for leadership/unauthorized roles. |
| **4. Inactive Campus Membership** | User with revoked/inactive campus membership requests student score. Must return 403. | ✅ **Covered** (`test_supabase_integration_readiness.py` enforces active membership). | Re-verify in student scoring route. |
| **5. Missing / Malformed Student UUID** | Caller provides invalid UUID string or non-existent UUID. Must return 422 or 404. | ⚠️ **Missing** | Add test verifying validation of UUID path parameter. |
| **6. Insufficient Day-30 Observations** | Student exists but has incomplete features (e.g., 0 VLE logs). Must return 422, not synthetic zeros. | ⚠️ **Missing** | Add test verifying `INSUFFICIENT_OBSERVATIONS` error response. |
| **7. Temporal Leakage & Post-Cutoff Records** | Observations with `available_at > Day 30` must be excluded during feature aggregation. | ✅ **Covered in Policy Engine** (`policy_engine.py:117`); ⚠️ **Missing for ML**. | Add test ensuring post-cutoff observations do not influence feature aggregation. |
| **8. Unauthenticated Session / Expired Token** | Anonymous call or expired session token. Must return 401. | ✅ **Covered** in `cli/tests/session_tests.rs` & `test_ml_integration.py`. | Inherited by route dependencies. |
| **9. Direct Bypass Attempt via `/predict`** | Caller attempts to bypass campus authorization by sending raw JSON to root `/predict`. | ❌ **VULNERABLE** (Currently `/predict` allows unauthenticated access). | Add test asserting `/predict` rejects unauthenticated or unprivileged calls. |
| **10. Audit Log & Credential Redaction** | Successful scoring writes to `ml_inference_logs`; tokens and raw student demographics redacted. | ✅ **Covered** for file predict; ⚠️ **Missing** for student scoring. | Add test verifying `student_id` logged in `ml_inference_logs` with zero credential leaks. |

---

## 7. Blockers, Risks & Recommended Implementation Order

### Identified Blockers

1. **Blocker 1: Student Feature Aggregation Engine Missing in Backend**
   - *Impact:* The backend cannot compute the 25 OULAD Day-30 features from the existing PostgreSQL `student_observations` schema because the underlying tables only store general 5-domain indicators (`attendance_rate`, `latest_score`), not OULAD VLE clickstreams or student demographics.
   - *Resolution:* Either implement a Student Feature Store table (`student_ml_features`) populated during LMS/SIS ingestion, or create an aggregation adapter that maps SIS records to the canonical schema.
2. **Blocker 2: Unauthenticated Root `/predict` Route**
   - *Impact:* Exposing an unauthenticated, unlogged inference route undermines the security guarantees of the SUTRA platform.
   - *Resolution:* Secure `app/main.py:135` with `require_campus_access` and `require_role`, or retire the root alias.
3. **Blocker 3: Lack of Authorized Backend Route for Student Scoring**
   - *Impact:* The CLI cannot implement `sutra student score <ID>` without a corresponding backend endpoint.
   - *Resolution:* Implement `POST /api/v1/students/{student_id}/score`.

### Recommended Implementation Roadmap (Phase 3B)

```mermaid
flowchart TD
    B1[1. Secure Root /predict Route] --> B2[2. Define Student Feature Store / Aggregation in Backend]
    B2 --> B3[3. Implement POST /api/v1/students/:id/score Endpoint]
    B3 --> B4[4. Add Backend Integration Tests (Security & Leakage)]
    B4 --> B5[5. Implement CLI Command: sutra student score :id]
    B5 --> B6[6. Verify Live End-to-End Scoring & Audit Logs]
```

1. **Step 1 (Security Hardening):** Add authentication and campus scoping dependencies to `POST /predict` in `app/main.py`.
2. **Step 2 (Data Foundation):** Implement the server-side feature extraction service that compiles the 25 Day-30 canonical features for a given `student_id` from authorized data sources.
3. **Step 3 (API Contract):** Expose `POST /api/v1/students/{student_id}/score` with role gating, 404 cross-campus isolation, and `ml_inference_logs` auditing.
4. **Step 4 (Test Matrix):** Execute the 10-point test matrix to confirm that insufficient data returns 422 and cross-campus requests return 404.
5. **Step 5 (CLI Implementation):** Add `sutra student score <STUDENT_ID>` to `sutra-cli`, reusing session management and Evidence Card formatting.

---

## 8. Final Audit Verdict

### **Verdict: `READY WITH BLOCKERS`**

- **Verified from Source Code:**
  - `POST /api/v1/ml/predict` is secure, calibrated, and audited.
  - `POST /predict` is unauthenticated and unlogged.
  - PostgreSQL database lacks the 25 canonical OULAD Day-30 features for all seeded students.
  - Policy engine confirms `ml_applicability: "insufficient_oulad_features"` for database students.
- **Verified from Live Execution:**
  - Release CLI binary (`sutra predict --file <PATH>`) successfully executes Day-30 inference against real model artifact with synthetic test fixtures.
  - All 21 Cargo unit tests pass.
- **Blockers Identified:**
  - Backend student feature extraction contract is missing.
  - Root `/predict` security bypass must be hardened.
- **Stop Condition:** Phase 3A audit complete. No implementation of Phase 3B commenced.
