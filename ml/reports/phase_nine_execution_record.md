# SUTRA Phase Nine — Execution Record: Module-Relative Engagement Feature Experiment

**Date:** 2026-10-12  
**Role:** Senior ML Engineer & Experiment Auditor  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1, psutil 7.1.0  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Execution Summary

Phase Nine executed a controlled research experiment testing whether standardizing Day-30 student engagement features relative to course module norms (`code_module`) improves predictive discrimination and operational alert efficiency compared to the established 25-feature baseline.

- **Primary Pipeline Executed:** `PYTHONPATH=ml/src:ml python3 ml/pipelines/run_module_relative_experiment.py`
- **Execution Wall Time:** 3.15 seconds
- **Folds Completed:** 5 student-grouped cross-validation folds (`GroupKFold` on `id_student`, 0 leakage)
- **Models Evaluated:**
  1. Baseline Regularized Logistic Regression (25 predictors)
  2. Experimental Module-Relative Logistic Regression (36 predictors)
  3. Baseline Constrained Depth-3 XGBoost (25 predictors)
  4. Experimental Module-Relative Constrained XGBoost (36 predictors)
- **Artifact Destination:** `ml/artifacts/experiments/phase_nine_module_relative/`
- **Production Status:** Production artifacts in `ml/artifacts/models/v1.0.0/` and API serving threshold `0.46` remain **strictly unchanged**.

---

## 2. Dataset & Reproducibility Fingerprint

| Parameter | Value |
| :--- | :--- |
| **Input Dataset** | `ml/data/processed/day30_features.csv` |
| **Dataset Content Hash** | `e6f6e4f9c3cacc48a59b3ed1f5b814fcae1d8e350964c0340eed6aa61e4ee3b9` |
| **Total Rows / Columns** | 27,466 rows, 31 columns |
| **Unique Students** | 24,787 unique students |
| **Training Partition** | Semesters `2013B`, `2013J`, `2014B` ($N = 18,263$ rows, 17,188 students) |
| **Temporal Holdout** | Semester `2014J` ($N = 9,203$ rows, 8,857 students; disjoint subset: 7,921 rows) |
| **Cross-Validation** | 5-Fold `GroupKFold` grouped strictly by `id_student` |
| **Random Seed** | 42 |

---

## 3. Experimental Feature Specification

### Engagement Features Transformed (11 features):
Standardized using:
$$\text{Feature}_{\text{module\_z}} = \operatorname{clip}\left(\frac{\text{Feature} - \mu_{\text{module}}}{\sigma_{\text{module}} + \epsilon}, -5.0, 5.0\right)$$
Fitted strictly on each training fold with global fallback for unseen or low-sample modules ($N < 10$):
1. `vle_total_clicks_d30`
2. `vle_active_days_d30`
3. `vle_clicks_precourse`
4. `vle_clicks_poststart_d30`
5. `vle_clicks_last_7d`
6. `vle_days_since_last_click`
7. `vle_clicks_forumng_d30`
8. `vle_clicks_oucontent_d30`
9. `vle_clicks_quiz_d30`
10. `vle_clicks_homepage_d30`
11. `vle_clicks_other_d30`

All 25 original predictors (19 numerical, 6 categorical) were retained alongside the 11 relative features to test whether relative signals add value.

---

## 4. Empirical Cross-Validation Results

### Pooled Out-of-Fold (OOF) Metrics ($N=18,263$, Threshold $t=0.46$)

