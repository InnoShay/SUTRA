# SUTRA Phase Twenty — Dataset Feasibility & Readiness Criteria

**Milestone:** CODEX 3.0 PS6 Institutional Dataset Readiness & Longitudinal Data Contract  
**Author:** Senior ML Data Engineer and Student Analytics Data Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Audit & Feasibility Framework  

---

## 1. Executive Summary

This document establishes the **SUTRA Dataset Feasibility & Readiness Framework**. It defines the quantitative scorecard and institutional governance criteria that any prospective higher-education dataset must satisfy before it can be accepted for longitudinal model training.

### Key Governance Principles
1. **Four Contiguous Semesters is a Minimum Planning Baseline, Not a Guarantee:** A dataset spanning four terms is necessary to support temporal holdout evaluation, but term count alone does not guarantee statistical power or distributional stability.
2. **Cluster Correlation & Effective Sample Size:** Standard power calculations assuming independent-and-identically-distributed (i.i.d.) rows underestimate variance. Power estimation must account for intraclass correlation (ICC) across repeated student enrollments and course departments.
3. **Maturity & Bias Audits:** Incomplete terms, unfinalized grades, and intervention confounding must be audited prior to training.

---

## 2. Workstream D — Dataset Readiness Scorecard

The table below details the quantitative readiness criteria evaluated by [`LongitudinalDatasetValidator`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/data/longitudinal_validator.py):

| Evaluation Dimension | Minimum Threshold | Target Ideal Benchmark | Assessment Metric & Rationale |
|---|:---:|:---:|---|
| **1. Total Snapshot Records** | $\ge 15,000$ | $\ge 40,000$ | Sufficient volume across Day-30 and Day-60 snapshots to train without extreme overfitting. |
| **2. Unique Student Cohort** | $\ge 5,000$ | $\ge 12,000$ | Unique de-identified learners; prevents cluster concentration on a tiny student sample. |
| **3. Academic Terms Span** | $\ge 4$ contiguous terms | $\ge 6$ terms | Minimum: 2 terms Train, 1 term Validation/Calibration, 1 term Untouched Test. |
| **4. Term-over-Term Variation** | $\ge 2$ academic years | $\ge 3$ years | Must span both Fall and Spring cycles to evaluate seasonal curriculum drift. |
| **5. Minority Outcome Volume** | $\ge 2,000$ at-risk ($Y=1$) | $\ge 5,000$ at-risk | Ensures adequate positive cases in validation and test partitions for subgroup calibration. |
| **6. Target Prevalence Range** | $15.0\% - 55.0\%$ | $25.0\% - 45.0\%$ | Extreme prevalence ($<5\%$ or $>80\%$) indicates non-representative courses or non-credit browsing. |
| **7. Dual Milestone Availability** | $100\%$ matched | $100\%$ matched | Both Day-30 and Day-60 snapshots must be present for active cohorts to enable trajectory slope modeling. |
| **8. Academic Domain Coverage** | $\ge 90.0\%$ | $\ge 98.0\%$ | Course credits, prior GPA, and graded assessment milestones must be present. |
| **9. LMS Domain Coverage** | $\ge 90.0\%$ | $\ge 98.0\%$ | Digital interaction logs and active days must be captured. |
| **10. Attendance Domain Coverage**| $\ge 80.0\%$ (if included)| $\ge 95.0\%$ | Optional tier; if institution claims attendance modeling, coverage must be verified. |
| **11. Outcome Maturity** | **$100.0\%$** | **$100.0\%$** | Zero pending grades, zero ongoing grade appeals. Unresolved terms are strictly rejected. |
| **12. Target Leakage Absence** | **$0$ leakage fields** | **$0$ leakage fields** | Complete absence of post-cutoff columns (`final_result`, `withdrawal_date`, etc.). |
| **13. Point-in-Time Correctness** | **$0$ violations** | **$0$ violations** | All feature timestamps must satisfy $t_{\text{event}} \le T_{\text{cutoff}}$. |
| **14. Legal & Ethics Governance** | **Certified** | **Certified** | Formal Data Use Agreement (DUA), IRB approval/exemption, de-identification verified. |

---

## 3. Critical Assessment of the Four-Contiguous-Semester Requirement

In Phase Nineteen, a minimum of **four contiguous academic semesters** was proposed. We formally assess this requirement:

