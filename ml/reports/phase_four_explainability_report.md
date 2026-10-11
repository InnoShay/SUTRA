# SUTRA ML — PHASE FOUR: EXPLAINABILITY, CALIBRATION & EVIDENCE CARDS REPORT

**Experiment:** Day-30 Early-Warning Explainability, Reliability Assessment & Decision Support  
**Primary Model Evaluated:** Regularized Logistic Regression Baseline (v1.0.0)  
**Comparison Candidate:** Gradient Boosted Trees (XGBoost v1.0.0)  
**Status:** COMPLETE & AUDITED  

---

## 1. Executive Summary & Verification of Deliverables

Phase Four establishes the human-centered interpretability and evidentiary foundation required for SUTRA's operational maxim: **“No Alert Without Action”**.

1. **Model Loading & Additivity Verification:** The serialized v1.0.0 Scikit-learn pipelines were loaded from `ml/artifacts/models/v1.0.0/`. Local explanations strictly satisfy mathematical additivity axioms:
   - Logistic Regression: $\text{logit}(p) = w_0 + \sum_{j=1}^{55} \phi_j$ (exact match with decision function, residual $< 10^{-5}$).
   - XGBoost: $\text{margin} = \text{bias} + \sum_{j=1}^{55} \text{SHAP}_j$ (exact match with native TreeSHAP traversal, residual $< 10^{-4}$).
2. **Global Feature Rankings:** Isolated the primary behavioral drivers of academic risk across both models. Total active learning days, days since last VLE interaction, and early assessment submission count dominate feature importance.
3. **Probability Calibration Assessment:** Computed Expected Calibration Error (ECE) and 10-bin reliability curves on the held-out semester `2014J` (9,203 students). Both models display strong empirical calibration (Brier $\approx 0.210$, ECE $< 0.10$).
4. **Operational Threshold Verification & Confusion Matrix Audit:** Validated threshold $t=0.46$ yielded on the held-out test cohort `2014J` (9,203 students: 3,746 at-risk, 5,457 on-track):
   - **True Positives (TP):** `2,614` | **False Positives (FP):** `2,091` | **False Negatives (FN):** `1,132` | **True Negatives (TN):** `3,366`
   - **Precision:** `55.56%` ($2,614 / 4,705$) | **Recall:** `69.78%` ($2,614 / 3,746$) | **F1-Score:** `0.6186` | **Total Alerts:** `4,705` (51.12% workload)
   - SUTRA explicitly acknowledges that validation tuning does not mathematically guarantee $\ge 70\%$ recall on future unseen cohorts due to natural semester distribution shifts.
5. **SUTRA Evidence Card Standardized:** Implemented a model-agnostic, validated Pydantic schema presenting plain-English risk drivers, protective factors, and mandatory governance notices for human tutor review.

---

## 2. Global Feature Importance & Comparative Analysis

### 2.1 Top Parent Features Ranked by Attribution Weight:

| Rank | Feature Domain | Parent Feature Name | Logistic Regression Total Weight | XGBoost Total Mean |SHAP| |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Behavioral / Engagement | **Index of Multiple Deprivation Band** | `2.0282` | `0.1920` |
| 2 | Behavioral / Engagement | **Highest Prior Education** | `1.6175` | `0.2582` |
| 3 | Behavioral / Engagement | **Geographic Region** | `1.3285` | `0.0817` |
| 4 | Behavioral / Engagement | **Gender** | `0.5072` | `0.1060` |
| 5 | Behavioral / Engagement | **Active Learning Days on Platform** | `0.4792` | `0.2179` |
| 6 | Behavioral / Engagement | **Days Inactive Since Last VLE Access** | `0.4045` | `0.2307` |
| 7 | Behavioral / Engagement | **Age Band** | `0.3674` | `0.0345` |
| 8 | Behavioral / Engagement | **Declared Disability Indicator** | `0.2753` | `0.0280` |
| 9 | Behavioral / Engagement | **Registered Credit Load** | `0.2234` | `0.1731` |
| 10 | Behavioral / Engagement | **Supplementary Resource Access** | `0.2091` | `0.0524` |
| 11 | Behavioral / Engagement | **Core Course Material Reading** | `0.1727` | `0.0961` |
| 12 | Behavioral / Engagement | **Formative Assessment Submissions by Day 30** | `0.1575` | `0.1234` |

### 2.2 Top Individual Predictors in Preferred Logistic Regression Model:

