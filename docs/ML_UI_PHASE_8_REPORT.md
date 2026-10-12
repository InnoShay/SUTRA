# SUTRA ML–UI Phase 8 — Carefully Governed What-If Scenarios Report

**Execution Date:** 2026-10-12  
**Branch:** `ml-integration-ui` -> Merged to `main`  
**Deployed Model Artifact:** `Regularized Logistic Regression Baseline` (`v1.0.0`)  
**Prediction Cutoff:** Day 30 Post-Start Telemetry Boundary ($t \le 30$)  
**Decision Threshold:** `τ = 0.46` (Institutional Capacity Allocation Rule)  

---

## 1. Executive Summary

Phase 8 implements **Carefully Governed What-If Scenarios** across SUTRA's machine learning backend and Student 360 interface. The capability allows authorized academic advisors and faculty to explore how changes in early behavioral engagement patterns correspond to shifts in the model's predictive scoring equation, while enforcing strict causal boundaries, temporal cutoff safeguards, zero database mutations, and explicit non-predictive support planning guidance.

### Core Governance Principles Enforced:
1. **Feasibility Assessment & Non-Retraining Verification**: The production serving model (`LogisticRegressionBaseline v1.0.0`) is a calibrated linear estimator ($z = \beta_0 + \sum \beta_i x_i$). It evaluates arbitrary valid Day-30 feature vectors directly via `predict_proba` without retraining or altering pipeline weights.
2. **Canonical Schema Validation**: The frontend is strictly prohibited from altering arbitrary feature keys or out-of-bounds values. Modifications are restricted to a whitelist of 6 actionable Day-30 behavioral parameters (`vle_active_days_d30`, `vle_days_since_last_click`, `vle_clicks_last_7d`, `vle_total_clicks_d30`, `assessments_submitted_d30`, `has_early_assessment_submission_d30`).
3. **Temporal Cutoff & Future Event Rejection**: Features representing prospective interventions or future post-cutoff occurrences (e.g., "tutoring_sessions", "future_attendance", "week_12_exam") are rejected by backend validators with HTTP 422 Unprocessable Entity. Future tutoring sessions cannot be simulated as past Day-30 evidence.
4. **Prohibition of Causal Efficacy Claims**: The system explicitly disclaims that a hypothetical score decrease represents the causal effect of an intervention. Educators are prohibited from claiming to students that attending tutoring will reduce course failure risk by a specific statistical percentage.
5. **Ethical Attribute Protection**: Protected demographic attributes (`gender`, `disability`, `imd_band`, `region`, `highest_education`, `age_band`) cannot be modified as hypothetical intervention variables.
6. **Zero Database Mutation Invariant**: All what-if calculations run strictly in memory. They never write to `ml_inference_logs`, `student_observations`, or official student records, and never trigger automated signals or cases.
7. **Side-by-Side Presentation**: Original baseline predictions and hypothetical projections are displayed side by side with explicit model version `v1.0.0`, decision threshold `0.46`, score delta ($\Delta P$), tier transitions, and changed inputs.
8. **Explanatory Non-Predictive Support Planning**: Integrates guidance explaining why real-world interventions cannot be scored by the Day-30 model and outlines qualitative educator support protocols.

---

## 2. Technical Feasibility Assessment & Feature Semantics

### 2.1 Model Architecture & Serving Equation
The frozen production model pipeline evaluates calibrated posterior risk probabilities using standardized linear log-odds:

$$z = \beta_0 + \sum_{i=1}^{p} w_i \cdot (x_i - \mu_i)$$
$$P(\text{At\_Risk} \mid \mathbf{x}) = \frac{1}{1 + e^{-z}}$$

With calibrated baseline weights:
- `vle_days_since_last_click` ($w = +0.0467$): Inactivity gap increases predicted failure risk.
- `vle_clicks_last_7d` ($w = -0.0183$): Recent activity decreases predicted risk.
- `assessments_submitted_d30` ($w = -0.1900$): Submitting assessments decreases predicted risk.
- `vle_active_days_d30` ($w = -0.0400$): Active login days decrease predicted risk.
- `vle_total_clicks_d30` ($w = -0.0020$): Total interactions decrease predicted risk.
- `has_early_assessment_submission_d30` ($w = -0.1500$): Diagnostic submissions decrease predicted risk.

Because the underlying pipeline accepts arbitrary numerical feature dictionaries matching the 25 Day-30 canonical schema, **hypothetical scenario calculations are technically sound without retraining or modifying model parameters**.

### 2.2 Supported Actionable Parameters vs. Forbidden Inputs

