# SUTRA ML–UI Phase 4 — Student 360 Evidence Experience Report

**Date:** 2026-10-12  
**Branch:** `ml-integration-ui`  
**Status:** Complete & Verified  

---

## 1. Executive Summary

Phase 4 consolidates model prediction, input telemetry evidence, feature attributions, and non-causal statistical limitations into a coherent Student 360 profile experience. It enforces the core **SUTRA Human-in-the-Loop Invariant**: machine learning predictions serve exclusively as advisory triage context for human educators and **never automatically create cases, assign penalties, or dispatch student interventions**.

Furthermore, Phase 4 strictly establishes the **Anti-Imputation Invariant**: unavailable or incomplete student features are visibly surfaced with explicit telemetry statuses (`missing`, `underivable_from_source`, `stale`) and derivation notes; the system never silently fills missing values with zeros or fabricates unobserved interaction clickstreams.

---

## 2. Key Architecture & Deliverables

### 2.1 Unified Risk Probability, Threshold, Classification & Provenance Card
In `frontend/app/students/[id]/page.tsx` and `frontend/components/student/StudentEvidenceLedger.tsx`:
- **Integrated ML Assessment Block:** Risk probability (e.g. `68.0%`), configured decision threshold (`0.46`), classification badge (`At_Risk` / `On_Track`), and prediction timestamp are co-located in the primary assessment card.
- **Model Version & Provenance Header:** Displays serving model version (`v1.0.0`, Logistic Regression Baseline) and explicit prediction provenance (`Fresh Live Inference`, `Cached Historical Inference Log`, or `Synthetic Demonstration Data`).
- **Attribution & Explanations:** Integrates the Phase 3 horizontal diverging bar chart (`FeatureAttributionChart`) displaying directional contributions in calibrated $\Delta$ Log-Odds alongside canonical audit keys, plus natural language summary cards.

### 2.2 SUTRA 5-Tier Evidence Architecture
The Student 360 experience clearly partitions evidentiary tiers to prevent educators from conflating statistical correlations with verified facts:
1. **Tier 1 — Observed Operational Facts:** Verified attendance turnstiles, assignment submissions, biometric scans, and activity logs.
2. **Tier 2 — Deterministic Rule Signals:** Institutional compliance triggers (e.g. 3 consecutive unexcused absences).
3. **Tier 3 — Early-Warning ML Predictions:** Statistical inference from the 25 canonical Day-30 features evaluated against the 0.46 decision threshold.
4. **Tier 4 — Recommended Interventions:** Curated institutional support catalog protocols (e.g., academic mentorship, peer tutoring).
5. **Tier 5 — Human Review & Case Actions:** Educator triage assessments, assigned cases, follow-ups, and recorded student outcomes.

### 2.3 Model Input Evidence & Anti-Imputation Ledger
The new `StudentEvidenceLedger` component (`frontend/components/student/StudentEvidenceLedger.tsx`):
- Connects to `GET /api/v1/students/{id}/readiness` through `api.students.getReadiness(id)`.
- Audits the complete set of **25 canonical Day-30 features** across all categories (`vle_engagement`, `academic_assessment`, `demographic`).
- Surfaces exact feature state:
  - `available`: Recorded and valid from authenticated upstream systems.
  - `underivable_from_source`: Telemetry cannot be derived from institutional systems (e.g., OULAD fine-grained URL clickstream not captured by standard LMS).
  - `missing`: Required attribute missing from student record.
  - `stale`: Telemetry is expired or outside temporal evaluation boundaries.
- **Zero Silent Zero-Imputation:** If a metric is absent, it is presented as `Null / Unavailable` with its specific derivation note. No zeroes are injected into the frontend state or inference requests.

### 2.4 Governance Guidance & Decision Threshold Clarifications
Embedded concise contextual education blocks:
- **Model Purpose:** Explains that the Day-30 Early-Warning Baseline estimates the statistical likelihood of course disengagement to facilitate timely proactive academic outreach.
- **Score Limitations:** Clarifies that risk scores reflect non-causal historical correlations from Open University datasets, not student capability, character, or personal destiny.
- **Decision Threshold (0.46):** Explains that 0.46 is chosen to balance early support reach (recall) with advisor bandwidth (precision), operating above uncalibrated default 0.50 cutoff.
- **Human Authority Safeguard:** Explicitly states the governance mandate: *"Machine learning scores (Tier 3) inform educator triage; they never automatically create cases, assign penalties, or dispatch student interventions without human educator review."*

