# SUTRA CLI — Phase 3B.1: Root Prediction Compatibility Route Security Fix

**Date:** 2026-10-12  
**Engineer / Role:** Senior Systems Security & ML Infrastructure Engineer  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Scope:** Hardening and parity alignment of root compatibility routes (`/predict`, `/predict/batch`, `/model-info`) in `app/main.py`.  
**Final Verdict:** **`SECURITY FIX VERIFIED`**  

---

## 1. Executive Summary

In Phase 3A, the security audit revealed a critical vulnerability: while the canonical ML route `POST /api/v1/ml/predict` enforced JWT verification, role authorization, campus scoping, and database audit logging, the root backwards-compatibility route `POST /predict` (mounted in `app/main.py:135`) had **zero authentication, no role checks, no campus scoping, and no audit logging**.

In Phase 3B.1, this bypass has been completely eliminated. The root routes in `app/main.py` (`POST /predict`, `POST /predict/batch`, `GET /model-info`) now delegate directly to the canonical route handlers in `app/api/v1/ml.py`:
- `predict_single`
- `predict_batch`
- `get_model_info`

Because both endpoints now share the exact same underlying FastAPI dependency tree, neither route can bypass security controls. All 10 security regression tests pass in `tests/test_ml_root_security.py`, all 96 backend tests pass in pytest, and live execution confirms that unauthenticated requests to `/predict` are rejected with `HTTP 401 Unauthorized`.

---

## 2. Changed Files & Implementation Details

### 2.1 Code Changes

#### 1. [`app/main.py`](file:///Users/neemaysmac/Desktop/Sutra/app/main.py)
Replaced the unauthenticated stub handlers in `app/main.py` with direct delegations to canonical route handlers in `app/api/v1/ml.py`:

```python
# Root-level backwards compatibility route aliases (ADR-005, ADR-001)
# Secured per Phase 3B.1: Root compatibility routes delegate to the canonical
# ML route handlers to guarantee identical authentication, campus scoping,
# role authorization, and audit logging.
from typing import Any, Dict, List
from app.api.v1.ml import get_model_info, predict_batch, predict_single
from app.schemas.ml import MLPredictResponse

app.add_api_route(
    "/model-info",
    get_model_info,
    methods=["GET"],
    response_model=Dict[str, Any],
    tags=["ML Compatibility"],
    summary="Root compatibility alias for ML model info",
)
app.add_api_route(
    "/predict",
    predict_single,
    methods=["POST"],
    response_model=MLPredictResponse,
    tags=["ML Compatibility"],
    summary="Root compatibility alias for ML single prediction",
)
app.add_api_route(
    "/predict/batch",
    predict_batch,
    methods=["POST"],
    response_model=List[MLPredictResponse],
    tags=["ML Compatibility"],
    summary="Root compatibility alias for ML batch prediction",
)
```

#### 2. [`tests/test_ml_integration.py`](file:///Users/neemaysmac/Desktop/Sutra/tests/test_ml_integration.py)
Updated `test_model_version_threshold_traceability_and_root_aliases` to explicitly test that unauthenticated requests to `/model-info` and `/predict` return `401 Unauthorized`, and that authenticated requests with `X-Campus-Id` succeed.

#### 3. [`tests/test_ml_root_security.py`](file:///Users/neemaysmac/Desktop/Sutra/tests/test_ml_root_security.py) (New)
Added a comprehensive 10-test regression suite verifying:
- Rejection of missing credentials (401)
- Rejection of expired and tampered JWTs (401)
- Rejection of inactive campus memberships (403)
- Rejection of cross-campus access attempts (403)
- Rejection of unauthorized roles (e.g. `student`) (403)
- Rejection of missing or malformed `X-Campus-Id` (400/422)
- Rejection of target outcome leakage (`final_result`) and schema violations (422)
- Execution of inference audit logging in `ml_inference_logs`
- Strict parity of prediction probabilities and Evidence Cards between `/api/v1/ml/predict` and `/predict`
- Authorization enforcement on `/predict/batch`

---

## 3. Effective Security Controls on Both Routes

| Security Dimension | Canonical `POST /api/v1/ml/predict` | Compatibility `POST /predict` | Parity Status |
| :--- | :--- | :--- | :--- |
| **Authentication Dependency** | `Depends(require_role(...))` | `Depends(require_role(...))` | ✅ **Identical** (Shared handler) |
| **JWT Verification** | Supabase signature, expiration, active user | Supabase signature, expiration, active user | ✅ **Identical** |
| **Role Authorization** | Gated to `"faculty"`, `"hod"`, `"mentor"`, `"institution_admin"` | Gated to `"faculty"`, `"hod"`, `"mentor"`, `"institution_admin"` | ✅ **Identical** |
| **Campus Tenant Scoping** | `Depends(require_campus_access)` via `X-Campus-Id` | `Depends(require_campus_access)` via `X-Campus-Id` | ✅ **Identical** |
| **Feature Schema Validation** | `MLPredictRequest` (25 canonical features, finite numbers) | `MLPredictRequest` (25 canonical features, finite numbers) | ✅ **Identical** |
| **Temporal Anti-Leakage** | Rejects `final_result`, `is_at_risk`, post-cutoff scores | Rejects `final_result`, `is_at_risk`, post-cutoff scores | ✅ **Identical** |
| **Decision Threshold** | `0.46` (Day-30 baseline) | `0.46` (Day-30 baseline) | ✅ **Identical** |
| **Inference Engine** | `baseline_logistic_regression.joblib` (v1.0.0) | `baseline_logistic_regression.joblib` (v1.0.0) | ✅ **Identical** |
| **Audit Logging** | Persisted to `ml_inference_logs` with `latency_ms` | Persisted to `ml_inference_logs` with `latency_ms` | ✅ **Identical** |

