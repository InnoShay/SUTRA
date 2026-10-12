# SUTRA ML–UI Phase 5 — Cohort Risk Analytics Report

**Execution Date:** 2026-10-12  
**Branch:** `ml-integration-ui` -> Merged to `main`  
**Governance Invariant:** Threshold = `0.46` | Non-Causal Disclaimers Active | Small-Group Privacy Suppression ($k \ge 5$) under ADR-004

---

## 1. Executive Summary

Phase 5 delivers trustworthy, aggregated cohort-level risk analytics and longitudinal visualisations for authorized campus staff (leadership, faculty, HODs, mentors, counsellors). The system provides visibility into support needs across academic cohorts without exposing individual student identifiers or operational queues to unauthorized roles.

All analytics strictly adhere to institutional governance mandates:
1. **Decision Threshold Fixed at 0.46**: Students are evaluated against the invariant decision boundary with granular tier distinctions (`Low Risk`: <0.30, `Moderate Risk`: 0.30–0.45, `Elevated Risk`: ≥0.46).
2. **Deduplication Invariant**: Multiple inference events per student are deduplicated to each student's latest prediction record for prevalence counts, preventing inflated risk distributions while tracking total inference runs separately.
3. **Multi-Tier Trend Disaggregation**: Prediction counts (Tier 3 ML predictions), early warning signals (Tier 2 rule alerts), opened cases (Tier 5 operational cases), and confirmed academic outcomes are strictly distinguished across time series.
4. **Non-Causal Disclaimers**: Case counts are explicitly labeled as human workflow actions rather than model accuracy metrics; intervention counts are clearly documented as support engagements, not causal proofs of effectiveness.
5. **Small-Group Privacy Protection (ADR-004)**: For leadership views and cohort breakdowns, any cohort or cell with fewer than 5 evaluated students ($N < 5$) is masked with privacy suppression indicators (`[Restricted: N < 5]`) to prevent deductive student re-identification.

---

## 2. Implemented Visualisations & Frontend Architecture

The visual layer in `frontend/app/analytics/page.tsx` integrates five synchronized components backed by the unified cohort summary API:

### 2.1 Cohort Risk Distribution (`frontend/components/analytics/CohortRiskDistributionChart.tsx`)
- **Visuals**: Primary proportional stacked bar showing evaluated distribution across At-Risk ($\ge 0.46$) and On-Track ($< 0.46$), alongside total cohort enrollment and unevaluated counts.
- **Granular Tiers**: Three detail cards providing count and percentage breakdowns for Low Risk (<0.30), Moderate Risk (0.30–0.45), and Elevated Risk ($\ge 0.46$).
- **Privacy Enforcement**: Detects leadership role or cell size $< 5$, displaying cell suppression notices when small group thresholds are met.
- **Empty States**: Displays clean zero-division resilient states when no students or predictions exist.

### 2.2 Cohort Comparison Table (`frontend/components/analytics/CohortComparisonTable.tsx`)
- **Multi-Cohort Breakdown**: Displays aggregated comparative metrics across distinct academic cohorts (e.g. `2024-SEM1`, `2023-SEM2`, `2024-SEM2`).
- **Denominators**: Explicitly lists total enrolled students ($N$), evaluated students, at-risk count, and computed at-risk percentage.
- **Cell-Level Privacy Badge**: Cells with evaluated $N < 5$ show an amber badge: `Suppressed (N < 5)` with a lock icon, preventing microdata leakage.

### 2.3 Multi-Tier Longitudinal Trend Chart (`frontend/components/analytics/MultiTierTrendChart.tsx`)
- **4 Distinct Time Series**:
  1. *Model Predictions* (Tier 3): Volume of algorithmic risk evaluations.
  2. *Early Warning Signals* (Tier 2): Rule-based operational trigger detections.
  3. *Support Cases Opened* (Tier 5): Human workflow intervention cases created.
  4. *Confirmed Outcomes*: Verified academic retention or probation outcomes.
- **Chart Presentation**: SVG line and point visualization with distinct colors and dash arrays for predictions vs cases. Includes an accessible tabular toggle view (`Show Data Table`) for keyboard and screen-reader accessibility.
- **Governance Notice**: Prominent banner cautioning that prediction volumes reflect evaluation runs rather than ground truth accuracy.

### 2.4 Support Intervention & Lifecycle Visualisations
- **Intervention Categories (`RadialProgressGauge.tsx`)**: Reflects actual support-workflow records categorised across the 4 canonical intervention types:
  - `ACADEMIC_TUTORING`
  - `ATTENDANCE_COUNSELING`
  - `PEER_MENTORSHIP`
  - `FACULTY_ADVISING`
- **Case Lifecycle Distribution (`LearningProgressChart.tsx`)**: Tracks actual status transitions across all 10 canonical support case states:
  - `DRAFT`, `OPEN`, `ASSIGNED`, `IN_REVIEW`, `ACTION_PLAN_CREATED`, `INTERVENTION_IN_PROGRESS`, `FOLLOW_UP_SCHEDULED`, `ESCALATED`, `RESOLVED`, `CLOSED`.

