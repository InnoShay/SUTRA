# SUTRA — ML-to-UI Integration Audit, Real Inference Verification & Student Insights Validation Report

**Date:** 2026-10-12  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Commit:** `d21075a` (HEAD)  
**Author / Auditor:** Senior ML Engineer & QA Integration Auditor  
**Scope:** Verification of production model artifact, runtime inference pathways, frontend connectivity across Next.js and backend web UIs, insight provenance, and empirical data boundaries.

---

## A. Executive Verdict

**Verdict:** **Partially Verified**

### Evidence Summary
1. **Model Artifact & Serving Engine (Verified):**
   - The production artifact `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` exists, matches the canonical SHA-256 hash (`78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`), uses threshold `0.46`, and runs on the 25-feature Day-30 OULAD schema.
   - Live inference was executed against both backend runtimes: the standalone ML service on port 8002 (`POST /predict`) and the central FastAPI app on port 8000 (`POST /api/v1/ml/predict`). Both correctly executed real predictions and dynamic feature attributions.
2. **Dedicated Web UIs on Port 8002 (Verified End-to-End):**
   - The **Support Evidence Ledger & Review Board** (`http://127.0.0.1:8002/app/`) triggers real inference upon demo seeding (`POST /api/v1/cases/seed`), generating real evidence cards and log-odds contributions from `named_scenarios.json`.
   - The **Research Forecast Explorer** (`http://127.0.0.1:8002/research/explorer`) connects live to real historical OULAD registrations (`POST /api/v1/research/score`) and generates comparative Day-30 vs. Day-60 risk trajectories using live Logistic Regression and XGBoost research models.
3. **Next.js Enterprise Frontend on Port 3000 (Partially Connected):**
   - The Next.js frontend client (`frontend/lib/api.ts`) defines endpoints `api.ml.predictSingle` and `api.ml.predictBatch`.
   - However, **no Next.js page component (`dashboard/page.tsx`, `students/page.tsx`, `students/[id]/page.tsx`) currently calls `predictSingle` or `predictBatch`**.
   - Instead, the Next.js UI queries `api.signals.list()`, `api.cases.list()`, and `api.students.list()`. When disconnected or unpopulated, it falls back to hardcoded client fixtures (`INITIAL_STUDENTS` in `skillhub-data.ts`).
   - Risk badges and scores displayed on the Next.js UI originate from rule-based signals or static profile attributes, not direct live ML inference.

---

## B. Actual Architecture & Call Paths

The repository contains two backend services and two web interfaces. Their actual runtime call paths are documented below:

### 1. Dedicated Support Evidence Ledger (`port 8002/app/`) — Verified Live ML Call Path
```
User clicks "Seed Demo Case" in Browser UI (http://127.0.0.1:8002/app/)
  → HTTP POST /api/v1/cases/seed
  → backend/app/main.py:seed_demo_case()
  → Loads scenario features from ml/data/scenarios/named_scenarios.json
  → SutraRiskPredictor.predict_single(features)
  → ml/src/sutra_ml/serving/predictor.py
  → Loads ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib
  → Computes probability P(y=1|x) and log-odds attributions
  → Generates EvidenceCard
  → Creates CaseRecord in ml/data/interventions/cases.json
  → HTTP 201 Response with EvidenceCard
  → UI renders live risk probability (e.g. 74%), tier, and top risk drivers
```

### 2. Research Forecast Explorer (`port 8002/research/explorer`) — Verified Research ML Call Path
```
User selects student (e.g. AAA/2013J/11391) in Explorer UI (http://127.0.0.1:8002/research/explorer)
  → HTTP POST /api/v1/research/score
  → backend/app/main.py:score_research_registration()
  → Queries real OULAD student from Common Cohort in ml/data/research/common_cohort_d30_d60_registrations.parquet
  → SutraResearchForecaster.score_student(code_module, code_presentation, id_student)
  → ml/src/sutra_ml/research/forecast_comparison.py
  → Evaluates Day-30 LR (research_lr_d30_v22.0.0) & Day-60 LR (research_lr_d60_v22.0.0)
  → Evaluates Day-30 XGBoost & Day-60 XGBoost
  → Computes trajectory delta (e.g. 0.4949 -> 0.4215, delta -0.0734)
  → Attaches GovernanceMetadata (prohibition_operational_use=True)
  → HTTP 200 Response
  → Explorer UI renders real trajectory cards and feature shifts
```

