# SUTRA CLI — Phase 12 Implementation Report: Authorized Student-Specific ML Scoring

**Timestamp**: 2026-10-12  
**Status**: Completed  
**Branch**: `main`  
**Phase Objective**: Add authorized student-specific early-warning ML scoring via `sutra predict --student <ID_OR_REF>` while preserving file-based inference (`sutra predict --file <PATH>`), establishing strict mutual exclusion, server-side feature aggregation, cross-campus tenancy boundaries, 25-feature Day-30 completeness verification, anti-leakage defenses, and full audit logging.

---

## 1. Executive Summary & Design Decisions

In Phase 12, we completed the bridge between student identity, verified operational telemetry, and production ML inference without compromising data provenance, tenant boundaries, or ethical governance constraints:

1. **Client Vectors vs. Authoritative Student Records**:
   - The CLI command `sutra predict --student <ID_OR_REF>` accepts **only** a student identifier (UUID or external reference such as `SYN-1007`).
   - The CLI **never** sends client-supplied feature values when invoking `--student`.
   - The backend aggregates features strictly from the authenticated student's tenant observations in `StudentObservation`.
2. **Mutual Exclusion Invariant**:
   - `sutra predict --file <PATH>` and `sutra predict --student <ID_OR_REF>` are strictly mutually exclusive in Clap (`conflicts_with = "student"` and `conflicts_with = "file"`).
   - Attempting to pass both flags fails immediately with exit code 2 and a clear CLI usage error.
3. **Multi-Tenant Scoping & Non-Leaking Isolation**:
   - Lookups resolve via `_resolve_student_in_campus(student_id, campus_id, db)`.
   - If a student belongs to another campus, the endpoint returns `HTTP 404 Not Found` identical to a nonexistent record, preventing cross-tenant existence enumeration.
4. **Canonical Day-30 Feature & Anti-Leakage Defense**:
   - Exact 25 canonical features (19 numerical + 6 categorical) are required.
   - If any canonical feature is absent, inference is refused with `HTTP 422 Unprocessable Entity` (`code="INSUFFICIENT_FEATURES"`).
   - If any feature observation is marked `stale` or `missing`, inference is blocked with `code="STALE_FEATURES"`.
   - If forbidden target outcomes or post-cutoff scores (`final_result`, `is_at_risk`, `score`, etc.) exist in the student's telemetry ledger, inference is rejected with `code="LEAKAGE_DETECTED"`.
5. **Reusing Production ML Pipeline & Audit Logging**:
   - Leverages `ml_service.predict_single` (Logistic Regression Baseline v1.0.0, cutoff Day 30, threshold 0.46, Platt-calibrated).
   - Every execution is audited in `ml_inference_logs` with `institution_id`, `student_id`, `external_student_ref`, probability, threshold, and execution latency.
6. **Governance & Non-Causal Advisory Notice**:
   - Outputs clearly label the data source: `"Authorized Campus Operational Ledger (Server-side aggregated)"` vs. `"Validated Local Feature File (Canonical 25 Day-30 vector)"`.
   - Prominent disclaimer that predictions are non-diagnostic, statistical correlations only, adhering to the *No Alert Without Action* and *Human Oversight* invariants.
   - Predictions **never** automatically create, modify, or escalate support cases.

---

## 2. API Contract Specification

### 2.1 Backend Endpoint: `POST /api/v1/students/{student_id}/predict`
*Also aliased at `POST /api/v1/ml/predict/student/{student_id}` for ML service parity.*

- **Method**: `POST`
- **Path Parameters**: `student_id: str` (UUID or external reference e.g., `SYN-1007`)
- **Headers**:
  - `Authorization: Bearer <JWT>` (Must resolve to authorized role: `faculty`, `hod`, `mentor`, `institution_admin`, `counsellor`)
  - `X-Campus-Id: <UUID>` (Active campus tenancy)
