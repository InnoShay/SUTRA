# SUTRA Phase Fourteen — Prospective Evaluation Gate Matrix & Decision Hierarchy

**Date:** 2026-10-12  
**Role:** Senior ML Model Governance Auditor & Statistician  
**Status:** Pre-Registered Governance Decision Matrix  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Branch:** `Neemay-ml`  

---

## 1. Executive Summary

Workstreams D and E established the definitive Evaluation Gate Matrix and Lexicographic Decision Hierarchy for determining whether the Phase Nine module-relative candidate can be promoted to production following a future shadow evaluation.

### Key Governance Principles:
1. **Ranking Performance Alone Cannot Authorize Promotion:** A statistically significant improvement in ROC-AUC ($\Delta \text{ROC-AUC} \ge +0.015$) is a necessary condition, but **wholly insufficient** on its own.
2. **Lexicographic Safety Priorities:** Operational advisor burden ($\Delta \text{False Alarms} < 0$), student safety ($\text{Recall} \ge \text{Baseline} - 2.0\%$), and probability reliability ($\text{ECE} \le 0.050$) strictly override pure discriminative ranking.
3. **Four-Fifths Rule is a Screening Metric, Not Fairness Certification:** A Disparate Impact Ratio within $[0.80, 1.25]$ screens out egregious selection disparities, but does not certify equal error rates or outcome equity.
4. **Historical 2014J Partition is Not a Prospective Holdout:** The 2014J cohort is classified as previously inspected historical development data. No future promotion decision may cite 2014J metrics as prospective confirmation.

---

## 2. Evaluation Gate Specification Matrix

| Metric Dimension | Target Parameter & Method | Minimum Success Threshold | Hard-Block (No-Go) Failure Condition | Operational Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **1. Primary Discrimination** | Paired $\Delta \text{ROC-AUC}$ on identical prospective cohort | $\Delta \text{ROC-AUC} \ge +0.015$ with $95\%$ bootstrap CI lower bound $> 0$ | $\Delta \text{ROC-AUC} \le 0$ or $95\%$ CI includes zero | Verifies candidate provides genuine ranking superiority on unseen curriculum. |
| **2. Advisor Workload Burden** | Paired change in false alarms ($\Delta \text{FP}$) at fixed threshold $\tau = 0.46$ | Statistically significant reduction: $\Delta \text{FP} < 0$ ($p < 0.01$) | $\Delta \text{FP} \ge 0$ (Equal or increased advisor burden) | Protects academic advisors against alert fatigue and unnecessary outreach. |
| **3. Student Safety (Recall)** | Sensitivity / Recall on true failing students at $\tau = 0.46$ | $\text{Recall}_{\text{exp}} \ge \text{Recall}_{\text{prod}} - 2.0\%$ points | $\text{Recall}_{\text{exp}} < \text{Recall}_{\text{prod}} - 2.0\%$ | Prevents reducing false alarms at the unacceptable cost of missing at-risk students. |
| **4. Probability Calibration** | Expected Calibration Error (ECE) across 10 uniform probability bins | $\text{ECE} \le 0.050$ and $\text{Brier}_{\text{exp}} \le \text{Brier}_{\text{prod}}$ | $\text{ECE} > 0.070$ (Severe probability distortion) | Ensures predicted probabilities reflect authentic empirical attrition risk. |
| **5. Clustered Uncertainty** | Student-grouped paired bootstrap resampling | $B = 1,000$ paired iterations clustered strictly on `id_student` | Row-level independent bootstrapping (Violates clustering) | Prevents artificial confidence interval narrowing caused by multi-course students. |
| **6. Fairness Screening** | Disparate Impact Ratio (DIR) across demographic subgroups | $0.80 \le \text{DIR}(g) \le 1.25$ for all evaluated groups | $\text{DIR}(g) < 0.80$ or $\text{DIR}(g) > 1.25$ | Four-Fifths rule screening to catch disparate alerting impact across demographics. |
| **7. Multiplicity Adjustment** | Multiple testing correction across subgroup comparisons | Benjamini-Hochberg (BH) FDR controlled at $q = 0.05$ | Uncorrected $p$-values across $>20$ simultaneous tests | Prevents false disparity findings driven by statistical multiplicity. |
| **8. Outcome Maturation** | Quarantine of delayed, appealed, or missing final grades | Complete grade certification; unmaturated records $\le 3.0\%$ | Missingness $> 3.0\%$ or synthetic imputation of outcomes | Prevents bias from incomplete term outcome records. |

---

## 3. Mathematical Subgroup Disparity Specifications

