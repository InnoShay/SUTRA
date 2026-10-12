# SUTRA — API Integration Registry & Backend Handoff Specification (Phase 3A)

## Executive Summary

This registry defines the authoritative frontend-side API integration specifications for **SUTRA**. It catalogs:
1. **Existing Verified Endpoints**: Live backend routes implemented in FastAPI (`app/api/v1`) and currently consumed by the Next.js frontend client (`frontend/lib/api.ts`).
2. **Proposed Endpoints (Phase 3A Handoff)**: Missing endpoints required for complete end-to-end student workflow persistence, including student-scoped case retrieval, general support ticket submission, assessment persistence, and case messaging.

> [!IMPORTANT]
> **Boundary & Safety Notice**: Frontend code does not modify backend routers, database migrations, or authorization policies. The proposed endpoint specifications below serve as unambiguous contracts for the backend teammate.

---

## 1. Authentication & Security Context

* **Base URL**: `http://localhost:8000/api/v1` (configured via `NEXT_PUBLIC_API_URL`).
* **Identity Provider**: Supabase OAuth / JWT.
* **Header Attachment**:
  * `Authorization: Bearer <supabase_jwt>`
  * `X-Campus-Id: <campus_uuid>` (Mandatory for all campus-scoped operations).
  * `Idempotency-Key: <unique_string>` (Supported for state machine mutations).
* **JWT Claims & Identity Mapping**:
  * The backend verifies JWTs via PyJWT using `SUPABASE_JWT_SECRET`.
  * The `sub` claim is parsed strictly as a **Python `uuid.UUID`**.
  * User roles are verified against `InstitutionMembership.role` (`"hod"`, `"mentor"`, `"faculty"`, `"institution_admin"`, `"counsellor"`).
* **Current Limitation**: Students currently lack a linked `InstitutionMembership` role claim, causing generic staff-scoped queries to fail with `403 Forbidden`.

---

## 2. Existing Endpoints Registry

The following table documents all routes currently active on the FastAPI backend:

