# SUTRA Counselor Subsystem & Dashboard Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate a complete Counselor Onboarding workflow, dedicated Counselor Dashboard, authority escalation modal, and risk-threshold-triggered counselor call workflow into SUTRA while auditing and clarifying navigation labels and metrics.

**Architecture:** Extend FastAPI backend with `/api/v1/counselors` routes and SQLAlchemy models/schemas for onboarding, authority contacts, escalations, and call requests. Extend Next.js frontend with unified TypeScript types, store actions, resilient offline synthetic fallbacks, and modular UI components (`CounselorDashboardView`, `CounselorOnboardingModal`, `ContactAuthorityModal`, `RequestCounselorCallModal`) following SUTRA's Apple/Inter design tokens.

**Tech Stack:** Next.js 14 (App Router, React 18, Tailwind CSS, Lucide icons), TypeScript, FastAPI, SQLAlchemy, Pydantic, Node test runner (`test-contract.mjs`).

## Global Constraints

- Preserve all existing ADR-004 privacy boundaries (leadership role cannot view individual student details).
- Preserve the 10-state case machine lifecycle: `NEW` -> `TRIAGED` -> `UNDER_REVIEW` -> `ACTIONABLE` -> `ASSIGNED` -> `ACCEPTED` -> `IN_PROGRESS` -> `FOLLOW_UP_REQUIRED` -> `RESOLVED` -> `CLOSED`.
- Single authoritative risk threshold: `0.46` (from `mlModelInfo.decision_threshold` / `settings.ML_DECISION_THRESHOLD`). Never hardcode divergent values.
- Zero fake student or course marketing names in active paths.
- Resilient dual-mode operation: seamless online HTTP calls with instant offline synthetic fixture fallbacks without unhandled runtime rejections.
- Consistent SUTRA design language: clean white surfaces (`bg-white`), subtle borders (`border-neutral-200/80`), rounded cards (`rounded-2xl` / `rounded-3xl`), restrained colors, clear typography, and accessible interactive elements.

---

### Task 1: Audit and Rename Navigation Labels & Section Terminology

**Files:**
- Modify: `frontend/components/AppShell.tsx:120-132`
- Modify: `frontend/app/courses/page.tsx:60-75`
- Modify: `frontend/app/community/page.tsx:75-90`
- Modify: `frontend/app/dashboard/page.tsx:300-340`
- Modify: `frontend/scripts/test-contract.mjs`

**Interfaces:**
- Consumes: Navigation items in `AppShell.tsx`
- Produces: Clear, unambiguous navigation labels matching actual page contents:
  - `Overview` (`/dashboard`, icon: `LayoutGrid`)
  - `Interventions & Protocols` (`/courses`, icon: `Bookmark`)
  - `Student Directory` (`/students`, icon: `GraduationCap`)
  - `Case Management` (`/community`, icon: `Users`)
  - `Institutional Analytics` (`/analytics`, icon: `BarChart2`)

- [ ] **Step 1: Update navigation definitions in `frontend/components/AppShell.tsx`**
Update `mainNavItems`:
```tsx
  const mainNavItems = [
    { name: "Overview", href: "/dashboard", icon: LayoutGrid },
    { name: "Interventions & Protocols", href: "/courses", icon: Bookmark },
    { name: "Student Directory", href: "/students", icon: GraduationCap },
    { name: "Case Management", href: "/community", icon: Users },
    { name: "Institutional Analytics", href: "/analytics", icon: BarChart2 },
  ];
```
- [ ] **Step 2: Update mobile dock navigation label truncation and tooltips**
Ensure responsive mobile labels match: `Overview`, `Protocols`, `Students`, `Cases`, `Analytics`.
- [ ] **Step 3: Verify contracts in `test-contract.mjs` pass**
Run `npm test` in `frontend/` to ensure no broken assertions.

---

### Task 2: Counselor Subsystem Domain Types and Schemas

**Files:**
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/skillhub-data.ts`
- Create: `app/schemas/counselor.py`
- Create: `app/models/counselor.py`

**Interfaces:**
- Consumes: `UserRole`, `DEMO_CAMPUS_ID`
- Produces:
  - `CounselorOnboardingState`: `'NOT_STARTED' | 'INCOMPLETE' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'`
  - `CounselorProfile`: credentials, specialization, preferences, escalation contacts
  - `AuthorityContact`: supervisor, welfare, academic, emergency contacts
  - `AuthorityEscalationRecord`: initiated, attempted, confirmed, resolved
  - `CounselorCallRequest`: requested, assigned, attempted, completed, closed

