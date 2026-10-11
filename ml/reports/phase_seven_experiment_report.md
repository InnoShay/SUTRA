# SUTRA ML — PHASE SEVEN EXPERIMENT REPORT
## Controlled Depth-3 XGBoost Experiment (EXP-C) & Model Comparison

**Experiment ID:** `EXP-C-DEPTH3-XGBOOST`  
**Candidate Model:** Constrained Gradient Boosted Decision Trees (`XGBClassifier`)  
**Production Baseline:** Regularized Logistic Regression Baseline (`ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`)  
**Primary Evaluation Partition:** 5-Fold Student-Grouped Cross-Validation on Training Set (`2013B, 2013J, 2014B`, $N=18,263$ rows, 17,188 unique students)  
**Secondary Comparison Partition:** Temporal Holdout (`2014J`, $N=9,203$ rows)  
**Status:** REPRODUCED, BENCHMARK AUDITED & RESEARCH CANDIDATE VERIFIED (72 Tests Passing)

---

## 1. Executive Summary & Recommendation

In Phase Six diagnostics, preliminary cross-validation suggested that constraining XGBoost's tree depth from 4 to 3 and sub-sampling features (`colsample_bytree=0.70`) could substantially reduce false alarms without sacrificing the $\ge 70\%$ sensitivity mandate. 

Phase Seven reproduced this experiment under rigorous 5-fold student-grouped cross-validation:

1. **False Alarm Reduction Verified:** On the 18,263 cross-validation training records, Constrained Depth-3 XGBoost reduced false alarms from **4,007 to 3,624**—eliminating **383 unnecessary alerts** (a **9.6% reduction in advisor review workload**).
2. **Discrimination Gains:** Pooled cross-validation ROC-AUC increased from **0.7230 to 0.7408** ($+0.0178$) and PR-AUC from **0.6939 to 0.7224** ($+0.0285$). Mean fold ROC-AUC was **0.7410 (±0.0085)** vs **0.7231 (±0.0068)** for the baseline.
3. **Operational Precision:** Precision at threshold $t = 0.46$ increased from **59.83% to 61.96%** ($+2.13\%$), while maintaining **70.81% recall** (surpassing the institutional target of $\ge 70\%$).
4. **Calibration Trade-off:** While Constrained XGBoost improved overall mean squared error (Brier score: **0.2050** vs **0.2117**), Logistic Regression maintains superior piecewise probability calibration (ECE: **0.0384** vs **0.0424**).
5. **Secondary 2014J Holdout Performance:** On `2014J`, Constrained XGBoost achieved ROC-AUC **0.7279**, PR-AUC **0.6707**, Recall **72.72%**, Precision **54.83%**, and **2,244 false alarms** (compared to 2,305 for original Depth-4 XGBoost and 2,091 for Logistic Regression).

