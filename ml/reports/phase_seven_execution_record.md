# SUTRA ML — PHASE SEVEN EXECUTION RECORD

**Date:** 2026-10-12  
**Environment:** macOS (Apple Silicon), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1, matplotlib 3.10.7, seaborn 0.13.2  
**Workspace:** `/Users/neemaysmac/Desktop/Sutra`  
**Execution Objective:** Perform controlled reproduction and validation of Constrained Depth-3 XGBoost candidate (EXP-C), evaluate cross-validation fold stability, verify isolated inference compatibility, and protect baseline production artifacts.

---

## 1. Verified Inventory & Baseline State

- Python: `3.13.6`
- scikit-learn: `1.7.2`
- XGBoost: `3.4.1`

### Protected Baseline Artifacts (Verified Unmodified):
- `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` (7,105 bytes, timestamp 00:08)
- `ml/artifacts/models/v1.0.0/candidate_xgboost.joblib` (270,054 bytes, timestamp 00:08)
- `ml/artifacts/models/v1.0.0/model_metadata.json` (6,758 bytes, timestamp 00:08)

---

## 2. Execution Log & Commands

### Command 1: Execute Phase Seven Experiment Pipeline
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_experiment_c.py
```
- **Exit Code:** `0`
- **Elapsed Time:** `2.82s`
- **Output Artifacts Generated:**
  - `ml/artifacts/experiments/exp_c_depth3_xgboost/candidate_constrained_xgboost.joblib` (192,262 bytes)
  - `ml/artifacts/experiments/exp_c_depth3_xgboost/config.yaml`
  - `ml/artifacts/experiments/exp_c_depth3_xgboost/feature_schema.json`
  - `ml/artifacts/experiments/exp_c_depth3_xgboost/validation_metrics.json`
  - `ml/reports/metrics/phase_seven_experiment_metrics.json`
  - `ml/reports/metrics/phase_seven_oof_predictions.csv` (18,263 de-identified records)
  - `ml/reports/figures/phase_seven_model_comparison.png`

### Command 2: Isolated Inference Verification
```bash
PYTHONPATH=ml/src:. python3 ml/scripts/verify_experiment_inference.py
```
- **Exit Code:** `0`
- **Verified:**
  - Single record prediction: `0.3547` (finite, bounded in $[0, 1]$)
  - Batch predictions: 3 records evaluated with length matching
  - Production API: `/ready` verified serving v1.0.0 Logistic Regression at threshold 0.46
  - File integrity: v1.0.0 baseline artifact size confirmed unaltered (7,105 bytes)

### Command 3: Execute Automated Test Suites
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```
- **Exit Code:** `0`
- **Elapsed Time:** `0.40s`
- **Test Summary:** `72 passed in 0.40s`
  - Data quality & validation: 9 tests
  - Leakage & boundary assertions: 6 tests
  - Explainability & calibration: 7 tests
  - Features & snapshots: 4 tests
  - Loaders & audits: 7 tests
  - Training & CV splits: 6 tests
  - Phase Six diagnostics: 6 tests
  - Phase Seven experiment: 4 tests
  - Inference backend endpoints & validation: 23 tests

---

## 3. Key Computed Results Summary

### 5-Fold Student-Grouped CV on Training Partition ($N=18,263$ at $t=0.46$):
- **Logistic Regression Baseline:**
  - Pooled ROC-AUC: `0.7230` | Mean Fold ROC-AUC: `0.7231 (±0.0068)`
  - Pooled PR-AUC: `0.6939` | Mean Fold PR-AUC: `0.6942 (±0.0087)`
  - Recall: `71.59%` | Precision: `59.83%` | False Alarms: `4,007`
  - Brier Score: `0.2117` | ECE: `0.0384`
- **Constrained Depth-3 XGBoost Candidate:**
  - Pooled ROC-AUC: `0.7408` | Mean Fold ROC-AUC: `0.7410 (±0.0085)`
  - Pooled PR-AUC: `0.7224` | Mean Fold PR-AUC: `0.7230 (±0.0100)`
  - Recall: `70.81%` | Precision: `61.96%` | False Alarms: `3,624` (**-383 false alarms, -9.6%**)
  - Brier Score: `0.2050` | ECE: `0.0424`

### Secondary 2014J Holdout Comparison ($N=9,203$ at $t=0.46$):
- **Logistic Regression Baseline:**
  - ROC-AUC: `0.7216` | PR-AUC: `0.6502` | Recall: `69.78%` | Precision: `55.56%` | FP: `2,091`
- **Constrained Depth-3 XGBoost Candidate:**
  - ROC-AUC: `0.7279` | PR-AUC: `0.6707` | Recall: `72.72%` | Precision: `54.83%` | FP: `2,244`

---

## 4. Verification Check of Safety & Governance Mandates

- [x] Zero changes to `ml/artifacts/models/v1.0.0/` model binaries.
- [x] Production threshold $t = 0.46$ preserved.
- [x] Test holdout (`2014J`) treated as secondary historical comparison; tuning completed strictly on CV.
- [x] Candidate saved in isolated experiment directory `ml/artifacts/experiments/exp_c_depth3_xgboost/`.
- [x] Production inference API (`backend/app/main.py`) confirmed using v1.0.0 Logistic Regression.
- [x] No Git commits, pushes, or deletions performed.