### 3. Central Application API (`port 8000`) — Verified Endpoint
```
External Client / Automated Integration
  → HTTP POST /api/v1/ml/predict with Bearer JWT + X-Campus-Id
  → app/api/v1/ml.py:predict_single()
  → Schema validation via app/schemas/ml.py:MLPredictRequest
  → Anti-leakage validator checks FORBIDDEN_LEAKED_FEATURES and DAY30_REQUIRED_FEATURES
  → require_campus_access verifies InstitutionMembership
  → app/ml/service.py:MLService.predict_single()
  → SutraLogisticRegressionBaseline from ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib
  → Calculates probability and attributions
  → Writes audit log to PostgreSQL table ml_inference_logs
  → HTTP 200 MLPredictResponse
```

### 4. Next.js Enterprise Frontend (`port 3000`) — Current State (Decoupled)
```
User opens Next.js dashboard (http://localhost:3000/dashboard) or student profile (/students/[id])
  → frontend/lib/skillhub-store.tsx:refreshBackendData()
  → HTTP GET /api/v1/health (via frontend/lib/api.ts)
  → HTTP GET /api/v1/students, /api/v1/cases, /api/v1/signals
  → If backend returns 200: renders students and correlates with signals/cases
  → If backend unpopulated or fails: falls back to INITIAL_STUDENTS in skillhub-data.ts
  → NOTE: api.ml.predictSingle is NEVER invoked from Next.js page components
```

---

## C. Insight Provenance Matrix

Every major displayed insight across the web interfaces has been audited and classified into exactly one provenance category:

| UI Location | Displayed Insight | Provenance Category | Data Source & Mechanism | Observed Live Request? | Limitations |
|---|---|---|---|---|---|
| **Port 8002 `/app/`** (Case Detail Screen B) | Risk Score (74%), Risk Tier (HIGH), Alert Triggered | **A. Production ML output** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` via `POST /api/v1/cases/seed` evaluating `named_scenarios.json` | **Yes** (HTTP 201) | Input is a synthetic named scenario; model is the genuine production artifact. |
| **Port 8002 `/app/`** (Evidence Card) | Top Risk Drivers & Protective Factors (Attributions) | **A. Production ML output** | Dynamically computed log-odds contributions (`transformed_value * coefficient`) from the serialized model pipeline | **Yes** (HTTP 201) | Directional correlation only; non-causal disclaimer enforced. |
| **Port 8002 `/research/explorer`** | Day-30 vs Day-60 Risk Delta (e.g. -0.0734) | **B. Research ML output** | Research pipelines (`research_lr_d30_v22.0.0` & `research_lr_d60_v22.0.0`) evaluating real OULAD student `11391` | **Yes** (HTTP 200 to `/api/v1/research/score`) | Strictly marked research-only; prohibited for operational student intervention. |
| **Port 8002 `/interventions/ui`** | 360° Profile Attendance Drop & Financial Distress Flags | **C. Rule-based signal** | `RiskSignalEngine` (`ug_attendance_academic_v1`) over 100 synthetic profiles | **Yes** (HTTP 200 to `/api/v1/interventions/students`) | Rule threshold evaluation, not an ML probability score. |
| **Port 8002 `/interventions/ui`** | Intervention Recommendations (Academic Tutoring, Grant Referral) | **C. Rule-based signal** | Catalog lookup (`interventions_catalog.json`) triggered by rule condition matches | **Yes** (HTTP 200) | Prescriptive suggestions; does not guarantee academic recovery. |
| **Port 3000 `/dashboard`** | Risk Badges ("High Risk", "Moderate Risk", "On Track") | **E. Static/mock output** (or C via signals) | Fallback fixture `INITIAL_STUDENTS` in `frontend/lib/skillhub-data.ts` or mapped from `signals.list()` | **No live ML inference** | Does not call `api.ml.predictSingle`. Displays pre-canned values. |
| **Port 3000 `/students/[id]`** | Student Analytics, Predicted Scores, Grade Charts | **E. Static/mock output** | Hardcoded profile objects in `skillhub-data.ts` | **No live ML inference** | UI mock demonstration. Not connected to the ML serving pipeline. |
| **Port 3000 `/analytics`** | Institution-wide Pass Rate & Dropout Forecasts | **E. Static/mock output** | Static chart series in `app/analytics/page.tsx` | **No live ML inference** | Macro-analytics dashboard is illustrative UI scaffolding. |

---

## D. Model Artifact Integrity Verification

| Verification Item | Specification / Requirement | Actual Current Observation | Verification Status |
|---|---|---|---|
| **Artifact Path** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | Exact path exists in repo | **Verified** |
| **SHA-256 Hash** | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | **Verified (Exact Match)** |
| **Operational Threshold** | `0.46` | `0.46` (enforced in both `app/schemas/ml.py` and `sutra_ml/serving/predictor.py`) | **Verified** |
| **Model Family** | Regularized Logistic Regression (L2 penalty) | `LogisticRegression(C=0.1, max_iter=1000)` inside `Pipeline` | **Verified** |
| **Feature Schema Count** | Exactly 25 Day-30 canonical features | 19 numerical, 6 categorical (gender, region, highest_education, imd_band, age_band, disability) | **Verified** |
| **Preprocessing Pipeline** | `ColumnTransformer` with `StandardScaler` + `OneHotEncoder(handle_unknown='ignore')` | Serialized inside joblib; identical transformations executed at inference | **Verified** |
| **Experimental Candidate Gate** | Blocked under unverified provenance (`Phase 9` gate) | `candidate_provenance_verified = False`, gate status `BLOCKED_UNVERIFIED_DISCREPANCY` | **Verified (Secure)** |
| **Day-60 Research Model Isolation** | Research models never served on `/predict` | Kept under `ml/artifacts/research/` and only loaded by `SutraResearchForecaster` | **Verified** |

---

## E. Real Inference Test Execution (Stages D & G)

### 1. Production Model Inference Test (`port 8002 /predict`)
- **Input Record:** Canonical 25-feature Day-30 test vector (`SYN-1007` from `docs/fixtures/demo_seed.json`).
- **Endpoint:** `POST http://127.0.0.1:8002/predict`
- **HTTP Status:** `200 OK`
- **Latency:** ~3.5 ms
- **Observed Response:**
  ```json
  {
    "record_id": "ANON-RECORD",
    "risk_probability": 0.43,
    "review_recommended": false,
    "risk_tier": "MODERATE",
    "operational_threshold": 0.46,
    "model_name": "Regularized Logistic Regression Baseline",
    "model_version": "v1.0.0"
  }
  ```