- [ ] **Step 1: Define TypeScript interfaces in `frontend/lib/types.ts`**
Add:
- `CounselorOnboardingStatus`
- `CounselorProfileDTO`
- `CounselorOnboardingRequest`
- `AuthorityContactItem`
- `EscalationRequest`
- `EscalationRecordDTO`
- `CounselorCallRequestDTO`
- `CreateCallRequestInput`
- [ ] **Step 2: Define Pydantic schemas in `app/schemas/counselor.py`**
Mirror DTOs in Python Pydantic models with field validations.
- [ ] **Step 3: Define SQLAlchemy models in `app/models/counselor.py`**
- [ ] **Step 4: Add canonical synthetic initial records in `frontend/lib/skillhub-data.ts`**
Add `INITIAL_COUNSELOR_PROFILE`, `INITIAL_AUTHORITY_CONTACTS`, `INITIAL_CALL_REQUESTS`, and `INITIAL_ESCALATIONS`.

---

### Task 3: Backend FastAPI Endpoints for Counselor Subsystem

**Files:**
- Create: `app/api/v1/counselors.py`
- Modify: `app/api/v1/router.py`
- Create: `tests/test_counselor_api.py`

**Interfaces:**
- Consumes: `CampusMembershipContext`, `get_db`, `get_campus_membership`
- Produces:
  - `GET /api/v1/counselors/profile`
  - `POST /api/v1/counselors/onboarding`
  - `POST /api/v1/counselors/onboarding/approve`
  - `GET /api/v1/counselors/authority-contacts`
  - `POST /api/v1/counselors/escalate`
  - `GET /api/v1/counselors/escalations`
  - `POST /api/v1/counselors/call-requests`
  - `GET /api/v1/counselors/call-requests`
  - `PATCH /api/v1/counselors/call-requests/{id}`

- [ ] **Step 1: Implement router in `app/api/v1/counselors.py`**
Role gates: counselor, faculty, dean, superadmin.
- [ ] **Step 2: Mount in `app/api/v1/router.py`**
Include `counselors_router`.
- [ ] **Step 3: Write test in `tests/test_counselor_api.py`**

---

### Task 4: Frontend API Client & Store Integration with Resilient Offline Fallbacks

