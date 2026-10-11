# 12 · Architecture Decisions, Ground Truth & Open Questions

## 1. Formal Architecture Decision Records (ADRs)

| ADR | Title & Canonical Decision | Technical Rationale | Revisit Trigger |
|---|---|---|---|
| **001** | **FastAPI Modular Monolith** | Python FastAPI monolith co-locating business logic and `sutra_ml`; decoupled Next.js App Router client. | Measured requirement for independent GPU/compute scaling. |
| **002** | **Deterministic Rules First, Bounded ML Support** | Core alerts driven by versioned rules; ML provides decision-support Evidence Cards; baseline Logistic Regression v1.0.0 (threshold 0.46). | Shadow deployment report proves superior decision utility under fixed alert budget. |
| **003** | **Sensitive Domain Separation** | Dedicated tables (`finance_observations`, `restricted_task_details`) and restricted endpoints for fee/counselling records. | Institutional governance approves multi-campus role-purpose policy. |
| **004** | **Pydantic v2, SQLAlchemy 2.x & Alembic** | High-performance async I/O, strict DTO typing, reproducible migrations, and automated OpenAPI 3.1 generation. | Incompatible dependency collision. |
| **005** | **ML Serving Boundary & Governance** | Co-locate `sutra_ml` in `app.ml`; serve Logistic Regression baseline; keep constrained XGBoost candidate research-only; provide compatibility route aliases. | Phase Three training completion and formal promotion review. |
| **006** | **Bounded AI Orchestration Safeguards** | Optional, read-only LLM assistance (summaries, catalogue-restricted suggestions, draft notes); zero direct database write permissions; mandatory human approval. | Delivery of core PS6 workflow (Phases 0–5). |

---

## 2. Ground Truth Reconciliation: Verified Codebase vs Handoff Claims

To prevent building on unverified assumptions, this table explicitly separates ground truth:

| Component / Claim | Teammate / Handoff Claim | Actual Verified Repository Status | Reconciled Canonical Strategy |
|---|---|---|---|
| **Backend Framework** | Mentioned Next.js Route Handlers in old doc pack; FastAPI in newer teammate notes. | Old pack had Next.js Route Handlers; target architecture requires Python FastAPI. | **FastAPI Modular Monolith** confirmed; Next.js confirmed as decoupled frontend client. |
| **ML Serving Status** | "Logistic Regression v1.0.0 at threshold 0.46 currently serving on `/predict` and `/model-info`." | `ml/src/sutra_ml/inference` and `models` are empty; no model binary in `ml/artifacts/models/`; `ml/README.md` notes Phase Three training is next. | **Ground truth recorded:** 25 Day-30 features and leakage tests are verified; model training and FastAPI inference endpoints are prioritized in Phase 3. |
| **XGBoost Candidate** | "Constrained XGBoost candidate evaluated." | Pipeline config exists in `ml/configs/features.yaml`, but training routines not yet executed. | **Research-only invariant:** XGBoost remains offline until formal promotion review. |
| **ML Inference Routes** | Reported standalone `/health`, `/ready`, `/model-info`, `/predict`, `/predict/batch`. | No standalone HTTP server in `ml/` repository. | **Canonical routes:** Integrated under `/api/v1/ml/*` with root aliases (`/model-info`, `/predict`, `/predict/batch`) for backward compatibility. |
| **Database Migrations** | Static SQL script `001_core_schema.sql` without RLS policies. | Schema defines 18 tables; enables RLS without final grant statements. | Reconciled into **Alembic migration sequence** with explicit RLS policies and grants. |

---

## 3. Working Assumptions

1. **Synthetic Demo Campus:** Hackathon evaluation runs on synthetic data under one demo institution (`overclocked-demo`).
2. **Supabase Managed Postgres & Auth:** Supabase Auth handles user identity; FastAPI verifies JWTs server-side.
3. **No External Message Broker:** The PostgreSQL transactional outbox pattern satisfies all asynchronous worker requirements without Redis.
4. **EduEagle Neutral Import:** SUTRA supports CSV/JSON imports mapping into its normalized observation contract; live cloud connection waits for authentic vendor sandboxes.
5. **No Imputed Zeroes:** Missing or stale data produces `unknown` / `insufficient_evidence`, never an invented 0.

---

## 4. Organizer Questions (CODEX 3.0 / PS6)

1. **EduEagle Sandbox:** Will organizers supply authentic EduEagle API documentation, sandbox tenant credentials, and export schemas, or is the synthetic CSV/JSON adapter sufficient for scoring?
2. **Campus Role Verification:** Are all 8 defined roles expected to be demonstrated, or is the primary advisor/mentor + HOD supervisor workflow the primary evaluation rubric?
3. **Parent / Guardian Outreach:** For adult college students (18+), what explicit statutory or institutional consent framework is required prior to permitting parent notifications?
4. **Intervention Catalogue Extensibility:** Can campus administrators dynamically publish new intervention types, or is the controlled static menu preferred for audit stability?
5. **Evaluation Demo Environment:** Will judges evaluate the live deployment on cloud infrastructure (e.g. Render / Supabase) or inspect local execution via test suites?
