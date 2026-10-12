# 11 · Deployment, Developer Runbook & Demo Walkthrough

Team: **Overclocked** | Hackathon: **CODEX 3.0** | Problem Statement: **PS6 — Student Success and Intervention Orchestration Engine**  
Principle: **“No Alert Without Action.”**

---

## 1. Prerequisites & Environment Setup

### System Requirements:
- **Python:** 3.10+ (Python 3.11 tested and recommended, `python3 --version`).
- **Node.js:** 18.x or 20.x LTS (for Next.js 14 frontend, `node -v`).
- **Rust Toolchain:** 1.75+ / 1.99+ (for `sutra-cli`, `cargo --version`).
- **Database:** PostgreSQL 15+ (production / staging) or SQLite with `aiosqlite` (local test & demo).
- **Package Managers:** `pip` / `virtualenv`, `npm`, `cargo`.

---

## 2. Architecture & Service Topology

```text
               ┌────────────────────────────────────────────────────────┐
               │              Web Client (Next.js 14 PWA)               │
               │   - Apple-inspired design preserved                   │
               │   - Standalone manifest & static-only Service Worker   │
               │   - ZERO offline caching of student data / JWTs        │
               └───────────────────────────┬────────────────────────────┘
                                           │ HTTPS (Bearer JWT + X-Campus-Id)
                                           ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     FastAPI Monolith Gateway (/api/v1)                │
│  - Supabase JWT validation & Multi-Campus Tenant Boundary Middleware   │
│  - Request Idempotency Middleware (Idempotency-Key)                   │
├──────────────────────────┬────────────────────────────┬───────────────┤
│    Core PS6 Engine       │    Decision Support ML     │ Bounded AI    │
│  - 6 Observation Domains │  - Logistic Regression v1  │  Orchestration│
│  - Deterministic Policy  │  - Platt Calibrated (0.46) │  - Advisory   │
│  - 10-State Case Machine │  - 25-Feature Day-30 Vector│  - Fenced     │
│  - Follow-up Proof Logs  │  - Explainable Evidence    │  - Catalog-   │
│  - Outbox Worker & Due   │    Card attributions       │    Confined   │
│    Date Escalations      │  - Never auto-intervenes   │  - Mock       │
│  - Closed Outcome Proof  │                            │    Fallback   │
└──────────────────────────┴────────────────────────────┴───────────────┘
                                           │
                                           ▼
               ┌────────────────────────────────────────────────────────┐
               │           Database & Persistence Layer                 │
               │  - PostgreSQL 15+ / SQLite3 (Alembic Migrations)       │
               │  - Transactional Outbox (NotificationOutbox)           │
               │  - Immutable Audit History (CaseEvent, AIOrchLog)      │
               └────────────────────────────────────────────────────────┘
                                           ▲
                                           │ HTTPS (/api/v1)
               ┌───────────────────────────┴────────────────────────────┐
               │                   Rust Standalone CLI                  │
               │     `sutra-cli` (health, signals, cases, cat, ai)      │
               │   - Communicates solely via authenticated /api/v1      │
               └────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Clean Setup Guide (< 5 Minutes)

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/InnoShay/SUTRA.git
cd SUTRA

# Create and populate .env from template
cp docs/.env.example .env
```

### Step 2: Initialize Python Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -e ml/
```

### Step 3: Run Database Migrations
```bash
# Applies baseline, ML inference logs, and idempotency/reliability hardening
alembic upgrade head
```

### Step 4: Seed Deterministic Synthetic Demo Dataset
```bash
python scripts/seed_demo_data.py --fixture docs/fixtures/demo_seed.json
```
*Creates: Demo campus, 5 authorized persona memberships (faculty, counselor, dean, leadership, superadmin), active policy version, 6 synthetic students (`SYN-1007` to `SYN-1012`), initial policy signals, and demonstration case with task and follow-up timeline.*

### Step 5: Build and Verify Rust CLI
```bash
cd cli
cargo test
cargo build --release
cd ..
# Binary is located at ./cli/target/release/sutra
```

### Step 6: Start FastAPI Backend Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
# Verify:
curl -s http://localhost:8000/api/v1/health
curl -s http://localhost:8000/api/v1/ready
```

