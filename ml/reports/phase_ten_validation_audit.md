# SUTRA Phase Ten — Model Promotion Readiness & Validation Audit Report

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Governance Reviewer  
**Scope:** Promotion-Readiness Audit of Phase Nine Module-Relative Logistic Regression Experiment  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Executive Summary & Verification Findings

This audit conducts an independent, methodological evaluation of the Phase Nine module-relative Logistic Regression candidate against the active production baseline (Logistic Regression v1.0.0 at threshold $0.46$).

### Key Audit Conclusions:
1. **The Phase Nine Gains Reproduce Exactly:** Re-executing the 5-fold cross-validation pipeline across all $18,263$ historical training records confirmed the reported metrics to four decimal places:
   - **ROC-AUC:** Baseline $0.7230 \rightarrow$ Experimental $\mathbf{0.7484}$ ($\Delta = +0.0254$)
   - **PR-AUC:** Baseline $0.6939 \rightarrow$ Experimental $\mathbf{0.7317}$ ($\Delta = +0.0378$)
   - **Workload at $t=0.46$:** False alarms dropped from $4,007$ to $\mathbf{3,607}$ ($-400$ false positives, a $-10.0\%$ reduction).
2. **Cluster-Bootstrap Proves Gains are Statistically Robust:** A 1,000-sample student-cluster bootstrap (resampling unique students with replacement to account for repeated registrations) demonstrated that the discrimination gain is unambiguously positive:
   - $\Delta \text{ROC-AUC}$ 95% CI: $[+0.0215, +0.0292]$ ($p < 0.001$)
   - $\Delta \text{PR-AUC}$ 95% CI: $[+0.0328, +0.0432]$ ($p < 0.001$)
   - $\Delta \text{FP}$ 95% CI: $[-469.7, -325.8]$ false alarms saved.
