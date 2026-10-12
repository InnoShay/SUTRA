# SUTRA — Role Model Simplification & Migration Plan

**Repository:** `d:\Programming\hackathon2026\sutra`  
**Date:** October 12, 2026  
**Document:** `docs/ROLE_MIGRATION.md`  
**Target Architecture:** Teacher-Centric Active Role Model with Preserved Enterprise Backend RBAC  

---

## 1. Executive Summary

This document specifies the architectural transition from an over-complicated multi-persona application UI to a streamlined, **Teacher-Only** active application experience.

In previous iterations, the user interface exposed an interactive persona-switching menu in the global header, allowing users to switch among six different identities (`student`, `faculty`, `counselor`, `dean`, `leadership`, `superadmin`). This introduced significant cognitive overhead, visual noise, and violated the core product focus of empowering educators directly responsible for student success.

The target design simplifies the active UI to the **Teacher** role (`faculty` / `Prof. Ananya Sharma`), while preserving:
1. All underlying student, case, signal, and appointment data.
2. Server-side role-based access control (RBAC) in FastAPI.
3. Database Row-Level Security (RLS) policies.
4. Historical records, audit logs, and counselor escalation pipelines.

---

## 2. Inventory of Historical & Active Roles

### Defined Roles in System

| Role Key | Display Name | Domain Scope | Permissions |
| :--- | :--- | :--- | :--- |
| `faculty` | Prof. Ananya Sharma | Teacher / Course Instructor & Mentor | Signal triage, case creation, student cohort 360, intervention assignment |
| `counselor` | Dr. Meera Nambiar | Student Counselor & Wellbeing Specialist | Specialized counseling cases, authority escalation, confidential notes |
| `dean` | Dr. Rajeshwar Rao | Academic Dean / HOD | Department oversight, case reassignment, protocol approval |
| `leadership` | Prof. S.K. Kulkarni | Vice Chancellor / Executive Leadership | Aggregate cohort statistics, ADR-004 privacy masking (zero individual PII) |
| `superadmin` | SUTRA Admin | Institutional Governance | System configuration, campus provisioning, global audit logs |
| `student` | Asha Synthetic | Enrolled Student | Self-service case requests, student messages, personal milestone tracking |

---

## 3. Active Teacher Application Model

### Core Principles
1. **Teacher as Primary Authorized User:** The educator is the active operator of SUTRA. The entire navigation and dashboard are purpose-built for the teacher's day-to-day workflow.
2. **Zero Client-Side Role Switching:** The global header persona dropdown has been removed. The active user identity is clearly displayed as a verified status pill (`Faculty (Prof. Sharma)`) without interactive switcher complexity.
3. **Dedicated Teacher Navigation:**
   - **Overview:** Teacher Dashboard matching the locked visual reference (`media_1791769884747.png`).
   - **My Cases:** Complete table of active, under-review, and resolved student support cases.
   - **Student Directory:** Roster of enrolled learners with attendance and academic telemetry.
   - **Interventions & Protocols:** Approved institutional intervention playbooks and SOPs.
   - **Help & Support:** Operational guidelines and plain-language assistance.
   - **Sign Out:** Secure session termination.

---

## 4. Distinction Between Role Removal and Data Preservation

A fundamental rule of this migration is that **simplifying the active UI role model does NOT destroy underlying data or backend capabilities**:

- **Student Records:** 100% preserved in `students` table and `INITIAL_STUDENTS` store.
- **Support Cases:** 100% preserved in `cases`, `case_tasks`, and `case_events`.
- **Counselor Workflows:** Subsystems for counselor onboarding, authority escalation, and threshold-triggered calls remain fully operational on the server and accessible when required via case workflows.
- **Audit Trails:** All historical case transitions and signal reviews retain their original author metadata.

---

## 5. Security Architecture & Preserved Boundaries

### A. Server-Side RBAC Enforcement
The FastAPI backend strictly enforces role checks in `app/core/security.py`:
```python
def require_roles(allowed_roles: List[str]):
    async def role_checker(membership: CampusMembershipContext = Depends(get_campus_membership)):
        if not any(r in allowed_roles for r in membership.roles):
            raise PermissionDeniedError(
                f"Role required: one of {allowed_roles}. User possesses: {membership.roles}",
                code="INSUFFICIENT_ROLE_PERMISSIONS",
            )
        return membership
    return role_checker
```
- Teacher accounts are granted `faculty` permissions.
- Administrative capabilities (such as altering campus configuration or deleting institutions) remain locked behind `institution_admin` / `superadmin` checks.
- Teachers CANNOT elevate their privileges through client-side modifications.

### B. Database Row-Level Security (RLS)
PostgreSQL RLS policies defined in `migrations/supabase_rls_lockdown.sql` remain in full force:
- Public/anon PostgREST queries from the browser are blocked (`REVOKE ALL`).
- All queries flow through FastAPI with authenticated `X-Campus-Id` and validated JWT claims.

---

## 6. Migration & Rollback Strategy

### Migration Execution
1. **Frontend UI Consolidation:**
   - In `AppShell.tsx`, replace the interactive dropdown with a clean, static status pill.
   - Clean navigation to feature Teacher-only core routes (`/dashboard`, `/cases`, `/students`, `/courses`, `/help`, `/login`).
2. **Dashboard Realignment:**
   - Update `app/dashboard/page.tsx` to match the 4 KPI cards and 2-column layout of `media_1791769884747.png`.
3. **Contract Test Alignment:**
   - Update test assertions in `frontend/scripts/test-contract.mjs` to verify Teacher-only active navigation invariants.

### Rollback Strategy
If legacy persona switching is ever required for multi-role demonstrations in external environments:
1. Re-enable the persona popover component in `AppShell.tsx` using Git history.
2. The underlying `DEMO_PERSONAS` dictionary in `lib/demo-auth.ts` remains intact, ensuring zero data loss or migration failure.
3. No database schema alterations are needed, guaranteeing zero-risk reversibility.
