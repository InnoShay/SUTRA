# SUTRA Phase Thirteen — Statistical Protocol & Power Audit Report

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Test Engineer  
**Status:** Audit Closure Review Document  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Branch:** `Neemay-ml`  

---

## 1. Executive Summary

Workstream D conducted an independent audit of the prospective evaluation protocol designed in Phase Twelve. The audit evaluated the sample size and power claims ($N \ge 3,500$, $K \ge 3,200$, $1-\beta = 0.90$, $\alpha = 0.01$), outcome-handling rules, multiple comparison controls, and promotion gate interaction logic.

### Key Conclusions:
1. **Power & Sample Size Claim Labeled Unverified:** The Phase Twelve claim that $N \ge 3,500$ mature registrations provides $90\%$ power at $\alpha = 0.01$ for detecting $\Delta \text{ROC-AUC} = 0.015$ was not accompanied by explicit parameter derivations. While mathematically achievable under high paired model correlation ($\rho_{\text{paired}} \ge 0.89$), it was undocumented. We formally label the claim **UNVERIFIED PENDING SPECIFIED CORRELATION ASSUMPTIONS** and provide an explicit sensitivity framework.
2. **Promotion Gate Hierarchy Hardened:** Confirmed that **ROC-AUC improvement alone is strictly insufficient for model promotion**. If discriminative ranking improves but false alarm burden increases ($\Delta \text{FP} > 0$) or calibration degrades ($\text{ECE} > 0.050$), promotion is **HARD-BLOCKED**.
3. **Outcomes & Multiple Comparison Controls Formalized:** Established formal quarantine procedures for delayed exam board results, Benjamini-Hochberg False Discovery Rate (FDR) adjustments for demographic subgroup analyses, and paired student-cluster bootstrap uncertainty estimation.
4. **Historical Holdout Safeguards Preserved:** Confirmed that no threshold optimization was performed on the historical 2014J holdout, and reaffirmed that retrospective OOF bootstrap intervals cannot substitute for authentic prospective cohort evaluation.

---

## 2. Power & Sample Size Mathematical Audit

### 2.1 The Theoretical Paired ROC Comparison Framework
In a prospective shadow evaluation, both the baseline (v1.0.0) and candidate (Phase Nine) score the **exact same cohort of students**. Consequently, the test is a paired comparison rather than two independent samples.

Under the Hanley-McNeil / DeLong / Obuchowski paired ROC framework, the variance of the difference between two correlated ROC-AUC estimates ($\Delta = \hat{\theta}_2 - \hat{\theta}_1$) is:
$$\mathbb{V}(\Delta) = \mathbb{V}(\hat{\theta}_1) + \mathbb{V}(\hat{\theta}_2) - 2 \cdot \text{Cov}(\hat{\theta}_1, \hat{\theta}_2)$$
$$\mathbb{V}(\Delta) \approx 2 \cdot \sigma^2 \cdot (1 - \rho_{\text{paired}})$$
where:
- $\sigma^2$ is the asymptotic variance of a single ROC-AUC estimator at prevalence $p \approx 0.456$:
  $$\sigma^2 = \frac{\theta (1 - \theta) + (n_1 - 1)(Q_1 - \theta^2) + (n_0 - 1)(Q_2 - \theta^2)}{n_0 n_1}$$
  with $n_1 = p N$, $n_0 = (1-p) N$, $Q_1 = \frac{\theta}{2 - \theta}$, and $Q_2 = \frac{2\theta^2}{1 + \theta}$.
- $\rho_{\text{paired}}$ is the correlation between the score rankings of the two models on the same student.
- $\text{VIF} = 1 + (\bar{m} - 1)\rho_{\text{intra}}$ is the clustering design effect across registrations per student ($\bar{m} = 3,500 / 3,200 \approx 1.094$, $\rho_{\text{intra}} \approx 0.12 \implies \text{VIF} \approx 1.011$).

The sample size required for two-tailed significance $\alpha = 0.01$ ($Z_{0.005} = 2.576$) and power $1 - \beta = 0.90$ ($Z_{0.10} = 1.282$) to detect effect size $\Delta = 0.015$ is:
$$N = \frac{\left(Z_{\alpha/2} + Z_{\beta}\right)^2 \cdot 2 \sigma^2 (1 - \rho_{\text{paired}})}{\Delta^2} \times \text{VIF}$$
$$\left(Z_{\alpha/2} + Z_{\beta}\right)^2 = (2.576 + 1.282)^2 = (3.858)^2 = 14.884$$

### 2.2 Sensitivity Analysis Over Paired Model Correlation
Because Phase Twelve did not record its assumed value of $\rho_{\text{paired}}$, we compute the required sample size across realistic correlation bounds:

| Assumed Paired Correlation ($\rho_{\text{paired}}$) | Paired Variance Reduction ($1 - \rho$) | Required Sample Size ($N_{\text{min}}$) | Assessment Relative to Phase 12 Claim ($N=3,500$) |
| :---: | :---: | :---: | :--- |
| **0.80** | $0.20$ | **6,420** | Underpowered at $N=3,500$ (Power $\approx 68\%$) |
| **0.85** | $0.15$ | **4,815** | Slightly underpowered at $N=3,500$ (Power $\approx 79\%$) |
| **0.88** | $0.12$ | **3,850** | Marginally underpowered (Power $\approx 86\%$) |
| **0.89** | $0.11$ | **3,530** | **Exact match for Phase 12 claim ($N \approx 3,500$)** |
| **0.92** | $0.08$ | **2,570** | Fully powered ($N=3,500$ achieves Power $> 96\%$) |

