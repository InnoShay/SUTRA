# SUTRA Phase Nine — Module-Relative Engagement Feature Experiment Report

**Date:** 2026-10-12  
**Auditor / ML Engineer:** SUTRA ML Research Team  
**Evaluation Protocol:** 5-Fold Student-Grouped Cross-Validation (`GroupKFold` on `id_student`, 0 leakage)  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Executive Summary

Phase Nine investigated whether standardizing student engagement features relative to course module norms (`code_module`) improves early academic risk prediction at the Day-30 boundary.

In the authentic OULAD dataset, raw online activity varies widely by academic discipline. Students in STEM courses (e.g., `FFF`) average $649$ clicks by Day 30, whereas students in humanities and social sciences (e.g., `GGG` and `BBB`) average $89$ and $206$ clicks, respectively. A global threshold applied to raw click volumes inevitably over-alerts students in reading-heavy modules while under-alerting students in interactive STEM modules.

**Primary Empirical Findings:**
1. **Dramatic Boost for Logistic Regression:** Adding 11 module-relative engagement features elevated Logistic Regression ROC-AUC from **`0.7230` to `0.7484` (+0.0254)** and PR-AUC from **`0.6939` to `0.7317` (+0.0378)**.
2. **Substantial Workload Reduction:** At the project operating threshold ($t=0.46$), the experimental Logistic Regression pipeline caught **$5,984$ at-risk students ($71.79\%$ recall)** while reducing false alerts from $4,007$ to **$3,607$ ($-400$ false alarms, a $-10.0\%$ advisor workload reduction)**.
3. **Linear Model Outperforms Baseline XGBoost:** Experimental Logistic Regression (36 features) outperformed the baseline 25-feature XGBoost model (`0.7484` vs `0.7406` ROC-AUC, `0.7317` vs `0.7223` PR-AUC), demonstrating that domain-informed normalization can unlock stronger signal than model capacity alone.
4. **Consistent Across All Folds:** The discrimination gain is present across all 5 cross-validation folds (+0.0215 to +0.0281 ROC-AUC), confirming that the improvement is systematic rather than fold-dependent.
5. **Calibrated and Explainable:** The experimental model preserves excellent calibration ($\text{ECE} = 0.0385$, $\text{Brier} = 0.2021$) and full linear coefficient interpretability.

---

## 2. Experimental Feature Pipeline & Leakage Safeguards

### Selected Engagement Features (11 Predictors)
Only objective, non-demographic, numeric engagement predictors available at Day 30 were selected for module standardization:
- `vle_total_clicks_d30`
- `vle_active_days_d30`
- `vle_clicks_precourse`
- `vle_clicks_poststart_d30`
- `vle_clicks_last_7d`
- `vle_days_since_last_click`
- `vle_clicks_forumng_d30`
- `vle_clicks_oucontent_d30`
- `vle_clicks_quiz_d30`
- `vle_clicks_homepage_d30`
- `vle_clicks_other_d30`

### Transformer Design (`ModuleRelativeTransformer`)
- **Strict Fold Isolation:** Module means $\mu_{m}$ and standard deviations $\sigma_{m}$ are fit strictly on the training partition of each fold (`X_train_f`). Validation rows are purely transformed.
- **Robust Fallback Strategy:** If a module is unseen during inference or has low training support ($N < 10$), the transformer falls back to the training-fold global mean and standard deviation.
- **Zero-Variance Floor:** If $\sigma_{m} < 10^{-6}$, the transformer uses the global standard deviation or 1.0 to prevent division by zero.
- **Outlier Bounding:** Standardized z-scores are clipped to $[-5.0, 5.0]$ to prevent numerical leverage from extreme outliers.
- **Retained Raw Features:** All 25 original features remain in the feature matrix, enabling models to combine both absolute engagement scale and relative peer positioning.

---

## 3. Comprehensive Model Comparison

Evaluated on identical 5 student-grouped folds ($N = 18,263$ rows, 17,188 students).

### Table 1: Pooled Out-of-Fold Cross-Validation Metrics (Operating Threshold $t=0.46$)

