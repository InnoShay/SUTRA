# SUTRA Backend Documentation Pack

**Team:** Overclocked · **Challenge:** CODEX 3.0 / PS6 · **Version:** 2.0 (Reconciled & Canonical) · **Basis date:** 12 October 2026

SUTRA (**Student Success and Intervention Orchestration Engine**) connects multi-source student risk observations to explainable evidence, human review, accountable ownership, enforceable deadlines, verified follow-ups, documented outcomes, and cohort-level operational analytics.

Core product principle:
> **“No Alert Without Action.”**

---

## 1. Canonical System Architecture & Technology Stack

The canonical implementation architecture reconciles all backend, frontend, ML, and tooling components into an integrated, production-grade system:

- **Main Backend:** Python 3.10+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, Pytest.
- **Data & Auth Tier:** PostgreSQL managed through Supabase; Supabase Auth with server-side JWT verification, role-capability resolution, and campus boundary enforcement on every protected request.
- **Frontend Client:** Next.js (App Router), React, TypeScript, Tailwind CSS. Decoupled responsive web application first; progressive web app (PWA) enhancements added once core workflows stabilize.
- **Machine Learning Subsystem:** Co-located in the FastAPI application via an isolated internal module (`app.ml`) invoking the existing Python package `sutra_ml`.
  - Serving baseline specification: Regularized Logistic Regression v1.0.0 at decision threshold `0.46` (Day-30 academic early-warning cutoff).
  - Research candidate: Constrained XGBoost classifier (strictly research-only pending formal promotion review).
  - *Repo Ground Truth:* Feature extraction (25 features) and anti-leakage pipelines are verified in `ml/`; model training and serialization are scheduled in Phase 3.
- **Asynchronous Execution & Reliability:** Database-backed transactional outbox pattern and durable deadline worker; zero dependency on external message brokers (Redis/RabbitMQ) for MVP.
- **Future Tooling:** Standalone Rust CLI communicating exclusively over authenticated HTTPS `/api/v1` routes; zero direct database or RLS bypass.
- **AI Boundaries:** Bounded, optional, and strictly auditable LLM orchestration for evidence synthesis and draft notes—zero autonomous database mutations or unreviewed outreach.

---

## 2. Start Here

1. **Phase Sequence:** Read [`docs/00_PHASE_PLAN.md`](docs/00_PHASE_PLAN.md) for dependency gates from Phase 0 to Phase 8.
2. **Scope & Traceability:** Review [`docs/01_SCOPE_AND_REQUIREMENTS.md`](docs/01_SCOPE_AND_REQUIREMENTS.md) mapping PS6 R1–R17.
3. **Architecture & Boundaries:** Inspect [`docs/02_ARCHITECTURE.md`](docs/02_ARCHITECTURE.md) and Architecture Decision Records in [`decisions/`](decisions/).
4. **Data Model & Schema:** Inspect [`docs/03_DATA_MODEL.md`](docs/03_DATA_MODEL.md) and [`migrations/001_core_schema.sql`](migrations/001_core_schema.sql).
5. **Authorization Matrix:** Enforce [`docs/04_AUTHORIZATION_PRIVACY.md`](docs/04_AUTHORIZATION_PRIVACY.md) before writing feature routes.
6. **API Specifications:** Read [`docs/08_API_CONTRACT.md`](docs/08_API_CONTRACT.md) and inspect [`openapi/openapi.yaml`](openapi/openapi.yaml).
7. **Developer Runbook:** Follow [`docs/11_DEPLOYMENT_RUNBOOK.md`](docs/11_DEPLOYMENT_RUNBOOK.md) for local environment setup and testing.

---

## 3. Pack Directory Contents

