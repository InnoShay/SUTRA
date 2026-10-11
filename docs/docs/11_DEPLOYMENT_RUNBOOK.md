# 11 · Deployment, Developer Runbook & Demo Walkthrough

## 1. Prerequisites & Environment Setup

### System Requirements:
- **Python:** 3.10 or higher (`python3 --version`).
- **Node.js:** 18.x or 20.x LTS (for decoupled Next.js client, `node -v`).
- **PostgreSQL:** Version 15+ (local Docker instance or Supabase project).
- **Package Managers:** `pip` / `virtualenv`, `npm` / `pnpm`.

---

## 2. Backend Workspace Layout

```text
app/
├── api/
│   └── v1/
│       ├── endpoints/
│       │   ├── auth.py          # Session and campus membership
│       │   ├── imports.py       # Observation batch uploads
│       │   ├── students.py      # Student 360° support views
│       │   ├── signals.py       # Policy evaluation & review queue
│       │   ├── cases.py         # 10-stage lifecycle transitions
│       │   ├── follow_ups.py    # Delivery proof logging
│       │   ├── outcomes.py      # Attributed outcome recording
│       │   ├── analytics.py     # Cohort & operational metrics
│       │   ├── ml.py            # Model metadata & inference
│       │   └── ai.py            # Optional bounded LLM endpoints
│       └── router.py            # Aggregated /api/v1 router
├── core/
│   ├── config.py                # Pydantic v2 Settings validation
│   ├── security.py              # Supabase JWT signature verification
│   └── database.py              # SQLAlchemy 2.x async engine & sessions
├── models/                      # SQLAlchemy 2.x declarative ORM models
├── schemas/                     # Pydantic v2 request & response DTOs
├── modules/
│   ├── policy/                  # Pure deterministic rule evaluator
│   └── worker/                  # Outbox dispatcher & deadline scanner
├── ml/                          # Co-located wrapper around sutra_ml
└── main.py                      # FastAPI application entrypoint

alembic/                         # Alembic migration scripts
fixtures/                        # Synthetic seed data
tests/                           # Pytest test suite
```

---

## 3. Developer Quick-Start Instructions

### Step 1: Clone and Configure Environment
```bash
cp SUTRA_Backend_Docs/.env.example .env
# Edit .env and supply local PostgreSQL credentials and Supabase sandbox keys
```

### Step 2: Initialize Virtual Environment & Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt  # FastAPI, Pydantic v2, SQLAlchemy 2.x, asyncpg, etc.
pip install -e ml/               # Editable install of sutra_ml package
```

### Step 3: Run Database Migrations (Alembic)
```bash
# Execute Alembic migrations to apply core schema and RLS policies
alembic upgrade head
```

### Step 4: Seed Synthetic Demonstration Fixtures
```bash
python scripts/seed_demo_data.py --fixture SUTRA_Backend_Docs/fixtures/demo_seed.json
```

### Step 5: Start Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Access interactive OpenAPI Swagger UI at: http://localhost:8000/docs
```

### Step 6: Start Decoupled Frontend (Next.js Client)
```bash
cd frontend
npm install
npm run dev
# Access SUTRA Web UI at: http://localhost:3000
```

---

## 4. End-to-End Evaluation Demo Walkthrough

Follow this rehearsed sequence to demonstrate the complete **“No Alert Without Action”** lifecycle without manual database edits:

1. **Liveness & Readiness Verification:**
   - Query `GET /ready`. Confirm database connected and `sutra_ml` initialized.
2. **Student 360° View & Temporal Anti-Leakage:**
   - Log in as Academic Mentor (`u_advisor`).
   - Query `GET /api/v1/students/SYN-1007/support-view`.
   - Verify attendance (58%), missing assignments (3), and stale participation warning.
   - Confirm fee details are **completely absent** from the mentor response.
3. **Signal Evaluation & Evidence Card Inspection:**
   - Execute `POST /api/v1/students/SYN-1007/signals/evaluate` with cutoff `2026-10-07`.
   - Verify that student assessment score from `2026-10-10` is **strictly excluded** because `available_at > cutoff`.
   - Inspect the **Evidence Card**: verify deterministic trigger + ML baseline risk probability (0.68) at threshold 0.46 with top SHAP factors.
4. **Human Review & Action Selection:**
   - Execute `POST /api/v1/signals/{signalId}/review`: select `modify`, choose `mentor_check_in`, provide rationale code `REVIEWER_SELECTED_ALTERNATIVE`.
5. **Case Creation & Owner Assignment:**
   - Execute `POST /api/v1/signals/{signalId}/cases`: assign `u_advisor`, set deadline `2026-10-14T10:00:00Z`.
6. **Owner Acceptance:**
   - Log in as assignee `u_advisor`.
   - Call `POST /api/v1/cases/{caseId}/accept-assignment`.
   - Inspect case history; verify assignment and acceptance logged as distinct events.
7. **Virtual Demo Clock Advance & Automated Escalation:**
   - Advance demo clock past due date: `POST /api/v1/admin/demo-clock/advance` (`hours: 48`).
   - Run worker cycle. Verify case marked `is_escalated = true` and single outbox notification created.
8. **Follow-Up Proof Recording:**
   - Call `POST /api/v1/cases/{caseId}/follow-ups`: status `student_reached`, proof kind `staff_attestation`, note recorded.
9. **Outcome Conclusion:**
   - Call `POST /api/v1/cases/{caseId}/outcome`: record `outcome_status: "unknown"`, reason: "Support delivered; awaiting next exam results".
   - Close case: `POST /api/v1/cases/{caseId}/transition` (`to_state: "closed"`).
10. **Cohort Analytics & Reconciliation:**
    - Query `GET /api/v1/analytics/overview`.
    - Verify that closed case with unknown outcome is included in the denominator.
    - Verify that small student subgroups ($N < 5$) display `suppressed: true`.

---

## 5. Security & Secret Management

- **`SUPABASE_SERVICE_ROLE_KEY`:** Server-only secret key. Bypasses all Row Level Security. Must **never** be included in frontend `.env.local`, client bundles, or logged to disk.
- **`SUPABASE_JWT_SECRET`:** Kept strictly server-side by the FastAPI backend to cryptographically verify token signatures.
- **Safe Recovery:** If an outbox worker crashes, restart safely: all state resides in PostgreSQL; un-dispatched rows remain `pending` and are picked up on restart.