### 3.1 Explicit Disparity Formulations
For each protected demographic attribute $A$ with evaluated subgroup $g$ and designated reference group $G_{\text{ref}}$:

1. **Selection Parity / Disparate Impact Ratio (DIR):**
   $$\text{Alert Rate}(g) = \frac{\sum_{i \in g} \mathbb{I}(P_i \ge 0.46)}{N_g}$$
   $$\text{DIR}(g) = \frac{\text{Alert Rate}(g)}{\text{Alert Rate}(G_{\text{ref}})}$$
   - **Numerator:** Alert rate of evaluated student subgroup $g$.
   - **Denominator:** Alert rate of designated reference group $G_{\text{ref}}$.
   - **Direction & Meaning:** $\text{DIR} < 0.80$ indicates under-flagging of risk relative to reference (potential under-support); $\text{DIR} > 1.25$ indicates over-flagging relative to reference (potential disproportionate scrutiny).

2. **False Positive Rate Parity Ratio (Burden Parity):**
   $$\text{FPR\_Ratio}(g) = \frac{\text{FPR}(g)}{\text{FPR}(G_{\text{ref}})} = \frac{P(\hat{Y}=1 \mid Y=0, A=g)}{P(\hat{Y}=1 \mid Y=0, A=G_{\text{ref}})}$$
   - Monitors whether non-failing students in protected categories experience higher rates of unneeded advisor intervention.

### 3.2 Reference Group Designations
- **Gender:** Male (`M`) is designated baseline reference; Female (`F`) evaluated.
- **Index of Multiple Deprivation (IMD):** Least deprived quintile (`80-100%`) is reference; lower deciles evaluated.
- **Disability:** No reported disability (`N`) is reference; reported disability (`Y`) evaluated.
- **Age Bands:** Traditional age bracket (`0-35`) is reference; older brackets evaluated.
- **Prior Education:** A-Level or Equivalent is reference; lower qualifications evaluated.

### 3.3 Sample Size & Privacy Suppression Rules
- **Privacy Suppression ($N_g < 5$):** Output is permanently masked as `"<5 (Suppressed for Privacy)"`.
- **Inconclusive Threshold ($5 \le N_g < 50$):** Output labeled `"INCONCLUSIVE (N < 50)"` because binomial confidence interval half-width exceeds $\pm 14\%$.
- **Evaluated Cohorts ($N_g \ge 50$):** Metric calculated with exact Wilson score confidence intervals.

---

## 4. Conflicting Performance Gates Resolution Hierarchy

When metrics conflict during prospective evaluation, decisions follow a **Lexicographic Safety Hierarchy**:

```
                       [ SAFETY DECISION HIERARCHY ]
                                     │
           Priority 1: Student Safety (Recall >= Baseline - 2.0%)
                                     │
           Priority 2: Operational Burden (Δ False Alarms < 0)
                                     │
           Priority 3: Fairness Screening (DIR in [0.80, 1.25])
                                     │
           Priority 4: Probability Accuracy (ECE <= 0.050)
                                     │
           Priority 5: Ranking Discrimination (Δ ROC-AUC >= +0.015)
```

### Resolution Rules for Common Operational Conflicts:
1. **Scenario A (Higher AUC, But More False Alarms):**
   $\Delta \text{ROC-AUC} = +0.024$, but $\Delta \text{FP} = +150$.  
   **Action: HARD-BLOCK (REJECT).** Priority 2 overrides Priority 5. SUTRA exists to reduce advisor burden, not inflate it.
2. **Scenario B (Lower False Alarms, But Lower Recall):**
   $\Delta \text{FP} = -300$, but $\text{Recall}$ drops from $65.0\%$ to $61.5\%$ ($\Delta = -3.5\%$).  
   **Action: HARD-BLOCK (REJECT).** Priority 1 overrides Priority 2. An early warning system must not abandon failing students to create an artificial impression of efficiency.
3. **Scenario C (Higher AUC, But Degraded Calibration):**
   $\Delta \text{ROC-AUC} = +0.020$, but $\text{ECE} = 0.078$.  
   **Action: HARD-BLOCK (HOLD/REJECT).** Priority 4 overrides Priority 5. Advisors rely on calibrated risk tiers; severe miscalibration invalidates triage.
4. **Scenario D (Higher AUC, Disparate Selection Ratio):**
   $\Delta \text{ROC-AUC} = +0.018$, all workload gates pass, but $\text{DIR}(\text{Disability=Y}) = 1.34$.  
   **Action: HOLD FOR ETHICS REVIEW.** Priority 3 blocks promotion until institutional review determines whether disparity reflects authentic need or algorithmic bias.
