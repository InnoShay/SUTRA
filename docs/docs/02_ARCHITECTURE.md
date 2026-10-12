# 02 · Canonical Backend Architecture

## 1. Architectural Strategy

SUTRA is architected as an **asynchronous Python / FastAPI modular monolith** co-locating business workflows, deterministic policy evaluation, transactional case management, and machine learning inference within a single, highly performant process.

Persistence and identity are managed via **PostgreSQL and Supabase Auth**, with server-side JWT verification and object-level authorization enforced on every protected request.

User interfaces interact with the backend as decoupled clients:
- **Primary Web Client:** Next.js (App Router), React, TypeScript, Tailwind CSS. Responsive web application first; progressive web app (PWA) offline enhancements added once the core workflow stabilizes.
- **Future CLI Client:** High-performance Rust CLI communicating exclusively over authenticated HTTPS `/api/v1` routes; zero direct database connections or permission bypasses.

---

## 2. Canonical System Architecture

```mermaid
flowchart TD
  subgraph Clients [Client Tier]
    W[Next.js App Router Web UI]
    C[Future Rust CLI]
  end

  subgraph FastAPI_Server [SUTRA FastAPI Modular Monolith]
    R[FastAPI Route Handlers /api/v1]
    
    subgraph Security_Layer [Security & Context Middleware]
      JWT[Supabase JWT Verification]
      CAMPUS[Campus Context & Membership Resolver]
      AUTHZ[Object-Level RBAC & Purpose Checker]
    end

    subgraph Business_Modules [Internal Application Modules]
      INGEST[Ingestion & Temporal Normalization]
      POLICY[Deterministic Policy Evaluator]
      CASE[Case Lifecycle & State Machine]
      ANALYTICS[Cohort & Operational Analytics]
      AI[Bounded AI Orchestrator (Optional)]
    end

    subgraph ML_Subsystem [Co-located ML Module app.ml]
      ML_VAL[Feature Schema Validation]
      ML_INF[Logistic Regression v1.0.0 Engine]
      ML_EXP[SHAP Explainability & Evidence Card]
    end

    subgraph Async_Worker [Durable Background Execution]
      OUTBOX[Transactional Outbox Table]
      WORKER[Durable Deadline & Escalation Worker]
      NOTIF[Notification Intent Dispatcher]
    end
  end

  subgraph Data_Tier [Persistence & Identity Tier]
    SUPA_AUTH[Supabase Auth Service]
    PG[(PostgreSQL Database via Supabase)]
  end

  W -->|HTTPS /api/v1 Bearer JWT| R
  C -->|HTTPS /api/v1 Bearer JWT| R

  R --> JWT
  JWT -->|Verify Signature| SUPA_AUTH
  JWT --> CAMPUS
  CAMPUS --> AUTHZ
  AUTHZ --> Business_Modules

  POLICY --> PG
  CASE --> PG
  INGEST --> PG
  ANALYTICS --> PG

  POLICY -.->|Invoke when eligible| ML_Subsystem
  ML_Subsystem -->|Feature extraction| PG
  ML_Subsystem -->|Evidence Card output| CASE

  AI -.->|Read-only context| PG
  AI -.->|Structured drafts| CASE

  CASE -->|Atomic transaction| OUTBOX
  WORKER -->|Poll due deadlines| PG
  WORKER -->|Process intents| OUTBOX
  WORKER --> NOTIF
```

---

## 3. Core Internal Modules

1. **`app.core.security` (Identity & Authorization):**
   - Validates incoming Supabase Bearer JWTs server-side using server-held cryptographic secrets (`SUPABASE_JWT_SECRET`).
   - Resolves active campus membership and role capabilities from `institution_memberships`.
   - Rejects unauthenticated, cross-campus, or unauthorized operations at the dependency injection level.
2. **`app.modules.ingestion` (Ingestion & Temporal Integrity):**
   - Ingests CSV/JSON observation batches across all 6 categories (attendance, academic, participation, fees, skills, faculty feedback).
   - Validates schemas, enforces deduplication, isolates restricted finance records, and validates temporal timestamps (`event_at`, `available_at`, `ingested_at`).
3. **`app.modules.policy` (Deterministic Policy Engine):**
   - Pure, deterministic evaluator operating over frozen evidence snapshots (`as_of_at`).
   - Evaluates versioned, immutable rule sets (`policy_versions`) producing reproducible signal evaluations and evidence packets.
4. **`app.ml` (Co-located ML Module):**
   - Interfaces directly with the Python package `sutra_ml` in-process.
   - Validates incoming feature vectors against Day-30 OULAD snapshot schemas (25 features).
   - Serves the **Regularized Logistic Regression v1.0.0** baseline at decision threshold **0.46**.
   - Contains the **Constrained XGBoost** candidate as research-only.
   - Formats outputs as standardized **Evidence Cards** with probability, threshold, and feature attributions.
5. **`app.modules.cases` (Case Lifecycle & Task Management):**
   - Enforces the strict 10-state case lifecycle state machine (`Suggested` → `Under Review` → `Action Planned` → `Assigned` → `Accepted` → `Contact Attempted` → `Support In Progress` → `Follow-up Due` → `Outcome Reviewed` → `Closed`).
   - Handles primary coordinator assignment, explicit owner acceptance, domain subtasks, follow-up records, and outcome notes.
6. **`app.modules.worker` (Durable Worker & Outbox):**
   - Executes durable asynchronous deadline scanning and notification dispatch via the PostgreSQL transactional outbox.
   - Bounded retries with exponential backoff; zero dependency on external message brokers (Redis/RabbitMQ).