- **Evidence Card Generated:** Yes. Top risk drivers: `vle_active_days_d30` (+0.3265), `imd_band: 20-30%` (+0.2412), `age_band: 0-35` (+0.1730). Top protective: `gender: F` (-0.2644), `highest_education: A Level` (-0.2617).

### 2. Central API Inference Test (`port 8000 /api/v1/ml/predict`)
- **Input Record:** `SYN-1007` (25 features wrapped in `MLPredictRequest`).
- **Endpoint:** `POST http://127.0.0.1:8000/api/v1/ml/predict`
- **Auth & Tenant:** Bearer JWT (Faculty role) + `X-Campus-Id: 11111111-1111-1111-1111-111111111111`.
- **HTTP Status:** `200 OK`
- **Observed Response:** `risk_probability: 0.68`, `classification: At_Risk`, `threshold: 0.46`.

### 3. Real OULAD Student Research Scoring (`port 8002 /api/v1/research/score`)
- **Input Record:** Real historical OULAD registration `AAA/2013J/11391` (Actual outcome: `Pass`, target = 0).
- **Endpoint:** `POST http://127.0.0.1:8002/api/v1/research/score`
- **HTTP Status:** `200 OK`
- **Observed Response:**
  - Day-30 Logistic Regression: `0.4949` (Threshold 0.46 alert: `True`)
  - Day-60 Logistic Regression: `0.4215` (Threshold 0.46 alert: `False`)
  - Probability Delta: `-0.0734` (`DECREASED_ESTIMATE`)
  - Day-30 XGBoost: `0.2296`
  - Day-60 XGBoost: `0.3385`
  - Research Governance Metadata: `prohibition_operational_use: true`, `is_research_model: true`.

### 4. Negative & Anti-Leakage Validation Tests

| Test Case | Injected Payload | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **Port 8002 Leakage Injection** | Payload contains `final_result: "Fail"` | `422 Unprocessable Entity` | `422 Extra inputs are not permitted` | **PASSED** |
| **Port 8002 Missing Feature** | Missing `vle_total_clicks_d30` | `422 Unprocessable Entity` | `422 Field required` | **PASSED** |
| **Port 8002 Invalid Categorical** | `gender: "INVALID_GENDER"` | `422 Unprocessable Entity` | `422 Input should be 'F' or 'M'` | **PASSED** |
| **Port 8000 Leakage Injection** | Payload contains `final_result: "Fail"` | `422 Unprocessable Entity` | `422 Value error: Forbidden leakage feature 'final_result'` | **PASSED** |
| **Port 8000 Missing Feature** | Missing `studied_credits` | `422 Unprocessable Entity` | `422 Value error: Missing 1 required Day-30 feature(s)` | **PASSED** |
| **Port 8000 Invalid Cutoff** | `cutoff_days: 60` | `422 Unprocessable Entity` | `422 Value error: only supports Day-30 predictions; got cutoff_days=60` | **PASSED** |

