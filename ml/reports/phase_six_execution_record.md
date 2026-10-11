# SUTRA ML — PHASE SIX EXECUTION RECORD

**Date:** 2026-10-12  
**Environment:** macOS (Apple Silicon), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1, matplotlib 3.10.7, seaborn 0.13.2  
**Workspace:** `/Users/neemaysmac/Desktop/Sutra`  
**Execution Objective:** Perform rigorous diagnostic evaluation, row-level error analysis, subgroup auditing, and controlled validation experiments on SUTRA ML models.

---

## 1. Verified Environment & Inventory

- Python: `3.13.6 (v3.13.6:4e665351082, Aug 6 2025, 11:22:35)`
- scikit-learn: `1.7.2`
- XGBoost: `3.4.1`
- matplotlib: `3.10.7`
- seaborn: `0.13.2`
- joblib: `1.5.2`
- pandas: `2.3.3`
- numpy: `2.3.2`

### Protected Model Artifacts (Verified Unmodified):
- `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` (7,105 bytes, timestamp 00:08)
- `ml/artifacts/models/v1.0.0/candidate_xgboost.joblib` (270,054 bytes, timestamp 00:08)
- `ml/artifacts/models/v1.0.0/model_metadata.json` (6,758 bytes, timestamp 00:08)

---

## 2. Execution Log & Commands

### Command 1: Run Full Phase Six Diagnostic Pipeline
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_diagnostics.py
```
- **Exit Code:** `0`
- **Elapsed Time:** `2.87s`
- **Output Artifacts Generated:**
  - `ml/reports/metrics/phase_six_metrics.json` (Comprehensive baseline metrics, error stats, threshold sweeps)
  - `ml/reports/metrics/phase_six_subgroup_metrics.csv` (Disaggregated metrics across 6 dimensions with Wilson CIs)
  - `ml/reports/metrics/phase_six_error_records.csv` (60 de-identified error cases with pseudonymous IDs)
  - `ml/reports/metrics/phase_six_experiments.json` (5 controlled CV experiments)
  - `ml/reports/figures/confusion_matrices.png`
  - `ml/reports/figures/probability_distributions.png`
  - `ml/reports/figures/calibration_curves.png`
  - `ml/reports/figures/roc_pr_curves.png`
  - `ml/reports/figures/threshold_tradeoffs.png`
  - `ml/reports/figures/feature_correlation_matrix.png`
  - `ml/reports/figures/feature_attributions_errors.png`

### Command 2: Execute Automated Test Suite
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```
- **Exit Code:** `0`
- **Elapsed Time:** `0.38s`
- **Test Summary:** `68 passed in 0.38s`
  - Data quality & validation: 9 tests
  - Leakage & boundary assertions: 6 tests
  - Explainability & calibration: 7 tests
  - Features & snapshots: 4 tests
  - Loaders & audits: 7 tests
  - Training & CV splits: 6 tests
  - Phase Six diagnostics: 6 tests
  - Inference backend endpoints & validation: 23 tests

---

## 3. Key Computed Results Summary

### Baseline Performance on Full Temporal Holdout (2014J, $N=9,203$ at $t=0.46$):
- **Logistic Regression Baseline:**
  - ROC-AUC: `0.7216` | PR-AUC: `0.6502` | Brier Score: `0.2103` | ECE: `0.0384`
  - Recall: `69.78%` ($N=2,614$) | Precision: `55.56%` | FPR: `38.32%`
  - False Alarms (FP): `2,091` | Missed At-Risk (FN): `1,132`
  - Total Alerts Fired: `4,705` (`51.12%` of cohort)
- **XGBoost Candidate:**
  - ROC-AUC: `0.7321` | PR-AUC: `0.6761` | Brier Score: `0.2095` | ECE: `0.0435`
  - Recall: `73.87%` ($N=2,767$) | Precision: `54.55%` | FPR: `42.24%`
  - False Alarms (FP): `2,305` | Missed At-Risk (FN): `979`
  - Total Alerts Fired: `5,072` (`55.11%` of cohort)

### Controlled Experiment Summary on 5-Fold Training CV (18,263 Rows):
1. **EXP-00 Baseline:** CV ROC-AUC: `0.7230`, CV PR-AUC: `0.6939`, CV False Alarms: `4,007`
2. **EXP-01 Pruning:** CV ROC-AUC: `0.7200` (-0.0030), CV PR-AUC: `0.6910`, CV False Alarms: `4,007`
3. **EXP-02 C=0.10 Reg:** CV ROC-AUC: `0.7231`, CV PR-AUC: `0.6939`, CV False Alarms: `4,009`
4. **EXP-03 Platt Calib:** CV ROC-AUC: `0.7220`, CV PR-AUC: `0.6935`, CV False Alarms: `3,746`
5. **EXP-04 Constrained XGB (Depth 3):** CV ROC-AUC: `0.7408`, CV PR-AUC: `0.7224`, CV False Alarms: `3,624` (**-383 false alarms**, Precision: `61.96%`)

---

## 4. Verification Check of Safety & Governance Mandates

- [x] Zero changes to `ml/artifacts/models/v1.0.0/` model binaries.
- [x] Production threshold $t = 0.46$ preserved.
- [x] Test holdout (`2014J`) kept strictly sealed during all experimental selection.
- [x] No target labels or unregistration dates leaked into predictors.
- [x] Inference API loads production model successfully.
- [x] Privacy preserved: De-identified error exports use pseudonymous IDs (`DIAG-FN-001`, `DIAG-FP-001`).
