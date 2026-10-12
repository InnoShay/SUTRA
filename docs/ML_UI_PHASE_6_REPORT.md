# SUTRA ML–UI Phase 6 — Model Performance Dashboard Report

**Execution Date:** 2026-10-12  
**Branch:** `ml-integration-ui` -> Merged to `main`  
**Deployed Model Artifact:** `Regularized Logistic Regression Baseline` (`v1.0.0`)  
**Decision Threshold:** `τ = 0.46` (Invariant Serving Boundary)  
**Evaluation Partition:** OULAD Day-30 Processed Dataset, Presentation `2014J` ($N = 9,203$ evaluated registrations; $8,857$ unique students)

---

## 1. Executive Summary

Phase 6 implements a defensible, auditable **Model Performance Dashboard** for authorized institutional staff (leadership, faculty, HODs, counsellors, institution admins). The dashboard transparently presents measured statistical capabilities and operational trade-offs of the frozen production model without inventing synthetic curves, misrepresenting test partitions, or claiming unverified fairness.

### Core Governance Principles Enforced:
1. **Exact Model Version Verification**: Displays measured performance strictly for `v1.0.0` (frozen serving baseline). Requests for unverified or mismatched versions (e.g. `v2.0.0`) are rejected with clean error boundaries rather than fabricated fallback metrics.
2. **Offline Benchmark vs. Live Telemetry Separation**: Distinctly separates retrospective offline held-out evaluations from live production telemetry (inferences logged, serving latency, active campuses).
3. **Historical Partition Disclosure**: Presentation `2014J` is explicitly disclosed as previously inspected historical development evidence and must never be cited as an untouched prospective test set.
4. **Anti-Fabrication Safeguard**: ROC and Precision-Recall curves are generated strictly from 9,203 genuine per-record predictions and ground-truth outcomes. When per-record data is absent, a limitation banner is displayed rather than fabricating an artificial curve.
5. **No False Claims of Fairness**: The presence of subgroup parity breakdowns is accompanied by a mandatory disclaimer that disaggregated visibility does *not* demonstrate bias-free operation. Subgroups with sample sizes below 100 registrations are flagged as `Low Confidence (N < 100)`. Small groups ($N < 5$) are suppressed under ADR-004.
6. **Frozen Serving Model**: The underlying production model is not retrained, altered, or replaced.

---

## 2. Verified Evaluation Metrics (Held-Out Benchmark `2014J`)

All metrics below are verified directly from `ml/reports/metrics/evaluation_labeled_run.json` and `ml/reports/metrics/phase_six_metrics.json` for the frozen model pipeline (`ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`):

### 2.1 Dataset Provenance & Population Parameters
- **Dataset Label**: OULAD Day-30 Processed Dataset (`ml/data/processed/day30_features.csv`)
- **Evaluation Partition**: Semester Presentation `2014J` (Temporal Diagnostic Holdout)
- **Raw Rows Examined**: 27,466 registrations across all presentations
- **Partition Evaluated Rows**: 9,203 registrations
- **Unique Students**: 8,857 students (continuing and new)
- **Target Outcome Definition**: Binary course withdrawal or failure before completion (`target = 1` for At-Risk, `target = 0` for On-Track)
- **Class Prevalence**: 40.70% ($3,746$ actual at-risk vs. $5,457$ actual on-track)
- **Feature Contract**: 25 canonical features at Day-30 cutoff (anti-leakage rules strictly exclude early assessment scores)

### 2.2 Threshold-Independent Metrics
- **ROC-AUC**: `0.7216`
- **PR-AUC**: `0.6502`
- **Brier Score**: `0.2103` (mean squared error of probability forecasts)
- **Expected Calibration Error (ECE)**: `0.0681` (6.81% average calibration gap)
- **Maximum Calibration Error (MCE)**: `0.0967` (9.67% maximum gap in [0.4, 0.5) bin)

### 2.3 Threshold-Dependent Metrics (at $\tau = 0.46$)
- **Accuracy**: `0.6498` (64.98%)
- **Balanced Accuracy**: `0.6573` (65.73%)
- **Precision (Positive Predictive Value)**: `0.5556` (55.56%)
- **Recall (Sensitivity / Catch Rate)**: `0.6978` (69.78%)
- **Specificity (True Negative Rate)**: `0.6168` (61.68%)
- **False Positive Rate (FPR)**: `0.3832` (38.32%)
- **F1-Score**: `0.6186`

