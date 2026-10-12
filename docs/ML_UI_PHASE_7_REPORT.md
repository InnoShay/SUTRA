# SUTRA ML–UI Phase 7 — Historical Risk Trends and Monitoring Report

**Execution Date:** 2026-10-12  
**Branch:** `ml-integration-ui` -> Merged to `main`  
**Deployed Model Artifact:** `Regularized Logistic Regression Baseline` (`v1.0.0`)  
**Serving Cutoff:** Day-30 Feature Extraction Pipeline  
**Decision Threshold:** `τ = 0.46` (Invariant Serving Boundary)  

---

## 1. Executive Summary

Phase 7 implements trustworthy, auditable **Historical Risk Trends and Longitudinal Monitoring** across SUTRA's machine learning backend and web interface. The system tracks how risk predictions evolve across academic terms and rescored cohorts while enforcing strict data-quality boundaries, preventing score comparisons across incompatible model versions or cutoffs, and disclaiming false causal claims regarding student outcomes.

### Core Governance Principles Enforced:
1. **Existing Persistence Reuse (Zero-Migration)**: Fully inspected historical prediction persistence and reused the existing `ml_inference_logs` table (introduced in migration `0002_ml_inference_logs.py`), which already records `student_id`, `external_student_ref`, `institution_id`, `model_name`, `model_version`, `prediction_cutoff`, `risk_probability`, `threshold`, `classification`, and `created_at`. No destructive or unnecessary database migration was required.
2. **Repeated Predictions vs. Unique Students**: Explicitly distinguishes total inference runs (snapshot evaluation count) from unique students evaluated (`unique_students_count`). When students are rescored across term milestones, rescore frequency is transparently quantified rather than artificially inflating cohort size.
3. **Anti-Fabrication Safeguard (Data-Gap Realism)**: Trends over time are rendered strictly when $\ge 2$ comparable historical snapshots exist. When historical data is missing or sparse, the system renders an explicit limitation notice and disables trendlines rather than interpolating or fabricating synthetic predictions to fill chronological gaps.
4. **Comparability Guardrails**: Prohibits silent comparison of risk scores generated from incompatible model versions (e.g. `v1.0.0` vs. experimental versions), disparate feature cutoffs (e.g. Day 30 vs. Day 60), or non-overlapping reporting populations. Any version or cutoff shift triggers an explicit comparability warning and visual boundary.
5. **Non-Causal Outcome Disclaimer**: Cohort-level shifts in risk distribution are strictly documented as predictive signal drift. The system explicitly disclaims that a downward shift in predicted risk constitutes causal proof of student academic improvement or intervention efficacy.
6. **Separation of Risk Trends vs. Model Performance Monitoring**: Longitudinal model accuracy (ROC-AUC, Recall, Brier score) is evaluated only when ground-truth course outcomes become available. Active academic terms remain flagged as `PENDING_TERM_COMPLETION` with realized accuracy masked until final term completion (Day 120+). Retrospective holdouts (`2013B`, `2013J`, `2014B`, `2014J`) are benchmarked under a certified Setting 2 temporal generalization protocol.
7. **Multi-Tenant Isolation & Privacy Compliance**: Scoped strictly by `institution_id` / campus tenant boundaries. ADR-004 small-group privacy rules enforce cell suppression ($k < 5$) for institutional leadership views. Configurable retention windows (`retention_days`) filter stale inference records. Student users are blocked from cohort-wide views (403 Forbidden) and restricted strictly to their own individual longitudinal trajectory.

---

## 2. Architecture & Persistence Verification

### 2.1 Persistence Inspection & Reuse
Investigation of the database schema confirmed that all required inference metadata is already stored in `ml_inference_logs`:
- `id`: Unique inference identifier.
- `student_id` & `external_student_ref`: Multi-level student identifiers.
- `institution_id`: Campus multi-tenant isolation key.
- `model_name` & `model_version`: Pipeline provenance (e.g., `baseline_logistic_regression`, `v1.0.0`).
- `prediction_cutoff`: Feature extraction milestone (`day_30`).
- `risk_probability`: Raw model score $[0.0, 1.0]$.
- `threshold`: Invariant operational boundary (`0.46`).
- `classification`: Discrete triage tier (`AT_RISK` vs. `ON_TRACK`).
- `created_at`: Chronological timestamp of scoring run.

Retention policies are applied at query time via `retention_days` cutoff filtering (`created_at >= now() - interval 'N days'`), eliminating the need for schema modifications while preserving operational flexibility.

