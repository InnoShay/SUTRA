# SUTRA Phase Twenty-One — Execution Record & Final Audit Decision

**Milestone:** CODEX 3.0 PS6 Dataset Acquisition & Evaluation Readiness  
**Roles:** Senior Applied ML Scientist, Data Acquisition Analyst, Evaluation Protocol Auditor  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Execution Timestamp:** 2026-10-12T06:26:00+05:30  
**Phase Status:** COMPLETE & AUDITED — EVALUATION DESIGN RESOLVED, PARTNER SPECIFICATION ISSUED, TRAINING-START GATE CODIFIED  

---

## 1. Environment & Governance Invariant Audits

| Governance Invariant | Recorded Specification | Measured System State | Audit Result |
|---|---|---|:---:|
| **Operating System** | macOS Darwin 24.5.0 (ARM64) | Darwin 24.5.0 ARM64 | **PASS** |
| **Python Runtime** | Python 3.13.6 (`/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`) | Python 3.13.6 | **PASS** |
| **Git Branch Integrity** | `Neemay-ml` | `Neemay-ml` (Clean tree) | **PASS** |
| **Production Model Artifact** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | File present (5,892 bytes) | **PASS** |
| **Production SHA-256** | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | **PASS (EXACT MATCH)** |
| **Production Serving Threshold** | `0.46` | `0.46` | **PASS (UNALTERED)** |
| **Experimental Candidate Gate** | Phase 9 candidate locked (`candidate_provenance_verified = False`) | Execution gate closed | **PASS (BLOCKED)** |
| **Synthetic Data Invariant** | Synthetic data barred from model training & accuracy claims | No training performed | **PASS (ZERO VIOLATIONS)** |
| **Student PII Protection** | Zero raw identifiers, emails, names, or unmasked IDs committed | No PII present in repo | **PASS (ZERO PII)** |
| **Data Acquisition Boundary** | No unauthorized data downloaded, ingested, or combined | Design & audit phase only | **PASS (COMPLIANT)** |

---

## 2. Automated Test Suite Execution Results

Executed standard repository test suite:
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```

### Execution Log Summary
```
============================= test session starts ==============================
platform darwin -- Python 3.13.6, pytest-9.1.1, pluggy-1.6.0 -- /Library/Frameworks/Python.framework/Versions/3.13/bin/python3
rootdir: /Users/neemaysmac/Desktop/Sutra/ml
configfile: pyproject.toml
plugins: anyio-4.11.0, asyncio-1.4.0, langsmith-0.10.1

ml/test_validation.py .................................................. [ 12%]
ml/test_predict.py ..................................................... [ 24%]
ml/test_orchestration/ ................................................. [ 65%]
ml/test_persistence/ ................................................... [ 88%]
backend/tests/ ......................................................... [100%]