### 2.4 Confusion Matrix & Advisor Capacity Impact
| | Actually At-Risk ($y = 1$) | Actually On-Track ($y = 0$) | Total |
| :--- | :---: | :---: | :---: |
| **Flagged At-Risk ($\hat{y} = 1$)** | **2,614 (TP)** | **2,091 (FP)** | 4,705 (51.12% Alert Rate) |
| **Flagged On-Track ($\hat{y} = 0$)** | **1,132 (FN)** | **3,366 (TN)** | 4,498 (48.88%) |
| **Total Population** | 3,746 (40.70%) | 5,457 (59.30%) | 9,203 (100.0%) |

- **Proactive Catches**: 2,614 students caught early (69.8% of students needing support).
- **Advisor False Alarm Burden**: 2,091 false alarms (44.4% of all alerts fired are false positives, meaning 1 in 2.25 alerts is on-track).
- **Missed At-Risk Students**: 1,132 students needing support who were not flagged at Day 30, requiring institutional safety nets (attendance policies, faculty check-ins).

---

## 3. Probability Calibration & Reliability Analysis

Assessed across 10 uniform probability intervals on held-out data:

| Bin Interval | Sample Size ($N$) | Mean Predicted Probability | Observed Positive Rate | Calibration Gap |
| :---: | :---: | :---: | :---: | :---: |
| **[0.0, 0.1)** | 116 | 7.18% | 14.66% | +7.47% |
| **[0.1, 0.2)** | 563 | 15.67% | 13.68% | -1.99% |
| **[0.2, 0.3)** | 1,153 | 25.51% | 19.77% | -5.74% |
| **[0.3, 0.4)** | 1,587 | 35.09% | 27.16% | -7.93% |
| **[0.4, 0.5)** | 1,770 | 44.93% | 35.25% | -9.67% |
| **[0.5, 0.6)** | 1,607 | 54.89% | 47.48% | -7.41% |
| **[0.6, 0.7)** | 1,205 | 64.62% | 57.93% | -6.70% |
| **[0.7, 0.8)** | 732 | 74.49% | 69.40% | -5.10% |
| **[0.8, 0.9)** | 368 | 84.53% | 82.88% | -1.65% |
| **[0.9, 1.0)** | 102 | 92.61% | 93.14% | +0.53% |

**Summary**: The model demonstrates monotonic calibration with an overall ECE of 6.81%. It slightly over-predicts failure risk in the mid-range ([0.3, 0.7)), providing slightly conservative risk probabilities that warrant educator verification.

---

## 4. Subgroup Parity & Fairness Disaggregation

Evaluated across demographic, course, and educational subgroups from `ml/reports/metrics/phase_six_subgroup_metrics.csv`:

### 4.1 Sample Highlights
- **Course Modules**:
  - `AAA`: $N = 348$, Recall = $40.0\%$, Precision = $40.0\%$, ROC-AUC = $0.657$
  - `BBB`: $N = 1,786$, Recall = $74.5\%$, Precision = $47.3\%$, ROC-AUC = $0.700$
  - `CCC`: $N = 2,014$, Recall = $66.0\%$, Precision = $63.7\%$, ROC-AUC = $0.699$
  - `DDD`: $N = 1,463$, Recall = $65.6\%$, Precision = $64.0\%$, ROC-AUC = $0.738$
  - `EEE`: $N = 1,020$, Recall = $73.2\%$, Precision = $49.4\%$, ROC-AUC = $0.781$
  - `FFF`: $N = 1,857$, Recall = $70.5\%$, Precision = $61.3\%$, ROC-AUC = $0.777$
  - `GGG`: $N = 715$, Recall = $87.5\%$, Precision = $43.9\%$, ROC-AUC = $0.687$
- **Demographic Dimensions**:
  - `Gender F`: $N = 3,872$, Recall = $62.3\%$, Precision = $52.8\%$, False Alarm Rate = $34.8\%$
  - `Gender M`: $N = 5,331$, Recall = $74.7\%$, Precision = $57.2\%$, False Alarm Rate = $41.0\%$
  - `Age 0-35`: $N = 6,305$, Recall = $75.1\%$, Precision = $55.0\%$, False Alarm Rate = $44.8\%$
  - `Age 35-55`: $N = 2,811$, Recall = $57.2\%$, Precision = $57.0\%$, False Alarm Rate = $26.1\%$
  - `Age 55<=`: $N = 87$ (**LOW_CONFIDENCE (<100)**), Recall = $41.9\%$, Precision = $86.7\%$
  - `Disability N`: $N = 8,349$, Recall = $67.7\%$, Precision = $54.6\%$, False Alarm Rate = $36.8\%$
  - `Disability Y`: $N = 854$, Recall = $85.1\%$, Precision = $62.1\%$, False Alarm Rate = $57.9\%$

