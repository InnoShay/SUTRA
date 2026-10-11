# 13 · Backend Implementation Backlog (Phases 0–8)

Use these trackable issues for sprint planning. Each task requires working code, verified tests, and updated documentation before sign-off.

---

## Phase 0 — Repository Audit & Contract Freeze
- [x] **B0.1** Inspect working tree, branch status, and existing documentation pack.
- [x] **B0.2** Audit `ml/` repository: verify Day-30 feature extraction and anti-leakage test status.
- [x] **B0.3** Reconcile architecture decisions: Python FastAPI modular monolith, Next.js frontend, Supabase persistence.
- [x] **B0.4** Lock canonical API catalog under `/api/v1` and generate complete OpenAPI 3.1.0 specification.
- [x] **B0.5** Record ground truth inventory and resolve teammate/handoff discrepancies.

**Exit Gate 0:** Documentation fully reconciled; zero contradictory contracts; approved architecture decision records committed.

---

## Phase 1 — Backend Foundations
- [ ] **B1.1** Initialize FastAPI application scaffolding, `core/config.py` with Pydantic v2 Settings.
- [ ] **B1.2** Setup asynchronous SQLAlchemy 2.x engine (`asyncpg`) and sync engine for Alembic (`psycopg2`).
- [ ] **B1.3** Implement Alembic migration suite: `001_core_schema.py` creating all 18 core database tables.
- [ ] **B1.4** Implement Supabase JWT verification dependency (`get_current_user`) using `SUPABASE_JWT_SECRET`.
- [ ] **B1.5** Implement campus context and membership resolution dependency (`get_campus_membership`).
- [ ] **B1.6** Implement liveness (`/health`) and readiness (`/ready`) endpoints verifying database connectivity.
- [ ] **B1.7** Author Pytest suite for authentication and campus-level isolation.

**Exit Gate 1:** Server-side JWT validation enforced; unauthenticated/cross-campus requests denied; database migrations apply cleanly.

---

## Phase 2 — Core PS6 Workflow
- [ ] **B2.1** Build ingestion pipeline (`POST /api/v1/imports`) for all 6 observation domains with deduplication.
- [ ] **B2.2** Enforce temporal integrity invariants (`available_at <= as_of_at`) in observation queries.
- [ ] **B2.3** Implement pure deterministic policy evaluator in Python (`app.modules.policy`).
- [ ] **B2.4** Build frozen `evidence_packets` and `signals` creation service.
- [ ] **B2.5** Implement signal review queue (`GET /api/v1/signals`, `POST /api/v1/signals/{id}/review`).
- [ ] **B2.6** Implement controlled `intervention_catalog` menu and case creation (`POST /api/v1/signals/{id}/cases`).
- [ ] **B2.7** Implement 10-state case machine transitions and assignment with explicit acceptance.
- [ ] **B2.8** Build follow-up proof logging and outcome recording (`helped`, `not_helped`, `mixed`, `unknown`).
- [ ] **B2.9** Implement append-only `case_events` audit logging for every mutation.

**Exit Gate 2:** Complete end-to-end support journey executable via REST API; invalid state transitions rejected; sensitive finance/counselling records segregated.

---

## Phase 3 — ML Integration & Serving
- [ ] **B3.1** Create co-located internal ML module (`app.ml`) invoking `sutra_ml` in-process.
- [ ] **B3.2** Define Pydantic v2 schemas for single (`/api/v1/ml/predict`) and batch inference (`/api/v1/ml/predict/batch`).
- [ ] **B3.3** Execute Phase Three ML model training to serialize baseline Logistic Regression v1.0.0 artifact.
- [ ] **B3.4** Integrate baseline model loader at decision threshold `0.46` for Day-30 academic early-warning cutoff.
- [ ] **B3.5** Build standardized Evidence Card generator attaching probability, threshold, and top SHAP attributions.
- [ ] **B3.6** Wire root-level compatibility route aliases (`/model-info`, `/predict`, `/predict/batch`, `/ready`).
- [ ] **B3.7** Implement ML inference audit logging into `ml_inference_logs`.

**Exit Gate 3:** ML predictions produce Evidence Cards; missing data handled as `unknown` (never zero); inference tests pass without temporal leakage.

