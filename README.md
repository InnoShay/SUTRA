# SUTRA — Student Success and Intervention Orchestration Engine

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0%2B-red.svg)](https://www.sqlalchemy.org/)
[![Tests](https://img.shields.io/badge/Tests-77%2F77%20Passed-brightgreen.svg)]()

> **Core Product Principle:** *“No Alert Without Action.”*

SUTRA (**Student Success and Intervention Orchestration Engine**) connects multi-source student risk observations to explainable evidence, human review, accountable ownership, enforceable deadlines, verified follow-ups, documented outcomes, and cohort-level operational analytics.

---

## 🏛️ System Architecture

SUTRA is architected as a modular monolith optimized for clear separation of concerns, institutional data privacy, and deterministic reliability:

```
                      ┌─────────────────────────────────────────┐
                      │          FastAPI Gateway & API          │
                      │               (/api/v1)                 │
                      └────┬───────────────────────────────┬────┘
                           │                               │
            ┌──────────────▼─────────────┐   ┌─────────────▼─────────────┐
            │   Deterministic Policy     │   │     Internal ML Service   │
            │          Engine            │   │      (Logistic Reg v1)    │
            └──────────────┬─────────────┘   └─────────────┬─────────────┘
                           │                               │
                           └──────────────┬────────────────┘
                                          │
                            ┌─────────────▼────────────┐
                            │    Review Queue & Case   │
                            │       State Machine      │
                            └─────────────┬────────────┘
                                          │
                     ┌────────────────────┼────────────────────┐
                     │                    │                    │
          ┌──────────▼─────────┐ ┌────────▼─────────┐ ┌────────▼─────────┐
          │  Outbox Worker &   │ │  Multi-Campus    │ │ Sensitive Domain │
          │  Escalations       │ │  RBAC Isolation  │ │ Task Encryption  │
          └────────────────────┘ └──────────────────┘ └──────────────────┘
```

1. **Policy-First Deterministic Triage:** High-confidence rule triggers (academic, attendance, engagement) generate verifiable signals without unexplainable black-box decisions.
2. **Explainable ML Early-Warning:** Regularized Logistic Regression model calibrated on Day-30 features synthesizes human-auditable Evidence Cards with top risk attributions.
3. **10-State Case Lifecycle:** Transition-controlled state machine ensuring every identified alert advances through assignment, acceptance, intervention, follow-up, and closure.
4. **Reliability & Idempotency:** Database-backed transactional outbox pattern, duplicate signal deduplication constraints, exponential backoff, dead-letter queuing, and automated deadline escalations.
5. **Zero-Trust Institutional Security:** Multi-campus isolation, role-based capability resolution, and AES-GCM encryption for sensitive-domain support tasks (e.g. mental health, accommodation notes).

---

## 📂 Repository Directory Layout

```
.
├── app/                        # Production FastAPI Backend Application
│   ├── api/                    # API v1 routes & endpoints
│   │   └── v1/                 # Endpoints: auth, ingestion, signals, cases, ml, health
│   ├── core/                   # Security, JWT auth, database engine, logging, settings
│   ├── ml/                     # ML service boundary, loader, and feature extraction
│   ├── models/                 # SQLAlchemy 2.x declarative database models
│   ├── schemas/                # Pydantic v2 validation contracts & DTOs
│   ├── services/               # Core domain services: policy engine, case machine, worker
│   └── main.py                 # FastAPI application factory and lifespan configuration
│
├── ml/                         # SUTRA Machine Learning Subsystem (sutra_ml)
│   ├── artifacts/              # Production & experimental model artifacts
│   │   └── models/v1.0.0/      # Production Logistic Regression v1.0.0 baseline
│   ├── src/sutra_ml/           # Preprocessing, explainability, synthetic data, evaluation
│   └── tests/                  # ML unit tests & shadow mode evaluation
│
├── docs/                       # Canonical Documentation Hub (formerly SUTRA_Backend_Docs)
│   ├── README.md               # Documentation guide & index
│   ├── MASTER_BACKEND_IMPLEMENTATION_PACK.md # Complete single-document implementation pack
│   ├── decisions/              # Architecture Decision Records (ADR-001 through ADR-006)
│   ├── docs/                   # 14 Specification chapters (Phases 0–8, data model, APIs)
│   ├── fixtures/               # Synthetic seed fixtures (demo_seed.json)
│   ├── migrations/             # SQL baseline schemas
│   └── openapi/                # Canonical OpenAPI 3.1.0 specification
│
├── alembic/                    # Database Migrations
├── tests/                      # Comprehensive Backend Test Suite (61 tests)
├── .env.example                # Canonical environment variable configuration template
├── alembic.ini                 # Alembic migration configuration
├── pytest.ini                  # Pytest test runner settings
└── requirements.txt            # Python dependencies
```

---

## 🚀 Quickstart

### 1. Prerequisites
- Python 3.10+ (Python 3.11 recommended)
- PostgreSQL database (or Supabase local development stack)

### 2. Setup Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
```
Update `.env` with your PostgreSQL database credentials and Supabase JWT secret.

### 5. Run Database Migrations
```bash
alembic upgrade head
```

### 6. Start the API Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive API documentation will be available at:
- Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

### Running the Frontend (Next.js 14 App Router)

The adapted frontend integrates with the verified backend while preserving its Apple-inspired aesthetic and design tokens:

```bash
cd frontend
npm install
npm test       # Runs TypeScript type-check and SUTRA contract validation
npm run dev    # Starts local Next.js dev server on http://localhost:3000
npm run build  # Compiles optimized production bundle
```

### Seeding Synthetic Demo Fixtures

To populate local development with multi-campus students, policy engine signals, and active support cases:

```bash
python scripts/seed_demo_data.py --fixture docs/fixtures/demo_seed.json
```

---

## 🧪 Running Automated Tests

The backend test suite verifies RBAC security, observation ingestion, policy engine evaluation, 10-state case transitions, ML inference contracts, and failure-recovery hardening.

```bash
# Run all tests
pytest tests

# Run with verbose output and coverage
pytest tests -v --cov=app
```

### Test Coverage Highlights
- `tests/test_phase8_acceptance.py` — Scenario 1 traceable workflow (observation to closed outcome), Scenario 2 negative boundaries & graceful AI degradation, API response time benchmarks.
- `tests/test_ai_orchestration.py` — Bounded AI review briefs, catalog filtering, prompt injection defense, ADR-003 financial data exclusion, provider fallback, and audit logging.
- `tests/test_auth_security.py` — Supabase JWT verification, role capabilities, campus boundary isolation.
- `tests/test_ingestion.py` — Multi-domain observation ingestion, anti-leakage validation.
- `tests/test_policy_engine.py` — Deterministic triage evaluation, rule triggers, signal generation.
- `tests/test_workflow_e2e.py` — Full observation-to-case lifecycle, follow-ups, and proof of outcome.
- `tests/test_ml_integration.py` — Day-30 25-feature schema validation, Evidence Card generation, ML audit logs.
- `tests/test_reliability_security.py` — Idempotency replay, outbox worker exponential backoff, dead letter queue, deadline escalations.
- `tests/test_features_schema.py` — 25-feature input validation and finite number checks.

---

## 🦀 Phase 7: Standalone Rust CLI & PWA Capabilities

SUTRA provides an authorized Rust command-line interface (`sutra-cli`) and standalone PWA capabilities:

- **Strict Gateway Conformance:** The Rust CLI communicates solely through authenticated `/api/v1` routes with `Bearer <JWT>` and `X-Campus-Id` headers. It does not possess direct database connections or bypass business rules.
- **Commands:**
  - `sutra health` — Validates FastAPI server liveness and database/ML readiness.
  - `sutra catalogue` — Lists active, campus-controlled intervention catalog options.
  - `sutra signals list` / `sutra signals review` — Inspects triage queue and records authorized reviews.
  - `sutra cases list` / `sutra cases get` / `sutra cases transition` — Coordinates the 10-state case lifecycle.
  - `sutra ai status` / `sutra ai review-brief <SIGNAL_ID>` — Queries bounded AI review briefs.
- **PWA Capabilities:** Standalone `manifest.json` and static-asset-only Service Worker (`frontend/public/sw.js`) strictly omitting offline caching of student data, cases, or tokens (ADR-003/ADR-004).

---

## 🏁 Phase 8: Final Integration, Evaluation & Demo Readiness

SUTRA is validated end-to-end for live demonstration:

- **Traceable Workflow:** Observations → Signals and Evidence → Human Review → Intervention → Assignment and Deadline → Follow-up or Escalation → Outcome → Cohort-Level Insights.
- **Empirical Latency:** All critical endpoints respond within sub-25ms times locally (Health: ~1ms, Readiness: ~5ms, Signals: ~4ms, Cases: ~8ms, AI Mock: ~6ms).
- **Automated Verification:** 77/77 Pytest tests passing, 7/7 Rust CLI integration tests passing, 6/6 frontend contract tests passing.
- **Full Demo Runbook:** See [`docs/docs/11_DEPLOYMENT_RUNBOOK.md`](docs/docs/11_DEPLOYMENT_RUNBOOK.md) for step-by-step walkthrough script and fallback actions.

---

## 🤖 Phase 6: Bounded AI Orchestration

SUTRA includes an advisory, bounded AI orchestration layer behind the verified FastAPI backend (`/api/v1/ai/*`):

- **Principle:** AI is strictly advisory and cannot mutate cases, execute interventions, or diagnose students. Consequential decisions require authorized human review (*"No Alert Without Action"*).
- **Prompt Fencing & Injection Defense:** Untrusted student telemetry is enclosed in `<untrusted_student_evidence>` delimiters with delimiter stripping (`sanitize_untrusted_text`) to neutralize prompt injection attacks.
- **Data Minimization (ADR-003):** Sensitive student financial records and direct PII are excluded from model inputs prior to prompt construction.
- **Institutional Governance (ADR-004):** Leadership accounts are restricted from individual student review briefs and 360° views.
- **Intervention Confinement:** Model suggestions are strictly validated against the campus-controlled `intervention_catalog`; unknown or invented keys are dropped.
- **Deterministic Mock Fallback:** Provider timeouts and network errors automatically fall back to an offline deterministic mock provider without interrupting educator workflows.
- **Persistent Audit Logging:** Every AI request is logged to the database table `ai_orchestration_logs` with timestamps, model name, provider, latency, and requesting educator reference.
- **Frontend Integration:** Assistive buttons (*"Prepare Review Brief"*, *"Generate Evidence Summary"*) in `SignalReviewModal` and Student Profile allow 1-click adoption of catalog suggestions without altering the core visual identity.

---

## 📚 Documentation & Specifications

Detailed documentation is organized under [`docs/`](docs/):

| Document | Description |
|:---|:---|
| [Master Backend Implementation Pack](docs/MASTER_BACKEND_IMPLEMENTATION_PACK.md) | Complete unified specification and architecture guide |
| [Architecture Decision Records (ADRs)](docs/decisions/) | ADR-001 (Modular Monolith) to ADR-006 (AI Safeguards) |
| [API Specification](docs/docs/08_API_CONTRACT.md) / [OpenAPI Spec](docs/openapi/openapi.yaml) | Canonical REST contract, DTOs, and error envelopes |
| [Data Model](docs/docs/03_DATA_MODEL.md) | PostgreSQL / SQLAlchemy entity-relationship diagrams |
| [Authorization & Privacy](docs/docs/04_AUTHORIZATION_PRIVACY.md) | Multi-campus RBAC matrix & sensitive task encryption |
| [Case Lifecycle & Worker](docs/docs/07_CASE_LIFECYCLE_AND_WORKER.md) | 10-state case machine, transactional outbox & worker |
| [Implementation Backlog](docs/docs/13_BACKEND_BACKLOG.md) | Phase-by-phase implementation tracking (Phases 0–8) |

---

## 🔒 Security & Data Privacy

- **Multi-Tenant Campus Isolation:** Enforced via `X-Campus-Id` header and validated against user institutional memberships on every database query.
- **Role-Based Access Control:** Strict role segregation (`faculty`, `counselor`, `dean`, `leadership`, `superadmin`).
- **Sensitive Domain Safeguards:** Mental health and disability accommodation records are field-level encrypted using AES-GCM and hidden from unauthorized roles.
- **Stateless ML Scoring:** Machine learning inference is stateless and produces auditable Evidence Cards with full governance traceability.

---

## 🛡️ Multi-Agent Orchestration & Support Evidence Ledger (Phases 0–4)

**Positioning:** *From Student Signals to Verified Support.*  

SUTRA bridges the critical gap between early academic risk identification and governed, evidence-based human intervention. Rather than treating risk scores as isolated black boxes, SUTRA grounds every student signal in a verifiable **Support Evidence Ledger** that links observable telemetry, deterministic model attribution, multi-agent qualitative analysis, adversarial verification, mandatory human review, and recorded follow-up outcomes.

### Architecture & Implementation Roadmap

Full system architecture, safety contracts, and phase roadmap are detailed in [Phase 0.1 Architecture Specification](docs/architecture/phase_0_audit_and_multi_agent_strategy.md):
- **Phase 0.1:** Repository Audit, Architecture Corrections & Evidentiary Governance (Complete)
- **Phase 1:** Orchestration Foundation, Contracts, Provider Interface & Baseline Safety Controls (Complete)
- **Phase 2:** Student Signal Interpreter & Intervention Strategist (Complete)
- **Phase 3:** Support Plan Designer & Evidence Challenge Agent (Complete)
- **Phase 4:** Human Review, Support Evidence Ledger, SQLite WAL Persistence & Advisor Review Interface (Complete)
- **Phase 5:** Stakeholder Communication Agent & Follow-up Note-Structuring Agent (Event-Triggered) (Planned - Next)
- **Phase 6:** Cohort Learning Analyst, Evaluation & Presentation Hardening (Planned)

### Running the Phase 4 Advisor Review Interface

#### 1. Launch the Local Service
```bash
PYTHONPATH=ml/src:. uv run --python 3.11 --with fastapi,uvicorn,scikit-learn==1.7.2,pandas,pyyaml,joblib,httpx,xgboost,pydantic uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### 2. Access the Advisor Review Interface
Open your browser to:
[http://127.0.0.1:8000/app/](http://127.0.0.1:8000/app/)

#### 3. Demonstration Workflow
1. **Screen A (Review Queue):** Click **"Seed Demo Case"** to ingest synthetic profile `LOW_ENGAGEMENT_AT_RISK` (`SYNTH-SCENARIO-LOW-02`). The service runs authentic ML inference, executes the four-agent triage pipeline, and registers the case in `DRAFT_AWAITING_REVIEW`.
2. **Screen B (Case Review & Evidence):** Inspect the authoritative ML Evidence Card ($P = 0.9287$, Risk Tier `HIGH`), Agent 1 qualitative interpretation with claim-level feature citations, Agent 2 catalog intervention selection, Agent 3 draft support plan, and Agent 4 advisory challenge findings. Verify the green deterministic validation pass badge distinct from advisory flags.
3. **Screen C (Advisor Decision):** Submit a human review decision (**Approve**, **Modify Plan**, **Reject**, or **Request Info**). If modifying, customize the action steps while enforcing catalog role constraints; the original draft plan is preserved as v1 and a new decision-linked v2 is created.
4. **Screen D (Support Evidence Ledger & Timeline):**
   - **Task Execution:** View created actionable tasks. Update task status to `COMPLETED` with an execution note. Observe that task execution **strictly preserves** student outcome as `UNOBSERVED`.
   - **Follow-up Record:** Record qualitative follow-up observations and evidence references.
   - **Distinct Student Outcome:** Record final student course achievement (`RECORDED`, `IN_PROGRESS`, or `UNOBSERVED`) independently from task completion.
   - **Audit Integrity:** Click **"Audit Integrity"** to verify the cryptographic SHA-256 backward hash pointer chain across all ledger events.

### Running Orchestration & Persistence Tests

```bash
# Backend, Orchestration & Phase 4 Persistence / API Suite (121 tests)
PYTHONPATH=ml/src:. uv run --python 3.11 --with pytest,fastapi,scikit-learn==1.7.2,pandas,pyyaml,joblib,httpx,xgboost,pydantic pytest backend/tests

# ML Regression Suite (107 tests passing; 1 known pre-existing missing gitignored artifact failure tracked separately)
PYTHONPATH=ml/src:. uv run --python 3.11 --with pytest,fastapi,scikit-learn==1.7.2,pandas,pyyaml,joblib,httpx,xgboost,pydantic pytest ml/tests
```
