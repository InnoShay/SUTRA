# SUTRA ML–UI Phase 3 — Feature Attribution Visualisations Report

**Date:** 2026-10-12  
**Branch:** `ml-integration-ui`  
**Status:** IMPLEMENTED, VERIFIED & PASSING  

---

## 1. Executive Summary

Phase 3 transforms the raw model explainability output into an accessible, dependable, and governance-compliant feature attribution experience on the Student 360 interface (`/students/[id]`).

### Core Audit & Verification Findings:
1. **Actual Backend Attribution Calculation Method:**
   * **Not SHAP:** The deployed serving model is the **Regularized Logistic Regression Baseline (`v1.0.0`)**. Although TreeSHAP was prototyped for the research XGBoost candidate, the production baseline calculates **Linear Log-Odds Feature Contributions** ($w_j \cdot (x_j - \bar{x}_j)$) relative to empirical training cohort baseline means ($\bar{x}_j$).
   * **Attribution Units:** **$\Delta$ Log-Odds (logit margin shift relative to cohort mean)**.
   * **Directional Semantics:**
     * **Positive ($\Delta > 0$ / `increases_risk`):** Risk Driver. Shifts the student's logit score higher than the cohort mean, correlating with increased probability of academic difficulty at Day 30.
     * **Negative ($\Delta < 0$ / `decreases_risk`):** Protective Factor. Shifts the logit score lower than the cohort mean, correlating with higher persistence.
     * **Neutral ($\Delta \approx 0$):** Baseline Reference. Student's telemetry metric matches the historical cohort mean.
2. **Visualisation Decisions:**
   * **Horizontal Diverging Bar Chart:** Centered on vertical zero-axis (`0.00 Δ log-odds` / `Cohort Baseline Mean`). Risk drivers extend rightward (rose gradient), protective factors extend leftward (emerald gradient).
   * **Dual Labeling:** Every feature renders an understandable human label (e.g. *Total LMS Activity Clicks*, *Active LMS Learning Days*) alongside its canonical identifier code badge (e.g. `vle_total_clicks_d30`, `vle_active_days_d30`) to ensure instant auditability.
   * **Observed vs Baseline Telemetry:** Displays observed student values alongside documented cohort training means (e.g. `Observed: 35 clicks • Cohort Mean: 142 clicks`).
   * **Directional & Impact Summary:** Displays summary cards for Total Risk Drivers ($\Sigma +$), Total Protective Offset ($\Sigma -$), and Net Directional Shift.
   * **Accessible Tabular Alternative:** Provides a semantic HTML table (`<table>`, `<caption>`, `<th scope="col">`) for screen reader compliance and high-density tabular inspection.
   * **Strict Non-Causal Governance:** Explicitly disclaims causality across all chart components, preventing educators from misinterpreting associational log-odds as causal diagnoses.
   * **Browser Integrity:** The frontend strictly visualizes the `top_attributions` payload returned by the backend. It never invents, estimates, or synthesizes attributions when the backend does not supply them.

---

## 2. Changes Made & Files Modified

### 2.1 New Component: `FeatureAttributionChart.tsx`
* **File:** [frontend/components/FeatureAttributionChart.tsx](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/FeatureAttributionChart.tsx)
* **Responsibilities:**
  * Defines canonical metadata for all 25 Day-30 features with human labels, units, cohort baseline means, and pedagogical categories.
  * Implements responsive horizontal diverging bar chart centered on zero axis.
  * Provides multi-mode tab navigation: `Diverging Spectrum`, `Risk Drivers`, `Protective Factors`, and `Audit Table`.
  * Computes relative bar widths safely clamped against maximum absolute attribution (`maxAbsMagnitude`), guarding against visual overflow from extreme outliers (`> 4.0`).
  * Handles empty or missing attribution arrays with an informative empty state.
  * Treats zero contributions safely as baseline reference points rather than false positives.
  * Includes expandable educational guidance on log-odds interpretation and mandatory non-causal governance notices.