- **Request Body**: Empty (No client vectors accepted)
- **Response**: `200 OK` (`MLPredictResponse`)
```json
{
  "external_student_ref": "SYN-1007",
  "risk_probability": 0.68,
  "threshold": 0.46,
  "classification": "At_Risk",
  "evidence_card": {
    "card_type": "ml_early_warning_evidence",
    "model_name": "logistic_regression_baseline",
    "model_version": "1.0.0",
    "prediction_cutoff": "Day 30",
    "risk_probability": 0.68,
    "threshold": 0.46,
    "classification": "At_Risk",
    "calibration_status": "platt_calibrated",
    "top_attributions": [
      {
        "feature": "vle_days_since_last_click",
        "value": 6.0,
        "attribution": 0.3265,
        "direction": "increases_risk"
      }
    ],
    "limitations": [
      "Trained on historical Open University course registrations; not calibrated for non-modular curricula.",
      "Early assessment grades were excluded to avoid temporal leakage.",
      "Represents statistical correlation, not causal certainty or personal diagnosis.",
      "Predictions must be reviewed by authorized educators before taking any supportive action."
    ]
  }
}
```

### 2.2 Error Responses
| HTTP Status | Error Code | Trigger Condition |
| :--- | :--- | :--- |
| `401 Unauthorized` | `UNAUTHORIZED` / `TOKEN_EXPIRED` | Missing, malformed, or expired JWT bearer token. |
| `403 Forbidden` | `LEADERSHIP_QUEUE_ACCESS_DENIED` / `ML_PREDICTION_ROLE_FORBIDDEN` | Caller has `leadership` role or lacks educator/advisor authorization. |
| `404 Not Found` | `STUDENT_NOT_FOUND` | Student ID does not exist OR belongs to another campus institution. |
| `422 Unprocessable` | `INSUFFICIENT_FEATURES` | Student lacks one or more of the 25 canonical Day-30 features. |
| `422 Unprocessable` | `STALE_FEATURES` | One or more canonical features has `quality_state == "stale"`. |
| `422 Unprocessable` | `LEAKAGE_DETECTED` | Student observation ledger contains post-cutoff or label leakage keys. |

---

## 3. CLI Command Specifications

### 3.1 Syntax
```bash
# Student-specific authorized scoring:
sutra predict --student <ID_OR_REF> [--campus <CAMPUS_UUID>] [--token <JWT>] [--url <BASE_URL>]

# File-based inference (unchanged):
sutra predict --file <PATH> [--campus <CAMPUS_UUID>] [--token <JWT>] [--url <BASE_URL>]
```

### 3.2 Mutual Exclusion Rule
`--file` and `--student` cannot be combined:
```bash
$ sutra predict --file test.json --student SYN-1007
error: the argument '--file <FILE>' cannot be used with '--student <STUDENT>'
```

### 3.3 Sample Terminal Output
```text
=== SUTRA Student-Specific Early Warning Prediction ===
Target Student:      SYN-1007
Campus Tenancy:      00000000-0000-0000-0000-000000000001
Source Policy:       Server-side observation ledger aggregation only
Evaluation Cutoff:   Strict Day 30 post-enrollment

Requesting authorized inference from backend server...

================================================================================
SUTRA EARLY WARNING PREDICTION (Day-30 Baseline Model)
================================================================================
Data Source:         Authorized Campus Operational Ledger (Server-side aggregated)
Record Reference:    SYN-1007
Model Pipeline:      logistic_regression_baseline (version: 1.0.0)
Prediction Cutoff:   Day 30
Calibration:         platt_calibrated

Risk Probability:    [====================          ] 68.0%
Decision Threshold:  46.0%
Classification:      [AT RISK • REVIEW RECOMMENDED]

TOP RISK DRIVERS (Increases Risk Weight):
  ▲ vle_days_since_last_click      observed: 6.0      (weight: +0.3265)
  ▲ assessments_submitted_d30      observed: 1.0      (weight: +0.1420)

TOP PROTECTIVE FACTORS (Decreases Risk Weight):
  ▼ highest_education              observed: A Level  (weight: -0.2617)

MODEL GOVERNANCE LIMITATIONS:
  • Trained on historical Open University course registrations; not calibrated for non-modular curricula.
  • Early assessment grades were excluded to avoid temporal leakage.
  • Represents statistical correlation, not causal certainty or personal diagnosis.
  • Predictions must be reviewed by authorized educators before taking any supportive action.

NON-CAUSAL ADVISORY DISCLAIMER:
  • Empirical statistical prediction based on historical Day-30 course interactions.
  • Does NOT constitute a clinical diagnosis, an ability assessment, or certainty of student outcome.
  • Principle 'No Alert Without Action': Any follow-up requires verified educator review.
  • Human Oversight Invariant: Predictions are decision-support only. Never automate case creation, escalation, or sanctions based on a model score alone.
================================================================================
```

