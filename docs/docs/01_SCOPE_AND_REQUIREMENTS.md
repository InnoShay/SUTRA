# 01 · Backend Scope and PS6 Traceability

## 1. Product Boundary

SUTRA is the dedicated intervention orchestration layer for CODEX 3.0 (PS6): connecting authorized multi-source observations to explainable evidence, human review, case ownership, enforceable deadlines, verified follow-ups, and recorded outcomes.

It operates strictly on the principle: **“No Alert Without Action.”**

SUTRA is **not** a replacement Student Information System (SIS), a replacement Learning Management System (LMS), an electronic health/clinical record system, an autonomous disciplinary enforcement tool, or an unreviewed black-box dropout classification service.

---

## 2. Requirement-to-Backend Traceability Matrix

| ID | Requirement (PS6 Core Specification) | Canonical Backend Implementation | Verification & Acceptance Evidence |
|---|---|---|---|
| **R1** | Convert early indicators into responsible, trackable support | Deterministic policy evaluation & ML decision support → Human review queue → Persistent case → Follow-up task → Recorded outcome. | Pytest end-to-end journey completes; audit history verifies every transition. |
| **R2** | Consent-aware, purpose-bound 360-degree view | Role-filtered support DTOs generated via Pydantic v2; object-level campus and purpose authorization checks on every read. | Role-switching tests verify unauthorized fields (fees, clinical notes) are omitted from responses. |
| **R3** | Six simulated observation categories (attendance, academic, participation, fees, skills, faculty feedback) | Normalization pipeline ingesting all 6 categories with explicit `event_at`, `available_at`, `ingested_at` timestamps and quality flags. | Ingest all 6 domains; verify data segregated correctly (general observations vs restricted finance observations). |
| **R4** | Explainable early-risk indicators | Versioned deterministic policy engine + internal `sutra_ml` inference generating Evidence Cards (probability, threshold 0.46, top SHAP attributions). | Replay frozen evidence snapshot; verify identical explanation; verify missing data produces `unknown`. |
| **R5** | Intervention recommendations from controlled catalogue | Controlled `intervention_catalog` table with domain-specific templates; human reviewer approves, modifies, or declines recommendations. | Reviewer modifies recommended tutoring to mentor check-in; case created with updated selection and audit reason. |
| **R6** | Accountable assignment across campus roles | Explicit role-aware assignments (faculty, HOD, mentor, counsellor, placement, finance); assignment and acceptance tracked as distinct states. | Assignee receives case in pending queue; accepts responsibility; timestamped acceptance recorded. |
| **R7** | Deadlines and automated escalation | Configurable due dates (`due_at`), PostgreSQL transactional outbox, durable background worker scanning overdue tasks. | Advance virtual demo clock past deadline; worker scans and issues single idempotent escalation event. |
| **R8** | Outcome notes showing whether an intervention helped | Dedicated `case_outcomes` record capturing `helped`, `not_helped`, `mixed`, or explicit `unknown` with follow-up window and rationale. | Record outcome; verify unknown outcomes stay in denominators and are not dropped from reporting. |
| **R9** | Leadership cohort trends & operational analytics | Denominator-defined operational metrics (`GET /api/v1/analytics/overview`) with small-cell suppression (<5) for privacy protection. | Aggregate counts reconcile directly to case and outcome rows; small cohorts marked `suppressed: true`. |
| **R10** | Role-based privacy & domain separation | FastAPI dependency injection enforcing Supabase JWT claims, active campus membership, object-level RBAC, and separate finance tables. | Comprehensive negative test suite (10 test cases) verifies 401/403/404 responses. |
| **R11** | Transparent manual override | Reasoned override operations (`POST /cases/{id}/override`) requiring actor rationale and preserving complete prior decision history. | Execute override; inspect case history to verify previous decision and new decision coexist with timestamps. |
| **R12** | Non-punitive & non-diagnostic invariant | API schemas omit disciplinary actions; rules prohibit inferring psychological conditions; parent contact for adult students strictly gated. | Negative test verifies attempts to execute disciplinary or diagnostic payloads return 422 Unprocessable Entity. |
| **R13** | Action-first orchestration (not a passive dashboard) | The core application state machine revolves around the case lifecycle; alerts cannot exist without assigned reviews. | Inspection of API surface proves every signal requires human triage to avoid backlog accumulation. |
| **R14** | Accountable follow-up tracking | Follow-up tracking distinguishes `contact_attempted`, `student_reached`, and `support_delivered` with explicit proof kinds. | Attestation of contact attempt does not transition case to support completed. |
| **R15** | Unified traceability linking observations to outcomes | Foreign-key lineage connecting observation IDs → evidence packet → signal → case → tasks → follow-ups → outcome. | Querying `/api/v1/cases/{caseId}/history` returns the complete chronological provenance graph. |
| **R16** | EduEagle reference integration boundary | Neutral import contract (`POST /api/v1/imports`) mapping CSV/JSON exports; live integration deferred pending authentic API sandbox. | Import synthetic data via standard schema; verify ingestion batch counts and row-level error reporting. |
| **R17** | Technology stack & advanced differentiators | Python FastAPI modular monolith + Next.js App Router client; co-located `sutra_ml`; optional bounded AI orchestration; future Rust CLI. | Modular architecture passes all unit/integration tests without external distributed broker dependencies. |

---

## 3. In Scope for Implementation

- **Campus & Tenant Boundary:** Every institution-owned entity carries `institution_id` (campus boundary); enforced at the database and application levels.
- **Six Simulated Observation Categories:** Validated, normalized, timestamped, and deduplicated.
- **Deterministic Policy Engine:** Pure, versioned evaluator producing reproducible evidence packets.
- **ML Subsystem Integration:** Co-located `sutra_ml` inference service generating standardized Evidence Cards for Day-30 academic early-warning predictions.
- **Human Case Review & Lifecycle:** 10-state machine covering creation, assignment, explicit acceptance, tasks, follow-ups, outcomes, overrides, and reopenings.
- **Durable Worker & Outbox:** PostgreSQL transactional outbox pattern handling deadline tracking and retries.
- **Cohort Operational Analytics:** Denominator-defined rates and small-cell privacy suppression.

---

## 4. Explicitly Out of Scope

- **Autonomous Dropout Classification:** ML models directly triggering interventions or contacting students without human review.
- **Automatic Parent/Guardian Outreach:** Parent notification without case-specific institutional authorization and adult-student policy compliance.
- **Clinical Psychological Diagnostics:** Any attempt to classify student mental health conditions from engagement or academic data.
- **Live EduEagle Cloud Connection:** Connecting to live production systems without official schemas, sandbox environments, and security clearance.
- **Multi-Agent Autonomous LLM Networks:** Multi-agent swarms with direct database write permissions.
- **Causal Efficacy Claims:** Claiming that correlation metrics (e.g. historical OULAD ROC-AUC) or synthetic demo results prove real-world retention uplift.

---

## 5. Non-Functional Requirements

- **Correctness & Reproducibility:** Replaying frozen evidence against an immutable policy version produces identical outputs.
- **Temporal Anti-Leakage:** Observations available after decision cutoff $T$ (`available_at > T`) are strictly excluded from evaluations.
- **Security & Privacy:** Server-side JWT validation, object-level access checks, zero service-role keys in clients, sanitized logs.
- **Idempotency & Concurrency:** Consequential mutations require `Idempotency-Key`; duplicate submissions return identical cached responses without duplicate effects.
- **Auditability:** Complete actor, timestamp, reason, and before/after state captures for all case transitions.