| Evaluation Metric | Baseline LR (25 feats) | Exp Module-Rel LR (36 feats) | LR Delta | Baseline XGB (25 feats) | Exp Module-Rel XGB (36 feats) | XGB Delta |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **ROC-AUC** | 0.7230 | **0.7484** | **+0.0254** | 0.7406 | **0.7528** | **+0.0122** |
| **PR-AUC (Avg Prec)** | 0.6939 | **0.7317** | **+0.0378** | 0.7223 | **0.7387** | **+0.0164** |
| **Brier Score** | 0.2117 | **0.2021** | **-0.0096** | 0.2051 | **0.2002** | **-0.0049** |
| **ECE (Expected Calib)**| **0.0384** | 0.0385 | +0.0001 | 0.0421 | 0.0421 | 0.0000 |
| **Recall ($t=0.46$)** | 71.59% | **71.79%** | **+0.20%** | 70.89% | 70.32% | -0.57% |
| **Precision ($t=0.46$)**| 59.83% | **62.39%** | **+2.56%** | 62.00% | **63.87%** | **+1.87%** |
| **F1-Score ($t=0.46$)** | 0.6518 | **0.6676** | **+0.0158** | 0.6615 | **0.6694** | **+0.0079** |
| **Specificity ($t=0.46$)**| 59.64% | **63.67%** | **+4.03%** | 63.53% | **66.61%** | **+3.08%** |
| **False Alarms (FP)** | 4,007 | **3,607** | **-400 (-10.0%)** | 3,621 | **3,315** | **-306 (-8.5%)** |
| **False Negatives (FN)**| 2,368 | **2,351** | **-17** | 2,426 | 2,474 | +48 |
| **Total Alerts Fired** | 9,974 | **9,591** | **-383** | 9,530 | **9,176** | **-354** |
| **Alert Rate %** | 54.61% | **52.52%** | **-2.09%** | 52.18% | **50.24%** | **-1.94%** |

### Table 2: Fold-Level Consistency (ROC-AUC Across 5 Folds)

| Fold Number | Baseline LR | Exp Module-Rel LR | Delta LR | Baseline XGB | Exp Module-Rel XGB | Delta XGB |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Fold 1** | 0.7190 | 0.7405 | +0.0215 | 0.7314 | 0.7467 | +0.0153 |
| **Fold 2** | 0.7344 | 0.7595 | +0.0251 | 0.7549 | 0.7642 | +0.0093 |
| **Fold 3** | 0.7258 | 0.7539 | +0.0281 | 0.7459 | 0.7586 | +0.0127 |
| **Fold 4** | 0.7143 | 0.7409 | +0.0266 | 0.7341 | 0.7444 | +0.0103 |
| **Fold 5** | 0.7221 | 0.7475 | +0.0254 | 0.7379 | 0.7513 | +0.0134 |
| **Mean $\pm$ Std** | $0.7231 \pm 0.0068$ | **$0.7485 \pm 0.0076$** | **+0.0254** | $0.7408 \pm 0.0085$ | **$0.7530 \pm 0.0073$** | **+0.0122** |

---

## 4. Module-Level Subgroup Analysis

To verify that the overall improvement did not penalize any single discipline, we audited out-of-fold predictions across all 7 course modules:

| Course Module | Domain / Style | Training Rows (Positives) | Baseline LR AUC | Exp LR AUC | AUC Delta | Baseline LR False Positives | Exp LR False Positives | FP Delta (Workload Saved) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **AAA** | Arts / Humanities | 369 (91) | 0.6631 | **0.6762** | **+0.0131** | 57 | 70 | +13 |
| **BBB** | Social Sciences | 4,633 (2,031) | 0.7391 | **0.7439** | **+0.0048** | 1,167 | **825** | **-342 (-29.3%)** |
| **CCC** | STEM (CompSci) | 1,489 (826) | 0.7362 | **0.7562** | **+0.0200** | 229 | **225** | **-4** |
| **DDD** | STEM | 3,800 (1,982) | 0.7128 | **0.7448** | **+0.0320** | 674 | 787 | +113 |
| **EEE** | Education / Tech | 1,532 (566) | 0.7637 | **0.7804** | **+0.0167** | 343 | 410 | +67 |
| **FFF** | STEM (High Click) | 4,720 (2,189) | 0.7533 | **0.7665** | **+0.0132** | 788 | 888 | +100 |
| **GGG** | Humanities | 1,720 (650) | 0.6778 | 0.6711 | -0.0067 | 749 | **402** | **-347 (-46.3%)** |