### Step 7: Start Next.js Frontend Client
```bash
cd frontend
npm install
npm test       # Validates contract types and security boundaries
npm run dev    # Starts frontend at http://localhost:3000
```

---

## 4. Live Demonstration Walkthrough Script

### Persona Reference Tokens
Generate tokens using the local environment helper:
```bash
# Faculty Persona (Prof. Ananya Sharma)
FACULTY_TOKEN=$(python -c "from tests.utils import make_jwt; import uuid; print(make_jwt(user_id=uuid.UUID('11111111-1111-1111-1111-111111111111')))")

# Mentor Persona (Dr. Meera Nambiar)
MENTOR_TOKEN=$(python -c "from tests.utils import make_jwt; import uuid; print(make_jwt(user_id=uuid.UUID('22222222-2222-2222-2222-222222222222')))")

# Leadership Persona (Prof. S. K. Kulkarni)
LEADERSHIP_TOKEN=$(python -c "from tests.utils import make_jwt; import uuid; print(make_jwt(user_id=uuid.UUID('44444444-4444-4444-4444-444444444444')))")
```

---

### Scenario 1: Primary Traceable Workflow ("No Alert Without Action")

**Goal:** Demonstrate complete traceable path from raw observations to auditable closed outcome.

#### Step 1.1: System Health & Readiness Verification
- **Action:**
  ```bash
  ./cli/target/release/sutra health
  ```
- **Expected Result:**
  - `Health: ok (version: 0.1.0)`
  - `Readiness: ready (database: ok, ml_model: ready)`

#### Step 1.2: Inspect Controlled Intervention Catalogue
- **Action:**
  ```bash
  ./cli/target/release/sutra --token "$FACULTY_TOKEN" catalogue
  ```
- **Expected Result:**
  - Lists 4 campus-controlled intervention keys: `academic_tutoring_offer`, `counselling_referral`, `fee_emergency_counselling`, `mentor_check_in`.
  - Shows authorized recipient role for each intervention.

#### Step 1.3: Inspect Signal Triage Queue
- **Action:**
  ```bash
  ./cli/target/release/sutra --token "$FACULTY_TOKEN" signals list
  ```
- **Expected Result:**
  - Displays pending signals for synthetic students (`SYN-1007` Asha, `SYN-1008` Dev, etc.).
  - Shows deterministic rule trigger explanation and evidence digest.

#### Step 1.4: Request Bounded AI Review Brief (Advisory Assistance)
- **Action:**
  ```bash
  SIGNAL_ID=$(curl -s -H "Authorization: Bearer $FACULTY_TOKEN" -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" http://localhost:8000/api/v1/signals | jq -r '.[0].id')
  ./cli/target/release/sutra --token "$FACULTY_TOKEN" ai review-brief "$SIGNAL_ID"
  ```
- **Expected Result:**
  - Clear banner: `[ADVISORY ONLY • NON-BINDING • REQUIRES HUMAN CONFIRMATION]`.
  - Section 1: Factual summary of observed telemetry.
  - Section 2: Observed facts separated from uncertainties.
  - Section 4: Data gaps (e.g. missing direct student self-report).
  - Section 6: Candidate interventions strictly filtered from catalog (`academic_tutoring_offer` / `mentor_check_in`).
  - Zero database mutations occur automatically.

#### Step 1.5: Record Human Educator Review Decision
- **Action (CLI or Web UI):**
  Educator approves signal and selects catalog intervention:
  ```bash
  curl -s -X POST "http://localhost:8000/api/v1/signals/$SIGNAL_ID/review" \
    -H "Authorization: Bearer $FACULTY_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    -H "Content-Type: application/json" \
    -d '{
      "decision": "approve",
      "selected_intervention_key": "mentor_check_in",
      "reason_code": "REVIEWER_APPROVED_RECOMMENDATION",
      "rationale": "Attendance drop verified alongside 3 missing coursework assignments."
    }' | jq .
  ```
- **Expected Result:**
  - Returns `decision: "approve"`, and automatically creates a new Case in `suggested` / `action_planned` state.