7. **`app.modules.analytics` (Cohort & Operational Analytics):**
   - Computes denominator-defined operational metrics (acceptance rate, first-contact coverage, outcome-known rate).
   - Enforces small-cell privacy suppression (<5 students) on sensitive cohort queries.
8. **`app.modules.ai` (Bounded AI Orchestrator - Optional):**
   - Optional, bounded helper endpoints for evidence summarization, catalogue-restricted intervention suggestion, and outreach note drafting.
   - Strictly read-only; zero direct database mutation permissions.
9. **`app.modules.localization` & Client Localization Subsystem (Indic Neural Localization & Sarvam AI Gateway):**
   - Integrates **Sarvam AI** sovereign Indic neural translation foundation (`https://api.sarvam.ai/translate`) for 12 official regional languages of India (Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese, English).
   - Zero-trust server boundary: `SARVAM_API_KEY` is isolated server-side, accessed via authenticated Next.js `/api/translate` and FastAPI `/api/v1/translate` proxies.
   - 4-Tier Zero-Cost Caching: Pre-compiled static dictionary, client `localStorage`, and server global cache (`globalThis.__sutraTranslationCache`).
   - Flight-Control & Request Coalescing: In-flight Promise deduplication eliminates thundering-herd API stampedes across concurrent UI components.
   - Automatic Client DOM Translation Engine with React reconciliation rollback interceptor; synchronous click updates apply immediately without requiring page refresh.
   - Fully specified in [ADR-007](file:///Users/yash/cooks/SUTRA/docs/decisions/ADR-007-sarvam-ai-indic-neural-translation.md) and [Deep Architecture: Indic Neural Language Orchestration](file:///Users/yash/cooks/SUTRA/docs/architecture/indic_language_orchestration_and_sarvam_ai.md).

---

## 4. Protected Request Flow

Every incoming mutation or sensitive read executes through this rigorous pipeline:
1. **Schema Validation:** FastAPI / Pydantic v2 validates request body, parameter types, string lengths, and payload size.
2. **JWT Authentication:** Dependency `get_current_user` extracts Bearer JWT, validates signature, expiration, and issuer.
3. **Campus Context Resolution:** Dependency `get_campus_membership` resolves active user membership within the target institution. Client-supplied roles or campus IDs in request bodies are ignored.
4. **Object-Level Authorization:** Data Access Layer (DAL) verifies that requested student, case, or task belongs to the user's active campus and that the user's role permits the specific action.
5. **Domain & Purpose Verification:** If the operation touches sensitive domains (e.g. fees, counselling), the system verifies explicit domain capabilities (`finance`, `counsellor`) and active student processing authorization.
6. **Atomic Transactional Mutation:** State change, lifecycle event, audit record, and outbox intent commit together in a single PostgreSQL transaction or rollback entirely on failure.
7. **Purpose-Minimized DTO Serialization:** Response is filtered through explicit Pydantic DTO schemas; raw database rows and sensitive fields are never returned to unauthorized callers.
8. **Sanitized Audit Logging:** Request ID, execution time, and sanitized audit codes are logged; zero student PII, finance notes, or clinical details are emitted.

---

## 5. ML Deployment Boundary & Co-location Justification

### Co-location Architecture
The ML package (`sutra_ml`) runs inside the FastAPI process. This architectural choice is deliberate:
- **Low Latency:** Zero inter-process network overhead or serialization delays when scoring students and assembling Evidence Cards.
- **Unified Language Stack:** FastAPI and `sutra_ml` both run on Python 3.10+, utilizing shared dependencies (`pydantic`, `numpy`, `pandas`).
- **Operational Simplicity:** Single container deployment, simplified environment configuration, and unified CI/CD pipelines.

### Criteria for a Future Microservice Split
The ML subsystem will only be separated into an independent microservice if one of the following concrete conditions is met:
1. **Hardware Acceleration:** High-volume inference requires dedicated GPU or high-compute instances that would be inefficient for the general CRUD API.
2. **Independent Scaling:** Inference workload volume significantly diverges from CRUD case management traffic.
3. **Dependency Conflict:** Advanced deep-learning or AutoML libraries introduce unresolvable C-library or Python package version collisions with core backend dependencies.
4. **Team Ownership Boundaries:** A dedicated ML engineering team requires isolated deployment cadence without risking backend API regressions.

---

## 6. Asynchronous Execution: PostgreSQL Outbox vs Distributed Broker

SUTRA utilizes the **PostgreSQL Transactional Outbox Pattern** for all asynchronous work:
- Consequential mutations write a pending record to `notification_outbox` within the same database transaction as the state mutation.
- A lightweight background worker (FastAPI lifespan task or dedicated worker process) polls `notification_outbox` and scans overdue cases using row-level locking (`FOR UPDATE SKIP LOCKED`).
- **No Redis / RabbitMQ Requirement:** Adding an external message broker adds operational failure modes (broker crashes, split-brain, lost transactions, outbox dual-write failures). PostgreSQL provides ACID transactional guarantees out of the box.

---

## 7. Client Boundaries: Next.js Frontend & Rust CLI

- **Next.js Frontend:** Interacts with the backend exclusively via standard HTTP Bearer token requests. The Next.js client does not hold database service-role secrets and does not directly connect to PostgreSQL.
- **Rust CLI (Future):** Designed for high-throughput batch operations and administrator inspection. The CLI must authenticate using user credentials, receive a Supabase JWT, and call the FastAPI REST API. The CLI is strictly forbidden from bypassing server-side authorization or establishing direct SQL connections to Supabase.