---

## 4. Source & Architecture Blockers: Institutional vs. OULAD Telemetry

As verified in Phases 10, 11, and 12:
- **Canonical Model Requirements**: SUTRA's active production baseline (`LogisticRegressionBaseline v1.0.0`) was trained on Open University Learning Analytics Dataset (OULAD) with Day-30 post-start cutoffs, requiring 12 clickstream features (`vle_total_clicks_d30`, `vle_active_days_d30`, `vle_clicks_oucontent_d30`, etc.).
- **Institutional Telemetry Reality**: Modern higher-education LMS and campus ERPs typically capture coarse attendance percentages, assignment counts, and LMS submission timestamps, but do NOT capture per-resource clickstream frequency or forumng interactions.
- **Governed Blocker Resolution**:
  - For institutional students with only attendance/assignment observations (`STU-ATTEND-ONLY`), the backend refuses inference with `INSUFFICIENT_FEATURES` and directs the user to `sutra students readiness <ID>`.
  - Synthetic demonstration profiles (`SYN-1007`) that provide all 25 canonical features can be successfully scored to demonstrate model mechanics.
  - SUTRA **refuses to fabricate or impute** missing VLE interaction counts with random numbers or default values.

---

## 5. Verification & Testing

### 5.1 Backend Pytest Integration Suite (`tests/test_student_predict.py`)
6 automated integration tests covering all failure and success modes:
1. `test_student_predict_valid_authorized_scoring`: Verifies scoring of student with all 25 features, evidence card generation, and audit logging into `ml_inference_logs`.
2. `test_parity_with_file_based_inference`: Verifies that server-side aggregated student prediction produces identical numerical probability, threshold, and classification to `/ml/predict` file-based inference for the exact same feature vector.
3. `test_student_predict_insufficient_features_rejection`: Confirms HTTP 422 with `INSUFFICIENT_FEATURES` when campus student has attendance but lacks VLE clickstream inputs.
4. `test_student_predict_stale_features_rejection`: Confirms HTTP 422 with `STALE_FEATURES` when telemetry is marked stale.
5. `test_student_predict_anti_leakage_rejection`: Confirms HTTP 422 with `LEAKAGE_DETECTED` when post-cutoff target features are detected in the student ledger.
6. `test_student_predict_authorization_and_isolation`: Validates 404 cross-campus isolation, 403 leadership role rejection, and 401 unauthenticated requests.

**Pytest Results**: **121 passed, 0 failed** in 3.09s across the entire project test suite.

### 5.2 Rust CLI Unit Suite (`cli/tests/predict_tests.rs`)
8 unit tests covering client models, features validation, anti-leakage, and CLI arguments:
1. `test_cli_predict_flags_mutual_exclusion`: Verifies Clap mutual exclusion between `--file` and `--student`.
2. `test_valid_canonical_feature_record_parsing`: Validates canonical 25-feature parsing.
3. `test_rejection_of_anti_leakage_forbidden_features`: Validates client-side leakage checks.
4. `test_rejection_of_missing_features`: Validates missing feature detection.
5. `test_rejection_of_invalid_feature_types`: Validates categorical vs. numeric type checks.
6. `test_rejection_of_invalid_cutoff_days`: Validates cutoff day constraints.
7. `test_demo_seed_fixture_structure_support`: Validates fixture vector parsing.
8. `test_ml_predict_response_dto_deserialization`: Validates Evidence Card and attribution deserialization.