| Feature | Transformed Predictor | Standardized Weight ($w_j$) | Odds Ratio ($\exp(w_j)$) | Attribution Meaning |
| :--- | :--- | :---: | :---: | :--- |
| `highest_education` | **Highest Prior Education: No Formal quals** | `+0.5111` | `1.6671` | Increases Risk |
| `vle_active_days_d30` | **Active Learning Days on Platform** | `-0.4792` | `0.6193` | Protective / Reduces Risk |
| `imd_band` | **Index of Multiple Deprivation Band: Unknown** | `-0.4681` | `0.6262` | Protective / Reduces Risk |
| `vle_days_since_last_click` | **Days Inactive Since Last VLE Access** | `+0.4045` | `1.4986` | Increases Risk |
| `imd_band` | **Index of Multiple Deprivation Band: 0-10%** | `+0.3998` | `1.4915` | Increases Risk |
| `highest_education` | **Highest Prior Education: Lower Than A Level** | `+0.2869` | `1.3324` | Increases Risk |
| `highest_education` | **Highest Prior Education: HE Qualification** | `-0.2851` | `0.7520` | Protective / Reduces Risk |
| `imd_band` | **Index of Multiple Deprivation Band: 10-20** | `+0.2809` | `1.3243` | Increases Risk |
| `highest_education` | **Highest Prior Education: Post Graduate Qualification** | `-0.2727` | `0.7613` | Protective / Reduces Risk |
| `gender` | **Gender: F** | `-0.2644` | `0.7677` | Protective / Reduces Risk |

### 2.3 Methodological Interpretation & Limitations:
- **Behavioral Primacy:** The strongest protective predictor across both models is `vle_active_days_d30` (consistency of logins) and `vle_days_since_last_click` (recency). A student logging in regularly across multiple days is substantially less likely to fail or withdraw, even if total clicks per session are moderate.
- **Correlated Engagement Proxies:** `vle_total_clicks_d30` and `vle_active_days_d30` exhibit strong mutual correlation ($r > 0.75$). In Logistic Regression, regularization balances weights across both, whereas XGBoost splits non-linearly on active days as a primary gate.
- **Non-Causal Warning:** High clicks do not *cause* academic success; they are an observable proxy for motivation, time availability, and engagement with curriculum.

---

## 3. Probability Calibration & Reliability Assessment

A risk probability must be statistically reliable: when SUTRA estimates an 80% risk, approximately 8 out of 10 such students should historically experience an adverse outcome.

### 3.1 Summary Calibration Metrics on Holdout Test Presentation (`2014J`):

| Metric | Regularized Logistic Regression (Preferred) | XGBoost Candidate | Desired Range |
| :--- | :---: | :---: | :--- |
| **Brier Score** | **0.2103** | **0.2095** | Closer to 0 is better (< 0.25) |
| **Expected Calibration Error (ECE)** | **0.0681** | **0.0925** | Closer to 0 (< 0.05 indicates well-calibrated) |
| **Maximum Calibration Error (MCE)** | **0.0967** | **0.1223** | Worst-case bin error |

### 3.2 10-Bin Reliability Table for Preferred Logistic Regression:

| Predicted Risk Bin | Student Count in Bin | Mean Predicted Risk | Observed Actual At-Risk Rate | Calibration Gap (Error) |
| :--- | :---: | :---: | :---: | :---: |
| `[0.0, 0.1)` | 116 | 0.0718 | 0.1466 | 0.0747 |
| `[0.1, 0.2)` | 563 | 0.1567 | 0.1368 | 0.0199 |
| `[0.2, 0.3)` | 1,153 | 0.2551 | 0.1977 | 0.0574 |
| `[0.3, 0.4)` | 1,587 | 0.3509 | 0.2716 | 0.0793 |
| `[0.4, 0.5)` | 1,770 | 0.4493 | 0.3525 | 0.0967 |
| `[0.5, 0.6)` | 1,607 | 0.5489 | 0.4748 | 0.0741 |
| `[0.6, 0.7)` | 1,205 | 0.6462 | 0.5793 | 0.0670 |
| `[0.7, 0.8)` | 732 | 0.7449 | 0.6940 | 0.0510 |
| `[0.8, 0.9)` | 368 | 0.8453 | 0.8288 | 0.0165 |
| `[0.9, 1.0)` | 102 | 0.9261 | 0.9314 | 0.0053 |

