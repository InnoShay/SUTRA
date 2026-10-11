# SUTRA Phase Sixteen — Synthetic Dataset & Demonstration Scenarios Report

**Status:** Generated & Formally Documented  
**Generator Source:** `ml/src/sutra_ml/data/synthetic.py`  
**Artifact Directory:** `ml/data/synthetic/`  
**Configured RNG Seed:** `42`

---

## 1. Purpose & Methodological Framework

The SUTRA synthetic dataset generator provides deterministic, schema-compliant student presentation records for **software testing, inference latency benchmarking, edge-case analysis, and interactive developer inspection**.

### Methodological Principles
1. **Zero Exposure of Authentic Student Records:** No real student identifiers, records, or templates were used to generate synthetic profiles.
2. **Strict Synthetic Identity:** All synthetic records carry identifiers prefixed with `SYNTH-` (e.g. `SYNTH-BATCH-001`, `SYNTH-SCENARIO-HIGH-01`).
3. **Plausible Parameter Bounding:** Numerical features are bounded to realistic Day-30 ranges derived from the OULAD feature dictionary.
4. **Logical Consistency Constraints:**
   - If `has_vle_activity_d30 == 0`, all click features (`vle_total_clicks_d30`, sub-category clicks, active days) are set strictly to `0.0`, and `vle_days_since_last_click` is set to the cutoff day `30.0`.
   - If `has_early_assessment_submission_d30 == 1`, `assessments_submitted_d30` is $\ge 1.0$.
   - Pre-course clicks and post-start clicks sum to total clicks.
   - Sub-activity clicks (homepage, core content, forums, quizzes, other) sum to the total click volume.
5. **No Ground Truth Target Labels:** Synthetic records do **not** possess target labels.

---

## 2. Generated Artifacts Overview

All artifacts are persisted in `ml/data/synthetic/`:

| Artifact File | Format | Record Count | Description |
| :--- | :--- | :--- | :--- |
| `synthetic_batch_100.json` | JSON Array | 100 | Full batch of randomized, schema-compliant synthetic records. |
| `synthetic_batch_100.csv` | CSV | 100 | Tabular export of the 100 synthetic records. |
| `named_scenarios.json` | JSON Object | 6 | Named demonstration scenarios illustrating distinct engagement archetypes. |
| `negative_test_cases.json` | JSON Object | 7 | Explicitly malformed records demonstrating fail-closed schema rejection. |
| `README.md` | Markdown | — | On-disk directory documentation and governance caveats. |

---

## 3. Named Demonstration Scenarios & Model Responses

Six named scenarios were scored using the production Regularized Logistic Regression baseline (`v1.0.0`) at threshold `0.46`:

### Scenario 1: `HIGH_ENGAGEMENT_ON_TRACK`
- **Archetype:** Highly active learner with sustained daily LMS engagement and timely assessment submission.
- **Key Inputs:** 650 total clicks, 24 active days, 0.0 days since last access, 2 assessments submitted, 60 credits, prior attempts = 0.
- **Model Output:**
  - **Estimated Probability:** $P(\text{At-Risk}) = 0.0967$
  - **Risk Tier:** `LOW`
  - **Review Recommended:** `NO` ($0.0967 < 0.46$)
- **Top Protective Factors:** Active learning days ($-0.3738$), core course material reading ($-0.2985$), HE qualification ($-0.2851$), assessment submissions ($-0.2046$).

### Scenario 2: `LOW_ENGAGEMENT_AT_RISK`
- **Archetype:** Minimal early engagement, prolonged inactivity, and absence of early assessment submissions.
- **Key Inputs:** 14 total clicks, 2 active days, 22.0 days inactive, 0 assessments submitted, 120 credits, prior attempts = 1.
- **Model Output:**
  - **Estimated Probability:** $P(\text{At-Risk}) = 0.9287$
  - **Risk Tier:** `HIGH`
  - **Review Recommended:** `YES` ($0.9287 \ge 0.46$)
- **Top Risk Drivers:** Low active days ($+0.5891$), days inactive ($+0.5359$), lower prior education ($+0.2869$), IMD deprivation band 10–20 ($+0.2809$), prior attempt ($+0.2614$).

### Scenario 3: `MIXED_SIGNALS_MODERATE`
- **Archetype:** High pre-course orientation interest followed by moderate disengagement after start.
- **Key Inputs:** 180 total clicks (90 pre-course, 90 post-start), 8 active days, 11 days inactive, 1 assessment submitted.
- **Model Output:**
  - **Estimated Probability:** $P(\text{At-Risk}) = 0.4721$
  - **Risk Tier:** `ELEVATED`
  - **Review Recommended:** `YES` ($0.4721 \ge 0.46$)
- **Interpretation:** Crosses the operational alert threshold by 0.0121, demonstrating sensitivity to post-start drop-off despite early pre-course activity.