#### Step 1.6: Assign Accountable Owner & Set Enforceable Deadline
- **Action:**
  ```bash
  CASE_ID=$(curl -s -H "Authorization: Bearer $FACULTY_TOKEN" -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" http://localhost:8000/api/v1/cases | jq -r '.[0].id')
  curl -s -X POST "http://localhost:8000/api/v1/cases/$CASE_ID/assignment" \
    -H "Authorization: Bearer $FACULTY_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    -H "Content-Type: application/json" \
    -d '{
      "primary_owner_user_id": "22222222-2222-2222-2222-222222222222",
      "due_at": "2026-10-19T10:00:00Z",
      "reason_code": "ASSIGNED_TO_DEPARTMENT_MENTOR"
    }' | jq .
  ```
- **Expected Result:**
  - Case state updates to `assigned`, with primary owner `Dr. Meera Nambiar` and due date.

#### Step 1.7: Owner Accepts Responsibility
- **Action:**
  ```bash
  curl -s -X POST "http://localhost:8000/api/v1/cases/$CASE_ID/accept-assignment" \
    -H "Authorization: Bearer $MENTOR_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    -H "Content-Type: application/json" \
    -d '{"acceptance_note": "Acknowledged. Scheduled 1-on-1 meeting."}' | jq .
  ```
- **Expected Result:**
  - Case state updates to `accepted`.

#### Step 1.8: Demonstrate Follow-Up Contact & Proof Logging
- **Action:**
  ```bash
  curl -s -X POST "http://localhost:8000/api/v1/cases/$CASE_ID/follow-ups" \
    -H "Authorization: Bearer $MENTOR_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    -H "Content-Type: application/json" \
    -d '{
      "follow_up_type": "support_delivered",
      "contact_status": "student_reached",
      "proof_kind": "appointment_record",
      "occurred_at": "2026-10-13T10:00:00Z",
      "note": "Conducted 45m tutoring session. Identified missed prerequisites in Calculus module.",
      "proof_ref": "CAL-OFFICE-OCT13"
    }' | jq .
  ```
- **Expected Result:**
  - Follow-up recorded with proof; case state transitions to `follow_up_due`.

#### Step 1.9: Record Student Outcome Separately from Task Completion
- **Action:**
  ```bash
  curl -s -X POST "http://localhost:8000/api/v1/cases/$CASE_ID/outcome" \
    -H "Authorization: Bearer $MENTOR_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    -H "Content-Type: application/json" \
    -d '{
      "outcome_status": "helped",
      "rationale": "Student submitted both backlogged assignments within 7 days of tutoring session.",
      "evidence_kind": "academic_record"
    }' | jq .
  ```
- **Expected Result:**
  - Returns `outcome_status: "helped"`.
  - Completing follow-up is proven distinct from whether the student was actually helped.

#### Step 1.10: Formal Closure & Immutable History Audit
- **Action:**
  ```bash
  curl -s -X POST "http://localhost:8000/api/v1/cases/$CASE_ID/transition" \
    -H "Authorization: Bearer $MENTOR_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    -H "Content-Type: application/json" \
    -d '{"to_state": "closed", "reason_code": "CASE_OBJECTIVES_FULFILLED"}' | jq .

  # View Immutable Event Log:
  curl -s -H "Authorization: Bearer $MENTOR_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    "http://localhost:8000/api/v1/cases/$CASE_ID/history" | jq .
  ```
- **Expected Result:**
  - Case state is `closed`.
  - Chronological timeline verifies complete chain: `CASE_CREATED_FROM_SIGNAL` → `OWNER_ASSIGNED` → `ASSIGNMENT_ACCEPTED` → `OUTCOME_RECORDED` → `CASE_CLOSED`.

---

### Scenario 2: Safety Boundaries, Fences, and Graceful Fallback

**Goal:** Demonstrate robust security, role containment, and safe degradation when dependencies fail.

#### Step 2.1: Cross-Campus Isolation Fence
- **Action:** Attempt to access Campus A student data using Campus B tenant header:
  ```bash
  curl -s -i "http://localhost:8000/api/v1/students/SYN-1007" \
    -H "Authorization: Bearer $FACULTY_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000002"
  ```