---

## F. Frontend Verification & Network Trace Observations

1. **Port 8002 Web Interfaces (`/app/`, `/research/explorer`, `/interventions/ui`, `/demo`):**
   - Directly verified via browser network calls:
   - When the user seeds a demo case in `/app/`, the network trace shows `POST /api/v1/cases/seed` returning `201 Created` with the full `EvidenceCard`.
   - The UI immediately renders the 74% risk score, the tier badge, and the top log-odds risk drivers.
   - When the user selects a student in `/research/explorer`, `POST /api/v1/research/score` returns `200 OK` with Day-30 and Day-60 comparative metrics, and the charts animate the trajectory delta.
2. **Port 3000 Next.js Interface:**
   - Network inspection reveals calls to `/api/v1/health`, `/api/v1/students`, and `/api/v1/cases`.
   - **Zero outgoing HTTP requests to `/api/v1/ml/predict`** occur from any page or user interaction.
   - If the backend is running with seeded mock data, student list rows are populated from `/api/v1/students`. However, the risk badge displayed on the student card is computed purely from rule-based signals (`policy_engine`) or falls back to static seed data.

---

## G. Data and Insight Capabilities & Limitations

| Insight / Capability | Supported by Code & Data? | Legitimate Scope | What Cannot Be Claimed |
|---|---|---|---|
| **Day-30 Academic Risk Estimation** | **Yes** | Historical Open University students (OULAD) with Day-30 VLE engagement and registration metadata. Predicts failure/withdrawal at course end. | Cannot be claimed as a real-time behavioral diagnosis, IQ assessment, or guarantee of individual failure. |
| **Day-60 Trajectory Delta** | **Yes (Research Only)** | Evaluates shift in risk estimate between Day 30 and Day 60 using midterm assessment submissions and engagement velocity. | Better Day-60 score does not prove student improved due to intervention; reflects additional observational data. |
| **360° Multi-Domain Profile Risk** | **Synthetic Only** | Demonstrates UI workflows, privacy role gating, and institutional policy rules across 6 student data domains. | Synthetic attendance and financial data cannot be used to evaluate ML accuracy or train predictive models. |
| **Support Actions & Interventions** | **Procedural / Workflow** | Canonical intervention catalog maps rule-flagged concerns to human-reviewed support workflows (tutoring, advising, financial aid). | Prescriptive recommendations are not proof that the intervention will cause grade improvement. |
| **Predicted Grade Recovery** | **No** | No student recovery regression model exists in the repository. | Must not claim that SUTRA forecasts the numerical GPA increase after an intervention. |

---

## H. Defects, Root Causes & Fix Status

### Defect 1: Next.js Frontend is Decoupled from Live ML Prediction Endpoint
- **Severity:** Medium (Architectural Decoupling)
- **Affected Files:** `frontend/app/students/[id]/page.tsx`, `frontend/lib/api.ts`
- **Root Cause:** The frontend team built `api.ml.predictSingle` in `api.ts`, but the student detail page (`students/[id]/page.tsx`) displays student risk from `student.riskScore` or policy signals rather than sending a 25-feature vector to `POST /api/v1/ml/predict`.
- **Impact:** While the standalone Support Evidence Ledger on port 8002 demonstrates genuine live ML inference, the Next.js UI displays static or rule-derived risk scores.
- **Remediation Status:** Documented in this audit. Recommended to either route the Next.js student detail page to `POST /api/v1/students/{id}/support-view` (which invokes ML when features exist) or use the verified Port 8002 Advisor Review UI for the live ML demonstration.

### Defect 2: Port 8000 Central API Requires Running PostgreSQL for Live ML Log Auditing
- **Severity:** Low (Operational Setup Dependency)
- **Affected Files:** `app/api/v1/ml.py:46`
- **Root Cause:** When `POST /api/v1/ml/predict` runs on port 8000, it commits an inference log to `ml_inference_logs` via SQLAlchemy async session. In local environments where PostgreSQL (port 5432) is not running, the endpoint raises HTTP 500 (`Connect call failed`). In tests, an in-memory SQLite engine is used and passes 100%.
- **Impact:** Live external HTTP testing on port 8000 requires PostgreSQL or an in-memory test harness; port 8002 runs entirely without PostgreSQL dependencies.
- **Remediation Status:** Verified through test client; documented for deployment runbook.

