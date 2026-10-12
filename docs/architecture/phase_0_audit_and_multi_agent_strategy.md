# SUTRA — Phase 0.1: System Architecture, Multi-Agent Strategy & Evidentiary Governance

**Document ID:** `SUTRA-ARCH-PHASE-0.1`  
**Revision:** Phase 0.1 Critical Architecture Corrections  
**Date:** October 12, 2026  
**Author:** Team Overclocked  
**Status:** ARCHITECTURE LOCKED & VERIFIED (Zero Application Code or ML Behavior Modified)  

---

## 1. Executive Summary & Core Product Direction

### 1.1 Product Positioning
> **SUTRA: From Student Signals to Verified Support.**  
> Transforming fragmented institutional student telemetry into a verifiable, human-governed **Support Evidence Ledger**.

### 1.2 Core Architectural Tenets
1. **The Support Evidence Ledger as Central Differentiator:** SUTRA establishes an unbroken, auditable link connecting source telemetry, deterministic ML attribution, structured qualitative interpretation, policy-constrained candidate interventions, adversarial critique, mandatory human approval, assigned execution records, and eventual course outcomes.
2. **Seven Bounded Specialist Roles:**
   - **Agents 1–4:** Form the core, sequential triage pipeline.
   - **Agents 5–7:** Are downstream, event-triggered extensions invoked only upon explicit staff or reporting events.
3. **Deterministic Orchestrator as Application Code:** The coordinator is deterministic, testable Python application logic, **not** an eighth AI agent.
4. **Backend Authority:** The backend application is the sole authority for identity authentication, access control, policy validation, persistence transactions, and consequential workflow state mutations. AI outputs are advisory draft proposals that never bypass deterministic controls.
5. **Empirical Grounding Over Marketing Overclaims:** SUTRA does not claim to be universally unique across all commercial software, nor does it assert unverified statistics (e.g., blanket attrition percentages or categorical competitor deficiencies). All live demonstrations use transparently labeled synthetic datasets (`SYNTH-` prefix) to prove software mechanics, architectural safety, and workflow integrity without fabricating real-world retention gains.

---

## 2. Verified Repository Reality & Baseline Audit

### 2.1 Git Topology and Working-Tree State
* **Active Working Branch:** `Neemay-ml` (tracking `origin/Neemay-ml`; commit hash `45d1c15`, identical to `origin/main`).
* **Working Tree:** Pristine and clean (`nothing to commit, working tree clean`).
* **Git History:** 4 cumulative commits implementing ML data ingestion, baseline training, explainability, and diagnostics (Phases 1–16 of ML subsystem).

### 2.2 Subsystem Implementation Reality