| Domain | Method | Route | Auth / Roles | Campus Scoped | Request Schema | Response Schema | Frontend Call Site | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Identity** | `GET` | `/auth/me` | Bearer Token | No | None | `AuthMeResponse` | `api.auth.getMe()` | Verified Live |
| **Campuses** | `GET` | `/campuses` | Bearer Token | No | Query: `limit`, `offset` | `List[CampusResponse]` | `api.campuses.list()` | Verified Live |
| **Campuses** | `GET` | `/campuses/{id}` | Bearer Token | No | Path: `id` | `CampusResponse` | `api.campuses.get()` | Verified Live |
| **Students** | `GET` | `/students` | Bearer / Staff | Yes (`X-Campus-Id`) | Query: `search`, `limit`, `offset` | `List[StudentSummary]` | `api.students.list()` | Verified Live |
| **Students** | `GET` | `/students/{id}/support-view` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id` | `SupportViewResponse` | `api.students.getSupportView()` | Verified Live |
| **Students** | `GET` | `/students/{id}/finance-view` | Bearer / Finance | Yes (`X-Campus-Id`) | Path: `id` | `FinanceViewResponse` | `api.students.getFinanceView()` | Verified Live |
| **Students** | `POST` | `/students/{id}/predict` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id`, Body: `dict` | `MLPredictResponse` | `api.students.predict()` | Verified Live |
| **Students** | `GET` | `/students/{id}/readiness` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id` | `StudentReadinessResponse` | `api.students.getReadiness()` | Verified Live |
| **Signals** | `GET` | `/signals` | Bearer / Staff | Yes (`X-Campus-Id`) | Query: `status`, `student_id` | `List[SignalDTO]` | `api.signals.list()` | Verified Live |
| **Signals** | `GET` | `/signals/{id}` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id` | `SignalDTO` | `api.signals.get()` | Verified Live |
| **Signals** | `POST` | `/signals/{id}/review` | Bearer / Staff | Yes (`X-Campus-Id`) | `SignalReviewRequest` | `SignalReviewResponse` | `api.signals.review()` | Verified Live |
| **Signals** | `POST` | `/signals/evaluate` | Bearer / Staff | Yes (`X-Campus-Id`) | `EvaluateRequest` | `List[SignalDTO]` | `api.signals.evaluateStudent()` | Verified Live |
| **Cases** | `GET` | `/cases` | Bearer / Staff | Yes (`X-Campus-Id`) | Query: `state`, `owner_id` | `List[CaseDetailDTO]` | `api.cases.list()` | Verified Live (Staff only) |
| **Cases** | `GET` | `/cases/{id}` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id` | `CaseDetailDTO` | `api.cases.get()` | Verified Live |
| **Cases** | `POST` | `/cases/{id}/transition` | Bearer / Staff | Yes (`X-Campus-Id`) | `CaseTransitionRequest` | `CaseDetailDTO` | `api.cases.transition()` | Verified Live |
| **Cases** | `POST` | `/cases/{id}/assignment` | Bearer / HOD, Mentor | Yes (`X-Campus-Id`) | `CaseAssignmentRequest` | `CaseDetailDTO` | `api.cases.assign()` | Verified Live |
| **Cases** | `POST` | `/cases/{id}/accept-assignment`| Bearer / Assigned Owner | Yes (`X-Campus-Id`) | `AcceptAssignmentRequest` | `CaseDetailDTO` | `api.cases.accept()` | Verified Live |
| **Cases** | `POST` | `/cases/{id}/tasks` | Bearer / Staff | Yes (`X-Campus-Id`) | `CreateTaskRequest` | `CaseTaskDTO` | `api.cases.createTask()` | Verified Live |
| **Cases** | `POST` | `/cases/{id}/follow-ups` | Bearer / Staff | Yes (`X-Campus-Id`) | `FollowUpRequest` | `FollowUpDTO` | `api.cases.recordFollowUp()` | Verified Live |
| **Cases** | `POST` | `/cases/{id}/outcome` | Bearer / Staff | Yes (`X-Campus-Id`) | `OutcomeRequest` | `CaseOutcomeDTO` | `api.cases.recordOutcome()` | Verified Live |
| **Catalog** | `GET` | `/interventions` | Bearer / Staff | Yes (`X-Campus-Id`) | None | `List[InterventionItem]` | `api.interventions.list()` | Verified Live |
| **ML Engine** | `GET` | `/ml/model-info` | Bearer Token | No | None | `MLModelInfo` | `api.ml.getModelInfo()` | Verified Live |
| **ML Engine** | `POST` | `/ml/predict` | Bearer Token | No | `MLPredictRequest` | `MLPredictResponse` | `api.ml.predictSingle()` | Verified Live |
| **ML Engine** | `POST` | `/ml/predict/batch` | Bearer Token | No | `BatchPredictRequest` | `List[MLPredictResponse]`| `api.ml.predictBatch()` | Verified Live |
| **AI Subsystem**| `GET` | `/ai/status` | Bearer / Staff | Yes (`X-Campus-Id`) | None | `AIServiceStatusResponse` | `api.ai.getStatus()` | Verified Live |
| **AI Subsystem**| `POST` | `/ai/review-brief` | Bearer / Staff | Yes (`X-Campus-Id`) | `ReviewBriefRequest` | `AIStructuredReviewBriefResponse` | `api.ai.getReviewBrief()` | Verified Live |
| **AI Subsystem**| `POST` | `/ai/summarize-evidence` | Bearer / Staff | Yes (`X-Campus-Id`) | `SummarizeEvidenceRequest`| `AISummarizeEvidenceResponse` | `api.ai.summarizeEvidence()` | Verified Live |
| **AI Subsystem**| `POST` | `/ai/suggest-interventions` | Bearer / Staff | Yes (`X-Campus-Id`) | `SuggestInterventionsRequest` | `AISuggestInterventionsResponse` | `api.ai.suggestInterventions()` | Verified Live |
| **Counselors** | `GET` | `/counselors/profile` | Bearer / Counselor | Yes (`X-Campus-Id`) | None | `CounselorProfileDTO` | `api.counselors.getProfile()` | Verified Live |
| **Counselors** | `POST` | `/counselors/onboarding` | Bearer / Counselor | Yes (`X-Campus-Id`) | `CounselorOnboardingRequest`| `CounselorProfileDTO` | `api.counselors.submitOnboarding()` | Verified Live |
| **Counselors** | `GET` | `/counselors/authority-contacts`| Bearer / Counselor | Yes (`X-Campus-Id`) | None | `List[AuthorityContactItem]` | `api.counselors.getAuthorityContacts()` | Verified Live |
| **Counselors** | `POST` | `/counselors/escalate` | Bearer / Counselor | Yes (`X-Campus-Id`) | `EscalationRequest` | `EscalationRecordDTO` | `api.counselors.escalate()` | Verified Live |
| **Counselors** | `GET` | `/counselors/escalations` | Bearer / Counselor | Yes (`X-Campus-Id`) | None | `List[EscalationRecordDTO]` | `api.counselors.listEscalations()` | Verified Live |
| **Counselors** | `POST` | `/counselors/call-requests` | Optional Token | Yes (`X-Campus-Id`) | `CreateCallRequestInput` | `CounselorCallRequestDTO` | `api.counselors.createCallRequest()` | Verified Live |
| **Counselors** | `GET` | `/counselors/call-requests` | Bearer / Counselor | Yes (`X-Campus-Id`) | Query: `status` | `List[CounselorCallRequestDTO]` | `api.counselors.listCallRequests()` | Verified Live |
| **Counselors** | `PATCH` | `/counselors/call-requests/{id}`| Bearer / Counselor | Yes (`X-Campus-Id`) | `UpdateCallRequestStatusInput` | `StatusResponse` | `api.counselors.updateCallRequestStatus()` | Verified Live |
| **Documents** | `GET` | `/documents` | Bearer / Staff | Yes (`X-Campus-Id`) | Query: `doc_type`, `status` | `DocumentListResponse` | `api.documents.list()` | Verified Live |
| **Documents** | `GET` | `/documents/{id}` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id` | `DocumentDTO` | `api.documents.get()` | Verified Live |
| **Documents** | `POST` | `/documents/generate` | Bearer / Staff | Yes (`X-Campus-Id`) | `DocumentCreateRequest` | `DocumentDTO` | `api.documents.generate()` | Verified Live |
| **Documents** | `POST` | `/documents/{id}/finalize` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id` | `DocumentFinalizeResponse` | `api.documents.finalize()` | Verified Live |
| **Documents** | `POST` | `/documents/{id}/anchor` | Bearer / Staff | Yes (`X-Campus-Id`) | Path: `id` | `DocumentAnchorResponse` | `api.documents.anchor()` | Verified Live |
| **Documents** | `POST` | `/documents/{id}/verify` | Bearer / Staff | Yes (`X-Campus-Id`) | Multipart `candidate_file` | `DocumentVerifyResponse` | `api.documents.verify()` | Verified Live |
| **CBDC** | `POST` | `/documents/cbdc/issue-voucher`| Bearer / Admin | Yes (`X-Campus-Id`) | `CBDCVoucherIssueRequest` | `CBDCVoucherRecord` | `api.cbdc.issueVoucher()` | Verified Live |
| **Analytics** | `GET` | `/analytics/cohort-summary` | Bearer / Leadership | Yes (`X-Campus-Id`) | Query: `cohort`, `timeframe` | `CohortAnalyticsSummaryResponse` | `api.analytics.getCohortSummary()` | Verified Live |
| **Health** | `GET` | `/health` | Public | No | None | `HealthResponse` | `api.health.check()` | Verified Live |
| **Health** | `GET` | `/ready` | Public | No | None | `ReadinessResponse` | `api.health.ready()` | Verified Live |

---

## 3. Proposed Endpoints (Phase 3A Handoff Specifications)

The following endpoints are required to complete student-facing workflows. They are formally typed in `frontend/lib/types.ts` and pre-wired into `api.proposed` in `frontend/lib/api.ts`.

### Endpoint 1: Student-Scoped Case Retrieval
* **HTTP Method**: `GET`
* **Route**: `/api/v1/cases/my-cases`
* **Purpose**: Allow an authenticated student to retrieve their own support cases without disclosing institution-wide case queues or exposing peer student records.
* **Security & Auth**:
  * Requires valid Supabase JWT in `Authorization: Bearer <token>`.
  * Requires `X-Campus-Id: <campus_uuid>`.
  * **Server Invariant**: The server must resolve `student_id` directly from `auth.users` / `students.user_id`. Never trust client-supplied student IDs.
* **Request Schema**: None (query parameters optional: `?status=ACTIVE|RESOLVED`).
* **Response Schema (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "c4b9d031-6e3e-4cf7-8b5e-998811223344",
        "institution_id": "00000000-0000-0000-0000-000000000001",
        "student_id": "11111111-2222-3333-4444-555555555555",
        "title": "Academic Tutoring & Lab Work Advisory",
        "state": "IN_PROGRESS",
        "severity": "MEDIUM",
        "selected_intervention_key": "academic_tutoring_offer",
        "primary_owner_name": "Prof. Ananya Sharma",
        "tasks_count": 3,
        "open_tasks_count": 1,
        "created_at": "2026-10-10T14:30:00Z",
        "updated_at": "2026-10-12T09:15:00Z"
      }
    ],
    "total": 1
  }
  ```