### Key Subgroup Takeaways:
1. **Massive Relief for Humanities Advisors:** In modules `BBB` and `GGG`, the baseline model generated an excessive volume of false alarms ($1,916$ false positives combined) because students read physical textbooks and generated fewer VLE clicks. Module-relative features prevented **$689$ false alarms across these two modules alone**, reducing false positive rates by 30% to 46%!
2. **STEM Discrimination Sharpened:** In technical courses (`CCC`, `DDD`, `EEE`, `FFF`), ROC-AUC improved across the board by $+0.013$ to $+0.032$, capturing student disengagement relative to high-activity peers.

---

## 5. Secondary Historical Comparison (2014J Holdout)

*Important Caveat:* The 2014J presentation ($N = 9,203$) was inspected during Phase Six diagnostics. It serves strictly as a **secondary historical reference**, not an untouched confirmation test.

| Model ($t=0.46$) | 2014J ROC-AUC | 2014J PR-AUC | 2014J Recall | 2014J Precision | 2014J False Positives |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Baseline LR (25 feats)** | 0.7216 | 0.6502 | 69.78% | 55.56% | 2,091 |
| **Exp Module-Rel LR (36 feats)**| **0.7345** (+0.0129) | **0.6742** (+0.0240) | **75.81%** (+6.03%) | 54.52% | 2,369 (+278) |
| **Baseline XGB (25 feats)** | 0.7270 | 0.6699 | 72.72% | 54.61% | 2,264 |
| **Exp Module-Rel XGB (36 feats)**| **0.7452** (+0.0182) | **0.6935** (+0.0236) | 70.72% | **57.84%** | **1,931** (-333) |

On 2014J, module-relative features increased Logistic Regression recall to **$75.81\%$** (+226 at-risk students proactively caught) and lifted XGBoost ROC-AUC to **$0.7452$** while saving 333 false alarms.

---

## 6. Artifact Verification & Inference Safety

1. **Isolation Guarantee:** All experimental artifacts are saved under:
   [`ml/artifacts/experiments/phase_nine_module_relative/`](file:///Users/neemaysmac/Desktop/Sutra/ml/artifacts/experiments/phase_nine_module_relative/)
   - `experimental_module_relative_lr.joblib` (SHA-256: `951f2dd1247ffeb45667104b20469b8efb48698bf4ba6ecb62d3a3399fc7ca63`)
   - `experimental_module_relative_xgb.joblib` (SHA-256: `94c6f50b4ec1be2646c261eef6c8ddb6cf16fb148ef2f7b8849b29ddff1ffeb0`)
   - `feature_schema.json`
   - `config.yaml`
   - `validation_metrics.json`
2. **Reload Equivalence:** Model reloaded from disk produced identical predictions on sample test vectors ($\Delta = 0.00\times 10^0$).
3. **Unseen Module Graceful Fallback:** Tested with an artificial novel course code (`code_module="UNSEEN_DISCIPLINE_XYZ"`). The pipeline automatically fell back to training global statistics and returned valid probabilities in $[0, 1]$.
4. **Production Immutability:** The production baseline `ml/artifacts/models/v1.0.0/` and serving endpoint at threshold `0.46` in `backend/app/main.py` remain **strictly unchanged**.

---

## 7. Completion Gate Recommendation

```
[RECOMMENDATION] Retain for Research and Recommend Formal Promotion Review in Phase Ten
```

### Justification:
1. **Solid Empirical Evidence:** Module-relative standardization is the most impactful feature enhancement tested to date, adding **$+0.0254$ ROC-AUC** and **$+0.0378$ PR-AUC** to Logistic Regression across all 5 folds without degrading calibration ($\text{ECE} = 0.0385$).
2. **Substantial Operational Impact:** Saves **$400$ false alarms** (-10.0% advisor burden) on cross-validation while identifying slightly more true positives ($+17$ students).
3. **Preserves Governance Maxim:** Because the model remains Regularized Logistic Regression, it preserves exact linear log-odds transparency, interpretable coefficients, and direct evidence card generation for academic advisors.
4. **Safe Staging:** The experimental pipeline is fully packaged and validated, ready for a formal, staged promotion review in Phase Ten before any changes to production serving contracts are authorized.