| Category | Features | Validation Rules & Action |
| :--- | :--- | :--- |
| **Supported Actionable Day-30 Inputs** | `vle_active_days_d30` [0, 30]<br>`vle_days_since_last_click` [0, 30]<br>`vle_clicks_last_7d` [0, 2000]<br>`vle_total_clicks_d30` [0, 5000]<br>`assessments_submitted_d30` [0, 10]<br>`has_early_assessment_submission_d30` [0, 1] | **Permitted & Validated**: Checked for finite numerical types and strict domain boundaries. |
| **Prospective Interventions & Future Events** | `tutoring_sessions`, `tutoring_hours`, `future_attendance`, `exam_score`, `final_grade` | **REJECTED (HTTP 422)**: Prohibited per Requirement 6. Future events cannot enter pre-cutoff Day-30 features. |
| **Protected Demographic Characteristics** | `gender`, `disability`, `imd_band`, `region`, `highest_education`, `age_band` | **REJECTED (HTTP 422)**: Prohibited per ethical governance. Demographics cannot be simulated as interventions. |
| **Target Outcome & Post-Cutoff Leakage** | `final_result`, `is_at_risk`, `date_unregistration`, `assessment_score` | **REJECTED (HTTP 422)**: Prohibited per anti-leakage invariants. |
| **Arbitrary / Unknown Features** | Any feature outside the supported 6 parameters | **REJECTED (HTTP 422)**: Prevents frontend from injecting unverified factors. |

---

## 3. Architecture & API Implementation

### 3.1 Backend DTOs (`app/schemas/ml.py`)
- `SupportedFeatureMetaDTO`: Metadata defining permissible bounds, units, step sizes, and descriptions for supported simulation parameters.
- `HypotheticalFeatureModificationDTO`: Individual changed input tracking feature key, label, baseline value, hypothetical value, unit, and delta.
- `WhatIfScenarioRequest`: Canonical request schema validating input keys, rejecting future events, demographic modifications, leakage, and out-of-bounds values via `@field_validator("hypothetical_modifications")`.
- `SupportPlanningGuidanceDTO`: Explanatory non-predictive guidance detailing why the model cannot estimate causal intervention effects and providing recommended qualitative educator actions.
- `WhatIfScenarioResponse`: Complete side-by-side comparison payload including baseline risk, hypothetical risk, probability delta, tier transition, ephemeral notices, and non-causal disclaimers.

### 3.2 Backend Service (`app/ml/service.py`)
- `get_supported_scenario_features()`: Returns canonical metadata for supported Day-30 features.
- `simulate_scenario(base_features, hypothetical_modifications, student_ref)`:
  1. Validates modifications against canonical rules.
  2. Synthesizes full 25-feature vector using student baseline or model default means.
  3. Executes in-memory baseline prediction.
  4. Applies hypothetical adjustments and maintains logical coupling (e.g. active clicks ensure `has_vle_activity_d30 = 1`).
  5. Executes in-memory hypothetical prediction.
  6. Computes score delta $\Delta P$, percentage points, and tier transition.
  7. **Crucial**: Does NOT write to `ml_inference_logs` or database.

### 3.3 Backend API Endpoints
- `GET /api/v1/ml/supported-scenario-features`: Returns parameter bounds and metadata. Requires authorized educator role (`leadership`, `faculty`, `hod`, `mentor`, `institution_admin`, `counsellor`).
- `POST /api/v1/ml/simulate-scenario`: Direct headless scenario simulation endpoint.
- `POST /api/v1/students/{student_id}/simulate-scenario`: Student-specific scenario simulation endpoint. Pulls authenticated observations as baseline, executes in memory, and returns side-by-side comparison. Students receive 403 Forbidden.

---

## 4. Frontend Visual Architecture

The visual implementation is encapsulated in [`frontend/components/student/GovernedScenarioPanel.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/student/GovernedScenarioPanel.tsx) and mounted in [`frontend/app/students/[id]/page.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/app/students/[id]/page.tsx):

1. **Governance & Provenance Header**:
   - Displays Model Version `v1.0.0`, Prediction Cutoff `Day 30`, Decision Threshold `46%`, and Ephemeral Status badge.
2. **Prominent Non-Causal Calculation Notice**:
   - Explicit alert clarifying that hypothetical scores are mathematical evaluations of the logistic regression equation and do NOT estimate intervention causality ($P \ne ATE$).
3. **Supported Input Sliders & Bounded Numeric Inputs**:
   - Sliders and numeric inputs strictly for supported Day-30 parameters.
   - Live delta indicators displaying changes relative to the student's observed baseline.
   - Quick action: "Reset to Baseline".
4. **Side-by-Side Model Comparison Cards**:
   - **Observed Baseline**: Observed probability, triage tier (`At_Risk` vs. `On_Track`), and threshold marker.
   - **Hypothetical Scenario**: Simulated probability, projected triage tier, percentage point delta badge, and tier transition state.
