# SUTRA ML–UI Phase 2 — Live Inference Reliability & Governance Report

**Date:** 2026-10-12  
**Branch:** `ml-integration-ui`  
**Status:** IMPLEMENTED, VERIFIED & PASSING  

---

## 1. Executive Summary

Phase 2 builds upon the architectural audit completed in Phase 1 (`docs/ML_UI_PHASE_1_AUDIT.md`), making the verified, calibrated Day-30 machine learning model directly accessible, trustworthy, and auditable within the Student 360 frontend user interface (`/students/[id]`).

### Core Objectives Delivered
1. **Verified Backend Endpoint Integration:**
   * Student 360 inference action calls the authenticated `POST /api/v1/students/{id}/predict` endpoint with Bearer auth token and campus tenancy scoping.
   * Model artifacts (`ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`), 25 canonical Day-30 features, and threshold `0.46` are served directly by `app/services/ml_service.py` without retraining, modification, or threshold drift.
2. **Explicit Reliability & State Machine in UI:**
   * Handled 5 distinct lifecycle states with visual feedback: `idle`, `loading`, `success`, `validation_error` (422), `auth_error` (401/403), and `service_error` (500/503/network).
   * Strict error transparency: failed API calls display explicit error cards with backend error codes and details. Failed calls **never** silently downgrade into synthetic predictions.
3. **Concurrency & Race Condition Prevention:**
   * Multiple rapid clicks are blocked via `loadingMlInference` button disabling.
   * Out-of-order asynchronous responses are safely discarded via an incrementing sequence counter (`inferenceSeqRef`).
4. **Dynamic Decision Threshold Verification:**
   * The 0.46 threshold is queried dynamically from backend `/api/v1/ml/model-info` on mount. If verified, the UI renders the official institutional policy indicator `(verified from backend configuration)`.
   * The UI never hardcodes a divergent frontend threshold.
5. **Separation of Probability & Triage Classification:**
   * Calibrated Risk Probability (continuous 0.00–1.00) is visually separated from Institutional Triage Classification (`At_Risk` vs `Low_Risk`).
   * Explicit governance copy clarifies: *"The 0.46 threshold is an administrative triage and resource-allocation policy, not a deterministic guarantee or certainty of an individual outcome."*
6. **Provenance & Fallback Transparency:**
   * Prediction timestamps (`processed_at`) are clearly surfaced with relative time badges.
   * Explicit provenance badges distinguish:
     - `FRESH LIVE INFERENCE` (direct from real-time model execution)
     - `HISTORICAL LOGGED PREDICTION` (loaded from `ml_inference_logs` / initial student snapshot)
     - `SYNTHETIC / OFFLINE DEMONSTRATION RECORD` (when running without active backend or on offline demo mocks)

---

## 2. Changes Made & Implementation Details

### 2.1 Backend Improvements
* **`app/api/v1/students.py`**:
  * Fixed observation dictionary lookup in student feature aggregation to accommodate both `{"val": ...}` and `{"value": ...}` key structures in `student_observations.value`.
  * Verified audit logging to `ml_inference_logs` table upon successful scoring.
* **`scripts/seed_demo_data.py`**:
  * Seeded the full 25 canonical Day-30 features for student `SYN-1007` from `docs/fixtures/demo_seed.json`, enabling reproducible end-to-end live inference against `sutra_dev.db`.

### 2.2 Frontend API & Types
* **`frontend/lib/types.ts`**:
  * Extended `MLPredictResponse` with `processed_at?: string` and `is_synthetic_fallback?: boolean`.
* **`frontend/lib/api.ts`**:
  * Tagged synthetic offline demo responses in `predictStudentRisk` and `predictRisk` with `is_synthetic_fallback: true` and ISO timestamp `processed_at`.
  * Ensured live HTTP errors (401, 403, 422, 500) throw standard Error objects with HTTP status attached so the UI handles real errors without masking.

### 2.3 Student 360 UI (`frontend/app/students/[id]/page.tsx`)
* **State Machine & Statuses:**
  * Added `mlInferenceStatus` state (`idle` | `loading` | `success` | `validation_error` | `auth_error` | `service_error`).
  * Added `mlInferenceError` structured object containing `status`, `code`, `message`, and `missingFeatures`.
  * Added `inferenceSeqRef` counter to guarantee that out-of-order network responses never overwrite newer inference calls.
* **Dynamic Threshold Contract:**
  * Added `api.ml.getModelInfo()` query on page load to retrieve active `decision_threshold` from the backend service.
  * Displays green verification check badge: `Threshold 0.46 (verified from backend configuration)`.