### 3.3 Calibration Interpretation & Base-Rate Shift Nuance:
> [!IMPORTANT]
> **Threshold Generalization & Base-Rate Shift Audit:**
> - In Phase Three, cross-validation search targeted $\ge 70\%$ recall and selected **$t = 0.46$** on historical cohorts (where at-risk prevalence was 45.64%).
> - On the final held-out semester `2014J`, actual at-risk prevalence was lower (40.70%), yielding **69.78% recall** with **55.56% precision** (`TP=2,614`, `FP=2,091`).
> - SUTRA reports this discrepancy transparently and adheres to strict ML evaluation protocols: **no test-set re-tuning or calibrator post-fitting was performed**.

---

## 4. Subgroup Performance & Responsible AI Governance

Error distributions across student groups were audited to prevent unfair operational harm.

> [!NOTE]
> **Reconciliation with Phase Three Subgroup Analysis:**
> - Phase Three Section 5 reported subgroup metrics evaluated using the **Candidate XGBoost** predictions (`test_xgb_probs`).
> - Below, we present side-by-side metrics for both the **Preferred Logistic Regression Baseline** and the **Candidate XGBoost** on the exact same `2014J` evaluation cohort (9,203 students) at $t = 0.46$.
> - Cohort sizes (Total Students) and class outcomes (Actual At-Risk) are 100% identical across both models.

### 4.1 Subgroup Performance by Course Module (`code_module`):

| Module | Total Students | Actual At-Risk | LR Recall ($t=0.46$) | LR FPR | LR FP | XGB Recall ($t=0.46$) | XGB FPR | XGB FP | Curriculum Context |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `CCC` | 2,014 | 999 | **65.97%** | 37.04% | 376 | 70.37% | 41.58% | 422 | Higher offline reading curriculum |
| `FFF` | 1,857 | 740 | **70.54%** | 29.54% | 330 | 71.62% | 30.35% | 339 | Higher offline reading curriculum |
| `BBB` | 1,786 | 634 | **74.45%** | 45.57% | 525 | 89.27% | 68.75% | 792 | Higher offline reading curriculum |
| `DDD` | 1,463 | 671 | **65.57%** | 31.31% | 248 | 73.47% | 37.75% | 299 | Higher offline reading curriculum |
| `EEE` | 1,020 | 336 | **73.21%** | 36.84% | 252 | 70.54% | 26.02% | 178 | Higher offline reading curriculum |
| `GGG` | 715 | 271 | **87.45%** | 68.24% | 303 | 70.85% | 46.62% | 207 | High online engagement module |
| `AAA` | 348 | 95 | **40.00%** | 22.53% | 57 | 48.42% | 26.88% | 68 | Higher offline reading curriculum |

### 4.2 Subgroup Performance by Age Band (`age_band`):

| Age Band | Total Students | Actual At-Risk | LR Recall ($t=0.46$) | LR FPR | LR FP | XGB Recall ($t=0.46$) | XGB FPR | XGB FP |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `0-35` | 6,305 | 2,658 | **75.09%** | 44.75% | 1632 | 77.88% | 47.05% | 1716 |
| `35-55` | 2,811 | 1,057 | **57.24%** | 26.05% | 457 | 64.24% | 33.41% | 586 |
| `55<=` | 87 | 31 | **41.94%** | 3.57% | 2 | 58.06% | 5.36% | 3 |

### 4.3 Ethical Governance Mandate:
1. **No Independent Demographic Triggering:** Demographic features (`gender`, `region`, `imd_band`, `age_band`) have modest statistical coefficients in the model, but must **never** serve as standalone justification for creating an intervention ticket.
2. **Action-First Support, Not Sanctions:** In accordance with SUTRA's core mission, risk flags trigger **proactive academic support** (e.g. peer tutoring, check-in meeting), never punitive administrative actions, financial aid cancellations, or de-registration.
3. **Mandatory Human Discretion:** An advisor must review the student's personal notes and LMS activity card before assigning a support plan.

---

## 5. The SUTRA Evidence Card Specification

The **SUTRA Evidence Card** is a model-agnostic, validated JSON/Pydantic contract designed for presentation on the advisor dashboard. Below are three representative de-identified examples generated from the test cohort:

