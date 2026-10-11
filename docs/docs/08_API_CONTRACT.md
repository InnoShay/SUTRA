# 08 · Canonical API Contract & OpenAPI Specification

Base Path: `/api/v1`. Format: `application/json`. Charset: UTF-8.  
Every protected route requires `Authorization: Bearer <SUPABASE_JWT>`.

---

## 1. Response Conventions & Standard Error Envelope

- **Purpose-Minimized DTOs:** Responses serialize strict Pydantic v2 schemas; internal database columns, raw SQL rows, and unauthorized fields are never leaked.
- **ISO 8601 UTC Timestamps:** All dates use explicit UTC format: `YYYY-MM-DDTHH:MM:SSZ`.
- **Pagination:** List endpoints accept `limit` (max 100, default 20) and `cursor` (opaque base64).
- **Mutation Idempotency:** Consequential POST endpoints require `Idempotency-Key` header (UUID or unique client token).

### Canonical Error Envelope
```json
{
  "error": {
    "code": "CASE_TRANSITION_NOT_ALLOWED",
    "message": "The requested transition is not valid for the current case state.",
    "request_id": "req_01HP89ABC1234XYZ",
    "timestamp": "2026-10-12T01:30:00Z",
    "details": {
      "current_state": "assigned",
      "requested_state": "closed",
      "required_interim_states": ["accepted", "support_in_progress", "outcome_reviewed"]
    }
  }
}
```

Standard HTTP Status Codes:
- `200 OK`: Successful read or synchronous mutation.
- `201 Created`: Resource successfully created.
- `202 Accepted`: Batch import or asynchronous job queued.
- `401 Unauthorized`: Missing, expired, or invalid Supabase Bearer JWT.
- `403 Forbidden`: Authenticated user lacks campus membership or role capability.
- `404 Not Found`: Entity does not exist, or cross-campus access blocked (zero object disclosure).
- `409 Conflict`: Concurrency version conflict (`CONCURRENT_CASE_MODIFICATION`) or invalid state machine transition.
- `422 Unprocessable Entity`: Schema validation or business invariant failure (e.g., negative click counts).
- `429 Too Many Requests`: Rate limit throttled.
- `500 Internal Server Error`: Unexpected server exception (redacted; error trace suppressed).

---

## 2. Canonical Endpoint Catalog

### 2.1 Health, Readiness & Authentication
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `GET` | `/health` (and `/api/v1/health`) | Basic process liveness check. | Public |
| `GET` | `/ready` (and `/api/v1/ready`) | Readiness probe verifying PostgreSQL connection and ML model readiness. | Public |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile, campus memberships, and active role. | Authenticated |
| `GET` | `/api/v1/campuses/active` | Current campus metadata and configuration thresholds. | Authenticated |

### 2.2 Ingestion & Data Import
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `POST` | `/api/v1/imports` | Submit CSV/JSON batch across 6 observation domains (`Idempotency-Key` required). | Admin, HOD |
| `GET` | `/api/v1/imports/{importId}` | Status, row counts, duplicate counts, and validation errors for batch. | Admin, HOD |

### 2.3 Students & Observations
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `GET` | `/api/v1/students` | List pseudonymous students in active campus with cohort filters. | Faculty, HOD, Mentor, Admin |
| `GET` | `/api/v1/students/{studentId}` | Student header profile, enrollment status, active case status. | Faculty, HOD, Mentor, Admin |
| `GET` | `/api/v1/students/{studentId}/support-view` | Role-filtered 360° support view with data freshness/completeness. | Faculty, HOD, Mentor |
| `GET` | `/api/v1/students/{studentId}/observations` | Chronological observations across 5 general domains. | Faculty, HOD, Mentor |
| `GET` | `/api/v1/students/{studentId}/finance` | Restricted fee-support observation details. | Finance Only |

### 2.4 Policy Evaluation & Signals
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `POST` | `/api/v1/students/{studentId}/signals/evaluate` | Evaluate policy rules against frozen evidence as-of cutoff. | Faculty, HOD, Mentor |
| `POST` | `/api/v1/signals/evaluate` | Batch evaluate student cohort against published policy version. | HOD, Admin |
| `GET` | `/api/v1/signals` | Paginated queue of active signals awaiting review. | Faculty, HOD, Mentor |
| `GET` | `/api/v1/signals/{signalId}` | Signal explanation, Evidence Card, quality state, and evidence packet. | Faculty, HOD, Mentor |
| `POST` | `/api/v1/signals/{signalId}/review` | Review decision: `approve`, `modify`, `dismiss`, or `request_more_data`. | Faculty, HOD, Mentor |

### 2.5 Interventions Catalogue
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `GET` | `/api/v1/interventions` | List active support interventions from controlled catalogue. | All Campus Roles |

