# SUTRA CLI — Phase 4 Command Capability Matrix

| Command | Implemented in Rust | Corresponding Backend API Exists | Real API Integration Verified | Required Authentication & Permissions | Test Coverage | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sutra health` | Yes (`commands/health.rs`) | Yes (`GET /health`, `GET /ready`) | Yes (Verified against live backend: `/health` returns 200, `/ready` checks DB/ML state) | None (Public endpoint) | `test_health_ready.py`, live verification | Complete |
| `sutra auth login` | Yes (`commands/auth.rs`) | Yes (`GET /api/v1/auth/me`) | Yes (Verified via live JWT bearer token exchange against `/auth/me`) | Valid Supabase JWT bearer token | `session_tests.rs` (7 tests), `test_auth_security.py` | Complete |
| `sutra auth whoami` | Yes (`commands/auth.rs`) | Yes (`GET /api/v1/auth/me`) | Yes (Verified local secure session retrieval & backend profile verification) | Valid local session or `--token` flag | `session_tests.rs`, live test | Complete |
| `sutra auth logout` | Yes (`commands/auth.rs`) | Local session storage management | Yes (Verified deletion of `~/.sutra/session.json`) | None (Local operation) | `session_tests.rs::test_logout_session_deletion` | Complete |
| `sutra signals list` | Yes (`commands/signals.rs`) | Yes (`GET /api/v1/signals`) | Yes (Verified request format, tenancy headers, leadership access check) | Bearer JWT, active campus header, leadership cohort restriction enforced | `cli_tests.rs`, `test_workflow_e2e.py` | Complete |
| `sutra signals get <ID>` | Yes (`commands/signals.rs`) | Yes (`GET /api/v1/signals/{id}`) | Yes (Verified URL construction, error propagation, evidence card parsing) | Bearer JWT, active campus header, leadership cohort restriction enforced | `cli_tests.rs::test_uuid_validation`, `test_workflow_e2e.py` | Complete |
| `sutra signals review <ID>` | Yes (`commands/signals.rs`) | Yes (`POST /api/v1/signals/{id}/review`) | Yes (Verified review payload format, 5-char rationale policy check, case creation response) | Bearer JWT, campus header, educator/staff role | `cli_tests.rs::test_signal_review_request_serialization`, `test_workflow_e2e.py` | Complete |
| `sutra cases list` | Yes (`commands/cases.rs`) | Yes (`GET /api/v1/cases`) | Yes (Verified case list retrieval, state lowercase normalization filter, leadership restriction) | Bearer JWT, campus header, non-executive role | `test_workflow_e2e.py`, live verification | Complete |
| `sutra cases get <ID>` | Yes (`commands/cases.rs`) | Yes (`GET /api/v1/cases/{id}`) | Yes (Verified full case retrieval, task list, event timeline, follow-up history) | Bearer JWT, campus header, staff role | `cli_tests.rs::test_case_dto_deserialization_with_followups_and_outcome`, `test_workflow_e2e.py` | Complete |
| `sutra cases transition <ID>` | Yes (`commands/cases.rs`) | Yes (`POST /api/v1/cases/{id}/transition`) | Yes (Fixed in Phase 4: normalized `to_state` to lowercase to match canonical state machine graph) | Bearer JWT, campus header, staff role | `cli_tests.rs::test_case_transition_request_serialization`, `test_workflow_e2e.py` | Complete |
| `sutra cases assign <ID>` | Yes (`commands/cases.rs`) | Yes (`POST /api/v1/cases/{id}/assignment`) | Yes (Fixed in Phase 4: corrected endpoint URL from `/assign` to `/assignment`) | Bearer JWT, campus header, roles: `hod`, `mentor`, `institution_admin` | `cli_tests.rs::test_case_assignment_request_serialization`, `test_workflow_e2e.py` | Complete |
| `sutra cases follow-up <ID>` | Yes (`commands/cases.rs`) | Yes (`POST /api/v1/cases/{id}/follow-ups`) | Yes (Verified follow-up schema with `contact_status`, `proof_kind`, UTC timestamp) | Bearer JWT, campus header, staff role | `cli_tests.rs::test_follow_up_request_serialization`, `test_workflow_e2e.py` | Complete |
| `sutra cases outcome <ID>` | Yes (`commands/cases.rs`) | Yes (`POST /api/v1/cases/{id}/outcome`) | Yes (Verified outcome status, mandatory 5-char rationale policy, evidence kind) | Bearer JWT, campus header, staff role | `cli_tests.rs::test_outcome_request_serialization`, `test_workflow_e2e.py` | Complete |
| `sutra catalogue` | Yes (`commands/catalogue.rs`) | Yes (`GET /api/v1/interventions`) | Yes (Verified controlled catalog retrieval, role scoping, campus isolation) | Bearer JWT, campus header | `test_workflow_e2e.py` | Complete |
| `sutra ai status` | Yes (`commands/ai.rs`) | Yes (`GET /api/v1/ai/status`) | Yes (Verified live response from running FastAPI backend on port 8005) | Bearer JWT, campus header | `cli_tests.rs::test_ai_status_deserialization`, live integration verified | Complete |
| `sutra ai review-brief <SIGNAL_ID>` | Yes (`commands/ai.rs`) | Yes (`POST /api/v1/ai/review-brief`) | Yes (Verified advisory brief contract, catalog grounding, latency metadata) | Bearer JWT, campus header | `cli_tests.rs::test_ai_review_brief_deserialization`, `test_ai_orchestration.py` | Complete |
| `sutra ai summarize <STUDENT_ID>` | Yes (`commands/ai.rs`) | Yes (`POST /api/v1/ai/summarize-evidence`) | Yes (Verified multi-domain telemetry synthesis with ADR-003 financial data exclusion) | Bearer JWT, campus header | `test_ai_orchestration.py` | Complete |
| `sutra predict --file <PATH>` | Yes (`commands/predict.rs`) | Yes (`POST /api/v1/ml/predict`) | Yes (Verified 25-feature validation, anti-leakage checks, and root security compatibility) | Bearer JWT, campus header | `predict_tests.rs` (7 tests), `test_ml_integration.py`, `test_ml_root_security.py` | Complete |
| `sutra student score <ID>` | No (Excluded per Phase 3B.2 & Phase 4 instructions) | No operational endpoint exists (`POST /api/v1/students/{id}/score` does not exist) | Blocked (No Day-30 feature store in DB; operational student records lack 25 canonical features) | Not applicable | Documented in `CLI_PHASE_3B_2_DATA_AUDIT.md` | Blocked / Unsupported |

---

## Command Classification & Audit Summary

1. **Complete & Verified (18 operations):**
   - Health (`health`)
   - Authentication & Session Management (`auth login`, `auth whoami`, `auth logout`)
   - Signal Triage (`signals list`, `signals get`, `signals review`)
   - Case Lifecycle Management (`cases list`, `cases get`, `cases transition`, `cases assign`, `cases follow-up`, `cases outcome`)
   - Catalog (`catalogue`)
   - AI Advisory Subsystem (`ai status`, `ai review-brief`, `ai summarize`)
   - Early Warning ML Prediction (`predict --file`)

2. **Blocked / Unsupported (1 operation):**
   - `sutra student score <ID>`: Blocked due to absence of operational backend student feature-retrieval pipeline and lack of 25 Day-30 OULAD features in operational PostgreSQL storage (audited in Phase 3B.2).