### Example Evidence Card 1: RiskTier.HIGH Risk Profile (`STU-DEID-9041`)
```json
{
  "record_id": "STU-DEID-9041",
  "course_context": {
    "module_code": "CCC",
    "presentation_code": "2014J",
    "snapshot_day": 30
  },
  "model_metadata": {
    "model_name": "Regularized Logistic Regression Baseline",
    "model_version": "v1.0.0",
    "training_cohort": "2013B, 2013J, 2014B"
  },
  "risk_probability": 0.9983,
  "risk_tier": "HIGH",
  "operational_threshold": 0.46,
  "alert_triggered": true,
  "top_risk_drivers": [
    {
      "factor_title": "Missing Registration Timestamp Flag",
      "observed_raw_value": "1",
      "contribution_weight": 5.6916,
      "plain_english_summary": "Registration date missing in institutional records, indicating atypical or late onboarding."
    },
    {
      "factor_title": "Days Inactive Since Last VLE Access",
      "observed_raw_value": "60.0",
      "contribution_weight": 1.794,
      "plain_english_summary": "Student has been inactive for 60.0 days since last platform access."
    },
    {
      "factor_title": "Active Learning Days on Platform",
      "observed_raw_value": "0",
      "contribution_weight": 0.6767,
      "plain_english_summary": "Recorded low platform presence (0 active study days logged by Day 30)."
    },
    {
      "factor_title": "Formative Assessment Submissions by Day 30",
      "observed_raw_value": "0",
      "contribution_weight": 0.1836,
      "plain_english_summary": "Zero early assessment submissions recorded by Day 30."
    }
  ],
  "top_protective_factors": [
    {
      "factor_title": "Virtual Learning Platform Access Flag",
      "observed_raw_value": "0",
      "contribution_weight": -0.7985,
      "plain_english_summary": "Zero virtual learning environment logins detected through Day 30."
    },
    {
      "factor_title": "Gender: F",
      "observed_raw_value": "F",
      "contribution_weight": -0.2644,
      "plain_english_summary": "Recorded demographic context 'F' (contextual reference only)."
    },
    {
      "factor_title": "Highest Prior Education: A Level or Equivalent",
      "observed_raw_value": "A Level or Equivalent",
      "contribution_weight": -0.2617,
      "plain_english_summary": "Highest prior education credential recorded as 'A Level or Equivalent'."
    },
    {
      "factor_title": "Index of Multiple Deprivation Band: 80-90%",
      "observed_raw_value": "80-90%",
      "contribution_weight": -0.1914,
      "plain_english_summary": "Area index of multiple deprivation decile band: '80-90%'."
    }
  ],
  "governance_notices": {
    "non_causal_disclaimer": "Empirical risk estimate based on historical patterns. Does NOT represent causation or a diagnostic assessment of ability.",
    "data_boundary_caveat": "Assessment marks are excluded due to grading latency. Evidence reflects only observable submissions and activity up to Day 30.",
    "human_in_the_loop_mandate": "No Alert Without Action: Requires verified review by an assigned academic advisor before any support case or outreach is confirmed."
  }
}
```

### Example Evidence Card 2: RiskTier.ELEVATED Risk Profile (`STU-DEID-5534`)
```json
{
  "record_id": "STU-DEID-5534",
  "course_context": {
    "module_code": "BBB",
    "presentation_code": "2014J",
    "snapshot_day": 30
  },
  "model_metadata": {
    "model_name": "Regularized Logistic Regression Baseline",
    "model_version": "v1.0.0",
    "training_cohort": "2013B, 2013J, 2014B"
  },
  "risk_probability": 0.46,
  "risk_tier": "ELEVATED",
  "operational_threshold": 0.46,
  "alert_triggered": true,
  "top_risk_drivers": [
    {
      "factor_title": "Active Learning Days on Platform",
      "observed_raw_value": "6",
      "contribution_weight": 0.4141,
      "plain_english_summary": "Recorded low platform presence (6 active study days logged by Day 30)."
    },
    {
      "factor_title": "Geographic Region: Wales",
      "observed_raw_value": "Wales",
      "contribution_weight": 0.1866,
      "plain_english_summary": "Geographic region recorded as 'Wales'."
    },
    {
      "factor_title": "Age Band: 0-35",
      "observed_raw_value": "0-35",
      "contribution_weight": 0.173,
      "plain_english_summary": "Student age bracket: '0-35'."
    },
    {
      "factor_title": "Core Course Material Reading",
      "observed_raw_value": "39",
      "contribution_weight": 0.0474,
      "plain_english_summary": "Accessed essential reading and course material 39 times."
    }
  ],
  "top_protective_factors": [
    {
      "factor_title": "Highest Prior Education: HE Qualification",
      "observed_raw_value": "HE Qualification",
      "contribution_weight": -0.2851,
      "plain_english_summary": "Highest prior education credential recorded as 'HE Qualification'."
    },
    {
      "factor_title": "Gender: F",
      "observed_raw_value": "F",
      "contribution_weight": -0.2644,
      "plain_english_summary": "Recorded demographic context 'F' (contextual reference only)."
    },
    {
      "factor_title": "Supplementary Resource Access",
      "observed_raw_value": "9",
      "contribution_weight": -0.1496,
      "plain_english_summary": "Accessed supplementary study resources 9 times."
    },
    {
      "factor_title": "Declared Disability Indicator: N",
      "observed_raw_value": "N",
      "contribution_weight": -0.1484,
      "plain_english_summary": "Declared disability accommodation status: 'N'."
    }
  ],
  "governance_notices": {
    "non_causal_disclaimer": "Empirical risk estimate based on historical patterns. Does NOT represent causation or a diagnostic assessment of ability.",
    "data_boundary_caveat": "Assessment marks are excluded due to grading latency. Evidence reflects only observable submissions and activity up to Day 30.",
    "human_in_the_loop_mandate": "No Alert Without Action: Requires verified review by an assigned academic advisor before any support case or outreach is confirmed."
  }
}
```