### 2.5 Privacy Gates & Access Controls
- **ADR-004 Leadership Privacy Gate:** Verified on `GET /api/v1/students/{id}/readiness`, `GET /api/v1/students/{id}/support-view`, and `POST /api/v1/students/{id}/predict`. The leadership persona is restricted to cohort aggregates and receives HTTP 403 `LEADERSHIP_QUEUE_ACCESS_DENIED`.
- **ADR-003 Sensitive Finance Segregation:** Financial observations (`fees_overdue_days`, `fee_support_status`) reside strictly in `finance_observations` and are never exposed in ML feature readiness, feature vectors, or student evidence summaries.

---

## 3. Files Created & Modified

| File | Change Type | Description |
| :--- | :--- | :--- |
| `frontend/lib/types.ts` | Modified | Added `FeatureReadinessItem`, `ObservationTelemetryAudit`, and `StudentReadinessResponse` contract types. |
| `frontend/lib/api.ts` | Modified | Added `getReadiness(id)` endpoint client and demo mode fallback fixture. |
| `frontend/components/student/StudentEvidenceLedger.tsx` | Created | Evidence ledger displaying 5-Tier Architecture, 25-feature completeness audit, anti-imputation notices, threshold guidance, and human governance banner. |
| `frontend/app/students/[id]/page.tsx` | Modified | Integrated `StudentEvidenceLedger`, hooked up live readiness query, and co-located risk score, threshold, and provenance metadata. |
| `frontend/scripts/test-contract.mjs` | Modified | Added Suite 17: Phase 4 Student 360 Evidence Experience verification assertions. |
| `tests/test_ml_ui_student360_evidence_experience.py` | Created | Backend integration test suite verifying 25-feature audit, anti-imputation, ADR-003 financial isolation, ADR-004 leadership privacy, and human-in-the-loop case preservation. |
| `docs/ML_UI_PHASE_4_REPORT.md` | Created | Comprehensive Phase 4 report. |

---

## 4. Verification & Test Execution Results

### 4.1 Frontend TypeScript & Contract Test Suite
```bash
npm --prefix frontend test
```
**Results:**
- TypeScript Type Check: Passed (`tsc --noEmit` clean, 0 errors).
- All 17 Contract Test Suites Passed:
  1. User Roles & ADR-004 Privacy Scopes: Passed
  2. SUTRA 10-State Case Machine Lifecycle: Passed
  3. No Alert Without Action Review Validation: Passed
  4. Interventions Catalog Domain Schema: Passed
  5. Zero Service Role Secrets: Passed
  6. Phase 6 Bounded AI Orchestration Contracts: Passed
  7. Store & Data Integrity Contracts: Passed
  8. Dashboard Semantic Correction & Metrics: Passed
  9. Catalog & Community Alignment: Passed
  10. Analytics & Chart Data Integrity: Passed
  11. Integration, Privacy & Regression Invariants: Passed
  12. Counselor Onboarding, Escalation & Call Contracts: Passed
  13. 3-Role Model & Dedicated Student Screens: Passed
  14. Phase 2 Live Inference Reliability: Passed
  15. Phase 1B API Reliability: Passed
  16. Phase 3 Feature Attribution Visualisations: Passed
  17. Phase 4 Student 360 Evidence Experience Contracts: Passed

### 4.2 Backend Pytest Test Suite
```bash
pytest tests/test_ml_ui_student360_evidence_experience.py
pytest tests/
```
**Results:**
- `test_ml_ui_student360_evidence_experience.py`: **4 passed in 0.18s**
  - `test_readiness_endpoint_audits_25_features_and_enforces_anti_imputation`: Passed
  - `test_adr003_financial_data_segregation_in_evidence_experience`: Passed
  - `test_adr004_leadership_privacy_gate_on_readiness_and_prediction`: Passed
  - `test_human_in_the_loop_invariant_prediction_does_not_mutate_cases`: Passed
- Entire repository pytest suite: **156 passed in 4.63s** (0 failed).

### 4.3 Rust CLI Test Suite
```bash
cargo test --manifest-path cli/Cargo.toml
```
**Results:**
- **55 passed; 0 failed** across all integration test suites.

---

## 5. Invariant Checks

1. **Threshold Preservation:** 0.46 governance decision threshold remains invariant; not altered or retrained.
2. **Anti-Imputation Invariant:** Zero silent zero-filling in frontend or API; underivable inputs clearly labeled with missing status.
3. **Human-in-the-Loop Invariant:** ML inference calls strictly do not create cases, assign tasks, or trigger automated interventions.
4. **Data Segregation (ADR-003):** Financial records are isolated in `finance_observations` and absent from ML feature audits.
5. **Leadership Persona Scope (ADR-004):** Leadership users blocked from student readiness, support views, and individual inference queues with HTTP 403.
