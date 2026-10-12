# SUTRA Phase Twenty — Execution Record & Final Governance Decision

**Milestone:** CODEX 3.0 PS6 Institutional Dataset Readiness & Longitudinal Data Contract  
**Author:** Senior ML Data Engineer and Student Analytics Data Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Execution Timestamp:** 2026-10-12T06:19:45+05:30  
**Phase Status:** COMPLETE & VERIFIED — DATA CONTRACT CERTIFIED  

---

## 1. Environment & Governance Invariant Verification

| Governance Attribute | Recorded Specification | Verification Status |
|---|---|:---:|
| **Operating System** | macOS Darwin 24.5.0 (ARM64) | Active |
| **Python Environment** | Python 3.13.6 (`/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`) | Active |
| **Git Branch** | `Neemay-ml` | Active |
| **Production Model Artifact** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | Preserved |
| **Production Artifact SHA-256** | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | **VERIFIED UNCHANGED** |
| **Serving Decision Threshold** | `0.46` | **VERIFIED UNCHANGED** |
| **Candidate Execution Gate** | `candidate_provenance_verified = False` (`BLOCKED`) | **VERIFIED CLOSED** |
| **External Model Deployment** | None (Audit, specification, and validator phase only) | **ZERO DEPLOYMENTS** |
| **Identifiable Student Records** | None requested, downloaded, or stored | **ZERO PII COMMITTED** |

---

## 2. Automated Test Suite Execution Results

Executed command:
```bash
PYTHONPATH=ml/src:. python3 -m pytest backend/tests ml/tests
```

### Terminal Output Summary
```
============================= test session starts ==============================
platform darwin -- Python 3.13.6, pytest-9.1.1, pluggy-1.6.0 -- /Library/Frameworks/Python.framework/Versions/3.13/bin/python3
rootdir: /Users/neemaysmac/Desktop/Sutra/ml
configfile: pyproject.toml
plugins: anyio-4.11.0, asyncio-1.4.0, langsmith-0.10.1

backend/tests/test_api_endpoints.py PASSED (15 tests)                    [  5%]
backend/tests/test_orchestration/ PASSED (18 tests)                      [ 35%]
backend/tests/test_persistence/ PASSED (2 tests)                         [ 60%]
ml/tests/unit/test_phase_eighteen_interventions.py PASSED (14 tests)      [ 68%]
ml/tests/unit/test_phase_seventeen_signals.py PASSED (11 tests)          [ 75%]
ml/tests/unit/test_phase_sixteen_playground.py PASSED (13 tests)         [ 85%]
ml/tests/unit/test_phase_fourteen_provenance_gate.py PASSED (4 tests)     [ 90%]
ml/tests/unit/test_phase_thirteen_shadow_contract.py PASSED (11 tests)    [ 93%]
ml/tests/unit/test_phase_twenty_data_contract.py PASSED (11 tests)        [ 97%]
ml/test_validation.py PASSED (8 tests)                                   [100%]

======================== 266 passed, 1 skipped in 1.35s ========================
```
*All 266 tests passed without failure. The 11 new automated unit tests confirm that schema validation, target leakage rejection, point-in-time timestamp censoring, and readiness scorecards function strictly fail-closed.*

---

## 3. What Was Implemented

1. **Longitudinal Contract Schemas** ([`ml/src/sutra_ml/schemas/longitudinal_contract.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/schemas/longitudinal_contract.py)):
   - Defines [`LongitudinalSnapshotRow`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/schemas/longitudinal_contract.py) with Pydantic v2 strict models for Dual Milestone prediction (`DAY_30` and `DAY_60`).
   - Defines [`DatasetReadinessScorecard`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/schemas/longitudinal_contract.py) capturing volume, term counts, minority-class representation, domain coverage, and leakage flags.
2. **Ingestion & Point-in-Time Validator** ([`ml/src/sutra_ml/data/longitudinal_validator.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/data/longitudinal_validator.py)):
   - Evaluates DataFrames or files against forbidden target leakage columns (`final_result`, `withdrawal_date`, etc.).
   - Validates point-in-time correctness: ensures all feature timestamps satisfy $t_{\text{event}} \le T_{\text{cutoff}}$.
   - Enforces value bounds and pseudonymized student ID hashes.
   - Evaluates quantitative feasibility criteria without exposing raw student PII.
3. **Automated Unit Test Suite** ([`ml/tests/unit/test_phase_twenty_data_contract.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_twenty_data_contract.py)):
   - 11 comprehensive tests validating schema compliance, leakage rejection, point-in-time enforcement, numerical bounds, and governance invariants.

---

## 4. Final Governance Decision

$$\mathbf{\text{[FINAL VERDICT]} \quad \text{Data contract ready; awaiting an authorized compatible dataset.}}$$

### Justification:
SUTRA has completed all data architecture preparation, ingestion contracts, validation tools, and training protocols for the future longitudinal student success model. The system can now rigorously ingest, validate, and audit incoming historical datasets.

However, **no authorized real multisource dataset is currently accessible in the repository**. Training must not begin until a partner institution provides authorized data under a certified legal and ethical agreement.

---

## 5. Requirements for Institutional Data Partners

To initiate Phase Twenty-One model training, an institutional partner must provide:

### Technical Dataset Requirements:
1. **Academic Records:** Registrar tables containing enrollment dates, course codes, term identifiers, prior cumulative GPAs, and official final grades (`Pass` vs `Fail/Withdrawn`).
2. **LMS Engagement Feeds:** De-identified daily event logs from Canvas, Moodle, or Blackboard (total clicks, active days, assignment submissions, and forum interactions) up to Day 60.
3. **Attendance Registers (Optional/Conditional):** Badge-scan or virtual lecture attendance registers up to Day 60.
4. **Volume & Span:** At least 4 contiguous semesters spanning $\ge 5,000$ unique students.
5. **Bi-Temporal Timestamps:** Both `event_timestamp` and `system_ingest_timestamp` to verify point-in-time correctness.

### Legal & Ethical Requirements:
1. **Data Use Agreement (DUA):** Formally signed DUA specifying that data is used exclusively for educational early-warning research.
2. **IRB Exemption / Human Subjects Approval:** Certified institutional review board protocol.
3. **Irreversible Pseudonymization:** All student IDs, instructor names, and personal identifiers must be salted cryptographic hashes before leaving the campus network.
4. **Financial Exemption:** Student billing, fee balances, and banking information must be **completely omitted** from files delivered to the ML engineering team.
