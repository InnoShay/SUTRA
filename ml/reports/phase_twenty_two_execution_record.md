# SUTRA Phase Twenty-Two — Execution Record & Final Governance Audit

**Milestone:** CODEX 3.0 PS6 OULAD Dual-Cutoff Academic Forecasting Research  
**Roles:** Senior Applied ML Scientist, Temporal Evaluation Engineer  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Execution Timestamp:** 2026-10-12T06:37:00+05:30  
**Phase Status:** COMPLETE & VERIFIED — RESEARCH PIPELINES VALIDATED & ARTIFACTS FROZEN  

---

## 1. Environment & Governance Invariant Audits

| Governance Invariant | Recorded Specification | Measured System State | Audit Result |
|---|---|---|:---:|
| **Operating System** | macOS Darwin 24.5.0 (ARM64) | Darwin 24.5.0 ARM64 | **PASS** |
| **Python Runtime** | Python 3.13.6 (`/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`) | Python 3.13.6 | **PASS** |
| **Git Branch Integrity** | `Neemay-ml` | `Neemay-ml` (Clean tree) | **PASS** |
| **Production Model Artifact** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | File present (5,892 bytes) | **PASS** |
| **Production SHA-256** | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | **PASS (EXACT MATCH)** |
| **Production Decision Threshold** | `0.46` | `0.46` | **PASS (UNALTERED)** |
| **Experimental Candidate Gate** | Phase 9 candidate locked (`candidate_provenance_verified = False`) | `BLOCKED_UNVERIFIED_DISCREPANCY` | **PASS (CLOSED)** |
| **Assessment Marks Safeguard** | Assessment scores excluded from Day-30 and Day-60 predictors | Zero score/grade features in datasets | **PASS (VERIFIED)** |
| **Synthetic Data Invariant** | Synthetic data barred from model training & accuracy claims | Models trained strictly on OULAD | **PASS (ZERO VIOLATIONS)** |
| **Target Isolation Invariant** | Final result & withdrawal date excluded from feature matrix | 100% isolated to labels | **PASS (COMPLIANT)** |
| **Student Privacy Invariant** | Zero student PII or raw identifiers committed to repo | Hashes / integer IDs only | **PASS (ZERO PII)** |
| **Production Promotion Boundary** | No models promoted or deployed to production in this phase | Research artifacts isolated in experiment dir | **PASS (ISOLATED)** |

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

backend/tests/ ......................................................... [ 15%]
ml/test_validation.py .................................................. [ 25%]
ml/test_predict.py ..................................................... [ 38%]
ml/test_orchestration/ ................................................. [ 68%]
ml/test_persistence/ ................................................... [ 82%]
ml/tests/unit/test_phase_twenty_two_forecasting.py ..................... [ 97%]
ml/tests/unit/ ......................................................... [100%]

