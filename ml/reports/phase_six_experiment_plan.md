# SUTRA ML — PHASE SIX EXPERIMENT PLAN
## Evidence-Based Next Improvement Experiments for SUTRA ML

**Author:** SUTRA ML Engineering & Evaluation Audit  
**Status:** PROPOSED & EVIDENCE-BACKED (Awaiting Human Authorization)  
**Governing Rule:** All experiments must be tuned and selected strictly on training partition cross-validation (`2013B, 2013J, 2014B`), completely preserving the `2014J` temporal holdout.

---

## 1. Context & Motivation from Diagnostic Findings

Phase Six diagnostic evaluation uncovered three distinct operational failure modes in the current model:

1. **Course Module Discrepancy:** The single global model misjudges modules with distinct engagement norms. Module AAA (low VLE usage) has an unacceptable **60.0% False Negative Rate**, while Module GGG has an excessive **68.2% False Positive Rate** (75.5% alert rate).
2. **False Alarm Burden (2,091 False Positives at $t=0.46$):** The linear baseline escalates risk sharply whenever days inactive is high ($\ge 14$ days), even when registered credits are modest and prior education is strong.
3. **Collinearity Redundancy:** 6 granular click categories are highly collinear ($r > 0.80$) with total clicks, adding model complexity without boosting predictive power.

Based directly on this empirical evidence, we propose 4 controlled experiments for subsequent phases.

---

## 2. Proposed Experiment Matrix

| Experiment | Name | Core Hypothesis | Proposed Changes | Primary Metric to Improve |
| :--- | :--- | :--- | :--- | :--- |
| **EXP-A** | **Module-Relative Engagement Normalization** | Normalizing clicks and active days by module mean/standard deviation will eliminate module-specific alert distortions. | Add z-scored features: `z_vle_clicks_by_module`, `z_active_days_by_module` calculated strictly per module on training folds. | Reduce Module GGG FPR from 68% to $< 40\%$; increase Module AAA Recall from 40% to $> 60\%$. |
| **EXP-B** | **Inactivity $\times$ Credit Load Interaction** | Inactivity is vastly more lethal for students carrying high credit burdens ($\ge 120$ credits) than light burdens ($\le 60$ credits). | Add explicit interaction term: $\text{inactive\_days} \times (\text{credits} / 60)$. | Reduce False Positives on lightly loaded students by $\ge 150$ cases on CV. |
| **EXP-C** | **Constrained Shallow Tree Ensemble (XGB-D3)** | Constraining XGBoost to `max_depth=3` and `colsample_bytree=0.70` captures non-linear interactions without memorizing false-alarm noise. | Train regularized XGBoost with shallow trees, evaluated at operating threshold $t=0.46$. | Achieve $\ge 70\%$ recall with $\ge 61.5\%$ precision (a $+2\%$ gain over baseline on CV). |
| **EXP-D** | **Two-Tier Disengagement Flag for Non-VLE Modules** | Students in Module AAA read physical textbooks; a non-zero assessment submission is a far stronger safety signal than VLE logins. | Introduce module-specific interaction between `has_early_assessment_submission` and `code_module == 'AAA'`. | Recover at least 15 missed at-risk students in Module AAA without elevating false alarms. |

---

## 3. Detailed Experiment Designs

### Experiment A: Module-Relative Engagement Normalization

- **Problem:** In Module GGG, students naturally log fewer clicks because materials are structured differently, causing the global model to falsely flag 75.5% of the class. In Module AAA, offline study means at-risk students blend in with normal students.
- **Implementation:**
  ```python
  # Fit strictly on training fold
  module_stats = train_df.groupby("code_module")["vle_total_clicks_d30"].agg(["mean", "std"])
  # Compute relative click score
  z_clicks = (df["vle_total_clicks_d30"] - mean_m) / (std_m + 1e-5)
  ```
- **Validation Check:** Compute 5-fold CV subgroup metrics. Confirm Module GGG alert rate drops below 55% while maintaining global ROC-AUC $\ge 0.723$.

---

### Experiment B: Inactivity $\times$ Credit Load Interaction

- **Problem:** Logistic Regression treats credit load and inactivity as independent additive penalties. In reality, carrying 120 credits with 15 days of silence is a critical emergency, whereas carrying 30 credits with 15 days of silence frequently resolves successfully.
- **Implementation:** Add interaction term $\text{interaction\_inactivity\_credit} = \frac{\text{vle\_days\_since\_last\_click} \times \text{studied\_credits}}{100.0}$.
- **Validation Check:** Evaluate out-of-fold False Alarms. Success criterion: reduction of at least 150 false alarms without dropping positive recall below 70.0%.

---

### Experiment C: Constrained Shallow Tree Ensemble (XGB-D3)

- **Problem:** Production Logistic Regression has lower false alarms (2,091 vs 2,305 for deep XGBoost), but depth-4 XGBoost overfits training interactions.
- **Evidence from Phase Six preliminary CV:** Constraining depth to 3 reduced CV false alarms from 4,007 to 3,624 (**383 fewer false alarms**) while maintaining 70.81% recall.
- **Implementation:** Hyperparameters: `max_depth=3`, `n_estimators=120`, `learning_rate=0.04`, `subsample=0.80`, `colsample_bytree=0.70`, `scale_pos_weight=1.1`.
- **Validation Check:** Check calibration curve and Brier score. Tree ensemble must achieve Brier score $\le 0.205$ and ECE $\le 0.040$.

---

## 4. Evaluation Protocol & Safety Guardrails

1. **Zero Test Set Snooping:** All 4 experiments will be evaluated strictly on 5-fold student-grouped cross-validation using the training partition (`2013B, 2013J, 2014B`).
2. **Holdout Sealing:** The `2014J` holdout will remain sealed until a candidate model is selected and verified on CV.
3. **No Automatic Promotion:** The production baseline ($t = 0.46$) will remain the default inference model in `backend/app/` until the user explicitly reviews the experimental results and authorizes promotion.