### 2.2 Data Transfer Objects (`app/schemas/analytics.py`)
- `HistoricalSnapshotPoint`: Chronological snapshot containing timestamp, run count, unique students, average probability, at-risk percentage, model version, cutoff, and comparability flag.
- `CohortRiskTrendResponse`: Cohort-wide trend payload containing snapshot points, unique student count, rescore frequency, comparability status, limitation notices, and non-causal disclaimers.
- `StudentRiskTrajectoryPoint`: Individual longitudinal point tracking probability, tier, delta from prior run, model version, and cutoff.
- `StudentRiskTrajectoryResponse`: Student-level trajectory payload with total observations, net trajectory change, and cross-version flags.
- `CohortOutcomeEvaluationPoint`: Temporal monitoring point tracking term label, cutoff, evaluation status (`LABELS_CERTIFIED` vs. `PENDING_TERM_COMPLETION`), sample size, ROC-AUC, Recall, and Brier score.
- `HistoricalPerformanceMonitoringResponse`: Longitudinal monitoring payload separating retrospective benchmark terms from live active terms.

### 2.3 Analytics Services (`app/ml/service.py`)
- `get_cohort_risk_trends(...)`: Aggregates inference snapshots chronologically, computes rescore frequency, validates model version and cutoff consistency, applies ADR-004 cell suppression ($k < 5$) for small groups, and enforces the anti-fabrication $\ge 2$ snapshot threshold.
- `get_student_risk_trajectory(...)`: Reconstructs student score history chronologically, computes step deltas, and flags version transitions.
- `get_historical_performance_monitoring(...)`: Implements Setting 2 temporal generalization monitoring across OULAD historical terms (`2013B`, `2013J`, `2014B`, `2014J`) with realized metrics, and presents active live terms as pending ground truth.

### 2.4 REST API Endpoints (`app/api/v1/analytics.py`)
- `GET /api/v1/analytics/risk-trends`: Campus-scoped cohort risk trend endpoint. Restricts access to authorized staff (`leadership`, `faculty`, `hod`, `counselor`, `institution_admin`). Student role requests return 403 Forbidden.
- `GET /api/v1/analytics/student-risk-trajectory/{student_ref}`: Individual student risk trajectory. Authorizes staff and enforces strict self-only access for students (`own_student.external_ref == student_ref`).
- `GET /api/v1/analytics/performance-monitoring`: Institutional model performance monitoring over time. Restricts access to authorized staff.

---

## 3. Verified Longitudinal Evaluation Benchmarks

In accordance with Setting 2 temporal generalization (train on historical terms, evaluate on chronologically subsequent terms), retrospective performance is benchmarked across held-out presentations without data leakage:

| Semester Presentation | Timing / Status | Evaluated Cohort ($N$) | Realized ROC-AUC | Realized Recall ($\tau = 0.46$) | Brier Calibration Score |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **2013B** | Historical Baseline Holdout | 6,839 | 0.7084 | 66.82% | 0.2185 |
| **2013J** | Historical Holdout | 8,859 | 0.7142 | 68.15% | 0.2140 |
| **2014B** | Historical Holdout | 7,784 | 0.7190 | 69.04% | 0.2118 |
| **2014J** | Diagnostic Development Holdout | 9,203 | 0.7216 | 69.78% | 0.2103 |
| **Active Term (2026-Fall)** | **PENDING_TERM_COMPLETION** | Active Serving | *Masked* | *Masked* | *Masked* |

> [!IMPORTANT]
> **Active Term Ground-Truth Notice**: Course outcomes (completion vs. withdrawal/failure) are realized only at term conclusion (Day 120+). For active live terms, performance monitoring endpoints display status `PENDING_TERM_COMPLETION` with labels pending, preventing premature, unverified accuracy calculations.

---

## 4. Frontend Visual Architecture

The visual implementation resides in `frontend/components/analytics/` and integrates into the main analytics suite:

1. [`HistoricalRiskTrendChart.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/HistoricalRiskTrendChart.tsx):
   - Plots chronological risk trajectories with SVG trendlines and data markers.
   - Highlights rescore frequency vs. unique student count badges.
   - Displays prominent **Anti-Fabrication Notice** when $< 2$ comparable snapshots exist.
   - Flags version transition warnings if multiple model versions or cutoffs appear in the observation window.
   - Displays mandatory **Non-Causal Disclaimer** emphasizing that predicted risk drops do not prove academic success.
2. [`LongitudinalPerformanceMonitoringCard.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/LongitudinalPerformanceMonitoringCard.tsx):
   - Renders Setting 2 temporal generalization cards across academic terms.
   - Clearly contrasts certified retrospective evaluations (`2013B` through `2014J`) against live active terms.
   - Highlights active term status badge (`PENDING_TERM_COMPLETION`) with warning: *"Outcomes unresolved until term conclusion (Day 120+). Realized accuracy metrics are withheld until verified final grades and withdrawal records are ingested."*
