# SUTRA CLI — Phase 13 Implementation Report: Evidence Cards and Human-Reviewed Support Recommendations

**Timestamp**: 2026-10-12  
**Status**: Completed  
**Branch**: `cli`  
**Phase Objective**: Establish an explainable, 5-tier Evidence Card architecture that cleanly separates empirical observations, rule triggers, ML predictions, AI decision-support advice, and human decision records, while strictly enforcing prompt injection neutralization, financial data segregation (ADR-003), catalogue grounding, and non-causal advisory invariants.

---

## 1. Executive Summary & Core Architectural Invariants

Phase 13 establishes strict separation between factual observation, statistical probability, deterministic rules, generative advisory text, and human accountability records.

1. **Strict 5-Tier Evidence Separation**:
   - **Tier 1 (Observed Student Data)**: Empirical telemetry events (attendance, LMS submissions, biometric turnstile), quality states (`valid`, `stale`), and data limitations. Financial records (`FinanceObservation`) are strictly excluded per ADR-003.
   - **Tier 2 (Rule-Based Signals)**: Deterministic policy engine triggers, rule keys, evaluation timestamps, and quality states.
   - **Tier 3 (ML Predictive Inference)**: Production serving outputs (`LogisticRegressionBaseline v1.0.0`), Day-30 cutoff, Platt-calibrated probabilities, decision thresholds (0.46), and directional feature attributions. Clearly marked as correlational and non-causal.
   - **Tier 4 (AI Decision-Support & Candidate Interventions)**: Generative synthesis, neutral questions for staff investigation, uncertainties, and candidate interventions strictly restricted to the campus `InterventionCatalog`.
   - **Tier 5 (Human Decision History & Case Outcomes)**: Human reviews, reason codes, case state transitions, follow-up logs, and recorded final outcomes.
2. **Contradictory & Missing Evidence Surfacing**:
   - When conflicting signals exist (e.g. recorded attendance >= 80% concurrent with an `attendance_drop` trigger rule, or high VLE clickstream concurrent with missing submissions), the system flags `Contradictions Detected` instead of synthesizing an artificial narrative.
   - Sparse telemetry (< 3 observations) or stale observations are surfaced in `Uncertainties & Data Caveats`.
3. **Prompt Injection & Delimiter Neutralization**:
   - `sanitize_untrusted_text` neutralizes system prompt override attempts (`ignore previous instructions`, `system prompt:`, `disregard all rules`, etc.) into `[UNTRUSTED_INJECTION_NEUTRALIZED]` and strips delimiter breakout attempts.
4. **Catalogue-Grounded Governance**:
   - Candidate interventions must match the active campus `InterventionCatalog`. Unsupported or fabricated actions (e.g., `expel_student`, `financial_fine`) are dropped by `validate_and_filter_candidate_interventions`.
5. **Non-Causal Advisory Invariant**:
   - All AI output is strictly advisory. It never diagnoses conditions, infers personal circumstances without evidence, or directly mutates student case state.

---

## 2. API Contract Specification

### 2.1 Enhanced `POST /api/v1/ai/review-brief`
Generates the comprehensive 5-tier evidence brief for an active signal.

- **Request**: `{"signal_id": "<UUID>"}`
- **Headers**:
  - `Authorization: Bearer <JWT>` (Roles: `faculty`, `hod`, `mentor`, `institution_admin`, `counsellor`)
  - `X-Campus-Id: <UUID>`
- **Response**: `200 OK` (`AIStructuredReviewBriefResponse`) with:
  - `target_student_ref`: Student external reference
  - `signal_id`: Signal UUID
  - `tier1_observed_data`: `ObservedDataTier` (counts, freshness, domains, facts, contradictions, limitations)
  - `tier2_rule_signal`: `RuleSignalTier` (rule key, result, evaluated timestamp, explanation)
  - `tier3_ml_prediction`: `MLPredictionTier` (model name, cutoff, risk probability, threshold, classification, attributions)
  - `tier4_ai_recommendation`: `AIRecommendationTier` (summary, uncertainties, neutral questions, candidate interventions)
  - `tier5_human_decision`: `HumanDecisionTier` (reviewed decision, reviewer, case state, follow-ups count, outcome)
  - `metadata`: `AIExecutionMetadata` (latency, provider, mock flag, safety disclaimer)

### 2.2 Student Evidence Summary `GET /api/v1/students/{student_id}/evidence-summary`
Returns the 5-tier evidence summary card for any authorized student by UUID or external reference (`SYN-1007`).

---

## 3. CLI Command Specifications

### 3.1 `sutra ai review-brief <SIGNAL_ID>`
Generates and displays the complete 5-tier evidence review card for a specific policy signal.

