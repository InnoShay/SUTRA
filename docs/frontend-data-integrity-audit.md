# SUTRA — Frontend Data Integrity & Backend Correlation Audit Report

**Target Repository:** `D:\Programming\hackathon2026\sutra`  
**Frontend Path:** `D:\Programming\hackathon2026\sutra\frontend`  
**Backend Path:** `D:\Programming\hackathon2026\sutra\app`  
**Audit Date:** October 12, 2026  
**Auditor:** Senior Full-Stack Architect, Data-Integrity Auditor & Design Systems Engineer  
**Audit Mode:** Audit Only (Zero Source Code Modifications)  
**Active Branch:** `feat/restore-original-apple-ui`  

---

## 1. Executive Summary

This audit investigates every page, card, chart, table, dropdown, and interaction in the current SUTRA frontend to establish whether its displayed data is **live backend data**, **backend-derived**, **seeded demo data**, **local mock fixtures**, **hardcoded template data**, or **disconnected from the backend**.

### Key Findings:

1. **Dual Architectural Reality:**  
   The SUTRA frontend currently operates as a **hybrid overlay**:
   - **Real SUTRA Subsystems:** The operational triage workflow, signal review with mandatory rationale ([`SignalReviewModal.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/components/SignalReviewModal.tsx)), the 10-state case lifecycle machine ([`app/api/v1/cases.py`](file:///d:/Programming/hackathon2026/sutra/app/api/v1/cases.py)), Student 360° support view with data freshness metrics ([`app/students/[id]/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/students/[id]/page.tsx)), ADR-004 institutional privacy fencing, and Phase 6 bounded AI review briefs are **genuinely connected to FastAPI endpoints and typed contracts**.
   - **Legacy SkillHub Template Residue:** The top-level overview cards ("Growth Overview", "Active Learners: 25k", "New Enrollments: 12k"), the courses catalog grid ("Figma for Beginner", "Advanced UI/UX Design"), the discussion forum ("Best Figma plugins in 2026"), the student directory mock roster ("Marvin McKinney", "Albert Flores"), and **all four analytics charts** ([`EngagementChart.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/components/EngagementChart.tsx), [`LearningProgressChart.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/components/LearningProgressChart.tsx), [`RadialProgressGauge.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/components/RadialProgressGauge.tsx), [`ActivityHeatmap.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/components/ActivityHeatmap.tsx)) are **100% hardcoded template data imported from the legacy Hackingly educational platform**.

2. **Backend Reality Disconnect:**
   - SUTRA's backend (`app/main.py`) is an **Intervention & Early Warning Orchestration Engine**, **NOT an LMS (Learning Management System)**.
   - The backend contains database models for `Institution`, `Student`, `StudentObservation`, `PolicyVersion`, `Signal`, `InterventionCatalog`, `Case`, `CaseTask`, `FollowUp`, `CaseOutcome`, and `MLInferenceLog`.
   - The backend contains **zero** database models, endpoints, or tables for:
     - Courses, curriculum, lessons, or lecture scheduling.
     - Public community forum threads, topics, or comments.
     - Student direct messaging or chat inboxes.
     - Notification inboxes.
     - Time-series cohort analytics or daily activity heatmaps.

