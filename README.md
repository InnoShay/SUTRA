# SUTRA — Student Success and Intervention Orchestration Engine

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0%2B-red.svg)](https://www.sqlalchemy.org/)
[![Tests](https://img.shields.io/badge/Tests-74%2F74%20Passed-brightgreen.svg)]()

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
- `tests/test_ai_orchestration.py` — Bounded AI review briefs, catalog filtering, prompt injection defense, ADR-003 financial data exclusion, provider fallback, and audit logging.
- `tests/test_auth_security.py` — Supabase JWT verification, role capabilities, campus boundary isolation.
- `tests/test_ingestion.py` — Multi-domain observation ingestion, anti-leakage validation.
- `tests/test_policy_engine.py` — Deterministic triage evaluation, rule triggers, signal generation.
- `tests/test_workflow_e2e.py` — Full observation-to-case lifecycle, follow-ups, and proof of outcome.
- `tests/test_ml_integration.py` — Day-30 25-feature schema validation, Evidence Card generation, ML audit logs.
- `tests/test_reliability_security.py` — Idempotency replay, outbox worker exponential backoff, dead letter queue, deadline escalations.
- `tests/test_features_schema.py` — 25-feature input validation and finite number checks.

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