### Scenario 4: `EDGE_CASE_ZERO_VALUES`
- **Archetype:** Absolute valid lower-bound inputs (no activity recorded by Day 30).
- **Key Inputs:** 0 clicks, 0 active days, 30.0 days inactive, 0 assessments submitted, registered on Day 0.
- **Model Output:**
  - **Estimated Probability:** $P(\text{At-Risk}) = 0.9063$
  - **Risk Tier:** `HIGH`
  - **Review Recommended:** `YES`

### Scenario 5: `EDGE_CASE_MAX_VALUES`
- **Archetype:** Upper-tier workload and very high activity volume.
- **Key Inputs:** 3,200 clicks, 30 active days, 0 days inactive, 3 assessments submitted, 240 credits, 4 prior attempts.
- **Model Output:**
  - **Estimated Probability:** $P(\text{At-Risk}) = 0.2842$
  - **Risk Tier:** `LOW`
  - **Review Recommended:** `NO`

### Scenario 6: `UNSEEN_MODULE_FALLBACK`
- **Archetype:** Valid student features enrolled in an unmodeled course code (`code_module = 'XXX'`).
- **Key Inputs:** Standard moderate engagement features.
- **Model Output:**
  - **Estimated Probability:** $P(\text{At-Risk}) = 0.3812$
  - **Risk Tier:** `MODERATE`
  - **Review Recommended:** `NO`
- **Robustness Finding:** The production pipeline executes smoothly on novel module codes without throwing exceptions or generating NaN predictions.

---

## 4. Synthetic Batch Statistics (N = 100)

Execution of the full 100-record synthetic batch yielded the following empirical summary:
- **Total Records Scored:** 100
- **Mean Inference Latency:** 1.43 ms per record
- **Total Batch Execution Time:** ~143 ms
- **Probability Distribution:**
  - **Minimum:** 0.2153
  - **Median:** 0.6083
  - **Mean:** 0.6037
  - **Maximum:** 0.9063
  - **Standard Deviation:** 0.1642
- **Operational Classification Breakdown (Threshold = 0.46):**
  - **Review Recommended (`YES`):** 77 records (77.0%)
  - **Review Not Recommended (`NO`):** 23 records (23.0%)
- **Risk Tier Distribution:**
  - `LOW` ($p < 0.30$): 2 records
  - `MODERATE` ($0.30 \le p < 0.46$): 21 records
  - `ELEVATED` ($0.46 \le p < 0.65$): 34 records
  - `HIGH` ($p \ge 0.65$): 43 records

---

## 5. Negative Validation Suite (Fail-Closed Gate Verification)

The negative test suite evaluated 7 malformed records to confirm that the input schema refuses invalid or leaked data:

| Test Case Name | Flaw Introduced | Observed Validation Rejection | Gate Status |
| :--- | :--- | :--- | :--- |
| `missing_required_feature` | Omitted `vle_total_clicks_d30` | `Field required` | **REJECTED (PASS)** |
| `forbidden_target_leakage` | Injected `target=1`, `raw_final_result='Fail'` | `Extra inputs are not permitted` | **REJECTED (PASS)** |
| `forbidden_grade_leakage` | Injected `assessment_score_d30=85.0` | `Extra inputs are not permitted` | **REJECTED (PASS)** |
| `invalid_categorical_level` | Injected `gender='NON_BINARY_UNLISTED'`, `region='Atlantis'` | `Input should be 'F' or 'M'`, enum constraint | **REJECTED (PASS)** |
| `non_finite_numeric_nan` | Injected `vle_active_days_d30 = NaN` | `Input should be a finite number` | **REJECTED (PASS)** |
| `non_finite_numeric_inf` | Injected `studied_credits = Inf` | `Input should be a finite number` | **REJECTED (PASS)** |
| `negative_numeric_constraint`| Injected `num_of_prev_attempts = -3` | `Input should be greater than or equal to 0` | **REJECTED (PASS)** |

---

## 6. CRITICAL METHODOLOGICAL PROHIBITIONS

Reviewers, engineers, and researchers must adhere to the following non-negotiable boundaries:

1. **NO ACCURACY OR PERFORMANCE CLAIMS FROM SYNTHETIC DATA:**
   The statistical distribution of predictions on synthetic data (e.g. 77% alert rate) reflects the arbitrary uniform and Gaussian priors used by the random number generator, **NOT** the performance, accuracy, precision, recall, or error rate of the model in real educational settings. Computing ROC-AUC, PR-AUC, or confusion matrices on synthetic data is strictly prohibited.
2. **SYNTHETIC DATA IS NOT AN ALTERNATIVE TO INSTITUTIONAL DATA USE AGREEMENTS:**
   Synthetic records cannot be used to certify clinical or pedagogical safety for student intervention. Prospective clinical evaluation requires an executed DUA and an authentic prospective cohort.
3. **NON-CAUSAL INTERPRETATION:**
   Feature contributions in evidence cards reflect linear empirical associations learned from historical training cohorts (2013B–2014B), not causal mechanisms or diagnostic student assessments.