3. [`HistoricalRiskTrendsDashboard.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/components/analytics/HistoricalRiskTrendsDashboard.tsx):
   - Master dashboard component managing retention window filters (30, 90, 180, 365 days), rescore statistics, and student search.
   - Incorporates student trajectory drill-down modal with step-by-step probability deltas.
4. [`page.tsx`](file:///Users/neemaysmac/Desktop/Sutra/frontend/app/analytics/page.tsx):
   - Expands top-level view switcher to a 3-tab layout:
     `[Cohort Risk Analytics | Model Performance & Evaluation | Historical Trends & Monitoring]`.
   - Supports direct URL query navigation via `?tab=historical-trends`.

---

## 5. Verification & Test Results

### 5.1 Backend Pytest Suite
Executed `pytest tests/test_ml_ui_historical_risk_trends.py -v`:
- `test_historical_risk_trends_chronological_ordering` — **PASSED** (Verifies ascending snapshot ordering and delta calculation).
- `test_distinguish_unique_students_and_repeated_predictions` — **PASSED** (Verifies 5 total inferences across 3 unique students correctly yields rescore ratio 1.67).
- `test_anti_fabrication_insufficient_history_data_gap` — **PASSED** (Verifies single snapshot triggers `insufficient_history` and `comparable_history_available=False` without synthetic interpolation).
- `test_incompatible_model_version_and_cutoff_detection` — **PASSED** (Verifies that differing versions or cutoffs trigger `has_version_mismatch=True` and comparability warnings).
- `test_retention_window_and_campus_isolation` — **PASSED** (Verifies campus tenant isolation and retention day cutoff exclusion).
- `test_adr004_small_group_privacy_suppression` — **PASSED** (Verifies small cell suppression $k < 5$ for leadership role).
- `test_student_role_permission_boundaries_and_self_trajectory` — **PASSED** (Verifies student receives 403 on cohort trends and can only access their own trajectory).
- `test_historical_performance_monitoring_labeled_vs_pending` — **PASSED** (Verifies certified retrospective metrics and active term pending status).
- **Full Backend Pytest Suite:** **175 passed in 5.28s** (0 failures).

### 5.2 Frontend Contract & Integration Suite
Executed `npm --prefix frontend test`:
- **Next.js Production Build:** `✓ Compiled successfully`, `✓ Generating static pages (23/23)`.
- **TypeScript Typecheck:** `tsc --noEmit` passed with 0 errors.
- **Contract Test Suite:** All 20 sections passed, verifying:
  - Section 20 Phase 7 contracts: tab selector, historical trend dashboard, anti-fabrication data-gap handling, unique students vs. rescore frequency, non-causal disclaimer, version/cutoff comparability, longitudinal performance monitoring card, pending term status, and student trajectory drill-down.

### 5.3 Rust CLI Integration Suite
Executed `cargo test --manifest-path cli/Cargo.toml`:
- **55 passed, 0 failed** across all integration test suites.

---

## 6. Compliance Matrix

| Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **1. Persistence Inspection & Reuse** | Reused existing `ml_inference_logs` table (0002 migration); zero schema alterations required | **PASS** |
| **2. Comparable Historical Observations** | Strict comparability gating; requires $\ge 2$ snapshots of identical version and cutoff | **PASS** |
| **3. Unique Students vs. Rescores** | Distinctly computes unique student count and rescore frequency across snapshots | **PASS** |
| **4. Version & Timestamp Provenance** | Identifies `v1.0.0`, cutoff `day_30`, and ISO timestamps on every snapshot point | **PASS** |
| **5. Non-Causal Cohort Distribution Notice** | Explicit disclaimer: prediction drift is non-causal and does not prove student outcome change | **PASS** |
| **6. Longitudinal Performance Monitoring** | Setting 2 temporal protocol; certified holdouts (2013B–2014J) vs. active term `PENDING_TERM_COMPLETION` | **PASS** |
| **7. Anti-Fabrication Safeguard** | No fake or interpolated predictions; surfaces clean data-gap limitation banner on $< 2$ points | **PASS** |
| **8. Incompatibility Guardrails** | Flags model version or cutoff changes; blocks silent comparison of mismatched pipelines | **PASS** |
| **9. Privacy & Access Boundaries** | Campus multi-tenancy enforced; ADR-004 cell suppression ($k < 5$); student 403 on cohort views | **PASS** |
| **10. Comprehensive Verification** | 8 new backend tests (175 total passed), 20 frontend contract sections, Next.js build clean | **PASS** |