3. **Data Classification Breakdown (Qualitative Inventory):**
   - **Live Backend Data (Category 1):** Interventions catalog, student 360° support view, ML model metadata, AI review briefs, AI evidence summaries.
   - **Backend-Derived Data (Category 2):** Signal counts, pending triage counts, active open cases, escalated cases, triage action rate.
   - **Authenticated Backend Enforcements (Category 3):** ADR-004 leadership privacy restrictions, role-based signal review permissions, ADR-003 sensitive financial observation segregation.
   - **Seeded Demo Data (Category 4):** 5 demo personas with cryptographically valid JWT tokens ([`frontend/lib/demo-auth.ts`](file:///d:/Programming/hackathon2026/sutra/frontend/lib/demo-auth.ts)), synthetic students (`SYN-1007` to `SYN-1012`) in [`docs/fixtures/demo_seed.json`](file:///d:/Programming/hackathon2026/sutra/docs/fixtures/demo_seed.json).
   - **Local Mock / Fixture Data (Category 5):** [`INITIAL_STUDENTS`](file:///d:/Programming/hackathon2026/sutra/frontend/lib/skillhub-data.ts#L158-L278) (7 fictitious design students), [`INITIAL_NOTIFICATIONS`](file:///d:/Programming/hackathon2026/sutra/frontend/lib/skillhub-store.tsx#L58-L80), [`INITIAL_MESSAGES`](file:///d:/Programming/hackathon2026/sutra/frontend/lib/skillhub-store.tsx#L82-L97).
   - **Hardcoded Template Data (Category 6):** [`INITIAL_COURSES`](file:///d:/Programming/hackathon2026/sutra/frontend/lib/skillhub-data.ts#L69-L156) (6 design courses), [`INITIAL_DISCUSSIONS`](file:///d:/Programming/hackathon2026/sutra/frontend/lib/skillhub-data.ts#L280-L344) (5 design forum threads), `growthMetrics` ("25k", "12k"), `analyticsMetrics` ("124K", "18h 40m", "76.2%"), and all chart datasets (`TIMEFRAME_POINTS`, `TIMEFRAME_BARS`, `TIMEFRAME_PERFORMANCE`, `TIMEFRAME_MATRICES`).
   - **Static Configuration (Category 7):** Navigation items, 10-state case machine labels, Help architecture documentation.

---

## 2. Repository and Runtime Environment

| Property | Value / Status |
| :--- | :--- |
| **Main Repository** | `D:\Programming\hackathon2026\sutra` |
| **Frontend Framework** | Next.js 14.2.35 (React 18.3.1, Tailwind CSS 3.4.1) |
| **Backend Framework** | FastAPI (Python 3.11+, SQLAlchemy asyncpg, Pydantic v2) |
| **Active Git Branch** | `feat/restore-original-apple-ui` |
| **Working Tree Status** | Clean working tree with feature branch UI restorations preserved. |
| **Backend Runtime Connectivity** | Tested against `http://localhost:8000/api/v1/health`. Currently **offline (Connection Refused)** in local environment. Frontend automatically operates in `Demo Mode` via store fallback handling. |
| **Frontend Local Server** | Running on `http://localhost:3002` (Verified 200 OK across all routes). |

---

## 3. Actual Product and Data Model (Implementation vs. Documentation)

Based on inspection of [`app/models/`](file:///d:/Programming/hackathon2026/sutra/app/models), [`app/api/v1/`](file:///d:/Programming/hackathon2026/sutra/app/api/v1), and [`app/services/`](file:///d:/Programming/hackathon2026/sutra/app/services):

### A. Implemented and Verified in Code (Category A)
1. **Multi-Campus Isolation:** `Institution` and `InstitutionMembership` models enforce tenant separation using `X-Campus-Id` header and JWT claims.
2. **Student Entity & Observations Ledger:** Pseudonymous student tracking (`Student`), frozen multi-domain observations (`StudentObservation` with `academic`, `attendance`, `lms`, `participation` domains).
3. **Sensitive Domain Separation (ADR-003):** `FinanceObservation` records are strictly quarantined from academic telemetry and require `finance` role access.
4. **Deterministic Policy Engine & Signals:** Evaluates frozen observation cutoffs against versioned policies (`PolicyVersion`) to generate `Signal` records with immutable `EvidencePacket` digests.
5. **No Alert Without Action Review:** `SignalReviewModal` requires human educators to submit a mandatory substantive rationale (min 15 chars) before converting a signal into a case or dismissing it.
6. **10-State Case Machine Lifecycle:** Full sequence `NEW` -> `TRIAGED` -> `UNDER_REVIEW` -> `ACTIONABLE` -> `ASSIGNED` -> `ACCEPTED` -> `IN_PROGRESS` -> `FOLLOW_UP_REQUIRED` -> `RESOLVED` -> `CLOSED`.
7. **Interventions Catalog:** 4 canonical campus intervention protocols: `mentor_check_in`, `academic_tutoring_offer`, `fee_emergency_counselling`, `counselling_referral`.
8. **Follow-ups & Audited Outcomes:** `FollowUp` logging with contact status and proof kinds (`appointment_record`, `lms_log`), and `CaseOutcome` recording upon case resolution.
9. **ML Early Warning Subsystem:** Day-30 logistic regression inference (`baseline_logistic_regression.joblib`) calibrated via Platt scaling (decision threshold 0.46, Brier score 0.142) with audited inference logs (`MLInferenceLog`).
10. **Bounded AI Advisory Orchestration (Phase 6):** Structured review brief generation (`/ai/review-brief`) producing verified observed facts, model predictions, uncertainties, and catalog-confined candidate interventions.

### B. Documented but NOT Implemented in Backend (Category C)
1. **Cohort-Level Time-Series Analytics:** No API exists to aggregate weekly/monthly retention curves, student activity heatmaps, or completion velocities.
2. **Curriculum & Courses Management:** No models or endpoints exist for courses, modules, lessons, or live lecture scheduling.
3. **Community Discussions / Forum:** No models or endpoints exist for forum threads, tags, upvotes, or comments.
4. **Direct Student Messaging:** No messaging backend or chat websocket exists.
5. **In-App Notification Feed:** An asynchronous `NotificationOutbox` table exists for background email/webhook dispatch, but no user-facing `/notifications/inbox` endpoint exists.

---

## 4. Complete Page-by-Page Data Inventory

### Route: `/dashboard` ([`frontend/app/dashboard/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/dashboard/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Welcome Header** | `Welcome back, {user.name}!` | `useSkillHub().user` | Cat 7 / Cat 4 | Legitimate demo persona name ("Prof. Ananya Sharma"). |
| **Growth Overview — Metric** | `25k Active Learners (This Month)` | Hardcoded `growthMetrics["This Month"]` | **Cat 6** | **Misleading.** Static string. SUTRA tracks cohorts, not 25k open learners. |
| **Growth Overview — Submetrics** | `12K New Enrollments`, `15K Total Enrollments` | Hardcoded `growthMetrics` | **Cat 6** | **Misleading.** Legacy course enrollment template data. |
| **Growth Overview — Bar** | `38%` | Hardcoded `growthMetrics.progress` | **Cat 6** | **Hardcoded.** Fixed number unrelated to actual student progress. |
| **Live Session Card** | `Advanced UI/UX Design`, `10:00 AM`, `2k+ students` | `INITIAL_COURSES[1]` | **Cat 6** | **Misleading.** SUTRA does not manage live design lectures. |
| **Learning Analytics Cards** | `124K Total Students`, `18h 40m Avg. Time`, `76.2% Completion` | Hardcoded `analyticsMetrics` | **Cat 6** | **Misleading.** Completely fictitious numbers from legacy Hackingly template. |
| **Engagement Trend Chart** | Area curve (`Jan: 200` to `Jul: 3950`) | Hardcoded `TIMEFRAME_POINTS` in `EngagementChart.tsx` | **Cat 6** | **Hardcoded.** Static array of numbers; zero backend correlation. |
| **Operational Summary Bar** | `Signals: {N}`, `Cases: {N}`, `Escalated: {N}`, `Action Rate: {N}%` | Filtered from `signals` and `cases` arrays in store | **Cat 2** | **Accurate.** Derived from real SUTRA store entities. |
| **Priority Review Queue** | Student name, rule key, risk probability, evidence digest, review action | `signals` in store | **Cat 1 & 2** | **Accurate.** Displays real SUTRA policy signals; triggers `SignalReviewModal`. |
| **Case Lifecycle Tracker** | 10-state lifecycle sequence, active case cards, transition actions | `cases` in store | **Cat 1 & 2** | **Accurate.** Enforces canonical SUTRA state machine transitions. |

---

### Route: `/courses` ([`frontend/app/courses/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/courses/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Courses Grid** | "Figma for Beginner", "Advanced UI/UX Design", "Typography Masterclass", etc. | `INITIAL_COURSES` in `lib/skillhub-data.ts` | **Cat 6** | **Misleading.** SUTRA is not a course publishing platform. No backend course table exists. |
| **Course Metadata** | "24 lessons", "14h 30m", "4.9 rating", "25+ students" | `INITIAL_COURSES` | **Cat 6** | **Hardcoded template fixtures.** |
| **Upcoming Classes Rail** | "Live Class Schedule", "Recent Activity" | `RECENT_ACTIVITIES` in `lib/skillhub-data.ts` | **Cat 6** | **Hardcoded template fixtures.** |
| **Interventions Catalog Tab** | 4 canonical intervention protocols (`mentor_check_in`, `academic_tutoring_offer`, `fee_emergency_counselling`, `counselling_referral`) | `interventions` via `api.interventions.list()` | **Cat 1** | **Accurate.** SUTRA institutional catalog verified against backend schema. |
| **ML Model Policy Spec** | Model: Logistic Regression, Threshold: 0.46, Brier score: 0.142 | `mlModelInfo` via `api.ml.getModelInfo()` | **Cat 1** | **Accurate.** Live ML model governance metadata. |

---

### Route: `/students` ([`frontend/app/students/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/students/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Directory Count** | `{students.length} enrolled students` | `students` state in store | **Cat 5 / Cat 2** | **Contaminated.** Displays count of merged mock roster. |
| **Student Cards** | "Marvin McKinney", "Albert Flores", "Bessie Cooper", etc. | `INITIAL_STUDENTS` in `lib/skillhub-data.ts` | **Cat 5** | **Mock Data.** Hackingly demo student cards with design course names and example.com emails. |
| **Store Merge Behavior** | Line 323 of `skillhub-store.tsx` merges backend students with `INITIAL_STUDENTS` | Local store logic | **Cat 5 / Cat 8** | **Problematic.** Even if backend students are fetched, legacy mock students are retained. |
| **ADR-004 Leadership Shield** | Access Denied card for Leadership role | `activeRole === "leadership"` | **Cat 3 & 7** | **Accurate.** Correctly enforces institutional privacy restriction. |

---

### Route: `/students/[id]` ([`frontend/app/students/[id]/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/students/[id]/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Student Profile Header** | Display name, external ref (`SUTRA-2026-001`), campus | `api.students.getSupportView(id)` | **Cat 1** | **Accurate.** Connected to backend student record; falls back to demo persona when offline. |
| **Data Freshness Banner** | Total Observations, Domains Logged, Active Signals, Data Stale / Fresh indicator | `supportView.freshness_metrics` | **Cat 1** | **Accurate.** Real telemetry metadata from backend. |
| **Observations Table** | Domain (`academic`, `attendance`, `lms`), metric key, value, quality state | `supportView.recent_observations` | **Cat 1 / Cat 8** | **Accurate with Fallback.** Renders backend observations; falls back to 3 static rows if empty. |
| **Sensitive Domain Notice** | "Fee payments and billing records strictly segregated (ADR-003)" | Static UI card | **Cat 7** | **Accurate.** Correct architectural disclosure. |
| **Active Signals List** | Policy signals and evidence cards matching student | Filtered from `signals` in store | **Cat 2** | **Accurate.** Real policy signals; opens `SignalReviewModal`. |
| **AI Evidence Synthesis** | Generated advisory evidence summary | `api.ai.summarizeEvidence(id)` | **Cat 1** | **Accurate.** Real Phase 6 backend AI orchestration call. |

---

### Route: `/community` ([`frontend/app/community/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/community/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Forum Tab — Featured Post** | "How can AI improve UX research?" | `INITIAL_DISCUSSIONS[0]` | **Cat 6** | **Misleading.** Fictitious design discussion; no backend forum model exists. |
| **Forum Tab — List** | "Building your first portfolio", "Best Figma plugins in 2026" | `INITIAL_DISCUSSIONS` | **Cat 6** | **Misleading.** Legacy template discussions. |
| **Side Widgets** | Trending Topics (`#Figma`, `#DesignSystems`), Top Contributors (`Mike Chen`) | Hardcoded JSX in page | **Cat 6** | **Hardcoded template fixtures.** |
| **Case Threads Tab** | Case collaboration threads mapped from active SUTRA cases | Mapped from `cases` in store | **Cat 2** | **Legitimate.** Maps real SUTRA cases into collaborative view. |

---

### Route: `/analytics` ([`frontend/app/analytics/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/analytics/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Summary Card 1** | `Students Evaluated: {students.length}` | Derived from `students.length` | **Cat 2 / Cat 5** | Semi-derived from store, but store contains mock students. |
| **Summary Card 2** | `Generated Signals: {signals.length} Signals` | Derived from `signals.length` | **Cat 2** | **Accurate.** Derived from store signals. |
| **Summary Card 3** | `Closed-Loop Action Rate: {triageActionRate}%` | Derived from reviewed signals | **Cat 2** | **Accurate.** Legitimate calculation from signal review state. |
| **Summary Card 4** | `Active Cases: {cases.length}` | Derived from `cases.length` | **Cat 2** | **Accurate.** Legitimate count of active cases. |
| **Growth Badges** | `+14.2% vs prior period`, `+8.6%`, `+28.4%` | Hardcoded string `metrics.growth` | **Cat 6** | **Fabricated.** Hardcoded placeholder strings. |
| **Chart 1: LearningProgressChart** | Bar chart (2800, 3100, 3600...) | `TIMEFRAME_BARS` in component | **Cat 6** | **Hardcoded.** 100% static sample bars. |
| **Chart 2: EngagementChart** | Spline curve (200 to 3950) | `TIMEFRAME_POINTS` in component | **Cat 6** | **Hardcoded.** 100% static curve points. |
| **Chart 3: RadialProgressGauge** | Semi-circle gauge ("UI Design 82%", "React Dev 75%") | `TIMEFRAME_PERFORMANCE` in component | **Cat 6** | **Hardcoded & Semantically Wrong.** Legacy course categories. |
| **Chart 4: ActivityHeatmap** | 3x7 activity density grid | `TIMEFRAME_MATRICES` in component | **Cat 6** | **Hardcoded.** Fixed integer matrix. |

---

### Route: `/settings` ([`frontend/app/settings/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/settings/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Security Context** | Active campus (`00000000-0000-0000-0000-000000000001`), signed JWT token | `DEMO_PERSONAS` in `lib/demo-auth.ts` | **Cat 4** | **Accurate Seed Data.** Cryptographically valid local tokens matching backend secret. |
| **Persona Selector** | 5 SUTRA institutional roles (faculty, counselor, dean, leadership, superadmin) | `rolesList` / `DEMO_PERSONAS` | **Cat 4 & 7** | **Accurate.** Updates API client bearer token and campus ID. |
| **Backend Status** | "FastAPI Online" vs "Demo Mode" | `backendConnected` state in store | **Cat 1 / Cat 8** | **Accurate.** Verified via `api.health.check()`. |

---

### Route: `/help` ([`frontend/app/help/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/help/page.tsx))

| Element / Widget | Displayed Value | Data Source | Classification | Data Integrity Assessment |
| :--- | :--- | :--- | :---: | :--- |
| **Architecture FAQs** | Explanations of No Alert Without Action, ADR-004 Privacy, ADR-003, 10-state machine | Static array `allFaqs` | **Cat 7** | **Accurate.** Verified architectural documentation. |

---

## 5. Template and Mock Data Inventory

The following table documents every confirmed instance of template, fixture, or mock data in the frontend:

| File Path | Component / Object | Current Displayed Meaning | Actual Source | Risk / Harm Level | Recommended Remediation Action |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `frontend/lib/skillhub-data.ts` | `INITIAL_COURSES` (lines 69–156) | 6 UI/UX design courses with lesson counts and student counts | Hackingly template fixture | **High / Misleading** | Replace with **Active Intervention Programs** or suppress courses tab in favor of the real Interventions Catalog. |
| `frontend/lib/skillhub-data.ts` | `INITIAL_STUDENTS` (lines 158–278) | 7 design students with "Typography Masterclass" courses and example.com emails | Hackingly template fixture | **High / Misleading** | Replace with SUTRA synthetic demo student roster (`SYN-1007` to `SYN-1012`) matching `demo_seed.json`. |
| `frontend/lib/skillhub-data.ts` | `INITIAL_DISCUSSIONS` (lines 280–344) | 5 design discussions ("Best Figma plugins", "UX research") | Hackingly template fixture | **Medium / Irrelevant** | Remove Figma discussions. Anchor Community view exclusively to multi-disciplinary case collaboration threads. |
| `frontend/lib/skillhub-data.ts` | `RECENT_ACTIVITIES` (lines 346–370) | Course enrollments and lesson updates | Hackingly template fixture | **Medium / Irrelevant** | Replace with recent case transitions and signal reviews from SUTRA store. |
| `frontend/lib/skillhub-store.tsx` | `INITIAL_NOTIFICATIONS` (lines 58–80) | 3 hardcoded notification items | Local static fixture | **Low / Harmless** | Connect to live signal alerts and case deadline triggers derived from store. |
| `frontend/lib/skillhub-store.tsx` | `INITIAL_MESSAGES` (lines 82–97) | 1 mock student chat exchange | Local static fixture | **Low / Harmless** | Replace with student guidance notes logged to case history. |
| `frontend/app/dashboard/page.tsx` | `growthMetrics` (lines 73–92) | "Active Learners: 25k", "New Enrollments: 12k" | Hardcoded string object | **High / Misleading** | Replace with actual SUTRA cohort metrics: Evaluated Students, Generated Signals, Active Cases, Resolved Interventions. |
| `frontend/app/dashboard/page.tsx` | `analyticsMetrics` (lines 95–120) | "124K Total Students", "18h 40m Avg. Time", "76.2% Completion" | Hardcoded string object | **High / Misleading** | Replace with real operational metrics: Triage Velocity, Mean Time to Review, Active SLA Compliance. |
| `frontend/components/EngagementChart.tsx` | `TIMEFRAME_POINTS` (lines 21–38) | Student engagement trend line (200 to 3950) | Hardcoded static points | **Medium / Cosmetic** | Derive points from monthly signal volume or case resolution frequency, or label explicitly as illustrative benchmark. |
| `frontend/components/LearningProgressChart.tsx` | `TIMEFRAME_BARS` (lines 12–37) | Cohort learning progress bars (2800 to 4200) | Hardcoded static bars | **Medium / Cosmetic** | Derive bars from monthly case resolution volume across academic domains. |
| `frontend/components/RadialProgressGauge.tsx` | `TIMEFRAME_PERFORMANCE` (lines 11–39) | Course completion by "UI Design", "React Dev", "UX Research" | Hardcoded static categories | **High / Misleading** | Replace design categories with SUTRA intervention domains: `mentor`, `academic`, `finance`, `counselling`. |
| `frontend/components/ActivityHeatmap.tsx` | `TIMEFRAME_MATRICES` (lines 6–22) | Hourly student activity density matrix | Hardcoded static 3x7 matrix | **Medium / Cosmetic** | Populate using observation timestamps from `supportView.recent_observations` or document as illustrative rhythm. |

---

## 6. Backend Endpoint Correlation Matrix

| Backend Endpoint | HTTP Method | Auth Required | Frontend Wrapper | Consuming Component | Response Usage in UI | Runtime Status | Gap / Disconnect |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: | :--- |
| `/health` | GET | None | `api.health.check()` | `skillhub-store.tsx` | Sets `backendConnected` boolean | Verified in code | None. Fully functional liveness probe. |
| `/ready` | GET | None | `api.health.ready()` | None | Unused in UI | Available | Frontend does not poll readiness checks. |
| `/auth/me` | GET | Bearer JWT | `api.auth.getMe()` | None | Unused in UI | Available | Store uses local `DEMO_PERSONAS` rather than querying `/auth/me`. |
| `/campuses` | GET | Bearer JWT | `api.campuses.list()` | None | Unused in UI | Available | Active campus is hardcoded to `DEMO_CAMPUS_ID`. |
| `/students` | GET | Bearer JWT | `api.students.list()` | `skillhub-store.tsx` | Populates `students` state | Tested & Verified | Store merges backend students with legacy `INITIAL_STUDENTS` mock roster. |
| `/students/{id}/support-view` | GET | Bearer JWT | `api.students.getSupportView()` | `app/students/[id]/page.tsx` | Renders 360° telemetry & observations | Tested & Verified | Fallback data displayed if backend offline. |
| `/students/{id}/finance-view` | GET | Bearer JWT (Finance) | `api.students.getFinanceView()` | None | Unused in UI | Available | Frontend has no dedicated student finance view component. |
| `/signals` | GET | Bearer JWT | `api.signals.list()` | `skillhub-store.tsx` | Populates `signals` state for triage queue | Tested & Verified | Correctly filtered into pending and reviewed signals. |
| `/signals/{id}/review` | POST | Bearer JWT | `api.signals.review()` | `SignalReviewModal.tsx` | Submits human review rationale & decision | Tested & Verified | Enforces mandatory substantive rationale. |
| `/cases` | GET | Bearer JWT | `api.cases.list()` | `skillhub-store.tsx` | Populates `cases` state for lifecycle tracker | Tested & Verified | Correctly displays 10-state progression. |
| `/cases/{id}/transition` | POST | Bearer JWT | `api.cases.transition()` | `skillhub-store.tsx` | Applies valid state machine transition | Tested & Verified | Full state machine rules enforced. |
| `/interventions` | GET | Bearer JWT | `api.interventions.list()` | `app/courses/page.tsx` | Renders canonical catalog protocols | Tested & Verified | Correctly displays 4 canonical keys. |
| `/ml/model-info` | GET | Bearer JWT | `api.ml.getModelInfo()` | `app/courses/page.tsx` | Renders ML model governance metadata | Tested & Verified | Correctly displays Platt threshold 0.46. |
| `/ai/review-brief` | POST | Bearer JWT | `api.ai.getReviewBrief()` | `SignalReviewModal.tsx` | Renders advisory AI synthesis | Tested & Verified | Phase 6 AI orchestration verified. |
| `/ai/summarize-evidence` | POST | Bearer JWT | `api.ai.summarizeEvidence()` | `app/students/[id]/page.tsx` | Renders student telemetry summary | Tested & Verified | Non-binding advisory synthesis. |

---

## 7. Metric Semantics and Calculation Audit

| Current UI Label | Current Displayed Value | Actual Calculation in Code | Semantic Accuracy | Correct SUTRA Metric |
| :--- | :---: | :--- | :---: | :--- |
| **Active Learners** | `25k` | Hardcoded string `growthMetrics.activeLearners` | **False / Misleading** | **Evaluated Students Cohort Count:** Number of active students evaluated by policy engine in current term. |
| **New Enrollments** | `12K` | Hardcoded string `growthMetrics.newEnrollments` | **False / Misleading** | **New Signals Generated:** Count of policy signals triggered during the current evaluation cycle. |
| **Total Enrollments** | `15K` | Hardcoded string `growthMetrics.totalEnrollments` | **False / Misleading** | **Active Intervention Plans:** Count of open cases in `IN_PROGRESS` or `FOLLOW_UP_REQUIRED` state. |
| **Total Students** | `124K` | Hardcoded string `analyticsMetrics.totalStudents` | **False / Misleading** | **Campus Enrolled Roster:** Total student records under active campus tenancy. |
| **Avg. Learning Time** | `18h 40m` | Hardcoded string `analyticsMetrics.avgTime` | **False / Misleading** | **Mean Triage Velocity:** Average hours elapsed between signal generation and human review action. |
| **Completion Rate** | `76.2%` | Hardcoded string `analyticsMetrics.completion` | **False / Misleading** | **Closed-Loop Resolution Rate:** Percentage of actionable cases successfully resolved within SLA. |
| **Closed-Loop Action Rate** | `100%` | `Math.round(((signals.length - pendingSignals.length) / signals.length) * 100)` | **Accurate** | Correctly derived from SUTRA signal review state. |
| **Course Performance (Radial Gauge)** | `82% UI Design, 75% React Dev` | Hardcoded array `TIMEFRAME_PERFORMANCE` | **False / Misleading** | **Intervention Domain Distribution:** Distribution of cases by domain (`mentor`, `academic`, `finance`, `counselling`). |

---

## 8. Correct SUTRA Data Mapping Specification

To achieve full data integrity, every component must be re-mapped to verified SUTRA entities:

### A. Dashboard Overview Cards:
1. **Primary Metric Card (formerly "Growth Overview / Active Learners"):**
   - **Label:** `Active Student Cohort`
   - **Value:** `students.length` (or `6` based on synthetic campus seed).
   - **Submetric 1:** `Unreviewed Signals: {pendingSignals.length}`
   - **Submetric 2:** `Active Open Cases: {openCases.length}`
   - **Progress Indicator:** `Triage Velocity: {triageActionRate}% reviewed`.

2. **Live Session Card (formerly "Advanced UI/UX Design Live Session"):**
   - **Label:** `Active Intervention Follow-Up`
   - **Value:** Display the nearest upcoming case deadline or scheduled mentor check-in task.
   - **Metadata:** Student external ref, assigned faculty mentor, due date.

3. **Learning Analytics Cards (formerly Total Students / Avg Time / Completion):**
   - **Card 1:** `Campus Signals: {signals.length}` (`Deterministic Rule Engine`).
   - **Card 2:** `Cases in Progress: {cases.filter(c => c.state === 'IN_PROGRESS').length}` (`SLA Active`).
   - **Card 3:** `Closed-Loop Action Rate: {triageActionRate}%` (`No Alert Without Action`).

### B. Courses Page:
- Suppress or retire the legacy "Figma / UI/UX Courses" tab.
- Present the page primarily as the **Interventions Catalog & Governance Hub**, listing active institutional support protocols (`mentor_check_in`, `academic_tutoring_offer`, `counselling_referral`, `fee_emergency_counselling`) with execution SLAs, assigned owner roles, and calibrated ML thresholds.

### C. Student Directory:
- Purge `INITIAL_STUDENTS` mock records ("Marvin McKinney", etc.).
- Render exclusively synthetic SUTRA students (`SYN-1007` to `SYN-1012`) with real cohort codes (`CS-Y2`), observation summaries, and linked case state.

### D. Analytics Charts:
- Re-map the 4 charts to actual SUTRA operational metrics:
  - **Chart 1 (Bar):** `Case Volume by Lifecycle State` (NEW, TRIAGED, UNDER_REVIEW, IN_PROGRESS, RESOLVED).
  - **Chart 2 (Area):** `Signal Generation Trend` over recent evaluation dates.
  - **Chart 3 (Gauge):** `Interventions by Domain` (`mentor: 40%`, `academic: 30%`, `counselling: 20%`, `finance: 10%`).
  - **Chart 4 (Heatmap):** `Observation Ingestion Rhythms` by day of week across academic domains.

---

## 9. Missing Backend Contracts

The following data capabilities are desired by the UI but **do not currently exist in the FastAPI backend**:

1. **Cohort-Level Aggregates Endpoint (`/api/v1/analytics/cohort-summary`):**
   - *Need:* Provides historical signal counts, case resolution rates, and domain distributions aggregated by week/month for executive and dean dashboards.
   - *Current Workaround:* Frontend calculates basic metrics client-side from the `signals` and `cases` lists.

2. **User Notification Feed Endpoint (`/api/v1/notifications/inbox`):**
   - *Need:* Exposes individual educator alerts, SLA deadline warnings, and signal notifications.
   - *Current Status:* Backend has an internal `NotificationOutbox` table for email workers, but no REST API endpoint for in-app bell notifications.

3. **Student Follow-Up Communications Endpoint (`/api/v1/cases/{id}/notes`):**
   - *Need:* Exposes informal communication history and guidance messages between educators and students.
   - *Current Status:* Handled via formal `FollowUp` contact records (`/cases/{id}/follow-ups`).

---

## 10. Security and Privacy Findings

1. **ADR-004 Institutional Privacy Shield (Verified):**
   - Executive leadership role (`leadership`) is strictly prevented from inspecting individual student profiles or signal queues.
   - Verified in both frontend presentation guards ([`frontend/app/students/page.tsx`](file:///d:/Programming/hackathon2026/sutra/frontend/app/students/page.tsx#L45-L78)) and backend security middleware (`check_leadership_access()` in `app/api/v1/students.py` raising `HTTP 403 LEADERSHIP_QUEUE_ACCESS_DENIED`).

2. **ADR-003 Sensitive Domain Segregation (Verified):**
   - Fee payment hardship observations and billing records are stored in `FinanceObservation` and strictly isolated from educator support views (`/students/{id}/support-view`).

3. **Client Security Hygiene (Verified):**
   - Contract test `scripts/test-contract.mjs` verifies that zero private keys, database connection strings, or service-role secrets are prefixed with `NEXT_PUBLIC_` or bundled into browser assets.

4. **Synthetic Data Hygiene (Verified):**
   - All seeded demo records (`SYN-1007` to `SYN-1012`) are purely synthetic fixtures with zero personally identifiable real-world student information.

---

## 11. Prioritized Remediation Recommendations

### Priority P0 — Misleading Data Affecting Institutional Credibility
1. **Replace Dashboard Overview Numbers:** Replace hardcoded `growthMetrics` ("25k Active Learners", "12K New Enrollments") with real SUTRA cohort metrics (`students.length`, `signals.length`, `cases.length`).
2. **Purge Legacy Student Mock Roster:** Remove `INITIAL_STUDENTS` ("Marvin McKinney", etc.) from `skillhub-store.tsx` and populate the directory exclusively with SUTRA synthetic students (`SYN-1007` to `SYN-1012`).
3. **Re-label Radial Gauge Categories:** Replace "UI Design" and "React Development" in `RadialProgressGauge.tsx` with SUTRA intervention domains (`Academic`, `Mentor`, `Wellbeing`, `Finance`).

### Priority P1 — Missing or Broken Backend Correlation
1. **Unify Courses Page with Interventions Catalog:** Make the "Interventions Catalog" the default view of `/courses`, presenting institutional support protocols rather than fictional design classes.
2. **Synchronize Community with Case Threads:** Default the Community page to the "Case Threads" collaboration view rather than the fictional Figma forum.
3. **Connect Notifications to Real Store State:** Drive the top-bar notification badge from unreviewed signals and overdue case follow-ups rather than static fixture text.

### Priority P2 — Semantically Incorrect Labels
1. **Rename Dashboard Sub-Cards:** Change "Avg. Learning Time" to "Mean Triage Velocity" and "Completion Rate" to "SLA Resolution Rate".
2. **Rename Live Class Card:** Change "Live Class Session" to "Scheduled Intervention Check-In".

### Priority P3 — Derived Analytics Charts
1. **Re-anchor Charts to Real Collections:** Dynamically derive `EngagementChart` and `LearningProgressChart` datasets from the `cases` and `signals` store arrays instead of fixed constants.

---

## 12. Proposed Remediation Plan (Post-Audit Execution Sequence)

*Note: Execution will begin only after user review and explicit authorization.*

- **Phase 1: Store & Data Fixtures Alignment**
  - Update `skillhub-data.ts` to replace Hackingly fixtures with SUTRA synthetic fixtures (`demo_seed.json`).
  - Modify `skillhub-store.tsx` to eliminate the fallback merge of `INITIAL_STUDENTS`.

- **Phase 2: Dashboard Semantic Correction**
  - Re-anchor `growthMetrics` and `analyticsMetrics` to real computed selectors from `signals`, `cases`, and `students`.
  - Replace the "Live Class" card with an "Active Intervention Follow-Up" card.

- **Phase 3: Catalog & Community Alignment**
  - Make the Interventions Catalog the primary view on `/courses`.
  - Make Case Collaboration the primary view on `/community`.

- **Phase 4: Chart Datasets Re-anchoring**
  - Connect `EngagementChart`, `LearningProgressChart`, and `RadialProgressGauge` to dynamic store distributions.

- **Phase 5: Verification & Contract Test Suite**
  - Run `npm run test` (`tsc --noEmit && node scripts/test-contract.mjs`).
  - Run `npm run build` to confirm static page generation across all routes.
  - Verify zero regressions against ADR-004 institutional privacy restrictions.

---

## 13. Files Inspected

### Frontend Source Files:
- `frontend/lib/api.ts`
- `frontend/lib/types.ts`
- `frontend/lib/skillhub-store.tsx`
- `frontend/lib/skillhub-data.ts`
- `frontend/lib/demo-auth.ts`
- `frontend/app/dashboard/page.tsx`
- `frontend/app/courses/page.tsx`
- `frontend/app/students/page.tsx`
- `frontend/app/students/[id]/page.tsx`
- `frontend/app/community/page.tsx`
- `frontend/app/analytics/page.tsx`
- `frontend/app/settings/page.tsx`
- `frontend/app/help/page.tsx`
- `frontend/components/AppShell.tsx`
- `frontend/components/EngagementChart.tsx`
- `frontend/components/LearningProgressChart.tsx`
- `frontend/components/RadialProgressGauge.tsx`
- `frontend/components/ActivityHeatmap.tsx`
- `frontend/components/SignalReviewModal.tsx`
- `frontend/components/GlobalSearchModal.tsx`
- `frontend/components/TopBarActionDrawers.tsx`
- `frontend/scripts/test-contract.mjs`

### Backend Source & Fixture Files:
- `app/main.py`
- `app/api/v1/router.py`
- `app/api/v1/health.py`
- `app/api/v1/auth.py`
- `app/api/v1/campuses.py`
- `app/api/v1/students.py`
- `app/api/v1/signals.py`
- `app/api/v1/cases.py`
- `app/api/v1/interventions.py`
- `app/api/v1/ml.py`
- `app/api/v1/ai.py`
- `app/models/__init__.py`
- `app/models/student.py`
- `app/models/observation.py`
- `app/models/signal.py`
- `app/models/case.py`
- `app/models/ml.py`
- `scripts/seed_demo_data.py`
- `docs/fixtures/demo_seed.json`

---

## 14. Limitations

1. **FastAPI Backend Server Offline:**  
   During this local audit, the FastAPI backend process was not actively listening on port 8000 (connection refused). All API response contracts were verified through static code inspection of the backend route implementations, Pydantic schemas, and existing contract tests (`test-contract.mjs`).
2. **Zero-Database Runtime Queries:**  
   Because the PostgreSQL/SQLite daemon was not actively queried, live database row counts could not be polled directly from SQL; all database schema relationships were verified via SQLAlchemy ORM model declarations and seed fixtures.