### 2.2 Student 360 Detail Page Integration
* **File:** [frontend/app/students/[id]/page.tsx](file:///Users/neemaysmac/Desktop/Sutra/frontend/app/students/%5Bid%5D/page.tsx)
* **Changes:**
  * Imported and mounted `FeatureAttributionChart` within the ML Early-Warning Assessment card.
  * Passed verified backend model metadata, threshold, and attribution payloads.

### 2.3 Frontend Integration & Contract Tests
* **File:** [frontend/scripts/test-contract.mjs](file:///Users/neemaysmac/Desktop/Sutra/frontend/scripts/test-contract.mjs)
* **Changes:**
  * Added **Section 15 (Feature Attribution Visualisations Contracts)**:
    - 15a: Verified horizontal diverging bar chart and directional separation.
    - 15b: Verified human-readable labels with canonical audit keys preserved.
    - 15c: Verified attribution units (`Δ Log-Odds`) and directional explanations.
    - 15d: Verified accessible structured table alternative with captions and column scopes.
    - 15e: Verified safe handling of empty, zero, invalid, and outlier values.
    - 15f: Verified non-causal governance disclaimers.

### 2.4 Backend Pytest Suite
* **File:** [tests/test_ml_ui_feature_attribution_visualisations.py](file:///Users/neemaysmac/Desktop/Sutra/tests/test_ml_ui_feature_attribution_visualisations.py)
* **Tests Implemented (6 tests, 100% pass):**
  1. `test_attribution_method_is_linear_log_odds_not_shap`: Proves that baseline model explain method decomposes linear log-odds $w \cdot (x - \text{mean})$ rather than SHAP.
  2. `test_attribution_direction_separation_positive_and_negative`: Tests directional separation of positive risk drivers and negative protective factors.
  3. `test_safe_handling_of_zero_neutral_attributions`: Tests student values exactly at cohort baseline mean produce 0.00 log-odds without errors.
  4. `test_safe_handling_of_outlier_telemetry_values`: Tests extreme outlier values (e.g. 50,000 clicks, 365 inactive days) remain finite and non-NaN.
  5. `test_non_causal_governance_limitations_in_evidence_card`: Asserts Evidence Card metadata includes non-causal correlation statements.
  6. `test_live_student_inference_returns_well_formed_attributions`: Live HTTP integration testing `POST /api/v1/students/SYN-1007/predict` returns valid attributions.

---

## 3. Test Verification Matrix (222 Total Tests Passed)

| Test Suite | Command | Total Tests | Passed | Failed |
| :--- | :--- | :--- | :--- | :--- |
| **Backend Reliability & Integration** | `pytest tests/` | 152 | **152** | 0 |
| **Frontend Contract & Governance** | `npm --prefix frontend test` | 15 suites (48 assertions) | **15 suites** | 0 |
| **Frontend TypeScript Typecheck** | `npx --prefix frontend tsc --noEmit` | Whole codebase | **Clean (0 errors)** | 0 |
| **SUTRA CLI Test Suite** | `cargo test --manifest-path cli/Cargo.toml` | 55 | **55** | 0 |
| **Combined System Verification** | Combined | **222 tests** | **222** | 0 |

---

## 4. Requirement Verification Checklist

| Requirement | Implementation Verification | Status |
| :--- | :--- | :--- |
| 1. Verified backend attribution calculation method | Verified linear log-odds decomposition $w_j \cdot (x_j - \bar{x}_j)$; confirmed it is NOT SHAP | PASS |
| 2. Accessible horizontal diverging bar chart | Implemented with center 0-axis, bidirectional color gradients, and percentage scaling | PASS |
| 3. Understandable labels + canonical keys | Rendered human title + monospace badge with canonical identifier for auditability | PASS |
| 4. Attribution units and direction semantics | Explicitly displays `Δ Log-Odds`; explains positive (risk) vs negative (protective) | PASS |
| 5. Risk drivers and protective factors separated | Summary load metrics, diverging poles, and separate filter tab views | PASS |
| 6. Table / accessible text alternative | Semantic `<table>` with `<caption>`, `<th scope="col">`, and screen-reader summaries | PASS |
| 7. Safe handling of empty, zero, invalid, outliers | Empty state card; 0.0 neutral baseline handler; outlier clamping with warning banner | PASS |
| 8. Non-causal governance language | Prominent disclaimer forbidding causal interpretation; mandatory educator judgment | PASS |
| 9. Zero browser calculation / no fabrication | Visualizes only backend `top_attributions`; zero synthesis of missing data | PASS |
| 10. Dependency discipline | Reused existing Tailwind CSS / Lucide icons without adding external chart libraries | PASS |