======================== 275 passed, 1 skipped in 1.50s ========================
```
*Result: 275 tests passed without failure (9 new unit tests verifying Phase Twenty-Two cutoff boundaries, score omission, point-in-time censoring, target isolation, student grouping, artifact integrity, and production safeguards).*

---

## 3. Workstream Deliverables & Artifacts Catalog

| Workstream | Deliverable Path | Description |
|---|---|---|
| **Workstream A: OULAD Timing Audit** | [`ml/reports/phase_twenty_two_data_timing_audit.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twenty_two_data_timing_audit.md) | Exhaustive data timing audit documenting all source tables, proving why assessment marks are excluded, establishing active cohort definitions, and detailing observable proxy features. |
| **Workstream B: Dual-Cutoff Datasets** | [`ml/data/processed/phase22_day30_features.csv`](file:///Users/neemaysmac/Desktop/Sutra/ml/data/processed/phase22_day30_features.csv)<br>[`ml/data/processed/phase22_day60_features.csv`](file:///Users/neemaysmac/Desktop/Sutra/ml/data/processed/phase22_day60_features.csv)<br>[`ml/data/processed/phase22_dataset_summary.json`](file:///Users/neemaysmac/Desktop/Sutra/ml/data/processed/phase22_dataset_summary.json) | Independently versioned feature matrices:<br>- Day 30: 27,466 rows, 27 features (SHA-256: `86da5e54ccfaf2a9de74d5ab29b299aa53f11d2b6749461fd174f0c0c78b25e6`)<br>- Day 60: 26,361 rows, 32 features (SHA-256: `421b402e60708a25f43964254e79dfe51cea0b2c5dbbd03818f448d874a994b3`) |
| **Workstream C & D: Pipelines & Experiments** | [`ml/pipelines/run_dual_cutoff_prep.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/pipelines/run_dual_cutoff_prep.py)<br>[`ml/pipelines/run_dual_cutoff_experiments.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/pipelines/run_dual_cutoff_experiments.py) | Automated pipelines generating datasets and executing 5-fold student-grouped CV and temporal diagnostic evaluations on 2014J under Settings 1 and 2. |
| **Workstream D & E: Research Report & Metrics** | [`ml/reports/phase_twenty_two_forecasting_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_twenty_two_forecasting_report.md)<br>[`ml/reports/metrics/phase_twenty_two_metrics.json`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/metrics/phase_twenty_two_metrics.json) | Full evaluation report documenting discrimination, calibration curves, threshold trade-offs, false alarm reductions, and metrics across all operating points. |
| **Workstream E: Serialized Research Models** | `ml/artifacts/experiments/phase_twenty_two/`: <br>- `day30_logistic_regression.joblib` (SHA-256: `11ffd9c38de1df2582845cbeae1df58514e823f66c9ecda895a9d35ad1a53ae6`)<br>- `day60_logistic_regression.joblib` (SHA-256: `ce737a71c5e010cd41a1c97a8c5bb74236a282f4e414c3823439e6a0d20dcfb6`)<br>- `day30_xgboost.joblib` (SHA-256: `279551ee279677b6d1947ebaa6194b5952db5a315e612cb7bc2538025e165ca4`)<br>- `day60_xgboost.joblib` (SHA-256: `b73b8523e10d93deed469ce00244439c28e4e9301659a9cf57f722971dd9eb0e`) | Trained models stored strictly outside production directories with full provenance metadata. |
| **Workstream F: Unit Verification Suite** | [`ml/tests/unit/test_phase_twenty_two_forecasting.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_twenty_two_forecasting.py) | 9 automated unit tests verifying cutoff boundaries, score omission, point-in-time censoring, target isolation, student grouping, artifact integrity, and production safeguards. |

---

## 4. Final Scientific Synthesis & Answers to Research Questions

### 1. Which Predictors Were Safe to Use?
- **Demographics & Registration:** `num_of_prev_attempts`, `studied_credits`, `gender`, `region`, `highest_education`, `imd_band`, `age_band`, `disability`, `days_registered_before_start`, `has_missing_registration_date`.
- **LMS Interactions:** `vle_total_clicks`, `vle_active_days`, `vle_clicks_precourse`, `vle_clicks_poststart`, `vle_clicks_last_7d`, `vle_days_since_last_click`, resource breakdowns (`forumng`, `oucontent`, `quiz`, `homepage`, `other`), and Day-60 trajectory indicators (`vle_clicks_month1`, `vle_clicks_month2`, `vle_trend_clicks`).
- **Assessment Behaviors:** `assessments_submitted`, `assessment_banked`, `has_assessment_submission`, `late_submissions`, `on_time_submissions`, `assessments_submitted_month2`, and `missed_assessments`.

### 2. Which Features Were Excluded and Why?
- **Assessment Marks / Scores:** Excluded at both Day 30 and Day 60 because OULAD records submission dates but **no grade return / publication timestamp**. Using scores would introduce feedback latency leakage.
- **Physical Attendance:** OULAD provides no classroom attendance data (purely distance learning).
- **Billing / Fees:** Permanently excluded by core SUTRA ethics policy; also absent from OULAD.
- **Qualitative Faculty Notes & Skills Assessments:** Absent from OULAD.
- **Post-Cutoff Withdrawals:** `date_unregistration` used strictly for active cohort partitioning; purged from predictors.

### 3. Actual Evaluation Findings:
- **Discrimination:** Day-60 models achieve substantial discrimination gains over Day 30:
  - Logistic Regression: $\text{ROC-AUC}$ increases from $0.7333$ to **$0.7839$** ($+0.0506$); $\text{PR-AUC}$ increases from $0.6912$ to **$0.7563$** ($+0.0651$).
  - XGBoost: $\text{ROC-AUC}$ increases from $0.7521$ to **$0.7998$** ($+0.0477$); $\text{PR-AUC}$ increases from $0.7236$ to **$0.7779$** ($+0.0543$).
- **Calibration:** Brier score improves from $0.2054$ to **$0.1803$** (LR) and ECE drops from $0.0210$ to **$0.0163$**.
- **False Alarm Reduction:** On the held-out 2014J cohort, false positive alerts drop by **$45.3\%$** (from $1,440$ to $787$).
- **Threshold Policy:** Maintaining fixed threshold $\tau = 0.46$ drops recall from $62.12\%$ to $54.33\%$ due to natural attrition in cohort prevalence ($43.99\% \to 41.64\%$). Realigning Day-60 threshold to $\tau = 0.40$ restores recall to $65.89\%$ while maintaining superior precision ($59.62\%$).

### 4. Boundary Between OULAD Development Evidence and Future Institutional Validation:
- OULAD provides **development evidence** demonstrating that multi-milestone modeling is technically viable and predictive.
- However, OULAD **cannot validate SUTRA's full six-domain vision** because it lacks attendance, qualitative observations, and prospective multi-term evaluation.
- **2014J results must not be claimed as independent prospective confirmation.** Genuine operational validation requires executing **Track A**: acquiring real, multi-domain data through an authorized institutional university partnership.

---

## 5. Governance Decision & Action Plan

$$\mathbf{\text{[PHASE TWENTY-TWO VERDICT]} \quad \text{Dual-cutoff research pipelines verified; production baseline v1.0.0 remains frozen.}}$$

### Prohibitions Enforced:
- **No production promotion:** Logistic Regression v1.0.0 and threshold $0.46$ remain active.
- **No candidate unlocking:** Experimental candidate gate remains locked (`candidate_provenance_verified = False`).
- **No claims of six-domain training:** The system explicitly acknowledges that only academic/LMS domains were modeled.

### Next Roadmap Actions:
1. Preserve the Phase Twenty-Two experimental artifacts and pipelines as an immutable research baseline.
2. Advance Track A institutional engagement: transmit the Phase Twenty-One Technical Data Specification to university partners.
3. Conduct pre-training verification gate review once partner data is received.