5. **Modified Parameters Summary Table**:
   - Structured table listing parameter names, baseline values, simulated values, and exact deltas.
6. **Zero Database Mutation Guarantee**:
   - Informs educators that results are purely ephemeral and no cases, signals, or audit logs have been written.
7. **Explanatory Non-Predictive Support Planning Section**:
   - Details why prospective interventions (like tutoring) cannot be scored by the Day-30 model.
   - Enforces prohibition on causal efficacy claims.
   - Recommends qualitative educator support actions (check-ins, coaching, faculty coordination).

---

## 5. Verification & Test Results

### 5.1 Backend Pytest Suite
Executed `pytest tests/test_ml_ui_what_if_scenarios.py -v`:
- `test_what_if_scenario_simulation_success_and_side_by_side` — **PASSED** (Verifies side-by-side calculation, delta, tier transition, and model version `v1.0.0`).
- `test_what_if_scenario_never_mutates_database_records` — **PASSED** (Verifies pre- and post-simulation database counts for `ml_inference_logs`, `signals`, `cases`, and `student_observations` are strictly identical).
- `test_what_if_scenario_rejects_future_events_and_tutoring` — **PASSED** (Verifies prospective tutoring sessions and future attendance return 422 Unprocessable Entity).
- `test_what_if_scenario_rejects_immutable_demographic_attributes` — **PASSED** (Verifies modifications to gender, disability, etc., return 422).
- `test_what_if_scenario_rejects_leakage_and_unsupported_features` — **PASSED** (Verifies target outcome leakage and arbitrary factors return 422).
- `test_what_if_scenario_enforces_bounds_and_finite_numeric_types` — **PASSED** (Verifies out-of-bounds values like 45 active days return 422).
- `test_what_if_scenario_direct_ml_endpoint_and_support_guidance` — **PASSED** (Verifies direct simulation and presence of support planning guidance).
- `test_what_if_scenario_role_permission_boundaries` — **PASSED** (Verifies students receive 403 Forbidden and unauthenticated requests receive 401).
- `test_get_supported_scenario_features_metadata` — **PASSED** (Verifies retrieval of Day-30 feature metadata).
- **Full Backend Pytest Suite:** **184 passed in 5.36s** (0 failures).

### 5.2 Frontend Contract & Integration Suite
Executed `npm --prefix frontend test`:
- **TypeScript Typecheck:** `tsc --noEmit` passed with 0 errors.
- **Contract Test Suite:** All 21 sections passed, verifying:
  - Section 21 Phase 8 contracts: domain interfaces, API client methods, mock handlers, `GovernedScenarioPanel` component contracts, side-by-side comparison, non-causal calculation notices, zero database mutation guarantee, support planning guidance, and integration into Student 360.

### 5.3 Next.js Production Build
Executed `npm --prefix frontend run build`:
- `✓ Compiled successfully`, `✓ Generating static pages (23/23)`.
- 0 TypeScript errors, 0 ESLint errors.

### 5.4 Rust CLI Integration Suite
Executed `cargo test --manifest-path cli/Cargo.toml`:
- **55 passed, 0 failed** across all integration test suites.

---

## 6. Compliance Matrix

| Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **1. Model Feasibility Assessment** | Validated that `LogisticRegressionBaseline v1.0.0` supports hypothetical evaluations without retraining or violating Day-30 cutoff | **PASS** |
| **2. Governed Scenario Panel** | Implemented `GovernedScenarioPanel.tsx` with validated endpoints (`/simulate-scenario`) changing only supported inputs | **PASS** |
| **3. Canonical Backend Validation** | Backend validator rejects arbitrary features, out-of-bounds values, non-numeric types, and unauthorized mutations | **PASS** |
| **4. Side-by-Side Presentation** | Baseline and hypothetical predictions displayed side-by-side with changed inputs, delta, and model version `v1.0.0` visible | **PASS** |
| **5. Non-Causal Calculation Notice** | Mandatory banners and response metadata explicitly state that results are mathematical evaluations, not causal estimates | **PASS** |
| **6. No Future Events in Day-30** | Future events and prospective interventions (e.g. `tutoring_sessions`) are strictly rejected with HTTP 422 | **PASS** |
| **7. No Unsupported Causal Claims** | Disclaimers and support guidance prohibit claiming that attending tutoring will reduce risk by a specific amount | **PASS** |
| **8. Zero Database Mutation** | Simulations run 100% in-memory; verified zero writes to `ml_inference_logs`, `signals`, `cases`, or student records | **PASS** |
| **9. Explanatory Support Planning Panel** | Integrated guidance detailing why real interventions cannot be scored by the Day-30 model and recommended educator actions | **PASS** |