---

## 4. Test Execution & Verification Evidence

### 4.1 Pytest Security Regression Suite (`tests/test_ml_root_security.py`)
```text
$ PYTHONPATH=ml/src:. pytest tests/test_ml_root_security.py
============================= test session starts ==============================
collected 10 items

tests/test_ml_root_security.py::test_root_predict_rejects_missing_credentials PASSED
tests/test_ml_root_security.py::test_root_predict_rejects_expired_and_invalid_jwts PASSED
tests/test_ml_root_security.py::test_root_predict_rejects_inactive_membership PASSED
tests/test_ml_root_security.py::test_root_predict_rejects_cross_campus_unauthorized_access PASSED
tests/test_ml_root_security.py::test_root_predict_rejects_disallowed_role PASSED
tests/test_ml_root_security.py::test_root_predict_rejects_missing_or_invalid_campus_header PASSED
tests/test_ml_root_security.py::test_root_predict_rejects_leakage_and_invalid_schema PASSED
tests/test_ml_root_security.py::test_root_predict_successful_execution_and_audit_logging PASSED
tests/test_ml_root_security.py::test_root_predict_and_canonical_predict_parity PASSED
tests/test_ml_root_security.py::test_root_predict_batch_security_and_execution PASSED

============================== 10 passed in 0.26s ==============================
```

### 4.2 Full Backend Pytest Suite
```text
$ PYTHONPATH=ml/src:. pytest
============================== 96 passed in 2.12s ==============================
```

### 4.3 Full CLI Cargo Test Suite
```text
$ cargo test --manifest-path cli/Cargo.toml
     Running tests/cli_tests.rs      (7 passed; 0 failed)
     Running tests/predict_tests.rs  (7 passed; 0 failed)
     Running tests/session_tests.rs  (7 passed; 0 failed)
test result: ok. 21 passed; 0 failed; 0 ignored
```

### 4.4 Live HTTP Endpoint Probes (Local Daemon Port 8005)
```bash
# 1. Unauthenticated POST /predict -> Returns 401
$ curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8005/predict \
  -H "Content-Type: application/json" -d '{"external_student_ref": "SYN-1007", "cutoff_days": 30, "features": {}}'
401

# 2. Unauthenticated GET /model-info -> Returns 401
$ curl -s -o /dev/null -w "%{http_code}\n" -X GET http://127.0.0.1:8005/model-info
401

# 3. Authenticated GET /model-info -> Returns 200 with model governance metadata
$ curl -s -X GET http://127.0.0.1:8005/model-info -H "Authorization: Bearer $TOKEN"
{"model_name":"Logistic Regression","model_version":"1.0.0","status":"ready","threshold":0.46...}

# 4. Authenticated POST /predict missing X-Campus-Id -> Returns 400
$ curl -s -o /dev/null -w "%{http_code}\n" -X POST http://127.0.0.1:8005/predict \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"external_student_ref": "SYN-1007", "cutoff_days": 30, "features": {}}'
400
```

---

## 5. Compatibility Implications for Existing Consumers

1. **Scripts and Legacy Clients Calling `/predict` Anonymously:**
   - Any external script or tool previously calling `/predict` without an `Authorization: Bearer <JWT>` header or without `X-Campus-Id` will now receive `HTTP 401 Unauthorized` or `HTTP 400 Bad Request`.
   - **Migration Requirement:** Clients must include a valid Supabase JWT and the active institution UUID in `X-Campus-Id`.
2. **SUTRA Rust CLI (`sutra-cli`):**
   - The CLI client ([`cli/src/client.rs`](file:///Users/neemaysmac/Desktop/Sutra/cli/src/client.rs#L324)) already includes `Authorization` and `X-Campus-Id` headers on both primary and fallback URLs. No CLI updates are required.
3. **Audit Logging Requirement:**
   - Because `/predict` now executes the full audit logging pipeline, requests require an active database connection to log into `ml_inference_logs`. Headless tests running without SQLite or PostgreSQL dependency injection must provide a valid session or mock.

---

## 6. Remaining Risks & Phase 3B.2 Scope

1. **Student Feature Pipeline (Blocker 1 from Phase 3A):**
   - This phase intentionally addressed **only** the `/predict` route security gap.
   - The primary data blocker remains: PostgreSQL `students` and `student_observations` tables do **not** store the 25 canonical OULAD Day-30 features required for inference.
   - `sutra student score <ID>` and `POST /api/v1/students/{id}/score` must **not** be implemented until a reliable student-feature data pipeline or feature store is defined.

---

## 7. Final Verdict

### **Verdict: `SECURITY FIX VERIFIED`**

- Unauthenticated `/predict` bypass is permanently closed.
- Both routes enforce identical security, campus isolation, anti-leakage guards, and audit logging.
- 96 backend tests and 21 CLI tests pass.
- Zero student scoring routes or synthetic feature stores were added.