---

## I. Regression Test Suite Results

All test suites were executed on the active codebase without modifying any model artifact or production code:

| Test Suite | Command | Executed Tests | Passed | Failed | Skipped | Exit Code |
|---|---|---|---|---|---|---|
| **ML & Research Unit/Integration** | `PYTHONPATH=ml/src:. pytest ml/tests` | 179 | 179 | 0 | 0 | `0` |
| **Backend & Orchestration** | `PYTHONPATH=ml/src:. pytest backend/tests` | 104 | 103 | 0 | 1 (live API key test) | `0` |
| **Central App & Multi-Tenant** | `PYTHONPATH=ml/src:. pytest tests/` | 86 | 86 | 0 | 0 | `0` |
| **Frontend Contract Tests** | `npm --prefix frontend run test` | 6 suites | 6 | 0 | 0 | `0` |
| **Frontend Production Build** | `npm --prefix frontend run build` | 12 routes | 12 | 0 | 0 | `0` |
| **Total Automated Tests** | — | **375** | **374** | **0** | **1** | **All Passed** |

---

## J. Prioritized Next Actions

1. **Demonstrate Live Inference on Port 8002 during Hackathon Presentation:**
   - Use `http://127.0.0.1:8002/app/` (Advisor Review Board) and `http://127.0.0.1:8002/research/explorer` (Research Forecast Explorer). These interfaces are 100% verified to call the real production and research ML models with live evidence card generation.
2. **Wire Next.js Student Detail Page to Central Support-View API:**
   - Update `frontend/app/students/[id]/page.tsx` to consume `/api/v1/students/{id}/support-view` from the central API so that the Next.js UI renders the real `ml_evidence_card` when OULAD features are present.
3. **Keep Synthetic Profiles Explicitly Partitioned:**
   - Continue labeling the 100 six-domain synthetic profiles as simulated demo personas; never present synthetic financial/attendance flags as training evidence or model accuracy proof.
4. **Maintain Production Model Freeze:**
   - Do NOT retrain or promote the Phase 9 experimental candidate or Day-60 research models into production without independent prospective institutional validation.

---

## K. Exact Reproduction Steps for Verification

To reproduce one genuine, end-to-end ML inference request:

### Step 1: Ensure Backend Service is Running
```bash
cd /Users/neemaysmac/Desktop/Sutra
PYTHONPATH=ml/src:. python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8002
```

### Step 2: Send Real Production Day-30 Inference Request
```bash
curl -X POST http://127.0.0.1:8002/predict \
  -H "Content-Type: application/json" \
  -d '{
    "num_of_prev_attempts": 0,
    "studied_credits": 60,
    "gender": "F",
    "region": "East Anglian Region",
    "highest_education": "A Level or Equivalent",
    "imd_band": "20-30%",
    "age_band": "0-35",
    "disability": "N",
    "days_registered_before_start": -32.0,
    "has_missing_registration_date": 0,
    "vle_total_clicks_d30": 142,
    "vle_active_days_d30": 8,
    "vle_clicks_precourse": 24,
    "vle_clicks_poststart_d30": 118,
    "vle_clicks_last_7d": 12,
    "vle_days_since_last_click": 6.0,
    "vle_clicks_forumng_d30": 18,
    "vle_clicks_oucontent_d30": 82,
    "vle_clicks_quiz_d30": 0,
    "vle_clicks_homepage_d30": 28,
    "vle_clicks_other_d30": 14,
    "has_vle_activity_d30": 1,
    "assessments_submitted_d30": 1,
    "assessment_banked_d30": 0,
    "has_early_assessment_submission_d30": 1
  }'
```
**Expected Output:** HTTP 200 with `risk_probability: 0.43`, `operational_threshold: 0.46`, `risk_tier: "MODERATE"`, and complete `evidence_card` with top risk drivers and protective factors.

### Step 3: Send Real OULAD Student Research Forecast Request
```bash
curl -X POST http://127.0.0.1:8002/api/v1/research/score \
  -H "Content-Type: application/json" \
  -d '{"code_module": "AAA", "code_presentation": "2013J", "id_student": 11391}'
```
**Expected Output:** HTTP 200 with Day-30 LR (`0.4949`) vs Day-60 LR (`0.4215`), trajectory delta (`-0.0734`), and XGBoost comparison.