### 2.6 Cases & Lifecycle Coordination
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `POST` | `/api/v1/signals/{signalId}/cases` | Create persistent case from reviewed signal and approved action. | Faculty, HOD, Mentor |
| `GET` | `/api/v1/cases` | Paginated case queue with state, owner, domain, and due filters. | All Campus Roles (Scoped) |
| `GET` | `/api/v1/cases/{caseId}` | Case coordination DTO and generic task statuses. | All Campus Roles (Scoped) |
| `POST` | `/api/v1/cases/{caseId}/transition` | Apply valid state machine transition (`Idempotency-Key` required). | Assigned Owner, HOD |
| `POST` | `/api/v1/cases/{caseId}/assignment` | Assign or reassign primary case owner. | HOD, Mentor, Admin |
| `POST` | `/api/v1/cases/{caseId}/accept-assignment`| Assigned owner explicitly accepts or declines responsibility. | Assigned Owner |
| `POST` | `/api/v1/cases/{caseId}/tasks` | Spawn domain subtask (e.g. finance aid, counselling referral). | Assigned Owner, HOD |
| `GET` | `/api/v1/cases/{caseId}/tasks/{taskId}/restricted` | Retrieve restricted task payload (counselling context / fee aid). | Domain Specialist Only |
| `POST` | `/api/v1/cases/{caseId}/follow-ups` | Record contact attempt, student reach, or support delivery evidence. | Assigned Owner |
| `POST` | `/api/v1/cases/{caseId}/outcome` | Record post-support outcome (`helped`, `not_helped`, `mixed`, `unknown`). | Assigned Owner, HOD |
| `GET` | `/api/v1/cases/{caseId}/history` | Redacted, role-filtered audit timeline of case events. | Assigned Owner, HOD, Admin |
| `POST` | `/api/v1/cases/{caseId}/override` | Reasoned authorized override; preserves prior decision history. | Assigned Owner, HOD |
| `POST` | `/api/v1/cases/{caseId}/reopen` | Reopen closed case with mandatory reason and next action. | HOD, Admin |

### 2.7 Cohort & Operational Analytics
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `GET` | `/api/v1/analytics/overview` | Executive overview of operational rates (acceptance, reaches, outcomes). | Leadership, HOD, Admin |
| `GET` | `/api/v1/analytics/cohorts` | Aggregate cohort breakdowns with small-cell suppression (<5). | Leadership, HOD, Admin |
| `GET` | `/api/v1/analytics/operations` | Case processing latency, overdue burdens, and worker dispatch rates. | Leadership, HOD, Admin |
| `GET` | `/dashboard/cohorts` & `/dashboard/operations` | Root compatibility aliases redirecting to canonical analytics paths. | Authenticated |

### 2.8 Machine Learning Inference & Governance
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `GET` | `/api/v1/ml/model-info` (alias: `/model-info`) | Active model metadata, version (v1.0.0), threshold (0.46), feature list. | Authenticated |
| `POST` | `/api/v1/ml/predict` (alias: `/predict`) | Single Day-30 inference; returns risk probability & Evidence Card. | Faculty, HOD, Mentor |
| `POST` | `/api/v1/ml/predict/batch` (alias: `/predict/batch`) | Batch inference over feature matrix; returns array of predictions. | HOD, Admin |

### 2.9 Bounded AI Orchestration (Planned / Optional)
| Method | Path | Summary & Purpose | Roles Allowed |
|---|---|---|---|
| `POST` | `/api/v1/ai/summarize-evidence` | Generate concise text brief from student observation timeline. | Faculty, HOD, Mentor |
| `POST` | `/api/v1/ai/suggest-intervention` | Suggest options restricted strictly to `intervention_catalog`. | Faculty, HOD, Mentor |
| `POST` | `/api/v1/ai/draft-followup` | Draft empathetic outreach message template for mentor review. | Assigned Owner |

---

## 3. Representative Request Payloads

### 3.1 Single Student ML Inference (`POST /api/v1/ml/predict`)
```json
{
  "external_student_ref": "SYN-1007",
  "cutoff_days": 30,
  "features": {
    "num_of_prev_attempts": 0,
    "studied_credits": 60,
    "gender": "F",
    "region": "East Anglian Region",
    "highest_education": "A Level or Equivalent",
    "imd_band": "20-30%",
    "age_band": "0-35",
    "disability": "N",
    "days_registered_before_start": -32.0,
    "has_missing_registration_date": 0,
    "vle_total_clicks_d30": 142,
    "vle_active_days_d30": 8,
    "vle_clicks_precourse": 24,
    "vle_clicks_poststart_d30": 118,
    "vle_clicks_last_7d": 12,
    "vle_days_since_last_click": 6.0,
    "vle_clicks_forumng_d30": 18,
    "vle_clicks_oucontent_d30": 82,
    "vle_clicks_quiz_d30": 0,
    "vle_clicks_homepage_d30": 28,
    "vle_clicks_other_d30": 14,
    "has_vle_activity_d30": 1,
    "assessments_submitted_d30": 1,
    "assessment_banked_d30": 0,
    "has_early_assessment_submission_d30": 1
  }
}
```

### 3.2 Signal Review (`POST /api/v1/signals/{signalId}/review`)
```json
{
  "decision": "modify",
  "selected_intervention_key": "mentor_check_in",
  "reason_code": "REVIEWER_SELECTED_ALTERNATIVE",
  "rationale": "Offer an informal mentor check-in first to verify engagement barriers before scheduling tutoring."
}
```

### 3.3 Record Follow-Up Proof (`POST /api/v1/cases/{caseId}/follow-ups`)
```json
{
  "follow_up_type": "contact_attempt",
  "contact_status": "student_reached",
  "occurred_at": "2026-10-13T10:15:00Z",
  "proof_kind": "staff_attestation",
  "note": "Met student in academic advisory session. Student confirmed difficulty accessing module materials."
}
```

### 3.4 Record Attributed Outcome (`POST /api/v1/cases/{caseId}/outcome`)
```json
{
  "outcome_status": "unknown",
  "follow_up_window_end": "2026-10-27T00:00:00Z",
  "rationale": "Advisory session completed; follow-up assessment is scheduled in 14 days. Current outcome remains unknown.",
  "evidence_kind": "insufficient_evidence"
}
```