### 4.2 Fairness Mandate
Visibility into subgroup metrics does **not** demonstrate that the model is fair. Wide variations in recall (40.0% in AAA vs 87.5% in GGG) and false alarm rates reflect curriculum differences and systemic disengagement patterns that cannot be resolved through algorithms alone.

---

## 5. Frontend Visual Architecture

The frontend components in `frontend/components/analytics/` comprise:
1. [`ModelEvaluationProvenanceCard.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/ModelEvaluationProvenanceCard.tsx): Displays model version, partition metadata, sample sizes, and historical partition disclaimer.
2. [`ConfusionMatrixCard.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/ConfusionMatrixCard.tsx): Displays 2x2 contingency grid, advisor false alarm burden, and decision threshold τ = 0.46.
3. [`ReliabilityCalibrationChart.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/ReliabilityCalibrationChart.tsx): Plots 10 reliability bins against the ideal diagonal line, with ECE and Brier badges, plus accessible tabular toggle.
4. [`ROCPRCurveChart.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/ROCPRCurveChart.tsx): Renders empirical ROC (AUC 0.7216) and Precision-Recall (AUC 0.6502) curves with threshold 0.46 operating point highlighted.
5. [`SubgroupFairnessTable.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/SubgroupFairnessTable.tsx): Disaggregated performance across courses and demographics with confidence flags and non-bias disclaimer.
6. [`ModelPerformanceDashboard.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/ModelPerformanceDashboard.tsx): Top-level composite dashboard linking components with version selector and offline/live telemetry distinction.
7. [`page.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/app/analytics/page.tsx): Top view switcher allowing seamless toggling between Cohort Risk Analytics and Model Performance Dashboard (supporting `?tab=model-performance`).

---

## 6. Verification & Test Results

### 6.1 Backend Pytest Suite
Ran `pytest tests/test_ml_ui_model_performance.py -v`:
- `test_verified_model_performance_metric_correctness` — **PASSED**
- `test_reliability_calibration_plot_and_roc_points` — **PASSED**
- `test_model_version_mismatch_rejection` — **PASSED**
- `test_offline_vs_live_telemetry_distinction` — **PASSED**
- `test_subgroup_metrics_confidence_flags_and_fairness_disclaimer` — **PASSED**
- `test_analytics_model_performance_alias_endpoint` — **PASSED**
- `test_unauthorized_student_access_blocked` — **PASSED**
- **Full Backend Suite:** **167 passed in 5.15s** (0 failures).

### 6.2 Frontend Contract & Integration Suite
Ran `npm --prefix frontend test`:
- **Next.js Production Build:** `✓ Compiled successfully`, `✓ Generating static pages (20/20)`.
- **TypeScript Typecheck:** `tsc --noEmit` passed with 0 errors.
- **Contract Test Suite:** All 19 sections passed, verifying:
  - Phase 6 components mounted and linked in `analytics/page.tsx`.
  - Offline held-out benchmark distinguished from live telemetry.
  - Confusion matrix values verified at threshold 0.46.
  - Calibration plot, 10 bins, ECE, and Brier badges verified.
  - Anti-fabrication safeguards for ROC/PR curves verified.
  - Subgroup parity disaggregation, confidence flags ($N < 100$), cell suppression ($N < 5$), and fairness disclaimers verified.
  - Model version mismatch limitation handling verified.

### 6.3 Rust CLI Integration Suite
Ran `cargo test --manifest-path cli/Cargo.toml`:
- **55 passed, 0 failed** across all integration test suites.

---

## 7. Compliance Matrix

| Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **Exact Model Version** | Verified metrics for `v1.0.0` (frozen serving baseline) | **PASS** |
| **Metric Suite** | ROC-AUC (0.7216), PR-AUC (0.6502), Precision (0.5556), Recall (0.6978), $N = 9,203$ | **PASS** |
| **Calibration Plot** | 10 reliability bins, ECE (6.81%), Brier (0.2103), diagonal reference line | **PASS** |
| **Confusion Matrix** | 2x2 matrix at threshold 0.46 (TP=2614, FP=2091, TN=3366, FN=1132) | **PASS** |
| **Offline vs Live** | Explicit badge separation; live telemetry tracking throughput without claiming accuracy | **PASS** |
| **Provenance Metadata** | OULAD Day-30, Presentation 2014J, $N=9203$, withdrawal target, historical partition warning | **PASS** |
| **Anti-Fabrication** | ROC/PR curves generated from genuine per-record scores; explicit limitation if unavailable | **PASS** |
| **Fairness Realism** | Subgroup table with confidence flags; disclaims fairness proof from dashboard alone | **PASS** |
| **Frozen Model** | No retraining or parameter replacement; version mismatch returns clear limitation | **PASS** |
