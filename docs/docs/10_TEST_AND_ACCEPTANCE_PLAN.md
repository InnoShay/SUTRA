# 10 · Test, Verification & Acceptance Plan

## 1. Automated Test Architecture (Pytest & HTTPX)

SUTRA utilizes **Pytest** with `pytest-asyncio` and `httpx.AsyncClient` for rigorous automated verification. All tests run locally without external cloud dependencies:

```text
tests/
├── unit/
│   ├── test_policy_evaluator.py     # Pure deterministic rule evaluator & operators
│   ├── test_state_machine.py        # Case lifecycle state transitions & validations
│   ├── test_metrics_denominators.py # Mathematical formula calculations
│   └── test_dto_serialization.py   # Pydantic v2 field allow-lists & redactions
├── integration/
│   ├── test_ingestion_pipeline.py   # CSV/JSON batch imports, deduplication, row errors
│   ├── test_case_lifecycle.py       # End-to-end signal -> case -> follow-up -> outcome
│   ├── test_outbox_worker.py        # Polling, row locking, retries, escalation events
│   └── test_ml_serving.py           # Co-located sutra_ml inference & Evidence Cards
├── security/
│   ├── test_jwt_auth.py             # Server-side Supabase token validation & expiry
│   ├── test_rbac_matrix.py          # 8-role capability matrix enforcement
│   ├── test_campus_isolation.py     # Cross-institution 404 boundary tests
│   └── test_domain_isolation.py     # Finance and counselling payload protection
├── temporal/
│   ├── test_anti_leakage.py         # Available_at <= cutoff enforcement
│   └── test_replay_fidelity.py     # Historical frozen evidence replay
└── e2e/
    └── test_demo_journey.py         # Complete simulated demo journey
```

---

## 2. The Ten Non-Negotiable Acceptance Gates

| Gate Name | Pass Condition | Failure Action |
|---|---|---|
| **Gate 1: JWT & Campus Guard** | Anonymous requests return 401; cross-campus IDs return indistinguishable 404; inactive memberships return 403. | Block build; security violation. |
| **Gate 2: Temporal Anti-Leakage** | Observations with `available_at > as_of_at` are strictly excluded from decisions. | Block build; data integrity failure. |
| **Gate 3: Missing Data Integrity** | Missing observations produce `unknown` / `insufficient_evidence`, never a silent 0 or imputed mean. | Block build; invalid assumption. |
| **Gate 4: Domain Segregation** | Unauthorized users (faculty, mentor) querying fee details receive 403; fee fields absent from general DTOs. | Block build; privacy leak. |
| **Gate 5: State Machine Invariants** | Unpermitted transitions (e.g. `assigned` → `closed`) rejected with 409 Conflict. | Block build; lifecycle flaw. |
| **Gate 6: Ownership Acceptance** | Owner assignment and explicit owner acceptance are logged as distinct chronological events. | Block build; accountability gap. |
| **Gate 7: Outbox & Escalation** | Expired deadline triggers exactly one escalation event and one outbox notification intent. | Block build; worker defect. |
| **Gate 8: Outcome Denominators** | Concluded cases with `unknown` outcome remain in analytical denominators. | Block build; metrics distortion. |
| **Gate 9: Small-Cell Suppression** | Cohorts with $N < 5$ students return masked metrics with `suppressed: true`. | Block build; re-identification risk. |
| **Gate 10: Zero Client Secrets** | Build scanner confirms `SUPABASE_SERVICE_ROLE_KEY` is completely absent from client bundles and git. | Block deployment; credential exposure. |

---

## 3. ML Subsystem Anti-Leakage Tests (`ml/tests/`)

The machine learning package `sutra_ml` incorporates 26 automated tests verifying:
- **Temporal Cutoff Boundary:** Hard temporal filter drops all VLE clicks and assessment submissions where $t > 30$.
- **Score Exclusion:** Verification that raw assessment scores are excluded due to unrecorded grading timestamps (`date_graded`).
- **Target Independence:** Final module results (`final_result`) and post-cutoff unregistration dates (`date_unregistration > 30`) are decoupled and completely excluded from feature columns.
- **Zero Row Multiplication:** Verification that aggregation produces exactly one row per student-course presentation (27,466 active cohort rows).

---

## 4. Adversarial Test Scenarios

- **The Late Grade Attack:** Student submits assignment on Day 5; instructor grades it on Day 12. Evaluation run on Day 7 must exclude the grade.
- **The Stale Feed Scenario:** LMS engagement sync failed for 10 days. Policy evaluation must return `stale_source` / `insufficient_evidence`, not 0 clicks.
- **The Spoofed Header Attack:** Non-admin user passes `{"role": "institution_admin"}` in request JSON. Backend derives role strictly from server database.
- **The Replay Verification:** Running the policy engine against a 6-month-old evidence packet reproduces the exact historical result and rationale codes.
- **The Network Partition:** Notification dispatch times out. Worker retries using exponential backoff up to 5 times without duplicating business events.

---

## 5. Scope & Validity Limitations

> [!NOTE]
> Passing automated test suites on synthetic fixtures confirms software correctness, state machine adherence, and security boundary integrity. It does **not** prove causal retention improvement, predictive precision on real campus student populations, or legal compliance under international education regulations.