- `docs/00_PHASE_PLAN.md` — 9-phase implementation plan (Phases 0–8), dependencies, and exit gates.
- `docs/01_SCOPE_AND_REQUIREMENTS.md` — PS6 requirement traceability, MVP boundaries, non-functional rules.
- `docs/02_ARCHITECTURE.md` — FastAPI modular monolith, ML module boundaries, Supabase Auth, Next.js client.
- `docs/03_DATA_MODEL.md` — Entity-relationship model, SQLAlchemy 2.x declarative schemas, Alembic migrations.
- `docs/04_AUTHORIZATION_PRIVACY.md` — Server-side JWT validation, role-based capabilities, sensitive domain isolation.
- `docs/05_INGESTION_TEMPORAL_INTEGRITY.md` — Ingestion schemas, 6 observation domains, temporal anti-leakage invariants.
- `docs/06_POLICY_AND_EVIDENCE.md` — Versioned deterministic policy engine, ML evidence card output, replayability.
- `docs/07_CASE_LIFECYCLE_AND_WORKER.md` — 10-state primary case machine, assignment, transactional outbox worker.
- `docs/08_API_CONTRACT.md` — Canonical FastAPI `/api/v1` endpoint catalog, DTO conventions, error envelope.
- `docs/09_OUTCOMES_AUDIT_ANALYTICS.md` — Outcome states, delivery proof, audit event structure, cohort metrics.
- `docs/10_TEST_AND_ACCEPTANCE_PLAN.md` — Test pyramid (Pytest, security negatives, leakage, E2E demo runbook).
- `docs/11_DEPLOYMENT_RUNBOOK.md` — FastAPI setup, Alembic migrations, seed loading, local demo execution.
- `docs/12_DECISIONS_AND_OPEN_QUESTIONS.md` — Architecture decisions (ADR-001 to ADR-006), verified vs handoff claims.
- `docs/13_BACKEND_BACKLOG.md` — Phase-by-phase implementation backlog items (Phases 0 to 8).
- `docs/architecture/indic_language_orchestration_and_sarvam_ai.md` — Canonical architecture for Sarvam AI Indic Neural Language Orchestration, multi-tiered caching, and React reconciliation defense.
- `openapi/openapi.yaml` — Canonical OpenAPI 3.1.0 contract including product, ML, and compatibility endpoints.
- `migrations/001_core_schema.sql` — PostgreSQL / Supabase structural migration starter.
- `fixtures/demo_seed.json` — Explicitly synthetic demo fixtures covering all 6 domains.
- `.env.example` — Configuration environment variables and placeholder definitions.
- `decisions/ADR-*.md` — Architecture Decision Records (ADR-001 through ADR-007).

---

## 4. Non-Negotiable Invariants

1. **No Alert Without Action:** Every generated risk signal must either result in an approved intervention case, reasoned dismissal, or explicit information request.
2. **Prediction is Not Diagnosis:** An ML probability or deterministic rule trigger is a decision-support indicator, never a clinical diagnosis, disciplinary ground, or certainty of failure.
3. **Stage Separation:** `contact_attempted`, `student_reached`, `support_delivered`, `follow_up_completed`, and `outcome_known` are strictly separated lifecycle milestones. Completing a task does not imply student improvement.
4. **Temporal Integrity:** Observations are evaluated strictly as-of decision time $T$ (`available_at <= T`). Future grades, later unregistrations, or post-cutoff activity must never leak into an earlier evaluation.
5. **No Imputed Zeroes:** Missing or stale data produces `unknown` or `insufficient_evidence`, never a silent zero or imputed non-engagement.
6. **Sensitive Domain Isolation:** Fee details and counselling records are stored in dedicated tables and served through purpose-limited endpoints; never leaked to general student profiles or logs.
7. **Reasoned Human Review:** All consequential student support actions require human-in-the-loop review and accountability.
8. **Auditability:** Every state mutation, owner reassignment, escalation, and override records actor ID, timestamp, reason code, and idempotency key.
9. **Non-Punitive Mandate:** SUTRA must never be configured to impose disciplinary sanctions or infer psychological conditions.
10. **Synthetic Validation:** Hackathon demonstrations and testing use synthetic data only; historical OULAD metrics or synthetic demo results must never be cited as real-world efficacy.

---

## 5. Status & Traceability

- **Documentation Status:** Reconciled Canonical Release 2.0.
- **Backend Code Status:** FastAPI backend scaffolding and migration in progress (Phase 1).
- **ML Subsystem Status:** Feature extraction and temporal anti-leakage verified (`ml/`, 26 tests passing); training pipeline and model binary scheduled in Phase 3.
- **Frontend Status:** Decoupled Next.js App Router client scheduled for integration in Phase 5.