### 3.2 `sutra ai evidence <STUDENT_ID_OR_REF>`
Displays the 5-tier synthesized evidence summary card for an authorized student record.

### 3.3 `sutra ai summarize <STUDENT_ID_OR_REF>`
Synthesizes student multi-domain telemetry into structured facts, uncertainties, and catalogue recommendations with ADR-003 financial data exclusion.

---

## 4. Verification & Testing

### 4.1 Backend Pytest Integration Suite (`tests/test_ai_evidence_cards.py`)
6 dedicated test suites covering all required scenarios:
1. `test_prompt_injection_neutralization`: Verifies neutralization of system prompt override keywords and delimiter breakout sequences.
2. `test_unsupported_intervention_rejection`: Verifies unauthorized candidate interventions outside the campus catalogue are dropped.
3. `test_ai_review_brief_five_tier_separation`: Verifies that `tier1_observed_data`, `tier2_rule_signal`, `tier3_ml_prediction`, `tier4_ai_recommendation`, and `tier5_human_decision` are populated and distinct.
4. `test_ai_review_brief_contradictory_observations`: Verifies that telemetry contradictions (e.g. high attendance concurrent with attendance drop alert) are detected and surfaced.
5. `test_ai_sensitive_financial_data_exclusion`: Verifies that fee support and financial aid observations are strictly excluded from AI prompts and outputs per ADR-003.
6. `test_student_evidence_summary_endpoint`: Tests `GET /api/v1/students/{id}/evidence-summary` with external reference `SYN-1008`.

**Backend Suite Result**: **127/127 passed** across all backend tests (`pytest tests/`).

### 4.2 Rust CLI Test Suite (`cli/tests/cli_tests.rs`)
Added `test_ai_review_brief_five_tier_deserialization` verifying full deserialization of the 5 tiers into `AiReviewBriefResponse`.

**Rust Test Suite Result**: **48/48 passed** across all 7 test suites (`cargo test`).

### 4.3 Live CLI Verification (`scratch/run_phase13_live_verification.py`)
Tested against a live background server on port 8013:
- [x] Scenario 1: `sutra ai review-brief <SIGNAL_ID>` rendered all 5 tiers cleanly.
- [x] Scenario 2: Contradictory evidence (85% attendance vs. drop trigger) surfaced in Tier 1 and Tier 4.
- [x] Scenario 3: `sutra ai evidence SYN-1007` rendered student 5-tier card with ADR-003 exclusion notice.
- [x] Scenario 4: `sutra ai summarize SYN-1007` rendered telemetry facts and uncertainties.
- [x] Scenario 5: Leadership role access rejected with HTTP 403 `INSUFFICIENT_ROLE_PERMISSIONS`.
- [x] Scenario 6: Expired JWT token rejected with HTTP 401 `TOKEN_EXPIRED`.

---

## 5. Changed Files Summary

| File Path | Description of Changes |
| :--- | :--- |
| `app/schemas/ai.py` | Added 5 distinct tier schemas (`ObservedDataTier`, `RuleSignalTier`, `MLPredictionTier`, `AIRecommendationTier`, `HumanDecisionTier`) and enriched brief responses. |
| `app/ai/prompt.py` | Added prompt injection keyword neutralization and reinforced financial record exclusion. |
| `app/ai/providers.py` | Enhanced `DeterministicMockProvider` and `OpenAIProvider` with contradiction detection and telemetry sparsity warnings. |
| `app/ai/service.py` | Implemented 5-tier data aggregation from observations, signals, ML evidence cards, and cases. |
| `app/api/v1/ai.py` | Supported `student_ref` in `POST /ai/summarize-evidence`. |
| `app/api/v1/students.py` | Added `GET /{student_id}/evidence-summary` endpoint. |
| `cli/src/models.rs` | Added 5-tier DTOs (`ObservedDataTierDto`, `RuleSignalTierDto`, `MLPredictionTierDto`, `AIRecommendationTierDto`, `HumanDecisionTierDto`). |
| `cli/src/client.rs` | Updated `ai_summarize_evidence` to take `&str` and added `get_student_evidence_summary`. |
| `cli/src/commands/ai.rs` | Rewrote `ai_review_brief` and added `ai_student_evidence` with rich 5-tier terminal rendering. |
| `cli/src/main.rs` | Added `sutra ai evidence` subcommand and updated `sutra ai summarize` parameter. |
| `cli/tests/cli_tests.rs` | Added `test_ai_review_brief_five_tier_deserialization`. |
| `tests/test_ai_evidence_cards.py` | New comprehensive integration test suite for Phase 13. |
| `CLI_PHASE_13_REPORT.md` | Master documentation report for Phase 13. |