**Cargo Test Results**: **47 passed, 0 failed** across all 7 Rust integration test suites.

### 5.3 Live CLI End-to-End Suite (`scratch/run_phase12_live_verification.py`)
Tested against a live background FastAPI server with all 10 target scenarios:
- [x] Scenario 1: `sutra predict --student SYN-1007` -> 200 OK, full advisory Evidence Card output.
- [x] Scenario 2: `sutra predict --file docs/fixtures/demo_seed.json` -> 200 OK, identical risk probability (68.0%) and threshold (46.0%).
- [x] Scenario 3: `sutra predict --file docs/fixtures/demo_seed.json --student SYN-1007` -> Exit code 2, mutual exclusion error.
- [x] Scenario 4: `sutra predict --student STU-ATTEND-ONLY` -> Exit code 1, HTTP 422 `INSUFFICIENT_FEATURES`.
- [x] Scenario 5: `sutra predict --student STU-STALE` -> Exit code 1, HTTP 422 `STALE_FEATURES`.
- [x] Scenario 6: `sutra predict --student STU-LEAKED` -> Exit code 1, HTTP 422 `LEAKAGE_DETECTED`.
- [x] Scenario 7: `sutra predict --student STU-BETA-77` -> Exit code 1, HTTP 404 (non-leaking cross-campus isolation).
- [x] Scenario 8: `sutra predict --student STU-NON-EXISTENT` -> Exit code 1, HTTP 404.
- [x] Scenario 9: `sutra predict --student SYN-1007` (leadership role) -> Exit code 1, HTTP 403 `LEADERSHIP_QUEUE_ACCESS_DENIED`.
- [x] Scenario 10: `sutra predict --student SYN-1007` (expired token) -> Exit code 1, HTTP 401 Unauthorized.

---

## 6. Changed Files Summary

| File Path | Description of Changes |
| :--- | :--- |
| `app/api/v1/students.py` | Added `POST /{student_id}/predict` endpoint with campus scoping, role gating, 25-feature ledger aggregation, freshness verification, anti-leakage audit, ML inference, and DB audit logging. |
| `app/api/v1/ml.py` | Added `POST /predict/student/{student_id}` alias routing to `predict_student_single`. |
| `cli/src/main.rs` | Updated `PredictArgs` with mutually exclusive `file` and `student` flags via Clap attributes, and updated execution dispatch. |
| `cli/src/commands/predict.rs` | Added `execute_student_predict_flow`, updated `render_prediction_response` to accept and display data source type. |
| `cli/src/client.rs` | Added `predict_student(student_id_or_ref)` HTTP request method with tenancy header and error translation. |
| `cli/tests/predict_tests.rs` | Added `test_cli_predict_flags_mutual_exclusion` for CLI option verification. |
| `tests/test_student_predict.py` | New comprehensive integration test suite covering 6 backend scoring scenarios. |
| `CLI_PHASE_12_REPORT.md` | Master documentation report for Phase 12. |

---

## 7. Compliance Invariants Checklist

- [x] `sutra predict --file <PATH>` preserved and 100% operational with identical behavior.
- [x] Mutually exclusive CLI options enforced via Clap.
- [x] Server-side feature retrieval only; client cannot supply unverified feature vectors for a student.
- [x] Cross-campus isolation strictly preserved with non-leaking HTTP 404 errors.
- [x] Role restrictions enforced (leadership blocked from individual student inference; educators authorized).
- [x] Strict anti-leakage defense rejects post-cutoff target features.
- [x] Output prominently labels prediction as advisory, non-causal, non-diagnostic.
- [x] Audit record persisted to `ml_inference_logs` for every authorized inference event.
- [x] No automatic support case creation or state changes triggered by model scores.
- [x] Zero feature fabrication: missing features return clear 422 errors instead of silent imputation.
- [x] Phase 13 has NOT been started.
