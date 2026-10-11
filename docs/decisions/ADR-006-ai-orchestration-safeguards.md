# ADR-006 · Bounded AI Orchestration and Safety Safeguards
- **Status:** Accepted as Planned / Optional (Design Boundary).
- **Context:** Generative AI capabilities (LLMs) can assist human educators by summarizing fragmented observations, suggesting relevant support options from an approved catalogue, or drafting empathetic outreach notes. However, unconstrained autonomous agents pose severe risks: hallucinated diagnoses, unintended disciplinary actions, unauthorized data exposure, and non-deterministic state mutations.
- **Decision:**
  1. **Strictly Bounded Assistance:** AI capabilities are optional support functions layered *around* the deterministic core workflow, never replacing or bypassing it.
  2. **Allowed Capabilities (Planned):**
     - Evidence summarization (`POST /api/v1/ai/summarize-evidence`): Synthesizing timeline observations into concise educator briefs.
     - Intervention suggestion (`POST /api/v1/ai/suggest-intervention`): Recommending actions strictly restricted to the controlled `intervention_catalog`.
     - Follow-up draft generation (`POST /api/v1/ai/draft-followup`): Drafting suggested outreach templates for mentor review.
  3. **Strict Invariants & Prohibitions:**
     - AI must **never** execute raw SQL, mutate database state directly, modify user roles, or trigger automated external notifications/outreach.
     - All suggestions require **mandatory human review and approval** before creating cases or recording follow-ups.
     - Data minimization: Sensitive financial and counselling notes are strictly excluded from AI prompts.
     - Execution audit: Every LLM call logs prompt tokens, model identifier, latency, cost, and output schema validation status in `ai_execution_logs`.
     - Deterministic Fallback: When AI providers time out, error, or are disabled, the system gracefully falls back to deterministic rule explanations.
- **Consequences:**
  - Zero autonomous agent drift or hallucinated policy actions.
  - Complete compliance with non-punitive product invariants.
  - Predictable execution latency and budget controls.
- **Rejected Alternatives:**
  - Multi-agent autonomous frameworks (e.g. AutoGen / CrewAI) making unilateral case interventions.
  - Giving LLMs write-access tools to mutate student records directly.
- **Review Trigger:** Delivery of core PS6 workflow (Phases 0–5) before initiating Phase 6 AI prototyping.
