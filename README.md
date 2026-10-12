# SUTRA — Student Success and Intervention Orchestration Engine

**Team Overclocked**  
**Positioning:** *From Student Signals to Verified Support.*  

SUTRA bridges the critical gap between early academic risk identification and governed, evidence-based human intervention. Rather than treating risk scores as isolated black boxes, SUTRA grounds every student signal in a verifiable **Support Evidence Ledger** that links observable telemetry, deterministic model attribution, multi-agent qualitative analysis, adversarial verification, mandatory human review, and recorded follow-up outcomes.

---

## Repository Subsystems

- [backend/](file:///Users/demo/Competitions/Sutra/backend): FastAPI inference and decision-support service serving the Day-30 early warning model and structured SUTRA Evidence Cards.
- [ml/](file:///Users/demo/Competitions/Sutra/ml): Machine learning training pipelines, explainability modules, model evaluation records, synthetic datasets, and shadow mode evaluation harnesses.
- [docs/architecture/](file:///Users/demo/Competitions/Sutra/docs/architecture/phase_0_audit_and_multi_agent_strategy.md): Architectural decisions, multi-agent strategies, contracts, and roadmap specifications.

---

## Architecture & Implementation Roadmap

Full system architecture, safety contracts, and phase roadmap are detailed in [Phase 0.1 Architecture Specification](file:///Users/demo/Competitions/Sutra/docs/architecture/phase_0_audit_and_multi_agent_strategy.md):
- **Phase 0.1:** Repository Audit, Architecture Corrections & Evidentiary Governance (Complete)
- **Phase 1:** Orchestration Foundation, Contracts, Provider Interface & Baseline Safety Controls (Complete)
- **Phase 2:** Student Signal Interpreter & Intervention Strategist (Complete)
- **Phase 3:** Support Plan Designer & Evidence Challenge Agent (Complete)
- **Phase 4:** Human Review, Support Evidence Ledger, SQLite WAL Persistence & Advisor Review Interface (Complete)
- **Phase 5:** Stakeholder Communication Agent & Follow-up Note-Structuring Agent (Event-Triggered) (Planned - Next)
- **Phase 6:** Cohort Learning Analyst, Evaluation & Presentation Hardening (Planned)

---

## Running the Phase 4 Advisor Review Interface

### 1. Launch the Local Service
```bash
PYTHONPATH=ml/src:. uv run --python 3.11 --with fastapi,uvicorn,scikit-learn==1.7.2,pandas,pyyaml,joblib,httpx,xgboost,pydantic uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Access the Advisor Review Interface
Open your browser to:
[http://127.0.0.1:8000/app/](http://127.0.0.1:8000/app/)

### 3. Demonstration Workflow
1. **Screen A (Review Queue):** Click **"Seed Demo Case"** to ingest synthetic profile `LOW_ENGAGEMENT_AT_RISK` (`SYNTH-SCENARIO-LOW-02`). The service runs authentic ML inference, executes the four-agent triage pipeline, and registers the case in `DRAFT_AWAITING_REVIEW`.
2. **Screen B (Case Review & Evidence):** Inspect the authoritative ML Evidence Card ($P = 0.9287$, Risk Tier `HIGH`), Agent 1 qualitative interpretation with claim-level feature citations, Agent 2 catalog intervention selection, Agent 3 draft support plan, and Agent 4 advisory challenge findings. Verify the green deterministic validation pass badge distinct from advisory flags.
3. **Screen C (Advisor Decision):** Submit a human review decision (**Approve**, **Modify Plan**, **Reject**, or **Request Info**). If modifying, customize the action steps while enforcing catalog role constraints; the original draft plan is preserved as v1 and a new decision-linked v2 is created.
4. **Screen D (Support Evidence Ledger & Timeline):**
   - **Task Execution:** View created actionable tasks. Update task status to `COMPLETED` with an execution note. Observe that task execution **strictly preserves** student outcome as `UNOBSERVED`.
   - **Follow-up Record:** Record qualitative follow-up observations and evidence references.
   - **Distinct Student Outcome:** Record final student course achievement (`RECORDED`, `IN_PROGRESS`, or `UNOBSERVED`) independently from task completion.
   - **Audit Integrity:** Click **"Audit Integrity"** to verify the cryptographic SHA-256 backward hash pointer chain across all ledger events.

---

## Running Automated Tests

```bash
# Backend, Orchestration & Phase 4 Persistence / API Suite (121 tests)
PYTHONPATH=ml/src:. uv run --python 3.11 --with pytest,fastapi,scikit-learn==1.7.2,pandas,pyyaml,joblib,httpx,xgboost,pydantic pytest backend/tests

# ML Regression Suite (107 tests passing; 1 known pre-existing missing gitignored artifact failure tracked separately)
PYTHONPATH=ml/src:. uv run --python 3.11 --with pytest,fastapi,scikit-learn==1.7.2,pandas,pyyaml,joblib,httpx,xgboost,pydantic pytest ml/tests
```

