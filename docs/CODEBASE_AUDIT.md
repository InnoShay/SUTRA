# SUTRA — Comprehensive Codebase Audit

**Repository:** `d:\Programming\hackathon2026\sutra`  
**Date:** October 12, 2026  
**Auditor:** Full-Stack Architect, Application Security Auditor & Database Engineer  
**System:** SUTRA (Student Support & Institutional Early-Warning Case-Management Platform)  
**Status:** Audit Complete — Phase 1 & 2 Completed

---

## 1. Architecture Overview

SUTRA is an institutional student support, early-warning triage, and case-management platform engineered for higher-education environments. The platform bridges predictive machine-learning indicators with authorized human educator workflows under the strict principle of **"No Alert Without Action"** (ADR-001) and **"Zero Automation of Adverse Decisions"**.

### Tech Stack
- **Frontend:** Next.js 14+ (App Router), React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 ORM, Alembic migrations.
- **Database:** PostgreSQL (with Supabase Managed Database, Row-Level Security, and Auth).
- **Inference & Orchestration:** Scikit-Learn risk inference engine, Bounded Orchestrator with human-in-the-loop gates.
- **Localization:** Sarvam AI Indic Neural Translation integration (`hi`, `te`, `ta`, `mr`, `bn`, `gu`, `kn`, `ml`, `en`).

### Core Subsystems
1. **Signal Ingestion & ML Governance:** Ingestion of synthetic LMS telemetry, baseline risk probability calculation, and ML explanation vectors.
2. **Human Triage & Review:** Educators evaluate predictive risk signals with mandatory qualitative rationales. Automated adverse decisions are prohibited.
3. **10-State Case Machine Lifecycle:** Deterministic lifecycle:
   $$\text{NEW} \rightarrow \text{TRIAGED} \rightarrow \text{UNDER\_REVIEW} \rightarrow \text{ACTIONABLE} \rightarrow \text{ASSIGNED} \rightarrow \text{ACCEPTED} \rightarrow \text{IN\_PROGRESS} \rightarrow \text{FOLLOW\_UP\_REQUIRED} \rightarrow \text{RESOLVED} \rightarrow \text{CLOSED}$$
4. **Interventions Catalog:** Standardized evidence-based student support interventions (academic tutoring, mentor check-ins, counseling referrals, financial aid navigation).
5. **Counselor Subsystem:** Dedicated counselor onboarding, verification lifecycle, risk-threshold-triggered call requests, and authority escalation channels.
6. **Data Privacy Boundaries (ADR-003 & ADR-004):** Sensitive financial segregation, student record self-service isolation, and institutional aggregate masking for executive leadership.

---

## 2. Route & Screen Inventory

### Frontend Routes (`frontend/app/`)
| Route | Access Scope | Status | Purpose |
| :--- | :--- | :--- | :--- |
| `/` | Public | Active | Landing Page with institutional value proposition and quick portal access |
| `/login` | Public | Active | Supabase Auth (SSO / Email) & zero-friction demo persona login |
| `/dashboard` | Teacher / Staff | **Reconstructed** | Locked Teacher Dashboard matching authoritative reference |
| `/cases` | Teacher / Staff / Student | Active | Complete case list with lifecycle filtering and search |
| `/cases/[id]` | Authorized Case Roles | Active | Deep case detail, action timelines, notes, and state transitions |
| `/students` | Teacher / Staff | Active | Student directory with cohort filtering and 360 profile access |
| `/students/[id]` | Teacher / Staff | Active | Student 360 telemetry, risk indicators, and intervention history |
| `/courses` | Teacher / Staff | Active | Standardized Interventions Catalog & Institutional Protocols |
| `/messages` | Teacher / Student | Active | Authorized case messaging and direct student-faculty conversations |
| `/help` | All authenticated | Active | Plain-language documentation, operational SOPs, and system help |
| `/settings` | All authenticated | Active | User preferences, language selection, and session controls |
| `/request-support` | Student Self-Service | Active | Student-initiated confidential support request portal |
| `/community` | Staff (Legacy) | Deprecated | Legacy discussion board; replaced by `/cases` case management |
| `/analytics` | Leadership (Legacy) | Deprecated | Aggregate institutional charts; replaced by dashboard operational metrics |