| Subsystem | Implemented Reality | Exact Location / Status |
| :--- | :--- | :--- |
| **Backend Framework** | **Yes** (FastAPI 0.115+, Uvicorn, Pydantic v2) | [backend/app/main.py](file:///Users/demo/Competitions/Sutra/backend/app/main.py), [backend/app/api/endpoints.py](file:///Users/demo/Competitions/Sutra/backend/app/api/endpoints.py) |
| **Inference API** | **5 Endpoints** (`/health`, `/ready`, `/model-info`, `/predict`, `/predict/batch`) | Mounted at root `/` and `/api/v1` |
| **Database & Persistence** | **None (Purely Stateless)** | Zero database models, ORM configurations, migrations, or tables. Calling `/predict` produces zero DB side effects. |
| **Authentication & RBAC** | **None** | No authentication middleware, tokens, session handlers, or tenant/campus isolation boundaries. |
| **Frontend / User Interface**| **None** | Zero frontend screens, templates, or client assets. |
| **ML Inference Pipeline** | **Yes** (Regularized Logistic Regression Baseline) | [ml/src/sutra_ml/inference/predictor.py](file:///Users/demo/Competitions/Sutra/ml/src/sutra_ml/inference/predictor.py) |
| **Explainability Engine** | **Yes** (Exact linear log-odds decomposition) | [ml/src/sutra_ml/explainability/local_explanations.py](file:///Users/demo/Competitions/Sutra/ml/src/sutra_ml/explainability/local_explanations.py) |
| **Synthetic Dataset** | **Yes** (100-record batch + 6 curated archetypes) | [ml/data/synthetic/](file:///Users/demo/Competitions/Sutra/ml/data/synthetic), `sutra_ml.data.synthetic` |
| **Intervention Catalog** | **None** | No intervention codes, policies, workflows, or task assignments. |
| **Multi-Agent / LLM Code** | **None** | Zero agent classes, system prompts, provider clients (OpenAI/Anthropic/Gemini absent), or orchestrators. |

---

## 3. Verified ML Artifact Packaging & Exact Score Reproduction

### 3.1 Artifact Packaging Defect & Resolution
In fresh checkouts, the [.gitignore](file:///Users/demo/Competitions/Sutra/.gitignore#L20-L21) rule `ml/artifacts/models/*` (excluding `.gitkeep`) causes the default directory `ml/artifacts/models/v1.0.0/` to be empty.
* **Prohibited Behavior:** Silently pointing the backend to an experimental training run artifact and treating it as production.
* **Mandated Packaging Standard:**
  1. The production model must be explicitly packaged and verified at `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib`.
  2. The artifact must match the verified SHA-256 hash:  
     `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`.
  3. Associated metadata must be packaged at `ml/artifacts/models/v1.0.0/model_metadata.json` matching the structure preserved in [ml/reports/metrics/model_comparison.json](file:///Users/demo/Competitions/Sutra/ml/reports/metrics/model_comparison.json).
  4. The runtime must enforce `scikit-learn==1.7.2`. Deserializing with scikit-learn $\ge 1.9$ fails due to internal `ColumnTransformer` feature name resolution changes.
  5. If the artifact is missing or fails checksum validation, the service must fail closed with an explicit error (HTTP 503) rather than guessing or loading an unverified candidate.

### 3.2 Exact Empirical Score Reproduction
Using the verified baseline model artifact and pinned environment (`Python 3.11`, `scikit-learn==1.7.2`), the existing synthetic scenario from [ml/data/synthetic/named_scenarios.json](file:///Users/demo/Competitions/Sutra/ml/data/synthetic/named_scenarios.json) was evaluated. The exact, verified reproduction figures are:

#### Scenario: `LOW_ENGAGEMENT_AT_RISK` (`record_id: SYNTH-SCENARIO-LOW-02`)
* **Risk Probability ($P(\text{At-Risk})$):** **`0.9287`** (92.87%)
* **Operational Threshold:** `0.46`
* **Review Recommended:** **`True`**
* **Risk Tier:** **`HIGH`**
* **Top 5 Risk Drivers (Exact Log-Odds Attribution):**
  1. `Active Learning Days on Platform` (`vle_active_days_d30`): Raw Value = `2.0 days`, Weight = `+0.5891`
  2. `Days Inactive Since Last VLE Access` (`vle_days_since_last_click`): Raw Value = `22.0 days`, Weight = `+0.5359`
  3. `Highest Prior Education: Lower Than A Level`: Raw Value = `'Lower Than A Level'`, Weight = `+0.2869`
  4. `Index of Multiple Deprivation Band: 10-20`: Raw Value = `'10-20'`, Weight = `+0.2809`
  5. `Prior Module Attempts` (`num_of_prev_attempts`): Raw Value = `1 attempt`, Weight = `+0.2614`
* **Top Protective Factors:**
  1. `Supplementary Resource Access`: Raw Value = `0.0`, Weight = `-0.1686`
  2. `Declared Disability Indicator: N`: Raw Value = `'N'`, Weight = `-0.1484`
  3. `Course Registration Lead Time`: Raw Value = `-5.0 days`, Weight = `-0.0300`

*(Correction Note: The previous placeholder values of $P=0.78$ and $+1.82$ log-odds are formally superseded by these verified empirical figures.)*

---

## 4. Server-Authoritative Identity, Authentication & Tenant Boundary

### 4.1 Vulnerability Elimination: Client Headers Are Untrusted
In the revised architecture:
* **Client-supplied headers** (`X-Campus-ID`, `X-Tenant-ID`, `X-User-Role`) are **strictly prohibited** as proof of identity or tenant scope.
* A client request cannot switch campus boundaries or elevate permissions by altering request headers or payload bodies.

### 4.2 Server-Authoritative Security Controls
1. **Cryptographic Identity Verification:** Identity must be established via a trusted mechanism (e.g., signed JWT bearer tokens issued by an institutional IdP or verified session cookies).
2. **Server-Side Context Derivation:** The authenticated user ID is extracted from the cryptographically verified token. The user's role (`ADVISOR`, `FACULTY`, `DEPARTMENT_HEAD`, `SYSTEM_ADMIN`) and authorized campus/tenant boundaries are looked up exclusively from trusted server-side authorization stores.
3. **Record-Level Authorization Gate:** For every request accessing student telemetry, generating an intervention, or reading ledger records, the server verifies:
   $$\text{Authorized}(\text{UserContext}, \text{StudentRecord}) \iff \text{UserContext.campus\_id} == \text{StudentRecord.campus\_id} \land \text{UserContext.has\_case\_permission}$$
4. **Development Demo Identity Scoping:** Any local synthetic demo identities (e.g. `DEMO_ADVISOR_CAMPUS_A`) are explicitly encapsulated within a mock development authentication provider. They must never be deployed to production or allowed to bypass server authorization checks.
5. **Phase Alignment:**
   - **Phase 1 (Foundation):** Implements the immutable server-side `SecurityContext` container and a strict dependency injection mock that enforces tenant matching in tests.
   - **Phase 4 (Workflow Integration):** Implements persistent user roles, session tokens, and database row-level security.

---

## 5. Ledger Integrity, Idempotency & Persistence Lifecycle

### 5.1 Distinct Concepts in Evidentiary Architecture

A SHA-256 digest alone does not make a record immutable. The architecture strictly distinguishes five separate concepts:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             SUTRA EVIDENTIARY CONCEPTS                           │
├──────────────────────────┬───────────────────────────────────────────────────────┤
│ 1. Content Fingerprint   │ Deterministic SHA-256 digest of normalized input      │
│                          │ telemetry; uniquely identifies the data snapshot.     │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 2. Idempotency Key       │ Client- or pipeline-generated UUID to ensure repeated │
│                          │ POST requests return cached results without retries.  │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 3. Tamper-Detection Hash │ Cryptographic hash chaining (Merkle/SHA-256 chain) of │
│                          │ ledger entries to detect unauthorized modification.   │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 4. Append-Only Audit     │ Data store policy where ledger tables permit only     │
│                          │ INSERT operations; UPDATE/DELETE are DB-restricted.   │
├──────────────────────────┼───────────────────────────────────────────────────────┤
│ 5. Durable Transactional │ ACID database engine (SQLite/PostgreSQL) guaranteeing │
│    Store                 │ atomic writes of human decisions and state changes.   │
└──────────────────────────┴───────────────────────────────────────────────────────┘
```

### 5.2 Progression from Ephemeral Mock to Production Persistence
* **Phase 1 (Test Harness):** `InMemoryLedgerRepository` is an ephemeral test fixture used exclusively to test coordinator state transitions in unit tests. It is explicitly **not** labeled an immutable ledger.
* **Phase 4 (Local Demonstration):** `SQLiteLedgerRepository` running in Write-Ahead Logging (WAL) mode provides durable, local ACID persistence for synthetic case reviews.
* **Phase 6+ (Production):** `PostgreSQLLedgerRepository` with append-only tables, database-level role separation, and cryptographic entry chaining.

### 5.3 Deduplication vs. Retries vs. Legitimate Reassessments
* **Transient AI Retries:** If an LLM call fails with a 503 or timeout, the coordinator retries within the *same* `run_id`. No duplicate cases, tickets, or outreach drafts are created.
* **Client Idempotency:** If a client resubmits an inference request with an existing `idempotency_key`, the server returns the existing `run_id` without re-running the agent pipeline.
* **Legitimate Reassessment:** When a student has fresh telemetry (e.g. Day 45 update), the request includes a new data snapshot with a distinct `evidence_fingerprint_sha256`. The server records this as a new, linked evaluation node in the student's case history.

---

## 6. Claim-Level Evidence Contracts & Deterministic Validation Gate

### 6.1 Preserving Existing Contracts
The multi-agent contracts strictly build upon the existing, verified schemas:
* [StudentFeatureInput](file:///Users/demo/Competitions/Sutra/backend/app/schemas/features.py) (25-feature input contract).
* [PredictResponse](file:///Users/demo/Competitions/Sutra/backend/app/schemas/predict.py) (model inference response).
* [SutraEvidenceCard](file:///Users/demo/Competitions/Sutra/ml/src/sutra_ml/schemas/evidence_card.py) (risk tier, threshold, and feature attribution factors).

### 6.2 Claim-Level Evidence Attribution Schema
To prevent ungrounded AI assertions, every factual statement generated by an agent must provide an explicit claim-reference:

```python
class GroundedClaim(BaseModel):
    claim_text: str = Field(description="The factual observation or interpretive assertion")
    evidence_feature: str = Field(description="Exact feature name from EvidencePacket, e.g. 'vle_days_since_last_click'")
    cited_raw_value: str = Field(description="The exact value observed in the evidence packet, e.g. '22.0'")
    confidence_level: str = Field(description="'VERIFIED_OBSERVATION' | 'INFERRED_HYPOTHESIS'")
```

### 6.3 Deterministic Verification Gate
The application does not trust boolean fields generated by LLMs:
* **Untrusted LLM Output:** Fields such as `policy_prerequisites_met: true` or `catalog_alignment_verified: true` returned by an LLM are treated as untrusted claims.
* **Authoritative Server Verification:** The deterministic Python coordinator enforces:
  1. **Citation Verification:** Checks that every `evidence_feature` exists in the input `EvidencePacket` and that `cited_raw_value` matches the actual normalized value within tolerance.
  2. **Catalog Validation:** Verifies that `selected_intervention_id` exists in the server-side institutional catalog enum (`SUPPORT_CATALOG_V1`).
  3. **Role & Action Gate:** Verifies that suggested action owners match authorized institutional roles.
  4. **Advisory Role of Agent 4:** Agent 4 is an automated red-team critic that highlights concerns for human review. It is **not** a deterministic security boundary; an absence of Agent 4 critique does not certify safety.

---

## 7. Multi-Layer Clinical-Language & Free-Text Safety

Regex and keyword filters are recognized as **supplementary heuristics, not sufficient security controls**. The architecture implements five defense layers:

```
Layer 1: Agent Contract Prompt Constraints (Negative behavioral boundaries)
   │
Layer 2: Structured Output Decoding (Pydantic v2 type enforcement)
   │
Layer 3: Deterministic Keyword/Regex Scanner (Supplementary early warning)
   │
Layer 4: Adversarial Red-Team Challenge (Agent 4 audits draft for clinical overreach)
   │
Layer 5: Mandatory Human-in-the-Loop Gate (Advisor approval required for any action)
```

1. **Contractual Boundaries:** System prompts explicitly forbid psychiatric diagnoses, medical assumptions, or moral judgments.
2. **Deterministic Heuristic Detection:** Scans for clinical terms (e.g., "depressed", "ADHD", "bipolar", "lazy") and automatically flags or rejects the proposal.
3. **Adversarial Red-Teaming (Agent 4):** Evaluates if the plan makes causal assumptions about personal health or home life without telemetry backing.
4. **Untrusted Free-Text Sanitization:** Staff notes and student comments are treated as untrusted text:
   - Wrapped in strict XML boundary tags (`<untrusted_user_text>...</untrusted_user_text>`).
   - Evaluated by prompt injection defense rules preventing instruction overrides.
5. **Mandatory Human Sign-Off:** No AI proposal can autonomously schedule appointments, message students, or alter academic standing.

---

## 8. Bounded Provider Interface, Latency & Execution Budget

### 8.1 Reconciling Latency and Execution Targets
* **Previous Inconsistency:** Sequential 4 agent calls with 15s individual timeouts and retries could take over 60 seconds, conflicting with an unmeasured "< 5s" live demo target.
* **Revised Execution Budget:**
  - **Overall Run Deadline:** Maximum **`18.0 seconds`** for the complete 4-agent triage sequence.
  - **Per-Agent Timeout:** Default **`4.0 seconds`** per specialist invocation.
  - **Bounded Retry Policy:** Maximum **`1 retry`**, permitted **only** for transient HTTP failures (`429`, `503`, read timeout) or malformed JSON syntax. Zero retries for client errors (`400`, `422`) or policy rejections.
  - **Call & Resource Limits:** Exactly 4 model calls per triage run. Token budget capped at 1,500 input tokens and 800 output tokens per run.

### 8.2 Execution State Progression for Demos
The coordinator emits observable state transitions:
`QUEUED` $\rightarrow$ `INTERPRETING` (A1) $\rightarrow$ `STRATEGIZING` (A2) $\rightarrow$ `PLANNING` (A3) $\rightarrow$ `AUDITING` (A4) $\rightarrow$ `GATE_CHECKED` $\rightarrow$ `READY_FOR_ADVISOR`.

If the overall run deadline expires, the coordinator returns partial results with:
`enrichment_status: "DEGRADED_TIMEOUT_PARTIAL"`  
The authoritative ML risk score and Evidence Card remain fully available to the advisor.

### 8.3 Live Provider Strategy for Phase 1
* Phase 1 implements a unified **`LLMProviderProtocol`** and a deterministic **`MockLLMClient`** for automated testing.
* Automated CI/CD test suites run exclusively against `MockLLMClient` with zero external API dependencies, zero network requests, and $< 50\text{ ms}$ execution.
* Exactly **one** live provider (e.g. LiteLLM with Google Gemini or OpenAI) will be connected only after credentials and latency are assessed in Phase 1. Supporting 4 providers simultaneously in Phase 1 is rejected as unnecessary complexity.

---

## 9. Presentation Strategy, Evidence Integrity & Scope

### 9.1 Correction of Presentation Claims
1. **Removed External Generalizations:** Unverified statistics (such as "40% of student disengagement occurs silently during the first month") are removed. The narrative focuses on verified institutional challenges: high student-to-advisor ratios, fragmented data silos, and alert fatigue.
2. **Rephrased Competitor Assessments:** Generalized categorical claims regarding named competitors are replaced with objective system distinctions: SUTRA emphasizes end-to-end evidentiary traceability from telemetry click to recorded outcome.
3. **Grounded Live Case Study:** The presentation demonstrates the verified synthetic case `SYNTH-SCENARIO-LOW-02` with reproducible probability ($0.9287$), explaining how each specialist contributes to the Support Evidence Ledger.
4. **Scope Boundaries:** Presenters must explicitly clarify that SUTRA is a competition prototype evaluated on historical and synthetic benchmarks, not a production-deployed university system with verified retention metrics.

---

## 10. Revised Seven-Phase Implementation Roadmap

```
Phase 0.1 ──> Phase 1 ──> Phase 2 ──> Phase 3 ──> Phase 4 ──> Phase 5 ──> Phase 6
[Arch Lock]   [Found.]    [A1 & A2]   [A3 & A4]   [Ledger/UI] [A5 & A6]   [A7 & Polish]
```

* **Phase 0.1: Architecture Corrections & Governance Lock (COMPLETE)**
  - *Exit Conditions:* Elimination of unsafe assumptions (untrusted headers, fake immutability, missing packaging, unverified figures); architecture document locked.
* **Phase 1: Orchestration Foundation, Contracts, Provider Interface & Baseline Safety Controls (COMPLETE)**
  - *Implemented Modules:*
    - `backend/app/orchestration/contracts.py`: Versioned Pydantic v2 schemas (`EvidencePacket`, `EvidenceReference`, `ClaimKind`, `SignalInterpretation`, `InterventionProposal`, `SupportPlanDraft`, `EvidenceChallengeReport`, `ValidationSummary`, `OrchestrationResult`).
    - `backend/app/orchestration/catalog.py`: Explicit `SyntheticDemoCatalog` (`DEMO_CATALOG_V1`) with allowed owner role constraints.
    - `backend/app/orchestration/provider.py`: `LLMProviderProtocol` and deterministic offline `MockLLMClient` with configurable error injection.
    - `backend/app/orchestration/coordinator.py`: `OrchestrationCoordinator` enforcing hard 18.0s overall run deadline, 4.0s stage timeouts, max 1 retry for recoverable failures, preserving authoritative ML Evidence Card on failure.
    - `backend/app/orchestration/validator.py`: `DeterministicValidator` verifying claim-level citations against canonical 25-feature dictionary, catalog IDs, allowed roles, and supplementary clinical language regex.
    - `backend/app/orchestration/context.py`: `AgentContextFilter` enforcing least-privilege boundary by excluding sensitive demographic features (`gender`, `region`, `imd_band`, `disability`, etc.) by default and flagging demographic equity review.
    - `backend/app/orchestration/security.py`: Server-side `SecurityContext` enforcing campus isolation boundaries with explicit `is_test_context=True` marking.
    - `backend/app/orchestration/repository.py`: Ephemeral `InMemoryRunRepository` with payload fingerprinting and idempotency conflict detection.
    - `scripts/package_model.py` & `backend/app/orchestration/packaging.py`: Reproducible model packager verifying SHA-256 (`78a082...`) and metadata.
  - *Test Verification:* 41 orchestration unit tests (100% pass rate) running completely offline; 63 total backend tests passing without regressions.
* **Phase 2: Student Signal Interpreter (Agent 1) & Intervention Strategist (Agent 2) (COMPLETE)**
  - *Implemented Modules:*
    - `backend/app/orchestration/agents/signal_interpreter.py`: `StudentSignalInterpreter` generating evidence-grounded qualitative summaries, identifying observed values, flagging missing/conflicting signals, and detecting temporal trend vs snapshot distinctions.
    - `backend/app/orchestration/agents/intervention_strategist.py`: `InterventionStrategist` proposing policy-constrained candidate interventions strictly from `DEMO_CATALOG_V1` (or explicit `NO_SUPPORTED_INTERVENTION`), verifying permitted owner roles, and citing telemetry evidence.
    - `backend/app/orchestration/agents/prompts.py`: Versioned prompt templates (`SIGNAL_INTERPRETER_SYSTEM_PROMPT_V1`, `INTERVENTION_STRATEGIST_SYSTEM_PROMPT_V1`) and untrusted input sanitization wrappers isolating injection attacks.
    - `backend/app/orchestration/validator.py`: Extended `DeterministicValidator` with claim temporal trend validation (`validate_temporal_claims`), speculative inference detection (`check_speculative_inferences`), and probability/tier reinterpretation checks (`check_risk_reinterpretation`).
    - `backend/app/orchestration/coordinator.py`: Updated pipeline orchestration supporting 2-stage execution with downstream stages (Stages 3 & 4) explicitly marked as `PENDING`, enforcing validation gates before downstream stage entry.
    - `backend/app/orchestration/provider.py`: Implemented fail-closed `LiveProviderClient` with opt-in smoke testing capability while preserving 100% offline mock execution for automated tests.
  - *Test Verification:* 64 orchestration tests (100% pass rate) running completely offline; 87 total backend tests passing without regressions.
* **Phase 3: Support Plan Designer (Agent 3) & Evidence Challenge Agent (Agent 4) (COMPLETE)**
  - *Implemented Modules:*
    - `backend/app/orchestration/agents/support_plan_designer.py`: `SupportPlanDesigner` formulating structured, bounded draft support plans (1-5 action steps) strictly adhering to synthetic catalog allowed owner roles, target windows, and required follow-up evidence.
    - `backend/app/orchestration/agents/evidence_challenge_agent.py`: `EvidenceChallengeAgent` acting as independent adversarial critic auditing the complete pipeline (telemetry, interpretation, proposal, plan) and reporting structured challenge findings.
    - `backend/app/orchestration/agents/prompts.py`: Added versioned system prompts (`SUPPORT_PLAN_DESIGNER_SYSTEM_PROMPT_V1`, `EVIDENCE_CHALLENGE_AGENT_SYSTEM_PROMPT_V1`).
    - `backend/app/orchestration/contracts.py`: Extended `ActionStep` (stable `step_id`, `evidence_reference`, `follow_up_evidence`), `SupportPlanDraft` (`is_draft`, `rationale`, `limitations_and_questions`), `EvidenceChallengeReport` (structured `findings: list[ChallengeFinding]`), and `StageExecutionRecord` (`attempt_count: ge=0` ensuring skipped/pending stages report 0 attempts).
    - `backend/app/orchestration/validator.py`: Extended `DeterministicValidator` with `validate_support_plan` (step bounds, role constraints, target days bounding, draft status, task-outcome conflation prevention, follow-up evidence requirements) and `validate_evidence_challenge` mapping advisory critique flags to warnings.
    - `backend/app/orchestration/coordinator.py`: Full four-specialist triage pipeline integration enforcing sequential execution gating, preserving authoritative EvidenceCard, and ensuring completed 4-agent runs explicitly remain unapproved drafts awaiting human review.
  - *Test Verification:* 85 orchestration tests (100% pass rate) running completely offline; 108 total backend tests passing without regressions.
* **Phase 4: Human Review, Support Evidence Ledger & Case-Workflow Persistence (PLANNED - NEXT)**
  - *Deliverables:* Durable SQLite repository with WAL mode, advisor decision endpoints (`POST /cases/{id}/decision`), server-side identity context, and lightweight advisor review interface.
  - *Exit Conditions:* Human approval cryptographically seals the ledger entry; actions cannot mutate without advisor sign-off.
* **Phase 5: Stakeholder Communication Agent (Agent 5) & Follow-up Analyst (Agent 6)**
  - *Deliverables:* Event-triggered outreach generator and note analyzer; segregation of `TaskExecution` vs `OutcomeEvidence`.
  - *Exit Conditions:* Outbound messages require manual advisor dispatch; task completion never falsifies student outcome.
* **Phase 6: Cohort Learning Analyst (Agent 7), End-to-End Evaluation & Pitch Polish**
  - *Deliverables:* Precomputed aggregate reporting narrator; adversarial evaluation suite execution; slide deck and live synthetic demo polish.
  - *Exit Conditions:* Complete end-to-end execution of synthetic persona `LOW_ENGAGEMENT_AT_RISK` within execution budget with zero security leaks.