### 2.5 Filters & Scope Controls
- **Cohort Selector**: Dropdown filter supporting all cohorts or individual cohort scoping (`All Cohorts`, `2024-SEM1`, `2023-SEM2`, `2024-SEM2`).
- **Timeframe Selector**: Selects between 30 days, 90 days, or Academic Year.
- **Risk Tier Quick Filters**: Filter pills for `All Tiers`, `Elevated (>=0.46)`, `Moderate (0.30-0.45)`, and `Low (<0.30)`.

---

## 3. Backend Implementation & Data Aggregation

### 3.1 Schemas (`app/schemas/analytics.py`)
- `GranularRiskTiers`: Counts and percentages for low, moderate, and elevated risk bands.
- `RiskDistributionDTO`: Cohort risk distribution with total enrolled, evaluated, unevaluated, at-risk, and on-track counts/percentages.
- `CohortBreakdownItem`: Per-cohort breakdown item with `is_suppressed` flag for small groups.
- `MultiTierTrendPoint`: Disaggregated longitudinal time series point.
- `CaseLifecycleStateCount` & `InterventionCategoryCount`: Operational record counts.
- `CohortAnalyticsSummaryResponse`: Complete summary response payload including metadata (threshold `0.46`, freshness timestamp, deduplication note, demo mode flag, non-causal disclaimer).

### 3.2 Endpoint (`app/api/v1/analytics.py`)
- **Route**: `GET /api/v1/analytics/cohort-summary`
- **Authorized Roles**: `leadership`, `faculty`, `hod`, `mentor`, `institution_admin`, `counsellor`.
- **Deduplication Logic**:
  ```python
  # Group predictions by student_id and select latest timestamp record
  student_latest_pred = {}
  for pred in predictions:
      sid = pred.student_id
      if sid not in student_latest_pred or pred.created_at >= student_latest_pred[sid].created_at:
          student_latest_pred[sid] = pred
  ```
- **Privacy Suppression Logic**:
  ```python
  if current_user.role == "leadership" and evaluated_count < 5:
      is_suppressed = True
  ```

---

## 4. Verification & Test Results

### 4.1 Backend Pytest Suite
Ran `pytest tests/test_ml_ui_cohort_analytics.py` and the entire backend test suite:
- **Command:** `pytest tests/test_ml_ui_cohort_analytics.py -v`
- **Results:**
  - `test_cohort_analytics_deduplication_and_risk_distribution`: **PASSED** (deduplication from 2 runs per student down to 3 distinct students, verified threshold 0.46 boundary).
  - `test_small_group_privacy_protection_for_leadership`: **PASSED** (leadership access verified; $N = 3$ correctly triggered `is_suppressed=True`).
  - `test_empty_cohort_and_zero_division_safety`: **PASSED** (empty cohort returns 0 counts and 0.0 percentages without division errors).
  - `test_governance_disclaimers_present_in_analytics_payload`: **PASSED** (non-causal disclaimers verified in payload metadata).
- **Full Backend Suite:** **160 passed in 4.79s** (0 failures).

### 4.2 Frontend Contract & Verification Suite
Ran `npm --prefix frontend test`:
- **Results:**
  - All 18 contract test suites passed.
  - Section 18 verified:
    - Phase 5 visual components mount properly.
    - Threshold 0.46 is present and correctly badged.
    - Multi-tier trends distinguish predictions, signals, cases, and outcomes.
    - Client deduplication logic reduces multiple student records to distinct students.
    - $N < 5$ cell suppression triggers privacy masks for leadership views.
    - Zero-division safety verified on empty collections.
    - Non-causal governance disclaimer verified.
  - TypeScript build check: **0 errors**.

### 4.3 CLI Rust Verification Suite
Ran `cargo test --manifest-path cli/Cargo.toml`:
- **Results:** **55 passed; 0 failed; 0 ignored** across all unit and integration tests.

---

## 5. Security & Governance Invariants Summary

| Mandate | Requirement | Implementation Status |
| :--- | :--- | :--- |
| **Fixed Threshold** | Invariant `0.46` decision boundary | **Verified**: Schema default and calculations locked to 0.46. |
| **Deduplication** | Distinct evaluated student denominator | **Verified**: Backend and frontend deduplicate by `student_id` to latest inference. |
| **Small-Group Privacy** | ADR-004 Cell suppression for $N < 5$ | **Verified**: Leadership view suppresses microdata cells when $N < 5$. |
| **Trend Distinction** | Separate predictions vs cases vs outcomes | **Verified**: 4 distinct series in backend DTO and frontend chart. |
| **Non-Causal Notice** | Disclaim case counts as accuracy / interventions as causal | **Verified**: Displayed on UI banner, trend chart, and API metadata. |
| **Zero-Division Safe** | Safe denominators on empty cohorts | **Verified**: Gracefully handles $N=0$ with zero percentages. |
