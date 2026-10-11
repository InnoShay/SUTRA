# SUTRA Phase Twelve — Pre-Registered Prospective Evaluation Protocol

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Governance Engineer  
**Status:** Pre-Registered Prospective Evaluation Plan (Locked Prior to Future-Cohort Observation)  
**Evaluated Models:**
- **Baseline Serving Model:** Regularized Logistic Regression v1.0.0 (SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`)
- **Experimental Candidate:** Phase Nine Module-Relative Logistic Regression (SHA-256: `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25`)
**Fixed Operating Threshold:** $\tau = 0.46$ (strictly locked; no post-hoc threshold optimization permitted)  

---

## 1. Study Objective & Pre-Registration Rationale

The objective of this prospective protocol is to evaluate whether the Phase Nine module-relative feature enhancement delivers genuine, statistically significant reductions in advisor false alarm burden while maintaining or improving early student catch rates in an authentic, unseen academic term.

To guard against p-hacking, retrospective threshold tuning, and selective subgroup reporting, **all eligibility rules, evaluation metrics, statistical hypotheses, and go/no-go gates are pre-registered in this document prior to any future-cohort data collection.**

---

## 2. Cohort Definition & Eligibility Rules

### 2.1 Target Population
The prospective evaluation cohort comprises all formal undergraduate registrations in accredited semester modules during the shadow evaluation term.

### 2.2 Eligibility Criteria
A student registration `(id_student, code_module, code_presentation)` is eligible for evaluation if and only if:
1. **Active Registration at Cutoff:** The student was officially registered on or before course Day 0 and remained registered through course **Day 30**.
2. **Feature Observability:** Complete telemetry for all 25 baseline features is recorded strictly within the window $t \le 30$.
3. **No Prior Dropped Status:** Registrations with official withdrawal dates $t_{\text{unreg}} \le 30$ are **excluded from the Day-30 early warning cohort** (as their withdrawal is already a known past event, not an early warning prediction).

### 2.3 Handling Missing Outcomes & Post-Day-30 Withdrawals
- **Post-Day-30 Withdrawals ($t_{\text{unreg}} > 30$):** Classified as **Positive Class ($y=1$, At-Risk)**. A withdrawal occurring after the prediction point represents a true attrition event that the Day-30 model was intended to anticipate.
- **Academic Failure (`Fail`):** Classified as **Positive Class ($y=1$, At-Risk)**.
- **Academic Success (`Pass`, `Distinction`):** Classified as **Negative Class ($y=0$, Non-Risk)**.
- **Missing / Incomplete Grades:** Any registration without a final certified exam/module result (e.g. administrative hold, transfer, medical deferral) will be **quarantined and excluded from primary metric scoring**, with missingness rates reported separately.

### 2.4 Outcome-Maturation Period
- Predictive scoring occurs at **Day 30**.
- **Outcomes remain strictly blinded** until the conclusion of the academic term and formal certification of final grades by the institution's examination board (typically 120–150 days post-launch).
- No evaluation metrics may be computed or released during the semester.

---

## 3. Pre-Registered Hypotheses & Metrics

### 3.1 Primary Statistical Hypotheses
All comparisons are evaluated at the fixed production threshold $\tau = 0.46$:

1. **Hypothesis 1 (Discriminative Superiority):**
   $$H_0: \Delta \text{ROC-AUC} \le 0 \quad \text{vs.} \quad H_1: \Delta \text{ROC-AUC} > 0$$
   where $\Delta \text{ROC-AUC} = \text{ROC-AUC}_{\text{exp}} - \text{ROC-AUC}_{\text{prod}}$.

2. **Hypothesis 2 (False Alarm Reduction):**
   $$H_0: \Delta \text{FPR} \ge 0 \quad \text{vs.} \quad H_1: \Delta \text{FPR} < 0$$
   where $\text{FPR} = \text{FP} / (\text{FP} + \text{TN})$ at $\tau = 0.46$.

### 3.2 Metric Definitions

| Metric Category | Metric | Operational Meaning | Success Criterion |
| :--- | :--- | :--- | :--- |
| **Primary** | $\Delta \text{ROC-AUC}$ | Change in overall rank-ordering capacity | $\Delta \ge +0.015$ ($p < 0.01$) |
| **Primary** | $\Delta \text{PR-AUC}$ | Precision-recall area under high-risk focus | $\Delta \ge +0.020$ ($p < 0.01$) |
| **Primary** | $\Delta \text{False Alarms}$ | Total reduction in unneeded advisor outreach | Statistically significant decrease ($\Delta < 0$) |
| **Secondary** | Brier Score | Mean squared error of predicted probabilities | Lower is better ($\text{Brier}_{\text{exp}} < \text{Brier}_{\text{prod}}$) |
| **Secondary** | Expected Calibration Error (ECE) | Average calibration mismatch across 10 bins | $\text{ECE} \le 0.045$ |
| **Secondary** | Recall at $\tau = 0.46$ | Percentage of true failing students alerted | Must remain within $\pm 2.0\%$ of baseline |
| **Secondary** | Alert Rate at $\tau = 0.46$ | Proportion of cohort flagged for human review | Expected reduction from $\sim 47\%$ to $\sim 43\%$ |

---

## 4. Statistical Power & Sample Size Requirements

To ensure the prospective evaluation yields definitive, defensible conclusions:

- **Target Effect Size:** Minimum detectable improvement of $\Delta \text{ROC-AUC} = 0.015$.
- **Significance Level:** $\alpha = 0.01$ (two-tailed).
- **Statistical Power:** $1 - \beta = 0.90$.
- **Required Mature Sample Size:**
  Based on paired Delong / clustered bootstrap power formulas with intra-student correlation $\rho \approx 0.12$:
  $$N_{\text{min}} \ge 3,500 \text{ eligible, mature registrations}$$
  $$\text{Unique Students: } K_{\text{min}} \ge 3,200 \text{ distinct individuals}$$
- **Uncertainty Estimation:** All confidence intervals will be constructed using **$B = 1,000$ paired cluster bootstrap resamples grouped on student identifier (`id_student`)**, mirroring the validated Phase Ten audit methodology.

---

## 5. Subgroup & Fairness Monitoring

The candidate model will be audited across all student demographic subgroups and academic disciplines to verify that performance gains are equitable:

### 5.1 Demographic Dimensions
- **Gender:** Male (`M`), Female (`F`).
- **Deprivation Index:** English Index of Multiple Deprivation (`imd_band` deciles/quintiles).
- **Disability Status:** Declared disability (`Y`), None (`N`).
- **Age Bands:** Under 35 (`0-35`), 35 to 55 (`35-55`), 55 and over (`55<=`).
- **Highest Prior Education:** Lower Than A Level, A Level, HE Qualification, Post Graduate.

### 5.2 Disparate Impact & Error Parity Criteria
- **False Positive Parity:** The ratio of false positive rates across demographic groups ($\text{FPR}_{\text{group}} / \text{FPR}_{\text{ref}}$) must not worsen by more than $5\%$ relative to baseline.
- **Alert Rate Balance:** Any module or demographic segment exhibiting an alert rate divergence $> 8\%$ between models must trigger a dedicated qualitative review.

---

## 6. Distribution Shift & Model Health Checks

Before computing mature metrics, the incoming Day-30 feature distributions will be checked against historical training data ($2013\text{B}$–$2014\text{B}$):

1. **Population Stability Index (PSI):**
   $$\text{PSI} = \sum \left(P_{\text{prospective}} - P_{\text{baseline}}\right) \times \ln\left(\frac{P_{\text{prospective}}}{P_{\text{baseline}}}\right)$$
   - $\text{PSI} < 0.10$: Stable distribution (Proceed).
   - $0.10 \le \text{PSI} < 0.25$: Moderate drift (Review feature distributions).
   - $\text{PSI} \ge 0.25$: Severe covariate shift (Pause evaluation).
2. **Unseen Module Frequency:**
   Proportion of students in newly created or unmapped course modules must not exceed $10\%$.

---

## 7. Go / No-Go Decision Thresholds for Model Promotion

Following completion of the shadow evaluation and outcome unblinding, promotion of the module-relative model from shadow to production will be governed by the following criteria:

| Verdict | Statistical & Operational Conditions | Action |
| :--- | :--- | :--- |
| **PROMOTE (Go)** | 1. $\Delta \text{ROC-AUC} \ge +0.015$ with $95\%\text{ CI}$ lower bound $> 0$<br>2. $\Delta \text{False Alarms} < 0$ with $p < 0.01$<br>3. Recall at $0.46$ drops by less than $2.0\%$ points<br>4. $\text{ECE} \le 0.050$<br>5. No worsening of demographic parity ratios $> 5\%$ | Model promoted to v2.0.0; serving threshold updated if approved |
| **PAUSE (Hold)** | 1. Sample size $N < 3,500$ mature records<br>2. Outcome maturation incomplete<br>3. Moderate PSI shift ($0.10 \le \text{PSI} < 0.25$) | Extend shadow mode for one additional term |
| **REJECT (No-Go)** | 1. $\Delta \text{ROC-AUC} \le 0$ or upper bound includes 0<br>2. $\text{ECE} > 0.070$ (severe probability miscalibration)<br>3. Severe disparate impact detected in any protected group<br>4. Unseen module fallback failures $> 15\%$ | Reject module-relative enhancement; retain v1.0.0 baseline |

*No exceptions or ad-hoc overrides to these gates are permitted.*