* **Provenance & Timestamps:**
  * Added `predictionProvenance` (`fresh` | `cached` | `synthetic`) and `predictionTimestamp`.
  * Prominently displayed badge in the card header:
    - `FRESH LIVE INFERENCE` (emerald badge)
    - `HISTORICAL LOGGED PREDICTION` (slate badge)
    - `SYNTHETIC / OFFLINE DEMONSTRATION RECORD` (amber warning badge)
* **Probability vs Classification Separation:**
  * Left pane: **Calibrated Risk Probability** gauge with model version `v1.0.0` and calibration type.
  * Right pane: **Institutional Triage Classification** with status tag, decision rule, and policy explanation note.

---

## 3. Verification & Test Matrix

### 3.1 Backend Integration Tests
New test suite: `tests/test_ml_ui_live_inference_reliability.py` (7 tests, 100% pass):
1. `test_backend_uses_existing_model_artifact_and_schema`:
   - Verifies model path `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`, model metadata, 25 feature schema, and 0.46 threshold.
2. `test_student_inference_success_live_scoring`:
   - Verifies `POST /api/v1/students/SYN-1007/predict` returns `200 OK`, valid risk probability (0.68), classification `At_Risk`, threshold 0.46, and persists record in `ml_inference_logs`.
3. `test_student_inference_missing_features_validation_error`:
   - Verifies `POST /api/v1/students/SYN-1008/predict` returns `422 Unprocessable Entity` with `INSUFFICIENT_FEATURES` and missing feature list.
4. `test_student_inference_unauthorized_access`:
   - Verifies unauthenticated request returns `401 Unauthorized`.
5. `test_student_inference_forbidden_non_campus_or_restricted_role`:
   - Verifies student/leadership forbidden access returns `403 Forbidden` (`LEADERSHIP_QUEUE_ACCESS_DENIED`).
6. `test_model_info_reports_verified_threshold_046`:
   - Verifies `GET /api/v1/ml/model-info` returns threshold `0.46` for dynamic frontend verification without drift.
7. `test_inference_logs_provenance_and_auditability`:
   - Verifies `ml_inference_logs` table records input hash, user ID, timestamp, and prediction output.

### 3.2 Full Test Suite Summary
| Test Suite | Command | Total | Passed | Failed |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Integration & Unit Tests** | `pytest tests/` | 146 | **146** | 0 |
| **Frontend Contract & E2E Tests** | `npm --prefix frontend test` | 14 suites (43 assertions) | **14 suites** | 0 |
| **Frontend TypeScript Typecheck** | `npx --prefix frontend tsc --noEmit` | N/A | **Clean (0 errors)** | 0 |
| **SUTRA CLI Test Suite** | `cargo test --manifest-path cli/Cargo.toml` | 55 | **55** | 0 |
| **Combined System Verification** | All test suites | **215 tests** | **215** | 0 |

---

## 4. Contract Conformance Summary

| Requirement | Implementation Verification | Status |
| :--- | :--- | :--- |
| 1. Student 360 calls authenticated backend | `POST /api/v1/students/{id}/predict` with Bearer token | PASS |
| 2. Backend uses existing model artifact & 25 schema | Model loaded from `ml/artifacts/models/v1.0.0/`; 25 Day-30 features | PASS |
| 3. Explicit lifecycle & error states | Loading spinner, 422 validation, 401/403 auth, 500 service errors | PASS |
| 4. Concurrency & race condition guards | Button disabled while loading; `inferenceSeqRef` discards stale async results | PASS |
| 5. Timestamps & provenance labeling | Surfaces `processed_at`; badges `FRESH`, `HISTORICAL`, `SYNTHETIC` | PASS |
| 6. Dynamic 0.46 threshold without drift | Queried from `GET /api/v1/ml/model-info`; confirmed by backend badge | PASS |
| 7. Separate probability & classification | Separate gauge & triage card; policy disclaimer displayed | PASS |
| 8. Synthetic demo clearly labelled | Never described as live institutional data; amber demo banner displayed | PASS |
| 9. No silent fallback conversion | Live API errors are caught, displayed, and never converted to fake success | PASS |

---

## 5. Artifacts & Code Modified

* `app/api/v1/students.py`
* `scripts/seed_demo_data.py`
* `frontend/lib/types.ts`
* `frontend/lib/api.ts`
* `frontend/app/students/[id]/page.tsx`
* `frontend/scripts/test-contract.mjs`
* `tests/test_ml_ui_live_inference_reliability.py`
* `docs/ML_UI_PHASE_2_REPORT.md`
