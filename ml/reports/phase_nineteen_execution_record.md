# SUTRA Phase Nineteen — Execution & Decision Record

**Milestone:** CODEX 3.0 PS6 Applied ML Roadmap & Longitudinal Feasibility Audit  
**Author:** Senior Applied ML Scientist and Longitudinal Student Analytics Architect  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Execution Timestamp:** 2026-10-12T06:12:00+05:30  
**Phase Verdict:** COMPLETE & VERIFIED — AUDIT & ROADMAP APPROVED  

---

## 1. Environment & Governance Invariant Verification

| Attribute | Recorded Value | Invariant Status |
|---|---|:---:|
| **Operating System** | macOS Darwin 24.5.0 (ARM64) | Active |
| **Python Environment** | Python 3.13.6 (`/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`) | Active |
| **Git Branch** | `Neemay-ml` | Active |
| **Production Model Artifact** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | Preserved |
| **Production Artifact SHA-256** | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | **VERIFIED UNCHANGED** |
| **Serving Decision Threshold** | `0.46` | **VERIFIED UNCHANGED** |
| **Candidate Execution Gate** | `candidate_provenance_verified = False` (`BLOCKED`) | **VERIFIED CLOSED** |
| **External Model Deployment** | None (Audit and architecture phase only) | **ZERO DEPLOYMENTS** |
| **External Sockets / Messages** | Disabled (Zero real student outreach) | **VERIFIED PASSIVE** |

---

## 2. Automated Test Suite Verification

Executed command:
```bash
PYTHONPATH=ml/src:. python3 -m pytest backend/tests ml/tests
```

### Actual Terminal Execution Output Summary
```
============================= test session starts ==============================
platform darwin -- Python 3.13.6, pytest-9.1.1, pluggy-1.6.0 -- /Library/Frameworks/Python.framework/Versions/3.13/bin/python3
rootdir: /Users/neemaysmac/Desktop/Sutra/ml
configfile: pyproject.toml
plugins: anyio-4.11.0, asyncio-1.4.0, langsmith-0.10.1

backend/tests/test_api_endpoints.py::test_health_endpoint PASSED         [  0%]
backend/tests/test_api_endpoints.py::test_ready_endpoint PASSED          [  0%]
backend/tests/test_api_endpoints.py::test_model_info_endpoint PASSED     [  1%]
...
backend/tests/test_orchestration/test_agent_1_signal_interpreter.py PASSED [ 15%]
backend/tests/test_orchestration/test_agent_2_intervention_strategist.py PASSED [ 22%]
backend/tests/test_orchestration/test_agent_3_support_plan_designer.py PASSED [ 30%]
backend/tests/test_orchestration/test_agent_4_evidence_challenge_agent.py PASSED [ 42%]
backend/tests/test_persistence/test_cases_api.py PASSED                   [ 55%]
backend/tests/test_persistence/test_ledger_and_persistence.py PASSED     [ 62%]
ml/tests/unit/test_phase_eighteen_interventions.py PASSED (14 tests)      [ 68%]
ml/tests/unit/test_phase_seventeen_signals.py PASSED (11 tests)          [ 75%]
ml/tests/unit/test_phase_sixteen_playground.py PASSED (13 tests)         [ 85%]
ml/tests/unit/test_phase_fourteen_provenance_gate.py PASSED               [ 90%]
ml/tests/unit/test_phase_thirteen_shadow_contract.py PASSED               [ 95%]
ml/test_validation.py PASSED                                             [100%]

======================== 255 passed, 1 skipped in 1.41s ========================
```
*Verification confirms that all 255 tests across the ML core, multisource signals, intervention workflows, and teammate-authored persistence/orchestration backend pass without failure.*

---

## 3. Workstream F — Recommendations & Decision Memo

### 3.1. Primary Predictive Task Recommendation
**Recommend Task 1: Academic Outcome Prediction at Progressive Dual Cutoffs (Day 30 and Day 60 / Midterm).**
- **Unit:** `(student_id, course_id, term_id, T_cutoff)`.
- **Target:** Official end-of-term academic outcome ($1 = \text{Fail or Withdraw}, 0 = \text{Pass or Distinction}$) recorded in the Student Information System.
- **Why:**
  1. Extends SUTRA's existing validated Day-30 model naturally rather than inventing a completely disconnected target.
  2. Ground truth is unambiguously recorded in official institutional gradebooks, avoiding arbitrary 30-day window drop definitions.
  3. Enables direct computation of trajectory slope: $\Delta \hat{P}_{\text{risk}} = \hat{P}_{60} - \hat{P}_{30}$, giving advisors visible progress indicators.