```
Year 1 (Term 1: Fall)     Year 1 (Term 2: Spring)    Year 2 (Term 3: Fall)      Year 2 (Term 4: Spring)
┌───────────────────────┐ ┌────────────────────────┐ ┌────────────────────────┐  ┌────────────────────────┐
│     TRAIN PARTITION   │ │    TRAIN PARTITION     │ │  VALIDATION PARTITION  │  │   TEST PARTITION       │
│ Historical Baseline   │ │ Historical Baseline    │ │ Model Tuning & Calib   │  │ Prospective Holdout    │
└───────────────────────┘ └────────────────────────┘ └────────────────────────┘  └────────────────────────┘
```

### Why Four Semesters is a Project Planning Target, NOT an Automatic Guarantee
1. **Seasonal Drift Between Fall and Spring:** Academic dynamics in Fall semesters (incoming freshmen, introductory courses) differ systematically from Spring semesters (continuing students, advanced prerequisite modules). Evaluating a model trained on Fall 1 + Spring 1 on a Fall 2 validation set tests seasonal robustness, but evaluating on Spring 2 tests spring-specific persistence.
2. **Curriculum & Policy Revisions:** Higher-education institutions frequently alter grading scales, add withdrawal deadlines, or transition LMS platforms (e.g. Blackboard to Canvas) over multi-year horizons. A four-semester extract spanning an LMS transition would suffer severe unobserved covariate shift.
3. **Sample Size Disparities Across Departments:** An institution with 20,000 total students may have only 80 students enrolled in smaller departments (e.g. Philosophy or Physics). In these small departments, four semesters provide insufficient positive cases for department-specific calibration.

---

## 4. Evidence Required to Estimate Sample Size & Statistical Power

To prevent ungrounded claims of statistical adequacy, SUTRA establishes the mathematical requirements for institutional sample size estimation.

### 4.1. Accounting for Clustered Correlation (Intraclass Correlation Coefficient)
Student enrollments are not independent observations. They are clustered within:
1. **Learners:** Repeated enrollments by the same student across terms ($\rho_{\text{student}}$).
2. **Courses:** Shared instructor grading norms and difficulty within a course module ($\rho_{\text{course}}$).

The **Design Effect (DE)** inflates variance and reduces effective sample size:
$$\text{DE} = 1 + (m - 1) \cdot \text{ICC}$$
Where $m$ is the average cluster size (enrollments per student or course) and $\text{ICC}$ is the intraclass correlation coefficient:
$$\text{ICC} = \frac{\sigma^2_{\text{between}}}{\sigma^2_{\text{between}} + \sigma^2_{\text{within}}}$$
The **Effective Sample Size** ($N_{\text{eff}}$) is:
$$N_{\text{eff}} = \frac{N_{\text{total}}}{\text{DE}}$$

### 4.2. Precision-Recall AUC (PR-AUC) Power Requirements
In academic risk forecasting, the minority class ($Y = 1$, At-Risk) carries primary operational importance.
To detect a statistically meaningful improvement of $\Delta \text{PR-AUC} \ge 0.05$ with power $1 - \beta = 0.80$ at significance level $\alpha = 0.05$:
- The test holdout must contain at least **$500$ mature minority-class events** ($Y=1$).
- At a typical prevalence of $30\%$, this requires an independent test partition of at least **$1,670$ distinct student registrations**.
- For subgroup audits (e.g. evaluating 5 distinct academic schools independently), each school must contain at least $100$ minority events, requiring at least $5 \times 350 = 1,750$ test registrations.

---

## 5. Audit of Potential Dataset Biases

Before a prospective dataset can be certified for model training, the following three bias mechanisms must be documented:

### 5.1. Label Bias
- **Differential Grading Standards:** Course failure in STEM departments may occur at $55\%$ exam average, whereas humanities courses may grade on qualitative rubrics with lower nominal failure rates.
- **Administrative Withdrawals vs Academic Failures:** Students who withdraw for non-academic reasons (medical emergency, military deployment, family caretaking) are labeled $Y=1$ in registrar records, confounding academic inability with external life shocks.

### 5.2. Selection Bias
- **Elective Online vs Mandatory In-Person Courses:** Students who choose online lecture streams often differ in employment status and age from residential campus students. Models trained on online courses cannot be generalized to residential freshmen cohorts without re-weighting.

### 5.3. Intervention Confounding (Policy Endogeneity)
- If the partner institution operated an active early-alert advisory service during the historical data collection period, students who were intervened upon and passed will appear as $Y=0$.
- The partner institution must provide **historical intervention logs** (or certify that no systematic early-warning outreach occurred during the historical training partition) to avoid training models on confounded labels.