* **Frontend Integration Call Site**:
  * [frontend/components/student/StudentDashboardView.tsx](file:///D:/Programming/hackathon2026/sutra/frontend/components/student/StudentDashboardView.tsx)
  * [frontend/app/cases/page.tsx](file:///D:/Programming/hackathon2026/sutra/frontend/app/cases/page.tsx)
* **Frontend Client Method**: `api.proposed.getMyCases()`

---

### Endpoint 2: General Student Support Ticket Submission
* **Status**: **Frontend Prepared / Backend Blocked (HTTP 404 Not Found)**
* **Verified Route Probe**: A direct probe against the active FastAPI backend (`http://localhost:8000/api/v1/support/tickets`) returned `HTTP 404 Not Found`. The support route is missing from FastAPI routers (`router.py`) and the OpenAPI schema, and the underlying database table has not yet been migrated.
* **HTTP Method**: `POST`
* **Route**: `/api/v1/support/tickets`
* **Purpose**: Enable students to submit online requests across Academic, Attendance, Learning Resource, and Administrative categories.
* **Security & Auth**:
  * Requires valid Supabase JWT in `Authorization: Bearer <token>`.
  * Requires `X-Campus-Id: <campus_uuid>`.
  * Resolves `student_id` from session server-side.
* **Request Schema (`Content-Type: application/json`)**:
  ```json
  {
    "category": "academic_mentorship",
    "subject": "Assistance needed for Advanced Calculus midterms",
    "description": "I have missed two lab sessions due to transit delays and require mentoring on problem sets 3 and 4.",
    "preferred_contact_method": "in_person",
    "urgency": "medium"
  }
  ```
* **Validation Invariants**:
  * `category` must be one of: `"counseling"`, `"academic_mentorship"`, `"attendance_support"`, `"learning_resources"`, `"administrative_guidance"`.
  * `subject`: min 5 chars, max 120 chars.
  * `description`: min 10 chars, max 2000 chars.
* **Response Schema (`201 Created`)**:
  ```json
  {
    "ticket_id": "7f8e9d0a-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
    "reference_number": "SUP-2026-8491",
    "category": "academic_mentorship",
    "subject": "Assistance needed for Advanced Calculus midterms",
    "description": "I have missed two lab sessions due to transit delays...",
    "status": "submitted",
    "student_id": "11111111-2222-3333-4444-555555555555",
    "created_at": "2026-10-12T16:00:00Z",
    "updated_at": "2026-10-12T16:00:00Z"
  }
  ```
* **Frontend Integration Call Site**:
  * [frontend/app/request-support/page.tsx](file:///D:/Programming/hackathon2026/sutra/frontend/app/request-support/page.tsx)
* **Frontend Client Method**: `api.proposed.createSupportTicket(payload)`

---

### Endpoint 3: Assessment Persistence
* **HTTP Method**: `POST`
* **Route**: `/api/v1/assessments/submissions`
* **Purpose**: Persist completed Student Guidance Assessment reports to database storage for longitudinal wellness tracking.
* **Security & Auth**:
  * Bearer Token + `X-Campus-Id`.
* **Request Schema**:
  ```json
  {
    "assessment_type": "STUDENT_GUIDANCE_V1",
    "overall_score": 78,
    "dimension_scores": {
      "learning_approach": 82,
      "motivation_engagement": 75,
      "confidence_self_efficacy": 70,
      "planning_time_management": 85,
      "coping_support": 72,
      "aspirations_career": 84
    },
    "strengths": ["Time Management", "Career Clarity"],
    "growth_areas": ["Exam Confidence"],
    "recommended_action": "Schedule 1-on-1 advisor check-in for midterm confidence building.",
    "client_completed_at": "2026-10-12T15:30:00Z"
  }
  ```
* **Response Schema (`201 Created`)**:
  ```json
  {
    "id": "e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a6b",
    "student_id": "11111111-2222-3333-4444-555555555555",
    "assessment_type": "STUDENT_GUIDANCE_V1",
    "overall_score": 78,
    "dimension_scores": { ... },
    "strengths": ["Time Management", "Career Clarity"],
    "growth_areas": ["Exam Confidence"],
    "recommended_action": "Schedule 1-on-1 advisor check-in...",
    "persisted_at": "2026-10-12T15:30:01Z"
  }
  ```
* **Related Retrieval Endpoints**:
  * `GET /api/v1/assessments/my-latest` (returns most recent record for authenticated student).
  * `GET /api/v1/assessments/{id}` (authorized staff or student owner lookup).
* **Frontend Integration Call Site**:
  * [frontend/app/assessment/page.tsx](file:///D:/Programming/hackathon2026/sutra/frontend/app/assessment/page.tsx)
* **Frontend Client Method**: `api.proposed.submitAssessment(payload)`, `api.proposed.getLatestAssessment()`

---

### Endpoint 4: Case Messaging Persistence
* **HTTP Methods**: `GET` / `POST`
* **Route**: `/api/v1/cases/{case_id}/messages`
* **Purpose**: Two-way asynchronous consultation messaging between assigned mentors/counselors and the student owner.
* **Security & Auth**:
  * Staff must have assigned ownership or campus supervision roles.
  * Students can only read/send messages if `case.student_id == authenticated_student_id`.
* **POST Request Schema**:
  ```json
  {
    "text": "Hello Professor Sharma, I have uploaded the draft for problem set 3."
  }
  ```
* **GET Response Schema (`200 OK`)**:
  ```json
  {
    "case_id": "c4b9d031-6e3e-4cf7-8b5e-998811223344",
    "messages": [
      {
        "id": "msg-001",
        "case_id": "c4b9d031-6e3e-4cf7-8b5e-998811223344",
        "sender_user_id": "22222222-2222-2222-2222-222222222222",
        "sender_name": "Prof. Ananya Sharma",
        "sender_role": "faculty",
        "text": "Let's meet on Tuesday at 17:30 to walk through the week 3 exercises together.",
        "created_at": "2026-10-11T14:30:00Z",
        "is_staff": true
      }
    ],
    "total": 1
  }
  ```
* **Frontend Integration Call Sites**:
  * [frontend/app/cases/[id]/page.tsx](file:///D:/Programming/hackathon2026/sutra/frontend/app/cases/[id]/page.tsx)
  * [frontend/app/messages/page.tsx](file:///D:/Programming/hackathon2026/sutra/frontend/app/messages/page.tsx)
* **Frontend Client Method**: `api.proposed.getCaseMessages(caseId)`, `api.proposed.sendCaseMessage(caseId, payload)`

---

## 4. Backend Database & Migration Dependencies

For the teammate handling database migrations and FastAPI models:

1. **Link `auth.users` to `Student`**:
   * Currently, the `Student` model has `institution_id: uuid.UUID` and `external_ref: str`, but no foreign key to Supabase's `auth.users.id`.
   * **Recommendation**: Add `user_id: Mapped[Optional[uuid.UUID]] = mapped_column(Uuid, ForeignKey("auth.users.id"), nullable=True)` to `students` table, with an index on `(institution_id, user_id)`.
2. **Support Tickets Table (`support_tickets`)**:
   * Columns: `id: UUID (PK)`, `institution_id: UUID (FK)`, `student_id: UUID (FK)`, `reference_number: String (Unique)`, `category: String`, `subject: String`, `description: Text`, `status: String`, `urgency: String`, `created_at: DateTime`, `updated_at: DateTime`.
3. **Assessment Submissions Table (`assessment_submissions`)**:
   * Columns: `id: UUID (PK)`, `institution_id: UUID (FK)`, `student_id: UUID (FK)`, `assessment_type: String`, `overall_score: Integer`, `dimension_scores: JSONB`, `strengths: JSONB`, `growth_areas: JSONB`, `recommended_action: Text`, `created_at: DateTime`.
4. **Case Messages Table (`case_messages`)**:
   * Columns: `id: UUID (PK)`, `case_id: UUID (FK)`, `institution_id: UUID (FK)`, `sender_user_id: UUID (FK)`, `text: Text`, `created_at: DateTime`.
5. **Python Driver Alignment**:
   * Install `greenlet` in the Python virtual environment (`pip install greenlet`) to resolve the SQLAlchemy async driver requirement on Python 3.13.

---

## 5. Implementation Status Matrix

| Workflow | Current State | Target / Proposed Route | Frontend Readiness | Backend Status & Blocking Dependency |
| :--- | :--- | :--- | :--- | :--- |
| **Counselor Call Request** | Server DB (`counselor_call_requests`) | Live `POST /counselors/call-requests` | 100% Integrated | **Verified Live** (Active endpoint & DB table) |
| **Student Case List** | In-memory client filtering of `/cases` | Proposed `GET /cases/my-cases` | 100% Prepared in `api.proposed.getMyCases()` | **Backend Blocked** (Returns HTTP 422 routing to `/{case_id}`; needs dedicated route & `students.user_id` mapping) |
| **Support Tickets** | Unavailable categories guarded | Proposed `POST /support/tickets` | 100% Prepared in `api.proposed.createSupportTicket()` | **Backend Blocked (HTTP 404)** (Route unmounted; requires `support_tickets` table migration & FastAPI router) |
| **Assessment Report** | `localStorage` with JSON validation | Proposed `POST /assessments/submissions` | 100% Prepared in `api.proposed.submitAssessment()` | **Backend Blocked** (Awaiting `assessment_submissions` table migration & router) |
| **Case Messaging** | Session React state with disclosure | Proposed `POST /cases/{id}/messages` | 100% Prepared in `api.proposed.sendCaseMessage()` | **Backend Blocked** (Awaiting `case_messages` table migration & router) |
| **Document Integrity** | Server DB + Sepolia registry | Live `/documents/*` | 100% Integrated | **Verified Live** (Active endpoint & contract registry) |
| **Cohort Risk Analytics** | Server DB (`analytics.py`) | Live `/analytics/cohort-summary` | 100% Integrated | **Verified Live** (Active endpoint & aggregate computation) |
| **Student Directory Privacy** | ADR-004 Gated in UI | Live `GET /students` | 100% Enforced in frontend | **Verified Live** (Staff-only access enforced client & server) |