### 3.2. Minimum Viable Real Dataset Required
A minimum viable real dataset for training SUTRA's next-generation model must satisfy:
1. **Source:** Real accredited university higher education records (not open MOOC clickstreams).
2. **Span:** At least **4 contiguous academic semesters** (e.g., 2 terms training, 1 term validation/calibration, 1 untouched prospective holdout term).
3. **Volume:** Minimum **10,000 unique student enrollments** across diverse departments to achieve statistical power for subgroup calibration.
4. **Feeder Systems Linked:**
   - Registrar SIS (enrollment dates, credit load, historical GPA, midterm and final grades).
   - LMS Clickstream (daily aggregated logins, resource accesses, forum interactions, assignment submissions).
   - In-Person / Lecture Attendance (session attendance percentage).

### 3.3. Fields to Use First vs. Fields to Defer

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                FEATURE INCLUSION ROADMAP                                           │
│                                                                                                    │
│   TIER 1: INCLUDE IN FIRST LONGITUDINAL MODEL                                                      │
│   ✓ LMS engagement aggregates (clicks, active days, study velocity)                                │
│   ✓ Assessment milestones (early quiz scores, midterm score, overdue count)                        │
│   ✓ Classroom / lab attendance percentage and consecutive absences                                │
│   ✓ Student historical baseline (cumulative GPA, prior retake count)                              │
│                                                                                                    │
│   TIER 2: DEFER FROM PREDICTIVE ML FEATURE VECTORS (Retain in Human Workflows)                     │
│   ✗ Fee Status & Financial Holds: EXCLUDE FROM ML ENTIRELY to prevent socioeconomic bias.          │
│     (Retain exclusively in confidential advisor triage workflows).                                │
│   ✗ Skills & Placement Readiness: DEFER due to extreme sparsity and MNAR upperclassman bias.       │
│   ✗ Faculty Qualitative Text: DEFER raw text to prevent subjective bias amplification.             │
│     (Retain as human-reviewed structured flags in the Support Evidence Ledger).                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4. Defensible Baseline Model & Evaluation Plan
- **Baseline Model:** Regularized Logistic Regression with student-grouped cross-validation (`GroupKFold` on `student_id`).
- **Benchmark Model:** Gradient-boosted trees (XGBoost / LightGBM) with monotonic constraints enforced on engagement features (i.e. more active days cannot increase risk).
- **Evaluation Splits:** Strict temporal holdout: train on earlier terms, evaluate calibration and discrimination on the latest term.
- **Metrics:** Precision-Recall AUC (PR-AUC), Brier Score calibration curve, Recall at top $10\%$ triage capacity, and module-level error disparity audits.

### 3.5. Conditions Required Before Training Begins
1. Execution of an institutional **Data Use Agreement (DUA)** and IRB research exemption for de-identified student data.
2. Verified schema contract ensuring bi-temporal timestamps (`event_time` and `ingest_time`) to eliminate retrospective data leakage.
3. Pre-registered data-cleaning protocol defining missingness handling without fabricating synthetic rows.

### 3.6. Conditions Required Before Connecting to Real Decisions
1. Successful retrospective temporal evaluation showing ECE $\le 0.05$ across all major academic departments.
2. Formal prospective shadow-mode evaluation spanning at least one full semester with **zero student-facing side effects**.
3. Algorithmic fairness audit verifying demographic parity and false-positive balance across protected subgroups.
4. Established human-in-the-loop review protocol with student appeal safeguards.

---

## 4. Definitive Concluding Decision

$$\mathbf{\text{[DECISION]} \quad \text{A compatible labeled dataset must be secured before training begins.}}$$

### Rationale:
- SUTRA's software architecture, Pydantic data schemas, rule engine, intervention workflow, and Support Evidence Ledger are fully designed, integrated, and verified.
- However, **no compatible real multisource dataset is currently available in the repository**.
- Retraining the model on synthetic data would violate fundamental ML ethics and fabricate false claims of predictive validity.
- The next engineering step must be securing an accredited institutional dataset partnership under a formal Data Use Agreement before initiating Phase Twenty training.

---

## 5. Unresolved Decisions & Open Architectural Questions

1. **Classroom Attendance Ingestion Protocol:** Will partner institutions provide Wi-Fi association logs, badge tap scans, or LMS virtual session attendance? (Requires technical specification per campus feeder).
2. **Policy Endogeneity Correction:** What proportion of historical students in the training partition received early-alert interventions? If intervention data is unrecorded, survival-time causal adjustment techniques must be formalized.
3. **Multi-Institution Generalizability:** Can a longitudinal model trained at one university transfer to another institution without re-fitting module-specific intercepts? (Historical OULAD audit suggests local re-calibration will be required).