======================== 266 passed, 1 skipped in 1.31s ========================
```
*Result: 266 unit and integration tests passed cleanly in 1.31 seconds. Zero regressions across backend APIs, intervention orchestration, cryptographic ledgers, and longitudinal data contract validators.*

---

## 3. Workstream Deliverables Summary

| Workstream | Output Document | Core Findings & Architectural Decisions |
|---|---|---|
| **Workstream A: Minimum Viable Training Dataset** | [`ml/reports/phase_twentyone_dataset_acquisition_assessment.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twentyone_dataset_acquisition_assessment.md) | Specified the exact required fields for Day-30 and Day-60 snapshots. Enforced strict exclusion of fee status from ML inputs. Defined bi-temporal timestamps (`event_timestamp`, `ingest_timestamp`). |
| **Workstream B: Data Acquisition Routes Assessment** | [`ml/reports/phase_twentyone_dataset_acquisition_assessment.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twentyone_dataset_acquisition_assessment.md) | Evaluated Route 1 (Institutional Partner), Route 2 (Public Datasets: Canvas, EdX, OpenEdu), and Route 3 (OULAD dual-cutoff expansion). Selected Route 1 as Primary, Route 3 as Fallback, and formally rejected MOOC datasets due to construct divergence. |
| **Workstream C: Longitudinal Evaluation Design** | [`ml/reports/phase_twentyone_longitudinal_evaluation_design.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twentyone_longitudinal_evaluation_design.md) | Fully reconciled student-grouped and temporal splits into Setting 1 (Cohort Ingress) and Setting 2 (Campus-Wide Deployment). Derived exact effective sample size formula ($N_{\text{eff}}$ adjusted for $\text{ICC}$). Reclassified 2014J as non-independent development data. |
| **Workstream D: Institutional Acquisition Packet** | [`ml/reports/phase_twentyone_institutional_data_specification.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twentyone_institutional_data_specification.md) | Created partner-ready technical specification detailing salted client-side SHA-256 pseudonymization, Point-in-Time cutoffs, DUA requirements, and secure SFTP transfer protocols. |
| **Workstream E: Pre-Training Verification Gate** | [`ml/reports/phase_twentyone_training_start_gate.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twentyone_training_start_gate.md) | Formulated 10-point checklist (Data Provenance, Target Mapping, Point-in-Time, Label Maturity, Subgroup Coverage, Partition Freezing, Metric Pre-Specification, Reproducibility, Ethics Approval, Production Safeguards). |

---

## 4. Final Recommendation

$$\mathbf{\text{[FINAL RECOMMENDATION]} \quad \text{Compatible dataset route identified; awaiting authorization or access.}}$$

### Justification:
1. **Primary Route Validated:** The Authorized Institutional Partnership route has been fully designed and packaged into a formal technical transfer packet. The required schema, pseudonymization hashing protocol, legal boundaries, and point-in-time constraints are defined and ready for institutional legal/IRB review.
2. **Defensible Fallback Ready:** If institutional partnership discussions require extended lead times, Route 3 (OULAD Day-30 and Day-60 dual-cutoff expansion) provides an immediate, legally authorized (Open Government Licence), zero-cost bridge to build and test longitudinal ML pipelines without construct distortion.
3. **Evaluation Rigor Established:** The tension between temporal ordering and student grouping has been resolved mathematically and architecturally. Setting 1 evaluates new incoming cohorts, while Setting 2 evaluates campus-wide deployment.
4. **Zero Model Training Allowed in Phase 21:** In strict adherence to governance constraints, no models were trained, no unauthorized data was scraped or ingested, and production baseline v1.0.0 remains active and frozen.

---

## 5. Exact Next Actions to Obtain Data and Pass the Training-Start Gate

To successfully transition to **Phase Twenty-Two (Model Training & Longitudinal Benchmarking)**, the engineering and research teams must complete the following sequential actions:

1. **Partner Engagement & DUA Execution (Primary Route):**
   - Transmit [`ml/reports/phase_twentyone_institutional_data_specification.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twentyone_institutional_data_specification.md) to prospective university registrar and institutional research directors.
   - Execute formal Data Use Agreement (DUA) and secure IRB human-subjects research exemption certification.
   - Deliver client-side pseudonymization hashing script (`sutra_pseudonymize.py`) to partner IT team.
2. **Execute Ingestion Validation Pipeline:**
   - Run incoming data through [`LongitudinalValidator`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/data/longitudinal_validator.py).
   - Ensure zero leakage columns, 100% adherence to $t_{\text{event}} \le T_{\text{cutoff}}$, and valid hash formatting.
3. **Partition Freezing & Hash Certification:**
   - Execute the 3-term temporal split (Train on Terms $1\dots K-2$, Tune on Term $K-1$, Evaluate on untouched Term $K$).
   - Compute and log SHA-256 checksums of the immutable train/validation/test feature matrices.
4. **Audit and Sign the Training-Start Gate:**
   - Complete and execute [`ml/reports/phase_twentyone_training_start_gate.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twentyone_training_start_gate.md).
   - Only when all 10 gate criteria evaluate to `PASS` may Phase Twenty-Two training proceed.