### Backend API Endpoints (`backend/app/api/` & `app/api/`)
| Endpoint | Method | Role Check | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/me` | GET | Authenticated | Returns user profile, active campus memberships, and roles |
| `/api/v1/signals` | GET | `faculty`, `hod`, `institution_admin` | Lists pending early-warning signals for cohort |
| `/api/v1/signals/{id}/review` | POST | `faculty`, `hod`, `institution_admin` | Submits human review with mandatory rationale |
| `/api/v1/cases` | GET | `faculty`, `counselor`, `dean`, `student` | Retrieves cases filtered by user assignment/scoping |
| `/api/v1/cases` | POST | `faculty`, `institution_admin` | Manually creates a new student support case |
| `/api/v1/cases/{id}` | GET | Authorized User | Fetches complete case details, tasks, and event timeline |
| `/api/v1/cases/{id}/transition` | POST | Authorized Assignee | Transitions case along canonical 10-state machine |
| `/api/v1/counselors/onboarding` | GET/POST | `counselor`, `admin` | Manages counselor credentials and verification lifecycle |
| `/api/v1/counselors/escalate` | POST | `counselor` | Escalates high-risk cases to campus authorities |
| `/api/v1/counselors/call-requests`| POST | `faculty`, `student` | Initiates risk-threshold-triggered counselor call |
| `/api/v1/interventions/catalog` | GET | Authenticated | Standardized catalog of approved institutional interventions |

---

## 3. Role & Permission Inventory

### Current Defined Roles
The system historically supported multiple application personas:
1. `faculty` (Teacher / Course Instructor & Mentor — Prof. Ananya Sharma)
2. `counselor` (Student Counselor & Wellbeing Specialist — Dr. Meera Nambiar)
3. `dean` (Dean of Academic Affairs & HOD — Dr. Rajeshwar Rao)
4. `leadership` (Institutional Leadership & Vice Chancellor — Prof. S.K. Kulkarni)
5. `superadmin` (System Governance Lead — SUTRA Admin)
6. `student` (Enrolled Student — Asha Synthetic)
7. `staff` (Consolidated operational role alias)
8. `admin` (Consolidated institutional administrator alias)

### Audit of Role Checking Points
- **Frontend Store (`frontend/lib/skillhub-store.tsx`):**
  - Managed `activeRole` state with interactive persona dropdown switcher in top header.
  - Dynamically altered views (`StudentDashboardView`, `CounselorDashboardView`).
- **Frontend Navigation (`frontend/components/AppShell.tsx`):**
  - Displayed complex role switcher allowing any browser user to toggle between student, faculty, counselor, dean, leadership, and superadmin.
- **Backend Authorization (`app/core/security.py`):**
  - Robust `require_roles(allowed_roles)` dependency validating JWT and PostgreSQL `institution_memberships` table.
- **Database Row Level Security (`migrations/supabase_rls_lockdown.sql`):**
  - RLS enabled on all core tables. Browser direct PostgREST calls revoked (`anon`, `authenticated`), routing all data access through FastAPI backend enforcement.

---

## 4. Findings & Issue Categorization

### A. Frontend Findings
1. **Role Switcher UI Complexity (Critical):**
   - The desktop header in `AppShell.tsx` contained an interactive persona popover allowing client-side role switching.
   - *Resolution:* Removed the interactive switcher in favor of a static active role pill (`Faculty (Prof. Sharma)`), anchoring the UI to the Teacher role.
2. **Dashboard Visual Drift:**
   - The dashboard had diverged from the locked template (`media_1791769884747.png`), rendering legacy analytics cards and charts.
   - *Resolution:* Reconstructed to exactly match the approved 4 KPI cards, "Priority Signal Review Queue" table, and "Active Intervention Follow-Up" milestone card.
3. **Inconsistent Navigation:**
   - Navigation contained legacy links (`/community`, `/analytics`).
   - *Resolution:* Standardized on Teacher-only navigation: Overview (`/dashboard`), My Cases (`/cases`), Student Directory (`/students`), Interventions & Protocols (`/courses`), Help & Support (`/help`), and Sign Out (`/login`).

### B. Backend Findings
1. **Server-Side Authorization Integrity:**
   - Server-side role checks in `app/api/v1/cases.py` and `app/api/v1/signals.py` correctly require `faculty` or `institution_admin`.
   - Teacher accounts possess appropriate operational access without granting destructive superadmin permissions.
2. **Audit Logging & Event Immutability:**
   - Case transitions write immutable records to `case_events` with timestamps, actor IDs, and rationales.

### C. Database Findings
1. **Data Model Health:**
   - `institution_memberships` maintains unique constraint `uq_membership_inst_user_role(institution_id, user_id, role)`.
   - Data entities (students, cases, signals, follow-ups) have valid foreign keys and indexes.
2. **Zero Data Destruction:**
   - Simplifying the UI role model does NOT drop or alter database records. All student data, case records, and counselor logs remain intact.

### D. Security Findings
1. **Defense-in-Depth RLS:**
   - Database tables are protected by Row-Level Security. PostgREST public access is revoked.
2. **Client-Side Secret Hygiene:**
   - Zero private keys, LLM credentials, or `service_role` secrets exposed to the browser.
3. **ADR-004 Student Privacy Enforcement:**
   - Individual student PII is strictly scoped to authorized educators with direct pedagogical responsibility.

---

## 5. MVP Feature Classification Matrix

| Feature | Classification | Evidence & Status |
| :--- | :--- | :--- |
| Teacher Dashboard (Approved Layout) | **1. Implemented & Verified** | Reconstructed to match `media_1791769884747.png` exactly |
| Signal Review with Mandatory Rationale | **1. Implemented & Verified** | Modal enforces min 5-character rationale per ADR-001 |
| 10-State Case Machine | **1. Implemented & Verified** | Full state transition pipeline validated in contract tests |
| Student Directory & 360 View | **1. Implemented & Verified** | Accessible via `/students`, scoped to assigned cohort |
| Interventions Catalog & Protocols | **1. Implemented & Verified** | Accessible via `/courses`, standard institutional protocols |
| Teacher Navigation Shell | **1. Implemented & Verified** | Standardized minimal navigation in `AppShell.tsx` |
| Role Switcher Removal | **1. Implemented & Verified** | Removed from header; Teacher is sole active user |
| Case Messaging & Direct Communication | **1. Implemented & Verified** | Accessible via `/messages` and case details drawer |
| Risk-Triggered Counselor Contact | **1. Implemented & Verified** | Threshold-triggered action modal on dashboard |
| Student Self-Service Support Request | **1. Implemented & Verified** | Available at `/request-support` |
| Indic Neural Translation | **1. Implemented & Verified** | Sarvam AI integration with 9 Indic languages |
| Legacy Role Switching Dropdowns | **5. Redundant / Removed** | Removed from active UI |
| Legacy Analytics / Social Forum | **5. Redundant / Replaced** | Replaced with focused case and intervention tools |
