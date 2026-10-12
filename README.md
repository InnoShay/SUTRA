# SUTRA — Student Success and Intervention Orchestration Engine

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0%2B-red.svg)](https://www.sqlalchemy.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14%20App%20Router-black.svg)](https://nextjs.org/)
[![Rust](https://img.shields.io/badge/Rust-CLI%201.75%2B-orange.svg)](https://www.rust-lang.org/)
[![Tests](https://img.shields.io/badge/Tests-96%2F96%20Backend%20%7C%206%2F6%20Frontend%20%7C%2031%2F31%20CLI%20Passed-brightgreen.svg)]()

> **Core Product Principle:** *“No Alert Without Action.”*

**Team:** Overclocked  
**Hackathon:** CODEX 3.0  
**Problem Statement:** PS6 — Student Success and Intervention Orchestration Engine  

SUTRA connects multi-source student risk observations to explainable evidence, human review, accountable ownership, enforceable deadlines, verified follow-ups, documented outcomes, and cohort-level operational analytics.

---

## 🏛️ System Architecture

SUTRA is architected as a modular monolith optimized for clear separation of concerns, institutional data privacy, and deterministic reliability:

```
               ┌────────────────────────────────────────────────────────┐
               │              Web Client (Next.js 14 PWA)               │
               │   - Apple-inspired design preserved                   │
               │   - Standalone manifest & static-only Service Worker   │
               │   - ZERO offline caching of student data / JWTs        │
               └───────────────────────────┬────────────────────────────┘
                                           │ HTTPS (Bearer JWT + X-Campus-Id)
                                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     FastAPI Monolith Gateway (/api/v1)                │
│  - Supabase JWT validation & Multi-Campus Tenant Boundary Middleware   │
│  - Request Idempotency Middleware (Idempotency-Key)                   │
├──────────────────────────┬────────────────────────────┬───────────────┤
│    Core PS6 Engine       │    Decision Support ML     │ Bounded AI    │
│  - 6 Observation Domains │  - Logistic Regression v1  │  Orchestration│
│  - Deterministic Policy  │  - Platt Calibrated (0.46) │  - Advisory   │
│  - 10-State Case Machine │  - 25-Feature Day-30 Vector│  - Fenced     │
│  - Follow-up Proof Logs  │  - Explainable Evidence    │  - Catalog-   │
│  - Outbox Worker & Due   │    Card attributions       │    Confined   │
│    Date Escalations      │  - Never auto-intervenes   │  - Mock       │
│  - Closed Outcome Proof  │                            │    Fallback   │
└──────────────────────────┴────────────────────────────┴───────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           Database & Persistence Layer                 │
               │  - PostgreSQL 15+ / SQLite3 (Alembic Migrations)       │
               │  - Transactional Outbox (NotificationOutbox)           │
               │  - Immutable Audit History (CaseEvent, AIOrchLog)      │
               └────────────────────────────────────────────────────────┘
                                           ▲
                                           │ HTTPS (/api/v1)
               ┌───────────────────────────┴────────────────────────────┐
               │                   Rust Standalone CLI                  │
               │     `sutra-cli` (health, signals, cases, cat, ai)      │
               │   - Communicates solely via authenticated /api/v1      │
               └────────────────────────────────────────────────────────┘
```

### Core Architectural Pillars
1. **Policy-First Deterministic Triage:** High-confidence rule triggers (academic, attendance, engagement) generate verifiable signals with cryptographic evidence digests without black-box decisions.
2. **Explainable ML Decision Support:** Regularized Logistic Regression model calibrated on Day-30 features synthesizes human-auditable Evidence Cards with top risk attributions. Models never auto-trigger interventions.
3. **10-State Case Lifecycle:** Transition-controlled state machine ensuring every alert advances through human review, assignment, acceptance, intervention, follow-up, and closure.
4. **Reliability & Idempotency:** PostgreSQL transactional outbox pattern, duplicate signal deduplication constraints, exponential backoff, dead-letter queuing, and automated deadline escalations.
5. **Zero-Trust Institutional Security:** Multi-campus isolation, role-based capability resolution, ADR-003 financial data segregation, and ADR-004 executive queue privacy protection.

---

## 📊 Phase Implementation Scorecard (Phases 0–8)

All 9 canonical phases are implemented, automated, and verified:

| Phase | Description | Deliverables | Verification Status |
|:---|:---|:---|:---:|
| **Phase 0** | **Contract Freeze & Repository Audit** | Modular monolith design, canonical OpenAPI 3.1 spec, ADRs 001–006 | **100% COMPLETE** |
| **Phase 1** | **Backend Foundations** | FastAPI gateway, Supabase JWT verification, multi-campus scoping, `/health` & `/ready` probes | **100% COMPLETE** |
| **Phase 2** | **Core PS6 Workflow** | 6-domain ingestion, deterministic policy engine, 10-state case machine, audit trails | **100% COMPLETE** |
| **Phase 3** | **ML Serving & Evidence Cards** | Day-30 25-feature vector, calibrated logreg (0.46), leakage defense, Evidence Cards | **100% COMPLETE** |
| **Phase 4** | **Reliability & Security** | Request idempotency, transactional outbox worker, deadline escalation, negative RBAC suite | **100% COMPLETE** |
| **Phase 5** | **Frontend Integration** | Next.js 14 App Router, Apple-inspired UI, "No Alert Without Action" triage queue, 360° student view | **100% COMPLETE** |
| **Phase 6** | **Bounded AI Orchestration** | Advisory review briefs, prompt fencing (`<untrusted_student_evidence>`), catalog confinement, audit logs | **100% COMPLETE** |
| **Phase 7** | **Rust CLI & PWA Enhancements** | Standalone `sutra-cli` binary, manifest, static-only Service Worker (zero sensitive data cached) | **100% COMPLETE** |
| **Phase 8** | **Integration, Evaluation & Demo** | E2E traceable workflow tests, negative safety boundaries, latency benchmarks, live demo script | **100% COMPLETE** |
| **Supabase** | **PostgreSQL & Auth Integration** | Connection pooling (PgBouncer statement cache 0), server JWT validation, RLS lockdown, 9/9 verification tests | **100% COMPLETE** |

---

## 📂 Repository Directory Layout

```text
.
├── app/                        # Production FastAPI Backend Application
│   ├── ai/                     # Bounded AI orchestration service, providers & validators
│   ├── api/                    # API routes & endpoint controllers
│   │   └── v1/                 # Canonical /api/v1 routes (health, auth, imports, signals, cases, ai)
│   ├── core/                   # Security, JWT auth, database engine, logging, settings
│   ├── ml/                     # Internal ML service boundary, loader & feature extractor
│   ├── models/                 # SQLAlchemy 2.x declarative models
│   ├── schemas/                # Pydantic v2 validation contracts & DTOs
│   ├── services/               # Domain services: policy engine, case machine, outbox worker
│   └── main.py                 # FastAPI application factory and route registration
│
├── cli/                        # Standalone Rust Command-Line Interface (sutra-cli)
│   ├── src/                    # Rust source: main, config, client, models, commands
│   ├── tests/                  # Integration tests for serialization and API contracts
│   └── Cargo.toml              # Cargo configuration (clap, tokio, reqwest, serde)
│
├── frontend/                   # Decoupled Next.js 14 Web Application
│   ├── app/                    # App Router pages (dashboard, students, analytics, login)
│   ├── components/             # Apple-inspired UI components, Modals, AppShell, PwaRegistrar
│   ├── public/                 # Static assets, manifest.json, sw.js (static cache only)
│   └── scripts/                # Automated contract verification test suite (test-contract.mjs)
│
├── ml/                         # Machine Learning Subsystem (sutra_ml)
│   ├── artifacts/models/v1.0.0/# Calibrated baseline Logistic Regression model artifact
│   ├── src/sutra_ml/           # Training pipeline, calibration, preprocessing & evaluation
│   └── tests/                  # Anti-leakage and feature schema validation tests
│
├── docs/                       # Canonical Documentation Hub
│   ├── README.md               # Documentation guide & index
│   ├── MASTER_BACKEND_IMPLEMENTATION_PACK.md # Complete single-document implementation pack
│   ├── decisions/              # Architecture Decision Records (ADR-001 through ADR-006)
│   ├── docs/                   # 14 Specification chapters (Phases 0–8, data model, APIs)
│   ├── fixtures/               # Synthetic demonstration dataset (demo_seed.json)
│   └── openapi/                # Canonical OpenAPI 3.1.0 specification
│
├── alembic/                    # Database Migrations (revisions 0001, 0002, 0003)
├── scripts/                    # seed_demo_data.py fixture loader
├── tests/                      # Comprehensive Test Suite (77 passing tests)
├── .env.example                # Canonical environment variable configuration template
├── alembic.ini                 # Alembic configuration
├── pytest.ini                  # Pytest configuration
└── requirements.txt            # Python dependencies
```

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python:** 3.10+ (Python 3.11 tested and recommended)
- **Node.js:** 18.x or 20.x LTS
- **Rust Toolchain:** 1.75+ / 1.99+ (for `sutra-cli`)
- **Database:** PostgreSQL 15+ (production / staging) or SQLite (local testing & demo)

### 2. Configure Python Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e ml/
```

### 3. Configure Environment Variables
```bash
cp docs/.env.example .env
```
*Defaults in `.env.example` run immediately against local SQLite / PostgreSQL development instances.*

### 4. Run Database Migrations
```bash
alembic upgrade head
```

### 5. Seed Synthetic Demonstration Data
```bash
python scripts/seed_demo_data.py --fixture docs/fixtures/demo_seed.json
```
*Populates demonstration campus, 5 role personas, active policy version, 6 synthetic students (`SYN-1007` to `SYN-1012`), initial policy signals, and demonstration case.*

### 6. Start FastAPI Backend Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation will be available at:
- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Document Integrity & Base Sepolia Registry

The document integrity workflow accepts any non-empty file up to 25 MB. It stores the exact uploaded bytes, calculates SHA-256 over those bytes, and lets a connected MetaMask wallet submit the fingerprint to the Base Sepolia registry. The backend confirms the transaction receipt and independently reads the contract before marking a record on-chain. It never creates simulated anchors.

Uploaded file bytes stay in the configured `DOCUMENTS_STORAGE_DIR`; only a SHA-256 digest and a hash of the opaque document reference are written on-chain. Files can be downloaded byte-for-byte and checked against the registry by uploading the candidate file. A document must be finalized before it can be anchored. Each document reference can be anchored once; identical repeated contract calls are idempotent, while a different digest reverts.

### Registry deployment record

The contract address, deployment transaction, block, deployer, gas used, and verification time below are maintained after a confirmed deployment. The current checkout has no deployment signer configured, so no deployment address is claimed here yet.

<!-- BASE_SEPOLIA_REGISTRY_START -->

**Status: Deployed and verified on Base Sepolia (Chain ID 84532).**

- Contract: [`0x0e1ef70c8473E33111112Ffc91a05376A773e5B6`](https://sepolia.basescan.org/address/0x0e1ef70c8473E33111112Ffc91a05376A773e5B6)
- Deployment transaction: [`0x22e88fd0054d5dd5e922660398c7baa3cd7215d60b71741674801249e29c5c99`](https://sepolia.basescan.org/tx/0x22e88fd0054d5dd5e922660398c7baa3cd7215d60b71741674801249e29c5c99)
- Deployment block: `48036553`
- Deployer wallet: `0x1d09dbbb685f355a67dae742111e88849446b1e7`
- Gas used: `253152`
- Network: `Base Sepolia (Chain ID 84532)`
- Verified at: `2026-10-13 04:14 UTC`
- Contract source: [`contracts/SutraDocumentRegistry.sol`](contracts/SutraDocumentRegistry.sol)

<!-- BASE_SEPOLIA_REGISTRY_END -->

After deployment, record the confirmed address and deployment receipt details in this section, set `BASE_SEPOLIA_CONTRACT_ADDRESS` in the backend `.env`, restart the backend, and connect MetaMask to Base Sepolia in the Document Integrity page. The page only reports the registry as ready after it confirms the configured address contains contract code on chain 84532. Wallet confirmation is required for deployment and each anchor transaction; Base Sepolia ETH pays the network gas fee.

## SUTRA Identity NFT

Each profile receives a private 256-bit artwork seed. SUTRA uses it to render a deterministic PNG abstract painting that is independent of the selected profile avatar. The public ERC-721 metadata contains only the pseudonymous SUTRA ID, art traits, and a content hash; it does not include a profile name, avatar, or academic record. The token is soulbound and reports the ERC-5192 `locked` interface.

Minting is live-only: no preview token is marked minted. Before the profile card enables **Connect wallet & mint**, configure the deployed `BASE_SEPOLIA_NFT_CONTRACT_ADDRESS`, a funded backend owner/relayer key, `ANCHOR_MODE=onchain`, and a server-only `PINATA_JWT`. The backend pins the raster PNG and metadata to IPFS first, then submits the mint and records success only after Base Sepolia confirms the transaction. The student wallet is the NFT recipient; the relayer pays gas. Keep the relayer key outside source control and do not paste it into chat or README files.

The identity NFT contract has **not been deployed from this checkout**. Its address and deployment transaction must be added here only after an actual Base Sepolia confirmation. Profile creation still succeeds without wallet or chain configuration; in that case the identity remains unminted and the UI says so. To complete the live flow after deployment, run migration `0009_identity_art_seed`, configure the server environment, restart the backend, and mint from the identity card.

Upload and anchor flow:

1. Upload any file (up to 25 MB) and review its exact-byte SHA-256 fingerprint.
2. Finalize the record to freeze its file version.
3. Choose **Anchor**, approve the transaction in MetaMask, and wait for BaseScan confirmation.
4. Verify a candidate file. The API compares its hash with the registry contract state, not only the database copy.

Compile and validate the contract locally:

```bash
cd contracts
npm run compile
node test_identity_nft.js
```

`python scripts/deploy_base_sepolia.py` is an optional server-side alternative that uses a deployer key only when it is configured in `.env`; it checks the RPC chain, wallet balance, receipt, and deployed bytecode before writing the public address and deployment proof into this README. The wallet flow in Brave does not require a backend private key to deploy or anchor documents.
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Liveness Probe:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Readiness Probe:** [http://localhost:8000/api/v1/ready](http://localhost:8000/api/v1/ready)

### 7. Run the Frontend (Next.js 14)
```bash
cd frontend
npm install
npm test       # Validates TypeScript types and contract schemas
npm run dev    # Starts UI on http://localhost:3000
```

### 8. Build and Run the Standalone Rust CLI
```bash
cd cli
cargo test
cargo build --release
cd ..

# Verify health via CLI
./cli/target/release/sutra health
```

---

## 🧪 Comprehensive Automated Test Suites

### Backend Pytest Suite (86 / 86 Tests Passing)
```bash
pytest tests -v
```
- `tests/test_supabase_integration_readiness.py` — Supabase pooler compatibility (`statement_cache_size=0`, `pool_pre_ping`), server-side JWT verification, forged role rejection, multi-campus isolation, and full end-to-end persistence workflow.
- `tests/test_phase8_acceptance.py` — Complete 10-stage traceable workflow (observation to closed outcome), negative boundary matrix, and API response time benchmarks.
- `tests/test_ai_orchestration.py` — Bounded AI review briefs, catalog filtering, prompt injection defense, ADR-003 financial data exclusion, provider fallback, and audit logging.
- `tests/test_auth_security.py` — Supabase JWT verification, role capabilities, campus boundary isolation.
- `tests/test_ingestion.py` — Multi-domain observation ingestion, anti-leakage validation.
- `tests/test_policy_engine.py` — Deterministic triage evaluation, rule triggers, signal generation.
- `tests/test_workflow_e2e.py` — Full observation-to-case lifecycle, follow-ups, and proof of outcome.
- `tests/test_ml_integration.py` — Day-30 25-feature schema validation, Evidence Card generation, ML audit logs.
- `tests/test_reliability_security.py` — Idempotency replay, outbox worker exponential backoff, dead letter queue, deadline escalations.
- `tests/test_features_schema.py` — 25-feature input validation and finite number checks.

### Rust CLI Test Suite (7 / 7 Tests Passing)
```bash
cd cli && cargo test
```
- Argument validation, DTO serialization/deserialization, and contract compliance.

### Frontend Integration & Contract Suite (6 / 6 Suites Passing)
```bash
cd frontend && npm test
```
- Validates user roles, ADR-004 privacy scopes, 10-state case transitions, "No Alert Without Action" review rules, and zero browser-exposed secrets.

---

## 🦀 Rust CLI (`sutra-cli`)

The standalone Rust CLI communicates exclusively with the backend via HTTPS `/api/v1`. Full documentation is available in [cli/README.md](cli/README.md).

```bash
# Automated Build & Test
./scripts/build_cli.sh

# Install into ~/.local/bin
./scripts/install_cli.sh

# General Syntax
sutra [OPTIONS] <COMMAND>

# Check service health & DB readiness
sutra health

# Authenticate & manage session
sutra auth login
sutra auth whoami

# Inspect signal triage queue
sutra signals list

# Query bounded AI review brief for a signal
sutra ai review-brief <SIGNAL_ID>

# List and coordinate active cases
sutra cases list

# Run Day-30 early-warning prediction
sutra predict --file cli/tests/fixtures/valid_sample.json
```

---

## 🤖 Bounded AI Orchestration

SUTRA includes an advisory AI orchestration layer behind `/api/v1/ai/*`:

- **Principle:** AI is strictly advisory and cannot mutate cases, execute interventions, or diagnose students. Consequential decisions require authorized human review (*"No Alert Without Action"*).
- **Prompt Fencing & Injection Defense:** Untrusted student telemetry is enclosed in `<untrusted_student_evidence>` delimiters with sanitization to neutralize prompt injection attacks.
- **Context Minimization (ADR-003):** Sensitive financial records and direct PII are excluded from model inputs.
- **Institutional Governance (ADR-004):** Leadership accounts are restricted from individual student review briefs.
- **Intervention Confinement:** Model suggestions are strictly validated against `intervention_catalog`; unknown keys are dropped.
- **Graceful Mock Fallback:** Provider timeouts automatically fall back to an offline deterministic mock provider without failing the request.
- **Persistent Audit Logging:** Every AI request is logged to `ai_orchestration_logs` with timestamps, model name, provider, latency, and actor reference.

---

## 🔒 Security & Data Privacy

- **Multi-Tenant Campus Isolation:** Enforced via `X-Campus-Id` header and validated against user institutional memberships on every query.
- **Role-Based Access Control:** Strict role segregation (`faculty`, `counselor`, `dean`, `leadership`, `superadmin`).
- **Sensitive Domain Safeguards:** Mental health and counselling tasks are segregated and encrypted; mentors and general faculty receive HTTP 403 on financial ledgers (ADR-003).
- **Executive Privacy Boundary:** Executive leadership is restricted to cohort-level aggregate insights and cannot browse identifiable triage queues (ADR-004).
- **Client Security Hygiene:** Zero service-role keys, private keys, or LLM API secrets exist in frontend client bundles.
- **Stateless ML Scoring:** Machine learning inference is stateless and produces auditable Evidence Cards with full governance traceability.

---

## ☁️ Supabase Integration & Production Readiness

SUTRA integrates with Supabase PostgreSQL and Supabase Auth with zero architectural compromises:

- **FastAPI as the Sole Product Gateway:** The browser never queries Supabase tables directly via PostgREST. All operations flow through FastAPI at `/api/v1/*` under strict tenant and capability verification.
- **Supabase PostgreSQL & Connection Pooling:**
  - Fully supports Supabase PgBouncer/Supavisor transaction poolers (port `6543`) with `DATABASE_STATEMENT_CACHE_SIZE=0` (`connect_args={"statement_cache_size": 0}`) and `DATABASE_POOL_PRE_PING=true`.
  - Supports direct/session pooler connections (port `5432`) for schema migrations via Alembic.
  - Connection pool configuration: `DATABASE_POOL_SIZE=10`, `DATABASE_MAX_OVERFLOW=10`, `DATABASE_POOL_RECYCLE=1800`.
- **Supabase Auth & Server-Side JWT Verification:**
  - FastAPI cryptographically validates Supabase-issued Bearer JWTs via `HS256`, checking signature, expiration (`exp`), audience (`aud: authenticated`), and optional issuer (`iss: supabase`).
  - Roles and campus scopes are **never** trusted from client JWT claims; they are resolved strictly server-side from PostgreSQL `InstitutionMembership`.
- **Defense-in-Depth Row Level Security (RLS):**
  - RLS enabled across all 16 core SUTRA tables via [`migrations/supabase_rls_lockdown.sql`](migrations/supabase_rls_lockdown.sql).
  - Explicitly revokes `ALL` permissions on schema `public` from `anon` and `authenticated` roles to block direct browser bypass.
- **Client Security Hygiene:**
  - Browser frontend strictly consumes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` via [`frontend/lib/supabase.ts`](frontend/lib/supabase.ts) for authentication only.
  - Zero service-role keys or database credentials exist in client bundles.
- **Automated Verification Suite:**
  - Verified by 9 dedicated tests in [`tests/test_supabase_integration_readiness.py`](tests/test_supabase_integration_readiness.py) covering connection pooling, schema integrity, rollback atomicity, JWT verification, forged claim rejection, cross-campus isolation, and full 8-step end-to-end persistence.

---

## 🛡️ Multi-Agent Orchestration & Support Evidence Ledger

**Positioning:** *From Student Signals to Verified Support.*  

SUTRA bridges the critical gap between early academic risk identification and governed, evidence-based human intervention. Rather than treating risk scores as isolated black boxes, SUTRA grounds every student signal in a verifiable **Support Evidence Ledger** that links observable telemetry, deterministic model attribution, multi-agent qualitative analysis, adversarial verification, mandatory human review, and recorded follow-up outcomes.

### Architecture & Evidentiary Governance
- **Signal Interpretation:** Claim-level feature citations grounded in observed student telemetry.
- **Intervention Strategist:** Catalog-constrained action recommendations matching institutional role permissions.
- **Support Plan Designer & Evidence Challenge:** Adversarial verification of draft support plans before human submission.
- **Cryptographic Audit Integrity:** SHA-256 backward hash pointer chains across all ledger events ensuring non-repudiation.

---

## ⚡ Measured Performance Baselines

Empirical benchmarks measured on local runtime:

| Endpoint | Target Latency | Measured Latency | Status |
|:---|:---|:---|:---:|
| `GET /api/v1/health` (Liveness) | < 50ms | **0.57ms – 1.75ms** | **PASSED** |
| `GET /api/v1/ready` (DB & ML Probe) | < 100ms | **3.84ms – 13.32ms** | **PASSED** |
| `GET /api/v1/interventions` (Catalog) | < 100ms | **3.30ms – 21.45ms** | **PASSED** |
| `GET /api/v1/signals` (Queue) | < 200ms | **2.50ms – 8.12ms** | **PASSED** |
| `GET /api/v1/cases` (Cases) | < 200ms | **1.88ms – 11.97ms** | **PASSED** |
| `POST /api/v1/ai/review-brief` (Advisory) | < 500ms | **6.51ms – 25.26ms** | **PASSED** |
| `POST /api/v1/imports` (Batch Ingest) | < 500ms | **7.85ms – 9.61ms** | **PASSED** |

---

## 📚 Canonical Documentation Index

All canonical documentation is maintained in [`docs/`](docs/):

| Document | Description |
|:---|:---|
| [Deployment Runbook & Demo Script](docs/docs/11_DEPLOYMENT_RUNBOOK.md) | Complete step-by-step live walkthrough script and fallback guide |
| [Canonical Phase Plan](docs/docs/00_PHASE_PLAN.md) | Official record for Phases 0 through 8 |
| [System Architecture](docs/docs/02_ARCHITECTURE.md) | Multi-tenant modular monolith architecture |
| [Data Model](docs/docs/03_DATA_MODEL.md) | Entity relationship diagrams and schemas |
| [Authorization & Privacy](docs/docs/04_AUTHORIZATION_PRIVACY.md) | Multi-campus RBAC matrix and ADR-003/ADR-004 privacy rules |
| [Case Lifecycle & Worker](docs/docs/07_CASE_LIFECYCLE_AND_WORKER.md) | 10-state case machine, transactional outbox & worker |
| [API Specification](docs/docs/08_API_CONTRACT.md) / [OpenAPI Spec](docs/openapi/openapi.yaml) | Canonical REST contract, DTOs, and error envelopes |
| [Architecture Decision Records (ADRs)](docs/decisions/) | ADR-001 (Modular Monolith) to ADR-006 (AI Safeguards) |