### 2.3 Formal Audit Finding on Sample Size
In historical Phase Ten out-of-fold data, the empirical Pearson correlation between baseline and candidate predicted probabilities on the same student registration was $\rho = 0.912$.
- At $\rho \approx 0.912$, $N = 3,500$ indeed yields power $\ge 90\%$.
- **However, because this calculation and the empirical correlation parameter were omitted in the Phase Twelve text, the claim is officially labeled UNVERIFIED AS STATED.**
- **Corrective Protocol:** Any future institutional pre-registration must explicitly specify $\rho_{\text{paired}} = 0.89$ as the conservative lower bound justifying $N_{\text{min}} = 3,500$.

---

## 3. Protocol for Outcome Maturation & Distribution Shifts

### 3.1 Handling Delayed and Missing Outcomes
1. **Unmaturated Registrations:** Registrations pending medical deferrals, grade appeals, or administrative holds at the end of the term must be **quarantined in an isolated non-evaluated partition**.
2. **Missingness Threshold:** If quarantined records exceed $3.0\%$ of the cohort, the evaluation must be paused until missingness causes are audited.
3. **Zero Imputation Policy:** Outcomes must never be synthetically imputed or filled with majority-class defaults.

### 3.2 Repeated Registrations & Clustered Uncertainty
Students registering for multiple simultaneous modules (e.g. 2 courses per semester) induce intra-student correlation ($\bar{m} \approx 1.094$).
- **Mandatory Clustering:** All confidence intervals and hypothesis tests must use **$B = 1,000$ paired cluster bootstrap resamples grouped on `id_student`**.
- Independent row-level bootstrapping is strictly prohibited.

### 3.3 Prevalence Shift Monitoring
The baseline model was trained on historical OULAD with at-risk prevalence $p = 45.64\%$.
- In a prospective cohort, baseline prevalence may drift ($p_{\text{prospective}} \ne 0.456$).
- The protocol requires computing both prevalence-dependent metrics (PR-AUC, Alert Rate, Brier Score) and prevalence-invariant metrics (ROC-AUC, FPR, TPR).
- If $p_{\text{prospective}}$ shifts outside $[35\%, 55\%]$, threshold re-calibration review is required.

### 3.4 Multiple Subgroup Testing Corrections
Auditing performance across 5 demographic dimensions (Gender, Age, Region, IMD, Disability) entails evaluating over 20 distinct subgroup comparisons.
- To prevent false discoveries driven by multiple hypothesis testing, all subgroup disparity $p$-values must be adjusted using the **Benjamini-Hochberg (BH) procedure** at False Discovery Rate $q = 0.05$.

---

## 4. Promotion Gate Hierarchy & Conflict Resolution

In operational student-support systems, a higher AUC does not necessarily translate to a better decision tool if it increases false alarms or distorts risk probabilities.

The following **Lexicographic Promotion Hierarchy** governs model promotion:

```
                                [ PROMOTION DECISION TREE ]
                                             │
                       Is Δ ROC-AUC >= +0.015 with 95% CI > 0?
                                  │               │
                                 YES              NO ───► REJECT CANDIDATE
                                  │
                       Is Δ False Alarms < 0 (p < 0.01)?
                                  │               │
                                 YES              NO ───► REJECT CANDIDATE
                                  │
                      Does Recall drop by less than 2.0%?
                                  │               │
                                 YES              NO ───► REJECT CANDIDATE
                                  │
                             Is ECE <= 0.050?
                                  │               │
                                 YES              NO ───► REJECT CANDIDATE
                                  │
                    Are all Subgroup DIRs in [0.80, 1.25]?
                                  │               │
                                 YES              NO ───► HOLD FOR ETHICS REVIEW
                                  │
                                  ▼
                         [ PROMOTE TO v2.0.0 ]
```

### Operational Conflict Rules:
- **Conflict 1 (Higher AUC, More False Alarms):** If the candidate achieves $\Delta \text{ROC-AUC} = +0.02$, but advisor false alarms increase ($\Delta \text{FP} > 0$), the model **MUST BE REJECTED**. Advisor burnout and alert fatigue override pure ranking gains.
- **Conflict 2 (Higher AUC, Severe Miscalibration):** If $\Delta \text{ROC-AUC} = +0.02$, but Expected Calibration Error degrades ($\text{ECE} > 0.050$), the model **MUST BE REJECTED** because predicted probabilities would misinform advisors regarding absolute risk.
- **Conflict 3 (Higher AUC, Demographic Disparity):** If any demographic subgroup experiences an adverse disparate impact ratio outside $[0.80, 1.25]$, promotion is **BLOCKED** pending human ethics review.

---

## 5. Methodological Safeguards Compliance

1. **No Threshold Tuning on Holdouts:** The operating threshold remains strictly locked at $\tau = 0.46$. It has not been tuned or altered using historical data or candidate predictions.
2. **No Claim of Prospective Validation from OOF Data:** Cross-validation bootstrap intervals from Phase Ten ($\Delta \text{ROC-AUC} \in [+0.0215, +0.0292]$) are explicitly recognized as internal retrospective estimates. They do not constitute prospective validation.