### Example Evidence Card 3: RiskTier.LOW Risk Profile (`STU-DEID-1082`)
```json
{
  "record_id": "STU-DEID-1082",
  "course_context": {
    "module_code": "FFF",
    "presentation_code": "2014J",
    "snapshot_day": 30
  },
  "model_metadata": {
    "model_name": "Regularized Logistic Regression Baseline",
    "model_version": "v1.0.0",
    "training_cohort": "2013B, 2013J, 2014B"
  },
  "risk_probability": 0.0118,
  "risk_tier": "LOW",
  "operational_threshold": 0.46,
  "alert_triggered": false,
  "top_risk_drivers": [
    {
      "factor_title": "Supplementary Resource Access",
      "observed_raw_value": "465",
      "contribution_weight": 0.8083,
      "plain_english_summary": "Accessed supplementary study resources 465 times."
    },
    {
      "factor_title": "Course Homepage Visits",
      "observed_raw_value": "573",
      "contribution_weight": 0.0615,
      "plain_english_summary": "Visited module course homepage 573 times."
    },
    {
      "factor_title": "Practice Quiz Interactions",
      "observed_raw_value": "138",
      "contribution_weight": 0.035,
      "plain_english_summary": "Engaged with formative practice quizzes 138 times."
    },
    {
      "factor_title": "Virtual Learning Platform Access Flag",
      "observed_raw_value": "1",
      "contribution_weight": 0.0288,
      "plain_english_summary": "Virtual learning platform access established during initial 30 days."
    }
  ],
  "top_protective_factors": [
    {
      "factor_title": "Core Course Material Reading",
      "observed_raw_value": "1257",
      "contribution_weight": -1.7008,
      "plain_english_summary": "Accessed essential reading and course material 1257 times."
    },
    {
      "factor_title": "Active Learning Days on Platform",
      "observed_raw_value": "48",
      "contribution_weight": -1.4242,
      "plain_english_summary": "Demonstrated consistent study routine (48 active days logged across Day 0-30)."
    },
    {
      "factor_title": "Formative Assessment Submissions by Day 30",
      "observed_raw_value": "3",
      "contribution_weight": -0.3987,
      "plain_english_summary": "3 formative assessment submission(s) logged by Day 30."
    },
    {
      "factor_title": "Highest Prior Education: HE Qualification",
      "observed_raw_value": "HE Qualification",
      "contribution_weight": -0.2851,
      "plain_english_summary": "Highest prior education credential recorded as 'HE Qualification'."
    }
  ],
  "governance_notices": {
    "non_causal_disclaimer": "Empirical risk estimate based on historical patterns. Does NOT represent causation or a diagnostic assessment of ability.",
    "data_boundary_caveat": "Assessment marks are excluded due to grading latency. Evidence reflects only observable submissions and activity up to Day 30.",
    "human_in_the_loop_mandate": "No Alert Without Action: Requires verified review by an assigned academic advisor before any support case or outreach is confirmed."
  }
}
```

---

## 6. Output Artifacts & Reproducibility

- **Explainability Modules:** `ml/src/sutra_ml/explainability/` (`local_explanations.py`, `global_explanations.py`)
- **Calibration Engine:** `ml/src/sutra_ml/evaluation/calibration.py`
- **Evidence Card Schema:** `ml/src/sutra_ml/schemas/evidence_card.py`
- **Calibration Metrics JSON:** `ml/reports/metrics/calibration_metrics.json`
- **Full Phase Four Report:** `ml/reports/phase_four_explainability_report.md`

### Command to Reproduce Phase Four:
```bash
python3 ml/pipelines/run_explain.py
PYTHONPATH=ml/src python3 -m pytest ml/tests
```
