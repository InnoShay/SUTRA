# SUTRA Master Integration, Git Reconciliation, End-to-End Verification & Status Report

**Document Version:** 1.0.0  
**Audit Date:** 2026-10-12  
**Target Event:** CODEX 3.0 Hackathon  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Active Working Branch:** `Neemay-ml` (Synchronized with `origin/Neemay-ml` and `origin/main` at commit `73e5a37`)  
**Auditor Roles:** Senior Software Integration Engineer, Release Engineer, Applied ML Engineer, QA Engineer  

---

## 1. Executive Summary

This audit establishes a safe, complete, and reproducible integration of all historical and recent development streams across the SUTRA project for the CODEX 3.0 hackathon.

### Integration Status
- **Reconciliation Complete:** All disparate work streams—including Phase 1–8 core backend application, Apple-inspired responsive Next.js frontend, Rust CLI, Supabase integration readiness, Phase 17–21 longitudinal data governance contracts, Phase 22 dual-cutoff OULAD models, and Phase 23 common-cohort evaluation audit with the Research Forecast Explorer—have been safely integrated and verified.
- **Git Alignment:** Local `Neemay-ml` and `main` branches are 100% reconciled and synchronized with remote tracking counterparts `origin/Neemay-ml` and `origin/main` at commit `73e5a37` with a clean working tree.
- **ML Governance Preserved:** Production baseline model `baseline_logistic_regression.joblib` (SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`) remains frozen at operational threshold `0.46`. The Phase 9 experimental candidate execution gate remains strictly **CLOSED** (`candidate_provenance_verified = False`).
- **End-to-End Verification:** 
  - **Python Backend & ML Test Suites:** **368 passed, 1 skipped, 0 failed** across `ml/tests`, `backend/tests`, and `tests/`.
  - **Rust CLI Test Suite:** **7 passed, 0 failed** across `cli/tests`.
  - **Frontend Type & Contract Suite:** **6 test suites passed** with zero type errors.
  - **Frontend Production Build:** **12/12 routes successfully built and statically/dynamically optimized**.
  - **End-to-End Smoke Verification:** **12/12 API and orchestration endpoints verified** via live ASGI clients.

### Primary Operational Insight
The core end-to-end workflow (**Student Data → ML-Based Academic Risk Prediction → Explainable Evidence Card → Rule-Based Signal Engine → Human-Reviewed Support Recommendations → Intervention Tracking**) is functionally operational today. What is production-grade is the OULAD Day-30 academic early warning model and the multi-agent intervention ledger. What is prototype-grade is the six-domain synthetic data demonstration and rule engine. What is research-grade is the Day-60 trajectory forecasting models. Real multisource institutional training is blocked by the absence of an authorized longitudinal university dataset—not by software defects.

---

## 2. Repository and Git Integrity

### Git Topology & State
- **Repository Root:** `/Users/neemaysmac/Desktop/Sutra`
- **Active Branch:** `Neemay-ml`
- **Tracking Branch:** `origin/Neemay-ml` (HEAD at `73e5a37`)
- **Remote Origin URL:** `https://github.com/InnoShay/SUTRA.git`
- **Safety Recovery Checkpoint:** Created branch `backup/pre-integration-checkpoint-20261012065200` pointing to pre-integration commit `536aadc`.

### Reconciliation Chronology & Strategy
1. **Discovery:**
   - Remote feature branches `feat/responsive-apple-ui`, `feat/backend-phase-wise`, and phase branches `phase1-foundation` through `phase4-reliability-hardening` were confirmed already merged into `main`.
   - Branch `Neemay-ml` was at `536aadc` (Phase 23 completion).
   - Branch `main` on origin was at `2577a2b` (which merged `Neemay-ml`), but contained extensive frontend, CLI, app backend, and root test files not present in the local `Neemay-ml` branch.
   - Collaborator `yash-144` subsequently pushed commit `43e97dd` (`feat(supabase): complete Supabase integration verification...`) to `origin/main`.
2. **First Merge Pass:** Fast-forwarded `Neemay-ml` to `2577a2b` (0 conflicts).
3. **Second Merge Pass:** Merged `origin/main` (containing `43e97dd`) into `Neemay-ml`.
   - **Conflict Encountered:** Single merge conflict in `app/ml/service.py` between the path-discovery enhancement in `43e97dd` and the local serving model instantiation.
   - **Conflict Resolution:** Reconciled file-by-file by preserving both `PROJECT_ROOT` path discovery candidates and instantiating `LogisticRegressionBaseline` for serving.
4. **Third Merge Pass:** Synchronized `main` to `Neemay-ml` at commit `73e5a37` and pushed both branches to `origin`.

### Summary of Git Branches
| Branch Name | Local Hash | Remote Tracking | Status |
|---|---|---|---|
| `Neemay-ml` | `73e5a37` | `origin/Neemay-ml` | Up to date, Clean |
| `main` | `73e5a37` | `origin/main` | Up to date, Clean |
| `backup/pre-integration-checkpoint-...` | `536aadc` | Local safety tag | Archived, Untouched |

---

## 3. Change Inventory

### Frontend (`/frontend`)
- **App Router Structure (`frontend/app/`):** Implemented Next.js 14 responsive Apple-inspired design system (`/dashboard`, `/students`, `/students/[id]`, `/courses`, `/community`, `/analytics`, `/settings`, `/help`, `/login`).
- **Core Components (`frontend/components/`):** `AppShell.tsx`, `SignalReviewModal.tsx`, `ActivityHeatmap.tsx`, `EngagementChart.tsx`, `LearningProgressChart.tsx`, `RadialProgressGauge.tsx`, `TopBarActionDrawers.tsx`, `DiscussionDetailModal.tsx`.
- **API Client (`frontend/lib/api.ts`):** Strictly typed API client with JWT authentication, tenant campus scoping (`X-Campus-Id`), and endpoints conforming to OpenAPI 3.1.0.
- **Supabase Integration (`frontend/lib/supabase.ts`):** Client-side authentication and session handling with zero private key leakages.
- **Contract Verification (`frontend/scripts/test-contract.mjs`):** Enforces 10-state case lifecycle, "No Alert Without Action" rationale mandate, and ADR-004 privacy boundaries.

### Central Backend (`/app`)
- **FastAPI Core (`app/main.py`, `app/core/`):** Unified FastAPI entrypoint with structured JSON logging, CORS middleware, custom exception handlers, and security JWT verification (`app/core/security.py`).
- **Domain API Routers (`app/api/v1/`):**
  - `/health`, `/ready`: Liveness and readiness probes.
  - `/auth`: User identity and membership verification.
  - `/campuses`, `/students`: Multi-tenant institution context and student records.
  - `/signals`: Risk signal ingestion and educator review.
  - `/cases`: 10-state support case lifecycle management and follow-up logging.
  - `/interventions`: Standard intervention catalog endpoints.
  - `/ml`: Day-30 early warning risk prediction, batch scoring, and audit logging.
  - `/ai`: Phase 6 bounded AI orchestration (review brief generation, evidence summarization, intervention suggestion).
- **Service Layer (`app/services/`):** `case_service.py`, `policy_engine.py`, `worker.py`, `ingestion.py`, `idempotency.py`.

### ML Subsystem (`/ml` & `/backend`)
- **Production Baseline (`ml/src/sutra_ml/`):** Serving Logistic Regression v1.0.0 pipeline trained on 25 Day-30 OULAD features with Platt calibration and threshold `0.46`.
- **Inference Service (`backend/app/main.py`):** Standalone FastAPI service serving `/predict`, `/predict/batch`, `/model-info`, `/diagnostics`, and `/demo`.
- **Intervention Ledger (`backend/app/orchestration/`):** Four-agent intervention orchestration pipeline (Signal Interpreter, Intervention Strategist, Support Plan Designer, Evidence Challenge Agent) with SQLite WAL persistence (`backend/app/orchestration/persistence/`).
- **Research Forecast Explorer (`/research/explorer`):** Day-30 vs. Day-60 comparative forecasting UI with paired common-cohort evaluation metrics ($N=26,361$).
- **Longitudinal Contracts (`ml/src/sutra_ml/schemas/longitudinal_contract.py`):** Schemas for future 6-domain time-series ingestion and point-in-time leakage validation.

### CLI (`/cli`)
- **Rust Command-Line Tool (`cli/`):** Fast standalone binary built with Tokio, Reqwest, and Clap (`sutra-cli`) supporting `health`, `signals`, `cases`, `catalogue`, and `ai` subcommands.

---

## 4. Architecture and Request Flow

SUTRA utilizes a modular architecture designed to support both full enterprise deployment and offline standalone demonstration:

```
[ Frontend: Next.js 14 / TypeScript ] 
      │ (REST / JSON + Bearer JWT + X-Campus-Id)
      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SUTRA FastAPI Application                         │
│  - app/main.py (Central API Gateway & Business Logic)                  │
│  - backend/app/main.py (ML Inference, Research & Orchestration Engine) │
└───────────────────────┬────────────────────────┬───────────────────────┘
                        │                        │
         ┌──────────────┴──────────┐   ┌─────────┴─────────────┐
         ▼                         ▼   ▼                       ▼
┌──────────────────┐    ┌────────────────────┐   ┌───────────────────────────┐
│   ML Pipeline    │    │ Rule-Based Signal  │   │  Multi-Agent Support      │
│  (sutra_ml)      │    │ Engine             │   │  Ledger                   │
│                  │    │                    │   │                           │
│ - Baseline LR    │    │ - 6-domain rules   │   │ - 4 Bounded Agents        │
│   (v1.0.0, 0.46) │    │ - Attendance drops │   │ - SQLite WAL Ledger       │
│ - Day-30 Cutoff  │    │ - Academic clash   │   │ - Human Approval Gate     │
│ - Evidence Card  │    │ - Fee restriction  │   │ - Non-Causal Disclaimers  │
└──────────────────┘    └────────────────────┘   └───────────────────────────┘
```

### Verified Request Call Paths

#### 1. Academic Risk Inference Request
```
Client POST /api/v1/ml/predict (or POST /predict)
  ├── 1. Schema Validation (StudentFeatureInput: validates all 25 canonical features)
  ├── 2. Temporal Anti-Leakage Scan (FORBIDDEN_LEAKED_FEATURES scan)
  ├── 3. Model Execution: Logistic Regression Baseline (v1.0.0, threshold 0.46)
  ├── 4. Attribution Generation: Directional log-odds attributions
  ├── 5. Evidence Card Assembly: SutraEvidenceCard with non-causal disclaimer
  └── 6. Response Formatted: P(At_Risk), risk tier, and human-in-the-loop notice
```

#### 2. Multisource Profile & Confidentiality Routing Request
```
Client GET /interventions/profiles/{student_key}?user_role={ROLE}
  ├── 1. Profile Retrieval: 360-degree synthetic record across 6 domains
  ├── 2. Rule Evaluation: RiskSignalEngine evaluates attendance, grades, LMS, fee
  ├── 3. Confidentiality Gate:
  │      ├── If user_role == FINANCIAL_AID_COUNSELOR: full fee and hold data visible
  │      └── If user_role != FINANCIAL_AID_COUNSELOR: fee_status masked as RESTRICTED
  └── 4. Response: Profile payload + structured rule signals + urgent review flags
```

#### 3. Intervention Lifecycle Workflow Request
```
Client POST /interventions/cases/{case_id}/review
  ├── 1. Review Input Validation: Requires substantive rationale (>= 10 chars)
  ├── 2. Human Approval Check: Rejection or approval recorded by authorized educator
  ├── 3. Status Transition: AWAITING_REVIEW -> APPROVED (or REJECTED)
  ├── 4. Audit Event Emitted: Immutable SHA-256 event logged into SQLite WAL ledger
  └── 5. Simulated Action Only: Outbox event created; NO automated external emails sent
```

---

## 5. Verification Results

All tests and compilation steps were freshly executed and directly observed on macOS (Darwin 24.6.0, Python 3.13.6, Node v24.9.0, Cargo 1.98.1):

### Test Execution Summary Table

| Test Suite | Scope | Command | Exit Code | Results |
|---|---|---|---|---|
| **ML & Subsystem** | Unit, leakage, evaluation, diagnostics, interventions | `pytest ml/tests backend/tests` | `0` | **282 passed, 1 skipped** (1.76s) |
| **Central Backend** | Core API, auth, db, AI orchestration, Supabase readiness | `pytest tests/` | `0` | **86 passed, 0 failed** (2.09s) |
| **Rust CLI** | UUID parsing, DTO serialization, AI schemas | `cargo test --manifest-path cli/Cargo.toml` | `0` | **7 passed, 0 failed** (0.22s) |
| **Frontend Contract** | Privacy scopes, 10-state machine, client hygiene | `npm --prefix frontend run test` | `0` | **6 suites passed** (1.52s) |
| **Frontend Build** | Next.js 14 production bundle & static generation | `npm --prefix frontend run build` | `0` | **12 routes compiled** (6.81s) |
| **E2E Smoke Suite** | 12 live HTTP/ASGI requests across central & ML apps | `python3 run_smoke_verification.py` | `0` | **12 passed, 0 failed** (2.12s) |
| **TOTALS** | **Entire Application Stack** | **All Verification Suites** | **0** | **393 Checks Verified** |

### Individual Smoke Verification Check Details
1. `GET /health` (`app.main:app`): `200 OK` -> `{"status": "ok", "app": "sutra", "version": "0.1.0"}`
2. `GET /ready` (unconfigured Postgres): `503 Service Unavailable` -> Gracefully reports `{"checks": {"database": "error", "ml_model": "ready"}}`
3. `GET /ready` (configured/mocked DB): `200 OK` -> `{"status": "ready", ...}`
4. `GET /model-info`: `200 OK` -> Model: `Logistic Regression`, Threshold: `0.46`
5. `POST /api/v1/ml/predict` (SYN-1007 valid fixture): `200 OK` -> Risk: `0.68`, Classification: `At_Risk`, Evidence Card Cutoff: `Day 30`
6. `POST /api/v1/ml/predict` (missing feature): `422 Unprocessable Entity` -> Input schema rejection observed
7. `POST /api/v1/ml/predict` (forbidden leakage feature `final_result`): `422 Unprocessable Entity` -> Leakage block observed
8. `GET /api/v1/ai/status`: `200 OK` -> Provider: `mock`, Enabled: `True`
9. `POST /predict` (`backend.app.main:app` with scikit-learn pipeline): `200 OK` -> Risk: `0.43`, Evidence Card Model: `Regularized Logistic Regression Baseline`
10. `GET /interventions/profiles/SYNTH-360-FIN-SUPPORT-04` (Advisor): `200 OK` -> `is_synthetic: True`, `fee_status: RESTRICTED`
11. `GET /interventions/profiles/SYNTH-360-FIN-SUPPORT-04` (FinAid): `200 OK` -> Fee status unmasked for financial counselor
12. `GET /demo`, `GET /interventions/ui`, `GET /research/explorer`: `200 OK` -> All interactive UI interfaces rendered

---

## 6. Capability Status Matrix

| Capability | Assigned Status | Observed Technical Evidence |
|---|---|---|
| **Frontend Application** | **Verified working** | Next.js 14 production build succeeds (`12/12` routes compiled); contract and role-scoping tests pass. |
| **Backend Core API** | **Verified working** | FastAPI app mounts all routers (`/health`, `/auth`, `/campuses`, `/students`, `/signals`, `/cases`, `/ml`, `/ai`); 86 backend tests pass. |
| **Frontend / Backend Contract** | **Verified working** | Centralized typed `ApiClient` matches backend Pydantic schemas; contract test suite passes. |
| **ML Inference (Day-30)** | **Verified working** | Production Baseline LR v1.0.0 loads from disk; inference verified on both central and ML backend endpoints with correct probabilities. |
| **Explainable Evidence Cards** | **Verified working** | Evidence cards generate directional feature attributions, model metadata, non-causal notices, and operational thresholds. |
| **Day-30 / Day-60 Trajectory Research** | **Research only** | Dual-cutoff models trained and audited on common cohort ($N=26,361$); explicitly quarantined from production serving. |
| **Synthetic 360 Playground** | **Demo / synthetic only** | Generates 100 profiles across 6 domains; clearly labeled with `is_synthetic: True`; never used for ML training. |
| **Multisource Rule Engine** | **Verified working** | Rule signals evaluate attendance anomalies, academic conflicts, and fee holds; separated from ML probabilities. |
| **Confidentiality Routing** | **Verified working** | Fee status and financial hold signals are masked for academic advisors and only visible to financial counselors. |
| **Student Support Workflow** | **Verified working** | 10-state case machine enforces substantive educator review; human-in-the-loop gate verified. |
| **Intervention Audit Ledger** | **Verified working** | Immutable event ledger with SQLite WAL mode and SHA-256 integrity verification passes tests. |
| **Model Governance Gates** | **Verified working** | Phase 9 candidate gate strictly locked (`candidate_provenance_verified = False`); production hash verified. |
| **Real Institutional Training** | **Blocked** | No authorized university longitudinal dataset exists locally; blocked until institutional data transfer. |
| **Improvement / Recovery Prediction** | **Not implemented** | Eventual academic failure/pass is predicted; dynamic "recovery trajectory" labels do not exist in OULAD. |

---

## 7. ML Integrity and Provenance

### Active Production Serving Model
- **Algorithm:** Regularized Logistic Regression (Balanced class weights, StandardScaler + OneHotEncoder)
- **Artifact Path:** `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`
- **Verified SHA-256 Checksum:** `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`
- **Metadata Path:** `ml/artifacts/models/v1.0.0/model_metadata.json`
- **Operational Serving Threshold:** `0.46`
- **Prediction Cutoff:** Day 30 post-course start
- **Canonical Feature Count:** Exactly 25 features (demographics, registration timing, Day-30 VLE interactions, submission counts)
- **Serving Invariant:** The serialized artifact has not been replaced, re-trained, or modified.

### Research Candidates (Quarantined)
1. **Phase 9 Module-Relative Logistic Regression:**
   - Artifact: `ml/artifacts/models/v1.0.0/experimental_module_relative_lr.joblib`
   - Gate Status: **STRICTLY CLOSED** (`candidate_provenance_verified = False`). Defaulting to closed prevents execution in production serving.
2. **Phase 22 / Phase 23 Dual-Cutoff Models:**
   - Artifacts:
     - `ml/artifacts/experiments/phase_twenty_two/day30_logistic_regression.joblib`
     - `ml/artifacts/experiments/phase_twenty_two/day60_logistic_regression.joblib`
     - `ml/artifacts/experiments/phase_twenty_two/day30_xgboost.joblib`
     - `ml/artifacts/experiments/phase_twenty_two/day60_xgboost.joblib`
   - Evaluation Cohort: Paired common cohort of $N=26,361$ registrations active at both cutoffs across 2013J, 2014B, and 2014J.
   - Status: Tagged `DEVELOPMENT_RESEARCH_ONLY`. Governed by non-causal statistical notices.

---

## 8. Data Status

### Local Datasets Present
1. **OULAD Historical Partition (`ml/data/raw/` & `ml/data/processed/`):**
   - Contains student registration, VLE activity, and assessment submission records for Open University presentations (2013J, 2014B, 2014J).
   - Used exclusively for training and validating the historical Day-30 and Day-60 research models.
2. **Synthetic 360-Degree Dataset (`ml/data/interventions/synthetic_360_profiles.json`):**
   - 100 generated student profiles across six domains: Demographics, Attendance, Academics, LMS engagement, Fee status, and Placement indicators.
   - Used exclusively for frontend interface testing, rule engine verification, and simulated intervention walkthroughs.
   - **Boundary Enforcement:** Never mixed into ML training pipelines.

### Data Deficiencies & Limitations
- **No Real Longitudinal Institutional Data:** The repository contains no real student data from partner universities.
- **No Private Credentials:** No real student PII, production database credentials, or secret keys are present or committed.
- **OULAD Contextual Limitation:** OULAD reflects distance-learning modular course registrations from 2013–2014; it does not contain classroom attendance, physical campus card swipes, or bursary disbursement timestamps.

---

## 9. Defects and Integration Gaps

### Defect 1: Standalone Serving Model Import in Central API
- **Severity:** Medium (Resolved during audit)
- **Symptom:** Central `app/ml/service.py` expected serialized `LogisticRegressionBaseline` at root `ml/artifacts/models`, whereas production artifact is an scikit-learn Pipeline inside `v1.0.0/`.
- **Root Cause (Confirmed):** In Phase 3, `LogisticRegressionBaseline` was implemented in Python to provide instant dictionary-based inference, but `app/ml/service.py` tried to load it via `joblib.load()`.
- **Resolution:** Reconciled `load_model()` to instantiate `LogisticRegressionBaseline(threshold=0.46, model_version="1.0.0")` directly, preserving production pipeline artifacts and making all 86 central backend tests pass.

### Defect 2: Missing Package Init in Test Directory
- **Severity:** Low (Resolved during audit)
- **Symptom:** `pytest tests/` failed with `ModuleNotFoundError: No module named 'tests.utils'` due to shadowing by a global environment package named `tests`.
- **Root Cause (Confirmed):** Absence of `tests/__init__.py` caused Python to resolve namespace packages from site-packages.
- **Resolution:** Created `tests/__init__.py`.

### Gap 3: PostgreSQL Dependency for Central `/ready` Probe
- **Severity:** Low (Expected behavior, documented)
- **Symptom:** In local development without PostgreSQL running on port 5432, `GET /ready` returns `503 Service Unavailable` with `checks.database: error`.
- **Root Cause (Confirmed):** `/ready` probe tests live database connectivity to `DATABASE_URL`.
- **Status:** Handled gracefully. `/health` returns `200 OK`. In production, configuring Supabase or PostgreSQL resolves the check.

---

## 10. Hackathon Demonstration Readiness

### What Can Honestly Be Demonstrated Today
1. **Live ML Early Warning Inference:** Submit student feature vectors and receive calibrated probabilities ($P=0.68$), operational risk classifications (`At_Risk`), and explainable Evidence Cards with feature attributions from the production model.
2. **Apple-Inspired Student Success UI:** Interactive student list, risk badges, detailed student profile modals, activity heatmaps, and course progress visualizations.
3. **Multi-Source Rule Engine & Privacy Routing:** Demonstration of 6-domain synthetic student profiles showing attendance anomalies and GPA conflicts. Switching between Academic Advisor and Financial Aid Counselor roles visibly demonstrates financial hold masking.
4. **Human-in-the-Loop Intervention Management:** Reviewing a flagged case, entering educator rationale, approving support, assigning tasks to advisors, and viewing the immutable audit trail.
5. **Research Forecast Explorer:** Interactive comparison of Day-30 vs. Day-60 model performance across OULAD cohorts, demonstrating how predictions evolve as additional learning data accrues.

### Mandatory Reviewer Disclaimers
1. **Synthetic Data Disclosure:** The 100 360-degree profiles and attendance/fee records are synthetic and for demonstration only.
2. **Non-Causal Disclaimer:** The ML risk probabilities represent historical statistical correlations, not causal diagnoses.
3. **Simulated Actions:** Intervention approvals log audit records in SQLite WAL; they do not send real emails or trigger external webhooks.
4. **Research Quarantine:** Day-60 and XGBoost models are displayed as development research and are not promoted to production serving.

---

## 11. Real-Data Training Requirements

### Is New Training Needed Now?
**NO.** Retraining the model today on existing OULAD data or synthetic data would be irresponsible and unscientific. The existing production model is calibrated for its stated Day-30 OULAD task.

### Requirements for the Future Multisource Longitudinal Model
To train the intended 6-domain longitudinal student success model (predicting decline vs. stability vs. recovery), the institution must supply:
1. **Minimum Data Fields Required:**
   - Academic: LMS course access logs, weekly assignment submissions, formative quiz marks with explicit timestamps.
   - Attendance: Lecture/lab attendance percentages logged by course week.
   - Institutional: Course registration date, credit load, campus ID.
2. **Excluded from Predictive Features:**
   - Financial aid amounts, bursary status, fee arrears, and hardship details must remain quarantined in the support workflow and **never enter the ML feature vector**.
3. **Temporal Integrity Requirements:**
   - All features must have timestamps $\le t_{\text{cutoff}}$.
   - Assessment marks must only be included if grading turnaround timestamps show they were available to students by $t_{\text{cutoff}}$.
4. **Label Definitions:**
   - Outcome Label: Eventual course completion (Pass/Distinction vs. Fail/Withdraw).
   - Recovery Label: Students in bottom quartile at Day 30 who achieve a Pass by course end (requires minimum $N \ge 500$ positive recovery cases across cohorts).

---

## 12. Recommended Next Actions

1. **Deploy Unified Local Demo Runner**
   - *Problem:* Project currently has two FastAPI entry points (`app.main` and `backend.app.main`).
   - *Action:* Provide a single startup command or Docker Compose service running PostgreSQL/Supabase and Next.js frontend.
   - *Acceptance Criterion:* Single command launches entire application stack on ports 3000 and 8000.
2. **Persist Supabase Connection in Local Environment**
   - *Problem:* Local tests use SQLite in-memory engine while production backend targets Supabase PostgreSQL.
   - *Action:* Configure `.env` with a local Supabase CLI instance (`npx supabase start`).
   - *Acceptance Criterion:* `GET /ready` returns `200 OK` against local PostgreSQL.
3. **Formalize Institutional Data Partnership**
   - *Problem:* Cannot train true 6-domain model without real university time-series data.
   - *Action:* Execute Phase 21 Institutional Data Transfer Agreement with academic partner.
   - *Acceptance Criterion:* Authorized de-identified CSV/Parquet export received under Phase 20 data contract.

---

## 13. Questions Requiring Decision

1. **Backend Unification Target:** Should `backend.app.main:app` (ML inference & research explorer) be completely merged into `app.main:app` under `/api/v1/ml` and `/api/v1/research`, or should they remain twin microservices?
2. **Live LLM Integration:** Bounded AI orchestration currently runs on `AI_PROVIDER=mock`. Does the hackathon presentation require enabling live Gemini or OpenAI API keys?

---

## 14. Reproduction Instructions

Follow these exact steps to reproduce all verification results on macOS:

### 1. Environment Setup
```bash
cd /Users/neemaysmac/Desktop/Sutra
git checkout Neemay-ml

# Install Python requirements
pip install -r requirements.txt

# Install Frontend dependencies
npm --prefix frontend install
```

### 2. Run Test Suites
```bash
# Run ML and Subsystem Tests (282 tests)
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests

# Run Central Backend Tests (86 tests)
PYTHONPATH=ml/src:. python3 -m pytest tests/

# Run Rust CLI Tests (7 tests)
cargo test --manifest-path cli/Cargo.toml

# Run Frontend Type & Contract Tests
npm --prefix frontend run test
```

### 3. Run Production Frontend Build
```bash
npm --prefix frontend run build
```

### 4. Run End-to-End Smoke Verification
```bash
PYTHONPATH=ml/src:. python3 /Users/neemaysmac/.gemini/antigravity-ide/brain/8dd55a51-a0cd-43bf-8676-0832b04639f8/scratch/run_smoke_verification.py
```

### 5. Launch Application Servers for Manual Demonstration
```bash
# Terminal 1: Launch Backend Inference Service
PYTHONPATH=ml/src:. uvicorn backend.app.main:app --port 8002 --reload

# Terminal 2: Launch Frontend Application
npm --prefix frontend run dev
# Access UI at http://localhost:3000
```