| Metric | Baseline LR (25 feats) | Exp LR (36 feats) | LR Delta | Baseline XGB (25 feats) | Exp XGB (36 feats) | XGB Delta |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **ROC-AUC** | 0.7230 | **0.7484** | **+0.0254** | 0.7406 | **0.7528** | **+0.0122** |
| **PR-AUC** | 0.6939 | **0.7317** | **+0.0378** | 0.7223 | **0.7387** | **+0.0164** |
| **Precision** | 59.83% | **62.39%** | **+2.56%** | 62.00% | **63.87%** | **+1.87%** |
| **Recall** | 71.59% | **71.79%** | **+0.20%** | 70.89% | 70.32% | -0.57% |
| **F1-Score** | 0.6518 | **0.6676** | **+0.0158** | 0.6615 | **0.6694** | **+0.0079** |
| **Specificity** | 59.64% | **63.67%** | **+4.03%** | 63.53% | **66.61%** | **+3.08%** |
| **False Alarms (FP)** | 4,007 | **3,607** | **-400 (-10.0%)** | 3,621 | **3,315** | **-306 (-8.5%)** |
| **False Negatives (FN)**| 2,368 | **2,351** | **-17** | 2,426 | 2,474 | +48 |
| **Alert Rate** | 54.61% | **52.52%** | **-2.09%** | 52.18% | **50.24%** | **-1.94%** |
| **Brier Score** | 0.2117 | **0.2021** | **-0.0096** | 0.2051 | **0.2002** | **-0.0049** |
| **ECE** | 0.0384 | 0.0385 | +0.0001 | 0.0421 | 0.0421 | 0.0000 |

### Fold-Level Stability (ROC-AUC Across 5 Folds)

| Fold | Baseline LR | Exp LR | LR Gain | Baseline XGB | Exp XGB | XGB Gain |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fold 1** | 0.7190 | 0.7405 | +0.0215 | 0.7314 | 0.7467 | +0.0153 |
| **Fold 2** | 0.7344 | 0.7595 | +0.0251 | 0.7549 | 0.7642 | +0.0093 |
| **Fold 3** | 0.7258 | 0.7539 | +0.0281 | 0.7459 | 0.7586 | +0.0127 |
| **Fold 4** | 0.7143 | 0.7409 | +0.0266 | 0.7341 | 0.7444 | +0.0103 |
| **Fold 5** | 0.7221 | 0.7475 | +0.0254 | 0.7379 | 0.7513 | +0.0134 |
| **Mean $\pm$ Std** | $0.7231 \pm 0.0068$ | **$0.7485 \pm 0.0076$** | **+0.0254** | $0.7408 \pm 0.0085$ | **$0.7530 \pm 0.0073$** | **+0.0122** |

---

## 5. Artifact Hashes & Fresh Reload Inference Verification

Saved in `ml/artifacts/experiments/phase_nine_module_relative/`:

- `experimental_module_relative_lr.joblib` (8,881 bytes) — SHA-256: `951f2dd1247ffeb45667104b20469b8efb48698bf4ba6ecb62d3a3399fc7ca63`
- `experimental_module_relative_xgb.joblib` (193,426 bytes) — SHA-256: `94c6f50b4ec1be2646c261eef6c8ddb6cf16fb148ef2f7b8849b29ddff1ffeb0`
- `feature_schema.json` (1,291 bytes) — SHA-256: `54fa251c8aebc52e4f0ba72fe4b38d7c2a71bfb5a3eb194b150c90f23fcfce9b`
- `config.yaml` (485 bytes) — SHA-256: `2b82142d13b30fc8fe7e48b816a1d48ba5efb5816da65842c75a4ea844c84a56`
- `validation_metrics.json` (28,900 bytes) — SHA-256: `a957feeeebda1cff97223c21a1005a743a3d54832561937ff32c3f87b8d4bb6d`

**Reload Equivalence & Unseen Fallback:**
- Reloaded LR vs in-memory LR max prediction diff: **`0.00e+00`**
- Reloaded XGB vs in-memory XGB max prediction diff: **`0.00e+00`**
- Unseen module test (`code_module="UNSEEN_DISCIPLINE_XYZ"`): Evaluated cleanly using training global fallback; output probabilities strictly bounded in $[0, 1]$.

---

## 6. Test Suite Evidence

Ran: `PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests`
- **Result:** **86 passed in 0.58s** (Exit code: 0)
- **New Tests Added:** 8 unit tests in [`ml/tests/unit/test_phase_nine_module_relative.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_nine_module_relative.py) covering fold-only fitting, zero-variance fallbacks, unseen module fallbacks, missing value handling, feature dimensions, reload equivalence, and production v1.0.0 immutability.