---

## Phase 4 — Reliability & Security
- [ ] **B4.1** Implement FastAPI request idempotency middleware enforcing `Idempotency-Key` headers.
- [ ] **B4.2** Build PostgreSQL transactional outbox insertion within state mutation transactions.
- [ ] **B4.3** Implement durable background worker polling pending outbox messages and scanning overdue deadlines.
- [ ] **B4.4** Implement bounded exponential retry backoff (max 5 attempts) and dead-letter queue.
- [ ] **B4.5** Implement small-cell privacy suppression (<5 students) in analytics query handlers.
- [ ] **B4.6** Implement controlled demo clock provider (`SUTRA_DEMO_MODE=true`).
- [ ] **B4.7** Author and execute 10 must-pass security negative tests (role RBAC, cross-campus isolation, domain protection).

**Exit Gate 4:** Idempotent retries produce zero duplicate mutations; worker recovers safely on restart; negative authorization suite passes 100%.

---

## Phase 5 — Frontend Integration
- [ ] **B5.1** Scaffold Next.js (App Router) client with TypeScript, React, and Tailwind CSS.
- [ ] **B5.2** Build typed API client layer connecting to FastAPI `/api/v1` routes.
- [ ] **B5.3** Implement Supabase Auth login flow and campus context selector.
- [ ] **B5.4** Build Educator Signal Review Queue UI displaying deterministic triggers and ML Evidence Cards.
- [ ] **B5.5** Build Case Detail & Coordination View with state transitions, assignment, and task management.
- [ ] **B5.6** Build Follow-Up & Outcome Modal with proof kind selection and unknown outcome handling.
- [ ] **B5.7** Build Executive Leadership Dashboard with denominator-defined cohort metrics and suppression indicators.

**Exit Gate 5:** Full end-to-end workflow accessible via responsive web UI; client respects role permissions; zero sensitive data leaked in client state.

---

## Phase 6 — Optional AI Orchestration
- [ ] **B6.1** Define typed Pydantic v2 schemas for evidence summary, intervention suggestion, and outreach note drafting.
- [ ] **B6.2** Implement context minimization filter stripping student PII, finance, and counselling details from LLM prompts.
- [ ] **B6.3** Implement `POST /api/v1/ai/summarize-evidence` with provider timeout, retries, and deterministic fallback.
- [ ] **B6.4** Implement `POST /api/v1/ai/suggest-intervention` restricted strictly to `intervention_catalog` keys.
- [ ] **B6.5** Implement `POST /api/v1/ai/draft-followup` creating draft notes requiring mentor approval.
- [ ] **B6.6** Implement `ai_execution_logs` capturing execution tokens, latency, and human approval status.

**Exit Gate 6:** AI operations are strictly read-only and require human review; zero direct database mutations; graceful fallback on provider failure.

---

## Phase 7 — Rust CLI & PWA Enhancements
- [ ] **B7.1** Scaffold standalone Rust CLI using `reqwest` and `clap`.
- [ ] **B7.2** Implement authenticated CLI login and token storage.
- [ ] **B7.3** Implement CLI commands for health check, batch observation import, and case queue inspection via `/api/v1`.
- [ ] **B7.4** Verify CLI respects identical server-side authorization and produces identical audit logs (zero direct DB access).
- [ ] **B7.5** Configure PWA web manifest and service worker for Next.js (strictly omitting sensitive data caching).

**Exit Gate 7:** CLI operates reliably over HTTPS; zero direct database connection; PWA operates safely without caching student records.

---

## Phase 8 — Evaluation & Demonstration
- [ ] **B8.1** Author automated end-to-end test script executing complete student journey from import to closed outcome.
- [ ] **B8.2** Build reproducible synthetic seed script (`scripts/seed_demo_data.py`).
- [ ] **B8.3** Verify Developer Runbook (`docs/11_DEPLOYMENT_RUNBOOK.md`) on clean environment.
- [ ] **B8.4** Document known limitations, dataset assumptions, and organizer questions.
- [ ] **B8.5** Rehearse hackathon live demonstration sequence.

**Exit Gate 8:** Fresh developer can clone, migrate, seed, and demonstrate complete SUTRA workflow in under 10 minutes without manual database tampering.