**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/skillhub-store.tsx`

**Interfaces:**
- Consumes: Counselor endpoints & `skillhub-data.ts` fixtures
- Produces:
  - `api.counselors.*` methods with offline fallback handlers
  - `useSkillHub()` exposed state:
    - `counselorProfile`, `updateCounselorProfile`, `submitCounselorOnboarding`, `approveCounselorOnboarding`
    - `authorityContacts`, `escalations`, `escalateCaseToAuthority`
    - `callRequests`, `requestCounselorCall`, `updateCallRequestStatus`

- [ ] **Step 1: Add `api.counselors` client methods in `frontend/lib/api.ts`**
Include offline fallbacks in `getOfflineFallback` for `/counselors/*`.
- [ ] **Step 2: Add state and actions in `frontend/lib/skillhub-store.tsx`**
Expose counselor profile, call requests, escalations, authority contacts in context.
- [ ] **Step 3: Verify with `npm test`**

---

### Task 5: Risk-Threshold-Triggered Counselor Contact on Dashboard (Phase 6)

**Files:**
- Create: `frontend/components/RequestCounselorCallModal.tsx`
- Modify: `frontend/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `mlModelInfo`, `signals`, `cases`, `requestCounselorCall`
- Produces:
  - Contextual banner on student/general overview when student risk score >= `0.46`:
    - "Additional Support Recommended"
    - Explains supportive purpose in non-stigmatizing plain language
    - `[Request a Counselor Call]` action button
  - Interactive modal collecting communication preference, preferred time window, voluntary consent
  - Submits request to store/backend, shows confirmation, tracks status

- [ ] **Step 1: Create `RequestCounselorCallModal.tsx`**
Clean Apple-style modal with communication preference (Phone, In-Person clinic, Video), time slot (Morning, Afternoon, Flexible), optional note, and clear voluntary disclosure.
- [ ] **Step 2: Wire threshold trigger in `frontend/app/dashboard/page.tsx`**
Detect students/signals where risk score >= `0.46` (from authoritative `mlModelInfo`). Render supportive action banner and trigger modal.
- [ ] **Step 3: Verify duplicate request handling**
Disable repeated submission if active request exists; show current status instead.

---

### Task 6: Counselor Onboarding Screen & Admin Approval Interface (Phase 3)

**Files:**
- Create: `frontend/components/counselor/CounselorOnboardingModal.tsx`
- Create: `frontend/components/counselor/CounselorStatusBadge.tsx`
- Modify: `frontend/app/settings/page.tsx`

**Interfaces:**
- Consumes: `counselorProfile`, `submitCounselorOnboarding`, `approveCounselorOnboarding`, `activeRole`
- Produces:
  - 4-Section Onboarding Form:
    - Section 1: Professional Information
    - Section 2: Professional Credentials
    - Section 3: Working Preferences & Availability
    - Section 4: Emergency and Escalation Configuration
  - Status management: `NOT_STARTED`, `INCOMPLETE`, `PENDING_VERIFICATION`, `APPROVED`, `REJECTED`, `SUSPENDED`
  - Confirmation screen with summary and next steps
  - Admin approval control (visible only to `dean` / `superadmin`)

- [ ] **Step 1: Create `CounselorOnboardingModal.tsx`**
Multi-section form with step validation, credential inputs, working hours, and emergency contacts.
- [ ] **Step 2: Create `CounselorStatusBadge.tsx`**
Pill badge with status color and tooltips.
- [ ] **Step 3: Integrate into `frontend/app/settings/page.tsx`**
Add Counselor Onboarding Management section with status and verification actions.

---

### Task 7: Authority Contact & Case Escalation Workflow (Phase 5)

**Files:**
- Create: `frontend/components/counselor/ContactAuthorityModal.tsx`
- Create: `frontend/components/counselor/UrgentSupportBanner.tsx`

**Interfaces:**
- Consumes: `authorityContacts`, `escalateCaseToAuthority`, `cases`
- Produces:
  - Modal displaying verified institutional contacts:
    - Counseling Supervisor
    - Student Affairs / Welfare Office
    - Academic Coordinator
    - Institutional Emergency Response
  - Allows selecting authority, communication channel (`tel:`, `mailto:`, secure message), case link, concise explanation
  - Initiates contact action on device without falsely claiming it was automatically answered
  - Records escalation audit entry with lifecycle state

- [ ] **Step 1: Create `ContactAuthorityModal.tsx`**
Structured modal with authority cards, calling action, escalation reason, and record creation.
- [ ] **Step 2: Create `UrgentSupportBanner.tsx`**
Clear, non-alarmist banner with emergency instructions and direct access to campus health/emergency response.

---

### Task 8: Dedicated Counselor Dashboard Interface (Phase 4)

**Files:**
- Create: `frontend/components/counselor/CounselorDashboardView.tsx`
- Modify: `frontend/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `cases`, `signals`, `callRequests`, `counselorProfile`, `activeRole`
- Produces:
  - When `activeRole === 'counselor'`, renders `CounselorDashboardView` instead of standard faculty view:
    - Top Header: Welcome Dr. Meera Nambiar, Counseling & Wellbeing Unit, availability toggle, Emergency Contact quick action
    - Overview Metrics: Assigned Students, Students Awaiting Contact, Pending Counseling Requests, High-Priority Cases, Follow-Ups Due, Escalations Requiring Attention
    - Priority Queue: filterable by Priority, Status, Referral Type, Next Action
    - Counseling Cases: triage, contact attempt logging, session scheduling, sanitized notes, escalation
    - Follow-Up Management: upcoming sessions, overdue follow-ups, rescheduling

- [ ] **Step 1: Build `CounselorDashboardView.tsx`**
Comprehensive counselor workspace with metrics, priority queue, call requests list, contact logger, and authority contact trigger.
- [ ] **Step 2: Integrate into `frontend/app/dashboard/page.tsx`**
Switch view dynamically when `activeRole === 'counselor'`.

---

### Task 9: Contract & Integration Testing, End-to-End Verification (Phase 10)

**Files:**
- Modify: `frontend/scripts/test-contract.mjs`
- Run: `npm test`

**Interfaces:**
- Consumes: All updated components and stores
- Produces: Green test suite covering:
  - 1. User roles & ADR-004 privacy boundaries
  - 2. 10-state case machine
  - 3. Signal review rationale validation
  - 4. Intervention catalog schema
  - 5. Zero secrets in client
  - 6. AI review brief
  - 7. Zero legacy contamination
  - 8. Dashboard metrics & navigation clarity
  - 9. Counselor onboarding states validation
  - 10. Risk threshold (0.46) call request validation
  - 11. Authority contact & escalation validation

- [ ] **Step 1: Update `frontend/scripts/test-contract.mjs` with Counselor contracts**
- [ ] **Step 2: Run `npm test` and verify all tests pass**
- [ ] **Step 3: Test local dev server on http://localhost:3000**