### Final Recommendation:
**Retain Constrained XGBoost as a Research Candidate; Do NOT promote it to production at this time.**  
*Rationale:* Production Logistic Regression Baseline ($t=0.46$) remains fully integrated in the FastAPI service, has zero tree complexity, provides exact linear log-odds Evidence Cards, and produces fewer false alarms on the held-out semester (2,091 vs 2,244). The candidate is preserved as a verified research asset in [`ml/artifacts/experiments/exp_c_depth3_xgboost/`](file:///Users/neemaysmac/Desktop/Sutra/ml/artifacts/experiments/exp_c_depth3_xgboost/).

---

## 2. Experimental Setup & Exact Hyperparameters

### 2.1 Model Configurations Compared
1. **Production Baseline (Logistic Regression):**
   - Solver: `lbfgs`, Penalty: `l2`, $C = 1.0$, `class_weight='balanced'`, `max_iter=1000`, `random_state=42`
2. **Original Candidate (Depth-4 XGBoost from v1.0.0):**
   - `n_estimators=150`, `max_depth=4`, `learning_rate=0.05`, `subsample=0.80`, `colsample_bytree=0.80`, `scale_pos_weight=1.20`, `eval_metric='logloss'`, `random_state=42`
3. **Constrained Candidate (EXP-C Depth-3 XGBoost):**
   - `n_estimators=150`, `max_depth=3`, `learning_rate=0.05`, `subsample=0.80`, `colsample_bytree=0.70`, `scale_pos_weight=1.20`, `eval_metric='logloss'`, `random_state=42`

### 2.2 Feature & Preprocessing Fidelity
- Exact 25 features: 19 numerical, 6 categorical.
- Preprocessing: `ColumnTransformer` with `StandardScaler` (numerical) and `OneHotEncoder(handle_unknown='ignore', sparse_output=False)` (categorical).
- Strict zero-leakage protocol: Preprocessor fitted exclusively on the training fold of each split.

### 2.3 Partitioning Protocol
- **Cross-Validation Partition:** Historical presentations `2013B, 2013J, 2014B` ($N=18,263$ rows, 8,335 at-risk positives, 9,928 on-track negatives).
- Grouping: `GroupKFold(n_splits=5)` grouped strictly by `id_student` (0% student overlap between train and validation folds).

---

## 3. Detailed Cross-Validation Comparison

### 3.1 Pooled Out-of-Fold Metrics ($N=18,263$, Threshold $t = 0.46$)

| Metric | Logistic Regression (Baseline) | Original XGBoost (v1.0.0 Depth 4) | Constrained XGBoost (EXP-C Depth 3) | Difference (EXP-C vs LR Baseline) |
| :--- | :--- | :--- | :--- | :--- |
| **ROC-AUC (Pooled OOF)** | 0.7230 | 0.7448 | **0.7408** | **+0.0178** |
| **PR-AUC (Pooled OOF)** | 0.6939 | 0.7273 | **0.7224** | **+0.0285** |
| **Mean Fold ROC-AUC** | 0.7231 (±0.0068) | 0.7450 (±0.0091) | **0.7410 (±0.0085)** | **+0.0179** |
| **Mean Fold PR-AUC** | 0.6942 (±0.0087) | 0.7278 (±0.0112) | **0.7230 (±0.0100)** | **+0.0288** |
| **Accuracy** | 65.04% | 67.24% | **66.86%** | **+1.82%** |
| **Balanced Accuracy** | 65.73% | 66.82% | **66.60%** | **+0.87%** |
| **Sensitivity (Recall)** | **71.59%** | 67.89% | **70.81%** | -0.78% |
| **Specificity (TNR)** | 59.64% | 64.92% | **63.50%** | **+3.86%** |
| **Precision** | 59.83% | 62.06% | **61.96%** | **+2.13%** |
| **False Positive Rate (FPR)** | 40.36% | 35.08% | **36.50%** | **-3.86%** |
| **F1-Score** | 0.6518 | 0.6486 | **0.6607** | **+0.0089** |
| **Brier Score** | 0.2117 | 0.2033 | **0.2050** | **-0.0067** (Superior MSE) |
| **Expected Calib. Error (ECE)**| **0.0384** | 0.0435 | 0.0424 | +0.0040 |
| **Alert Rate (% Cohort)** | 54.61% | 49.33% | **52.16%** | **-2.45%** |
| **Total Alerts Fired** | 9,974 | 9,008 | **9,527** | **-447 fewer alerts** |
| **False Alarms (FP Burden)** | 4,007 | 3,483 | **3,624** | **-383 fewer false alarms** |
| **Missed At-Risk (FN)** | 2,368 | 2,676 | **2,433** | +65 cases |
| **Successful Catches (TP)** | 5,967 | 5,659 | **5,902** | -65 cases |

---

### 3.2 Fold-by-Fold Stability Analysis

The performance improvement of Constrained XGBoost is uniform across all 5 validation folds:

| Fold | Validation Rows | LR ROC-AUC | EXP-C ROC-AUC | Gain | LR False Alarms | EXP-C False Alarms | False Alarms Saved |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Fold 1** | 3,653 | 0.7190 | 0.7317 | +0.0127 | 789 | 689 | **-100** |
| **Fold 2** | 3,653 | 0.7344 | 0.7551 | +0.0207 | 789 | 741 | **-48** |
| **Fold 3** | 3,653 | 0.7258 | 0.7458 | +0.0200 | 798 | 728 | **-70** |
| **Fold 4** | 3,652 | 0.7143 | 0.7342 | +0.0199 | 798 | 736 | **-62** |
| **Fold 5** | 3,652 | 0.7221 | 0.7383 | +0.0162 | 833 | 730 | **-103** |
| **Total** | 18,263 | **0.7231 (±0.0068)** | **0.7410 (±0.0085)** | **+0.0179** | 4,007 | 3,624 | **-383** |

*Key finding:* No single fold drove the improvement; all 5 folds demonstrated consistent discrimination gains ($+0.013$ to $+0.021$) and reductions in false alarms (48 to 103 false alarms saved per fold).

---

## 4. Secondary Comparison on 2014J Temporal Holdout

Following validation freezing, the final candidate pipeline was fitted once on the full 18,263 training records and evaluated on `2014J`:

| Metric | Logistic Regression Baseline | Original XGBoost (Depth 4) | Constrained XGBoost (Depth 3) |
| :--- | :--- | :--- | :--- |
| **ROC-AUC** | 0.7216 | **0.7321** | 0.7279 |
| **PR-AUC** | 0.6502 | **0.6761** | 0.6707 |
| **Recall ($t=0.46$)** | 69.78% | **73.87%** | 72.72% |
| **Precision ($t=0.46$)** | **55.56%** | 54.55% | 54.83% |
| **False Alarms ($t=0.46$)** | **2,091** | 2,305 | 2,244 |
| **Missed At-Risk ($t=0.46$)** | 1,132 | **979** | 1,022 |
| **Alert Rate (% Cohort)** | **51.12%** | 55.11% | 53.98% |
| **Brier Score** | 0.2103 | **0.2095** | 0.2102 |
| **ECE** | **0.0384** | 0.0435 | 0.0418 |

### Methodological Context on Secondary Evaluation:
- Semester `2014J` was extensively analyzed during Phase Six diagnostics.
- Although `2014J` labels were never used to update hyperparameters, prior exposure limits claims of fully blind confirmation.
- Therefore, cross-validation metrics remain the primary authoritative evidence.
- On `2014J`, Constrained XGBoost successfully reduced false alarms relative to the original XGBoost candidate (2,244 vs 2,305), but Logistic Regression remains the operational leader in minimizing false alarms on this specific holdout (2,091 false alarms).

---

## 5. Artifact Protection & Inference Smoke Test

1. **v1.0.0 Artifacts Preserved:**
   - [`ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`](file:///Users/neemaysmac/Desktop/Sutra/ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib) (7,105 bytes) remains intact.
   - [`ml/artifacts/models/v1.0.0/candidate_xgboost.joblib`](file:///Users/neemaysmac/Desktop/Sutra/ml/artifacts/models/v1.0.0/candidate_xgboost.joblib) (270,054 bytes) remains intact.
   - Production inference backend (`backend/app/main.py`) confirmed serving the baseline at threshold $0.46$.
2. **Experiment Artifacts Saved Separately:**
   - [`ml/artifacts/experiments/exp_c_depth3_xgboost/candidate_constrained_xgboost.joblib`](file:///Users/neemaysmac/Desktop/Sutra/ml/artifacts/experiments/exp_c_depth3_xgboost/candidate_constrained_xgboost.joblib) (192,262 bytes).
   - Configuration: `ml/artifacts/experiments/exp_c_depth3_xgboost/config.yaml`.
   - Feature Schema: `ml/artifacts/experiments/exp_c_depth3_xgboost/feature_schema.json`.
   - Validation Metrics: `ml/artifacts/experiments/exp_c_depth3_xgboost/validation_metrics.json`.
3. **Isolated Inference Smoke Test Verified:**
   - [`ml/scripts/verify_experiment_inference.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/scripts/verify_experiment_inference.py) executed and confirmed:
     - Predicted probability: finite float within $[0, 1]$ (`0.3547`).
     - Batch inference succeeds with correct array lengths.
     - Production API `/ready` endpoint confirms `model_name: "Regularized Logistic Regression Baseline"`.

---

## 6. Generated Phase Seven Deliverables

- **Report:** [`ml/reports/phase_seven_experiment_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_seven_experiment_report.md)
- **Execution Log:** [`ml/reports/phase_seven_execution_record.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_seven_execution_record.md)
- **Metrics Ledger:** [`ml/reports/metrics/phase_seven_experiment_metrics.json`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/metrics/phase_seven_experiment_metrics.json)
- **OOF Predictions:** [`ml/reports/metrics/phase_seven_oof_predictions.csv`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/metrics/phase_seven_oof_predictions.csv) (18,263 de-identified rows with pseudonymous IDs)
- **Comparison Visualizations:** [`ml/reports/figures/phase_seven_model_comparison.png`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/figures/phase_seven_model_comparison.png) (4-panel figure: Pooled ROC, Pooled PR, Reliability Diagram, Fold Stability)
- **Automated Tests:** [`ml/tests/unit/test_phase_seven_experiment.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_seven_experiment.py) (4 new tests passing)
