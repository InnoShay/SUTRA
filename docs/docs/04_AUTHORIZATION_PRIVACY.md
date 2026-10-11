# 04 · Authorization, Campus Privacy & Security Controls

## 1. Identity & Campus Membership Model

Authentication establishes verified user identity; authorization strictly dictates permitted resources, domains, and operations.

SUTRA integrates **Supabase Auth**, but enforces all authorization **server-side** inside the FastAPI application:
1. **Server-Side Cryptographic JWT Verification:** Every protected request carries a Bearer JWT in the `Authorization` header. FastAPI dependency `get_current_user` validates signature, expiration, and issuer using server-held `SUPABASE_JWT_SECRET`. Client-supplied roles or identity claims in JSON bodies are completely ignored.
2. **Campus Membership Resolution:** FastAPI dependency `get_campus_membership` queries `institution_memberships` using the authenticated `user_id`. It confirms active status (`is_active = true`) within the target `institution_id` (campus boundary).
3. **Data Access Layer (DAL) Object Checks:** Even with a valid token and active membership, the DAL verifies object-level ownership: the student, signal, case, or task must belong to the user's active campus, and the user's role must permit the requested operation.

### Canonical Campus Roles:
`faculty`, `hod`, `mentor`, `counsellor`, `placement`, `finance`, `leadership`, `institution_admin`.

---

## 2. Role-Based Capability Matrix

| Data / Action | Faculty | HOD | Mentor | Counsellor | Placement | Finance | Leadership | Admin |
|---|---|---|---|---|---|---|---|---|
| **Academic Observations** | Scoped | Scoped | Assigned | Referral context only | Referral context only | No | Aggregates only | Config only |
| **Fee Details** | No | No by default | No | No | No | Authorized finance tasks | Aggregates only | No elevated data access |
| **Counselling Details** | No | No | Referral status only | Authorized cases only | No | No | Aggregates only | No elevated data access |
| **Submit Observation / Concern** | Yes | Yes | Yes | Role scope | Role scope | Role scope | No by default | No |
| **Review & Approve Signal** | Scoped | Yes | Assigned scope | Counselling referrals only | Placement support only | Finance support only | No | Emergency override only |
| **Assign / Reassign Owner** | Limited | Yes | Assigned scope | Domain tasks | Domain tasks | Domain tasks | Operational aggregates | Configuration, audited |
| **Record Follow-Up Proof** | Assigned cases | Assigned cases | Assigned cases | Counselling tasks | Placement tasks | Finance tasks | No | No |
| **Record Student Outcome** | Assigned cases | Yes | Assigned cases | Counselling tasks | Placement tasks | Finance tasks | No | No |
| **Cohort Aggregates** | Course scope | Yes | Mentee scope | Domain scope | Domain scope | Domain scope | Yes (suppressed <5) | Yes |
| **Manual Override** | Reasoned own case | Yes | Assigned scope | Domain scope | Domain scope | Domain scope | No | Governed audit |

---

## 3. Four-Dimensional Authorization Model

Every protected operation evaluates across four distinct dimensions:
1. **Campus / Institution Boundary:** Active membership in the target `institution_id`. Cross-campus access is strictly forbidden and returns an indistinguishable `404 Not Found`.
2. **Role & Capability:** User's assigned role possesses explicit permission for the requested action under the capability matrix.
3. **Domain Boundary:** Sensitive financial data (`finance_observations`) and counselling notes (`restricted_task_details`) require explicit domain authorization. General case queries omit sensitive payloads.
4. **Purpose & Student Processing Authorization:** Processing must be valid under an active `processing_authorizations` record. Withdrawn optional authorization immediately halts pending optional workflows.

---

## 4. DTO Serialization & Logging Privacy Rules

- **Strict Field Allow-Lists:** FastAPI / Pydantic v2 response schemas use strict field allow-lists. Raw database models are never returned to clients.
- **DTO Redaction:** Mentors and general faculty inspecting a case with financial support tasks receive only generic task labels (e.g. `domain: "finance"`, `status: "in_progress"`). The fee amount, debt status, and private notes are completely stripped.
- **Aggregates-Only for Leadership:** Leadership accounts receive aggregated operational metrics; they are denied access to identifiable individual student queues.
- **Small-Cell Suppression:** Any cohort aggregate query returning fewer than `SUTRA_MIN_AGGREGATE_CELL` (default: 5) individuals is redacted and marked `suppressed: true` to prevent re-identification.
- **Log Sanitization:** Application logs, error traces, and metrics strictly exclude student names, roll numbers, fee balances, counselling notes, JWT tokens, and LLM student prompts.

---

## 5. Database Safeguards & RLS Defense-in-Depth

- **Dual-Layer Enforcement:** Table grants and PostgreSQL Row Level Security (RLS) policies are configured in tandem.
- **Service-Role Isolation:** The Supabase secret/service-role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and is strictly confined to the backend server environment. It is never exposed to Next.js browser bundles, mobile clients, or the Rust CLI.
- **Worker Isolation:** Asynchronous workers operate with isolated, least-privilege credentials restricted to due task queries and outbox dispatch.

---

## 6. Ten Must-Pass Security Negative Tests

1. `test_anonymous_request_rejected`: Unauthenticated request returns `401 Unauthorized`.
2. `test_inactive_membership_rejected`: User with `is_active = false` returns `403 Forbidden`.
3. `test_cross_campus_access_blocked`: User attempting to access student or case from another campus returns `404 Not Found` (zero disclosure).
4. `test_mentor_cannot_read_fee_details`: Mentor requesting `/students/{id}/finance` returns `403 Forbidden`; general DTO omits fee fields.
5. `test_faculty_cannot_perform_counsellor_action`: Faculty submitting counselling referral outcome returns `403 Forbidden`.
6. `test_leadership_cannot_list_identifiable_cases`: Leadership role requesting `/cases` returns `403 Forbidden`.
7. `test_spoofed_role_in_payload_ignored`: Request containing `{"role": "institution_admin"}` does not elevate authority.
8. `test_revoked_purpose_blocks_handoff`: Withdrawn student processing authorization halts optional intervention creation.
9. `test_service_key_absent_from_client_bundles`: Automated build scanner verifies `SUPABASE_SERVICE_ROLE_KEY` is nowhere in client code.
10. `test_small_cell_suppression_enforced`: Query for cohort with $N=3$ students returns masked metrics and `suppressed: true`.

---

## 7. Safeguarding & Non-Punitive Invariant

SUTRA is engineered strictly as an educational support and early-warning orchestration system:
- **No Disciplinary Sanctions:** SUTRA contains zero endpoints, rules, or workflows for suspending students, issuing penalties, or recording disciplinary sanctions.
- **No Psychological Diagnosis:** Under no circumstances may rule engines, ML models, or AI summaries output clinical psychological labels (e.g. "depressed", "bipolar").
- **Adult Student Privacy:** Parent/guardian contact for adult students is strictly non-automated and gated behind mandatory human review and institutional privacy policy compliance.