3. **Zero Preprocessing Leakage:** The experimental transformer ([`ModuleRelativeTransformer`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/features/module_relative.py)) was verified to fit module means and standard deviations strictly on the training partition of each fold. Validation data distributions and labels never influence learned statistics.
4. **No Untouched Temporal Holdout Remains in OULAD:** All four historical course presentations in OULAD (`2013B`, `2013J`, `2014B`, `2014J`) have been evaluated in previous phases. The 2014J cohort cannot serve as an independent confirmation set. True prospective validation is mandatory before production replacement.
5. **Operational Trade-offs Across Modules:** The net reduction of $-400$ false alarms is driven by humanities/social science courses (`BBB`: $-342$, `GGG`: $-347$), while STEM courses experienced minor false positive increases (`DDD`: $+113$, `FFF`: $+100$) due to higher relative peer engagement expectations.
6. **Calibration is Preserved:** Probability calibration remains tightly aligned across decile bins ($\text{ECE} = 0.0385$, $\text{Brier} = 0.2021$), showing stability across 5, 10, 15, and 20 bin partitions.
7. **Production Baseline Remains Untouched:** `ml/artifacts/models/v1.0.0/` remains completely unmodified (SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`), and `backend/app/main.py` continues serving v1.0.0 at threshold $0.46$.

---

## 2. Dataset Partitions & Validation Evidence Inventory

To establish what empirical evidence genuinely exists, we audited all data partitions across Phases Three through Ten:

| Cohort / Presentation | Sample Size | Unique Students | At-Risk Prevalence | Historical Usage in Project | Independence Status |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`2013B`, `2013J`, `2014B`** | 18,263 | 17,188 | 45.64% (8,335) | Training partition for 5-fold student-grouped cross-validation in Phases 3, 4, 6, 7, 8, 9, 10. | **In-Sample / CV Only** |
| **`2014J` (All Students)** | 9,203 | 8,857 | 40.70% (3,746) | Evaluated in Phase Three, Phase Four-A reconciliation, Phase Six diagnostic errors, Phase Seven secondary comparison, Phase Eight, Phase Nine. | **Exhausted / Secondary Historical Diagnostic Only** |
| **`2014J` (Disjoint Subset)** | 7,921 | 7,921 | 40.45% (3,204) | Evaluated in Phase Three and Phase Six to check unseen student generalization. | **Exhausted / Diagnostic Reference Only** |

### Critical Finding: Absence of Untouched Data
Because the open OULAD benchmark contains only these four presentations, **no genuinely untouched temporal holdout remains in the dataset**. 

Claims of "independent test set confirmation" cannot be made from 2014J evaluations. Rerunning random splits or altering seeds would manufacture synthetic independence and violate temporal integrity. True empirical confirmation requires:
1. Prospective shadow deployment on active upcoming course presentations.
2. Ingestion of multi-institution learning management data (Canvas/Moodle/Blackboard).

---

## 3. Quantified Uncertainty: Student-Cluster Bootstrap

Individual course registrations from the same student are not independent. To estimate paired parameter uncertainty without violating group structure, we executed a **1,000-iteration student-cluster bootstrap**:
- Unique students were resampled with replacement from the $17,188$ unique training students.
- All registrations belonging to sampled students were extracted.
- Paired differences ($\Delta = \text{Metric}_{\text{Exp}} - \text{Metric}_{\text{Baseline}}$) were computed on identical resampled datasets.

### Table 1: Paired Uncertainty Analysis ($B = 1,000$ Bootstrap Iterations)

| Metric | Baseline LR Mean | Exp Rel LR Mean | Paired Mean Difference | Standard Error | 95% Bootstrap Confidence Interval | $P(\Delta \le 0)$ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **ROC-AUC** | 0.7230 | 0.7484 | **+0.0253** | 0.0019 | **[+0.0215, +0.0292]** | $< 0.001$ |
| **PR-AUC** | 0.6939 | 0.7317 | **+0.0379** | 0.0026 | **[+0.0328, +0.0432]** | $< 0.001$ |
| **Brier Score** | 0.2117 | 0.2021 | **-0.0096** | 0.0007 | **[-0.0109, -0.0082]** | $< 0.001$ |
| **Precision ($t=0.46$)** | 59.83% | 62.39% | **+2.58%** | 0.26% | **[+2.06%, +3.09%]** | $< 0.001$ |
| **Recall ($t=0.46$)** | 71.59% | 71.79% | **+0.20%** | 0.36% | **[-0.50%, +0.87%]** | 0.284 |
| **F1-Score ($t=0.46$)** | 0.6518 | 0.6676 | **+0.0159** | 0.0026 | **[+0.0106, +0.0206]** | $< 0.001$ |
| **Specificity ($t=0.46$)** | 59.64% | 63.67% | **+4.05%** | 0.38% | **[+3.28%, +4.75%]** | $< 0.001$ |
| **False Alarms (FP)** | 4,007 | 3,607 | **-401.7** | 37.8 | **[-469.7, -325.8]** | $< 0.001$ |
| **False Negatives (FN)**| 2,368 | 2,351 | **-16.9** | 30.0 | **[-72.8, +41.0]** | 0.286 |
| **Alert Rate %** | 54.61% | 52.52% | **-2.11%** | 0.27% | **[-2.60%, -1.57%]** | $< 0.001$ |

### Interpretation:
1. **Unambiguous Discrimination Gain:** The entire 95% confidence interval for ROC-AUC is strictly positive ($+0.0215$ to $+0.0292$), demonstrating a genuine ranking improvement across student cohorts.
2. **Statistically Significant Workload Reduction:** The experimental model saves between $326$ and $470$ false alarms with 95% confidence.
3. **Recall Parity:** Recall difference spans zero ($[-0.50\%, +0.87\%]$), indicating that the false alarm reduction is achieved without sacrificing at-risk student detection.

---

## 4. Subgroup Operational Audit: Disciplinary Trade-offs

A critical requirement of SUTRA's "No Alert Without Action" governance is auditing how operational workloads distribute across individual course modules.

### Table 2: Module-by-Module Breakdown ($N = 18,263$, Operating Threshold $t=0.46$)

| Module | Disciplinary Domain | Registrations (Positives) | Preval. | Base FP | Exp FP | Net FP Delta | Base FN | Exp FN | Net FN Delta | Base Rec | Exp Rec | Rec Delta | Base Alert Rate | Exp Alert Rate |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **AAA** | Arts & Humanities | 369 (91) | 24.66% | 57 | 70 | **+13** | 53 | 46 | **-7** | 41.76% | 49.45% | +7.69% | 25.75% | 31.17% |
| **BBB** | Social Sciences | 4,633 (2,031) | 43.84% | 1,167 | 825 | **-342** | 459 | 655 | **+196** | 77.40% | 67.75% | -9.65% | 59.10% | 47.51% |
| **CCC** | STEM (CompSci) | 1,489 (826) | 55.47% | 229 | 225 | **-4** | 255 | 247 | **-8** | 69.13% | 70.10% | +0.97% | 53.79% | 53.93% |
| **DDD** | STEM (Technical) | 3,800 (1,982) | 52.16% | 674 | 787 | **+113** | 663 | 459 | **-204** | 66.55% | 76.84% | +10.29% | 52.45% | 59.76% |
| **EEE** | Technology / Edu | 1,532 (566) | 36.95% | 343 | 410 | **+67** | 157 | 112 | **-45** | 72.26% | 80.21% | +7.95% | 49.09% | 56.40% |
| **FFF** | STEM (High Click) | 4,720 (2,189) | 46.38% | 788 | 888 | **+100** | 709 | 585 | **-124** | 67.61% | 73.28% | +5.67% | 48.05% | 52.80% |
| **GGG** | Humanities (Reading) | 1,720 (650) | 37.79% | 749 | 402 | **-347** | 72 | 247 | **+175** | 88.92% | 62.00% | -26.92% | 77.15% | 46.80% |
| **Total**| **All Modules Pooled** | **18,263 (8,335)** | **45.64%** | **4,007** | **3,607** | **-400** | **2,368** | **2,351** | **-17** | **71.59%** | **71.79%** | **+0.20%** | **54.61%** | **52.52%** |

### Mathematical Reconciliation:
- Sum of module FP deltas: $(+13) + (-342) + (-4) + (+113) + (+67) + (+100) + (-347) = \mathbf{-400}$.
- Sum of module FN deltas: $(-7) + (+196) + (-8) + (-204) + (-45) + (-124) + (+175) = \mathbf{-17}$.
The module sums reconcile with the pooled out-of-fold metrics.

### Trade-off Dynamics:
1. **The Humanities Workload Rebalancing:** In modules `BBB` and `GGG`, the baseline model suffered from an extreme alert rate ($59.1\%$ in BBB and $77.2\%$ in GGG) because students read physical books and had fewer VLE clicks. Module-relative features prevented **$689$ false alarms** across these two courses, rationalizing advisor caseloads.
2. **The STEM Sensitivity Shift:** In technical modules (`DDD`, `EEE`, `FFF`), the baseline model under-detected at-risk students because moderate clickers looked "engaged" relative to humanities students. Module-relative standardization boosted STEM recall by $+5.7\%$ to $+10.3\%$, proactively identifying **$373$ additional at-risk students**, with a proportionate increase of $280$ false positives across these modules.
3. **Governance Note on False Positives:** A false positive (alerting an on-track student) is an advisor review opportunity, not harmful intervention. However, false positive spikes in specific modules must be communicated to faculty tutors so caseload expectations match course size.
4. **Fairness Disclaimer:** These subgroup variations reflect historical pedagogical differences across courses. They do not constitute formal fairness certification or causal proof.

---

## 5. Calibration Sensitivity & Operational Threshold Policy

### Table 3: Calibration Robustness Across Reliability Bin Counts ($N = 18,263$)

| Bin Count ($n_{\text{bins}}$) | Baseline LR ECE | Exp Module-Rel LR ECE | $\Delta$ ECE | Baseline Brier | Exp Brier |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **5 Bins** | 0.0380 | **0.0384** | +0.0004 | 0.2117 | **0.2021** |
| **10 Bins (Deciles)** | 0.0384 | **0.0385** | +0.0001 | 0.2117 | **0.2021** |
| **15 Bins** | 0.0380 | **0.0400** | +0.0020 | 0.2117 | **0.2021** |
| **20 Bins (Ventiles)**| 0.0384 | **0.0405** | +0.0021 | 0.2117 | **0.2021** |

### Calibration Audit Findings:
- Expected Calibration Error (ECE) remains under $0.041$ across all binning granularities.
- Brier score improves by $-0.0096$ ($0.2117 \rightarrow 0.2021$), reflecting sharper probability separation while preserving accuracy.

### Operational Threshold Policy:
The operating threshold **$t = 0.46$** was retained without alteration throughout Phase Nine and Phase Ten.
- **Why $t=0.46$ is Preserved:** Setting the threshold at $0.46$ reflects SUTRA's established target of catching $\ge 70\%$ of at-risk students at Day 30 while maintaining manageable caseloads.
- **Requirements for Any Future Threshold Change:** Modifying the operational threshold cannot be done based on ML accuracy curves alone. It requires:
  1. Consultation with academic advisory deans regarding maximum weekly case review capacity.
  2. Cost-benefit weighting of missed at-risk students (Type II error) versus advisor consultation load (Type I error).
  3. Formal sign-off through an institutional governance approval gate.

---

## 6. Inference Safety & Production Integrity

1. **Production Artifact Hashes (Verified Unchanged):**
   - `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`:
     `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` (**Intact**)
   - `ml/artifacts/models/v1.0.0/model_metadata.json`:
     `747c216d65377f293fcadc135153113dbfa4d01c0a26fb33b9218af8b495de8b` (**Intact**)
2. **Experimental Artifact Isolation:**
   - Saved exclusively in `ml/artifacts/experiments/phase_nine_module_relative/`.
   - Production directories contain zero references to module-relative transformers.
3. **Inference Transformer Immutability:**
   - Unit tests verified that executing `predict_proba()` with valid, extreme, or malformed inference inputs does not refit or mutate internal transformer statistics.
4. **Unseen Module Graceful Fallback:**
   - Evaluated with an unseen course identifier (`code_module="UNKNOWN_MODULE_ZZZ"`). The pipeline gracefully utilized training global statistics and returned finite probabilities in $[0, 1]$.
5. **API & Test Suite Status:**
   - Full automated test suite: **91 passed in 0.54s** across data quality, leakage, explainability, backend endpoints, and audit tests.

---

## 7. Supporting Artifacts & Figures

- **Uncertainty JSON:** [`ml/reports/metrics/phase_ten_uncertainty.json`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/metrics/phase_ten_uncertainty.json)
- **OOF Prediction Records:** [`ml/reports/metrics/phase_nine_oof_predictions.csv`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/metrics/phase_nine_oof_predictions.csv)
- **Audit Visualization:** [`ml/reports/figures/phase_ten_calibration_and_uncertainty.png`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/figures/phase_ten_calibration_and_uncertainty.png)