- **Expected Result:**
  - `HTTP/1.1 404 Not Found` (Campus B faculty has zero visibility into Campus A records).

#### Step 2.2: Sensitive Domain Separation (ADR-003)
- **Action:** Faculty attempts to access student financial ledger:
  ```bash
  STUDENT_UUID=$(curl -s -H "Authorization: Bearer $FACULTY_TOKEN" -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" http://localhost:8000/api/v1/students | jq -r '.[0].id')
  curl -s -i "http://localhost:8000/api/v1/students/$STUDENT_UUID/finance" \
    -H "Authorization: Bearer $FACULTY_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001"
  ```
- **Expected Result:**
  - `HTTP/1.1 403 Forbidden` (`FINANCE_DOMAIN_RESTRICTED`).
  - Financial data is never leaked in standard 360° student support views.

#### Step 2.3: Executive Leadership Queue Protection (ADR-004)
- **Action:** Executive leadership role attempts to access individual student triage queue:
  ```bash
  curl -s -i "http://localhost:8000/api/v1/cases" \
    -H "Authorization: Bearer $LEADERSHIP_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001"
  ```
- **Expected Result:**
  - `HTTP/1.1 403 Forbidden` (`LEADERSHIP_QUEUE_ACCESS_DENIED`).
  - Leadership accounts are restricted to cohort-level aggregates only to protect student privacy.

#### Step 2.4: Out-of-Order Transition Rejection
- **Action:** Attempt to transition a suggested case directly to `closed`:
  ```bash
  curl -s -i -X POST "http://localhost:8000/api/v1/cases/$CASE_ID/transition" \
    -H "Authorization: Bearer $FACULTY_TOKEN" \
    -H "X-Campus-Id: 00000000-0000-0000-0000-000000000001" \
    -H "Content-Type: application/json" \
    -d '{"to_state": "closed"}'
  ```
- **Expected Result:**
  - `HTTP/1.1 409 Conflict` (`CASE_TRANSITION_NOT_ALLOWED`).

#### Step 2.5: AI Provider Failure Fallback
- **Action:** When upstream LLM provider times out or is unreachable:
- **Verification:**
  - SUTRA automatically intercepts exception and logs `status = fallback`.
  - Returns deterministic offline advisory brief without crashing or blocking the educator's workflow.

---

## 5. Measured Performance Baseline

Empirical metrics measured against local test environment:

| Endpoint | Target Latency | Actual Latency (Observed) | Status |
|:---|:---|:---|:---|
| `GET /api/v1/health` (Liveness) | < 50ms | 0.57ms – 1.75ms | **PASSED** |
| `GET /api/v1/ready` (DB + ML probe) | < 100ms | 3.84ms – 13.32ms | **PASSED** |
| `GET /api/v1/interventions` (Catalog) | < 100ms | 3.30ms – 21.45ms | **PASSED** |
| `GET /api/v1/signals` (Triage Queue) | < 200ms | 2.50ms – 8.12ms | **PASSED** |
| `GET /api/v1/cases` (Active Cases) | < 200ms | 1.88ms – 11.97ms | **PASSED** |
| `POST /api/v1/ai/review-brief` (Advisory) | < 500ms (mock/fallback) | 6.51ms – 25.26ms | **PASSED** |
| `POST /api/v1/imports` (Batch Ingestion) | < 500ms | 7.85ms – 9.61ms | **PASSED** |

---

## 6. Known Limitations & Fallback Procedures

1. **OULAD Prototype Scope:**
   - The ML model artifact is trained and calibrated on the Open University Learning Analytics Dataset (OULAD). It serves as a decision-support demonstration and must be re-calibrated on local institutional historical data before deployment in a new university.
2. **Offline XGBoost on macOS:**
   - XGBoost requires OpenMP runtime (`brew install libomp`). The production baseline model utilizes Platt-calibrated Logistic Regression (`sutra_ml` v1.0.0, threshold 0.46), which runs without OpenMP dependencies across all platforms.
3. **Small-Cell Suppression:**
   - To safeguard student anonymity, cohort queries returning subgroups smaller than 5 students ($N < 5$) suppress identifiable metrics per institutional privacy standards.
