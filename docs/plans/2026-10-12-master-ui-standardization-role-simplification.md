# SUTRA — Master UI Standardization, Screen Implementation & Role Simplification Audit

**Author:** SUTRA Architectural & Security Team  
**Date:** 2026-10-12  
**Target:** SUTRA MVP (Student, Staff, Admin)  
**Locked Design Reference:** Approved SUTRA Minimal Dashboard Layout (`media_1791769884747.png`)

---

## 1. Executive Summary

This audit establishes the blueprint for standardizing SUTRA's user interface, completing role-specific screens, and consolidating the role hierarchy into a coherent, secure, 3-role MVP model (**Student**, **Staff**, **Admin**).

### Core Audit Findings
1. **Visual Language Inconsistency**: While the core dashboard layout (`media_1791769884747.png`) exemplifies a clean, light, accessible interface (pale gray background, white card container, restrained typography, thin borders, generous whitespace), other views previously suffered from disparate badges, promotional banners, and inconsistent terminology.
2. **Missing Dedicated Student Experience**: The previous frontend was designed predominantly for educators and investigators. Enrolled students (such as Asha, `SYN-1007`) lacked a dedicated self-service dashboard, personal case tracker (`/cases`), support request form, and direct student communication portal.
3. **Role Complexity vs. Functional Need**: The application had 5 distinct roles (`faculty`, `counselor`, `dean`, `leadership`, `superadmin`) with overlapping capabilities. Most distinctions were UI persona labels rather than hard security boundaries, with two notable exceptions:
   - **ADR-004**: Leadership cannot inspect individual student 360 records (cohort aggregate only).
   - **Clinical Privacy**: Confidential counseling and mental health notes must be restricted from general faculty mentors.
4. **Backend Security Parity**: Backend route guards (`require_roles` in `app/core/security.py`) and FastAPI endpoints enforce authorization. The MVP role model must preserve existing database relationships and ADR security invariants while simplifying frontend navigation and user management.

---

## 2. Current Roles Discovered & Analysis

| Current Role | Stated Purpose | Existing Routes & Capabilities | Overlaps & Gaps | MVP Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **`faculty`** | Course instructor & mentor | `/dashboard`, `/courses`, `/students`, `/community`, `/analytics`. Can review signals, convert to cases, log follow-ups. | Overlaps with `counselor` and `dean` on triage and signal review. Cannot view finance. | **Consolidate into `STAFF`** with standard mentor capability. |
| **`counselor`** | Student wellbeing specialist | `/dashboard`, `/students`, `/community`. Can access wellbeing queue, authority escalation, confidential counseling notes. | Separate view created, but fundamentally performs student support workflows. | **Consolidate into `STAFF`** with `canViewCounselling: true` permission. |
| **`dean`** | Department head / academic dean | Same as faculty plus case reassignment and departmental metrics oversight. | Almost identical to faculty; reassignment capability is an administrative privilege. | **Consolidate into `STAFF`** with `canReassignCases: true` permission. |
| **`leadership`** | Executive / Vice Chancellor | Cohort-level telemetry on `/dashboard` and `/analytics`. **Strictly forbidden** from viewing individual student records (ADR-004). | Overlaps with dean/admin on analytics, but has deliberate privacy suppression. | **Represented as `STAFF` (Executive Scope)** with `canViewIndividualStudents: false` privacy gate. |
| **`superadmin`** | System administrator | Full access across all routes, user management, configuration. | Full privileged role. | **Rename to `ADMIN`**. |
| *(Missing)* **`student`** | Enrolled student | **Zero dedicated views existed.** Could not track own cases, submit requests, or view next steps. | Critical product gap for closed-loop student support. | **Introduce as primary `STUDENT` role**. |

---

## 3. Recommended 3-Role MVP Model

To simplify without weakening security, SUTRA adopts 3 primary application roles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                               SUTRA MVP                                │
├──────────────────┬─────────────────────────────┬───────────────────────┤
│     STUDENT      │            STAFF            │         ADMIN         │
│  (Self-Service)  │      (Case Management)      │    (Administration)   │
├──────────────────┼─────────────────────────────┼───────────────────────┤
│ • My Dashboard   │ • Operational Overview      │ • System Overview     │
│ • My Cases       │ • Case Management & Triage  │ • Case Oversight      │
│ • Request Support│ • Student Directory         │ • User & Role Mgmt    │
│ • Messages       │ • Protocols & Interventions │ • Category Governance │
│ • Help & Support │ • Institutional Analytics   │ • Settings & Audit    │
│ • My Profile     │ • Follow-Ups & Escalation   │ • RLS & System Health │
└──────────────────┴─────────────────────────────┴───────────────────────┘
```

### Permission Matrix

| Capability / Resource | STUDENT | STAFF (Mentor) | STAFF (Counselor) | STAFF (Leadership) | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| View Own Student Dashboard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Submit Support Request | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Own Cases & Updates | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Assigned Student Cases | ❌ | ✅ | ✅ | ❌ (Aggregates Only) | ✅ |
| Progress Case Lifecycle (10-state) | ❌ | ✅ | ✅ | ❌ | ✅ |
| Add Standard Follow-Up Notes | ❌ | ✅ | ✅ | ❌ | ✅ |
| Access Confidential Clinical Notes | ❌ | ❌ | ✅ | ❌ | ✅ |
| Initiate Authority Escalation | ❌ | ❌ | ✅ | ❌ | ✅ |
| View Student Directory (360°) | ❌ | ✅ | ✅ | ❌ (ADR-004 Gate) | ✅ |
| Access Institutional Analytics | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage Users & Assign Roles | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure Support Categories | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 4. Route & Screen Inventory

| Route | Intended Role | Screen Description | Status | Missing / Required Enhancements |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | All | Role-aware Overview | Partially Implemented | Needs dedicated Student Overview when `role === 'student'` matching the locked visual reference. |
| `/cases` | Student | My Support Cases List | Missing | Create clean, minimal list of student's own support requests. |
| `/cases/[id]` | Student / Staff | Case Detail View | Partially (in modal) | Standardize dedicated view showing permitted case description, status, student-visible messages, hiding confidential staff notes. |
| `/request-support` | Student | Submit Support Request | Missing | Clean form collecting category, subject, details, and voluntary attachments with validation. |
| `/messages` | Student / Staff | Case Communication | Missing | Clean conversation feed linked to active cases. |
| `/students` | Staff / Admin | Student Directory | Implemented | Preserve ADR-004 privacy gate for leadership; standardize card design. |
| `/courses` | Staff / Admin | Interventions & Protocols | Implemented | Preserve ML governance and protocol catalog; maintain minimal styling. |
| `/community` | Staff / Admin | Case Management | Implemented | Standardize table, filters, and status presentation. |
| `/analytics` | Staff / Admin | Institutional Analytics | Implemented | Preserve cohort telemetry and retention metrics. |
| `/settings` | All | Settings & User Mgmt | Implemented | Add Admin User/Role Management tab and Student Profile tab. |
| `/help` | All | Help & Support | Implemented | Add student-specific guidance and emergency contacts. |

---

## 5. Visual Standardization Guidelines (Locked Design Reference)

Every screen must conform to the characteristics of the approved reference (`media_1791769884747.png`):

1. **Palette**:
   - Application Background: Pale neutral gray (`bg-[#f4f5f7]` or `bg-neutral-100`).
   - Card Surfaces: Pure white (`bg-white`), thin borders (`border-neutral-200/80`), rounded-3xl / rounded-2xl corners.
   - Text Hierarchy: Primary `text-neutral-900 font-extrabold tracking-tight`, Secondary `text-neutral-500` or `text-neutral-400`.
   - Accent Colors: Highly restrained. Amber (`text-amber-700 bg-amber-50 border-amber-200`) for pending/action required; Emerald (`text-emerald-700 bg-emerald-50 border-emerald-200`) for verified/resolved; Rose (`text-rose-700 bg-rose-50 border-rose-200`) for high-urgency escalations.
2. **Typography**: Clean sans-serif (`font-sans`), font-heading for primary headers, strictly avoiding decorative or colored text.
3. **Status Presentation**: Text-first statuses (e.g., `In Progress`, `Action Required`, `Resolved`) with subtle, uniform pills. No oversized badges or rainbow tags.
4. **Layout**:
   - Sidebar on the left (`w-64`), containing Logo, Main Navigation, Others Navigation, and User Profile Card at the bottom.
   - Top Header inside content surface: Search input pill, Session / Role indicators, Notification icons, User Avatar.
   - Page Content: 2-column or clean stacked grid with generous padding (`p-6 sm:p-8`).

---

## 6. Implementation Plan

- **Phase 1: Role System & Demo Auth Integration**:
  - Add `student` role to `UserRole` in `frontend/lib/types.ts`.
  - Add `student` persona (`Asha (synthetic)`, `SYN-1007`) to `DEMO_PERSONAS` in `frontend/lib/demo-auth.ts`.
  - Add role helper functions (`isStudent`, `isStaff`, `isAdmin`) in `frontend/lib/auth-utils.ts`.
- **Phase 2: AppShell Dynamic Navigation**:
  - Update `AppShell.tsx` to dynamically render role-specific navigation based on active role (Student vs Staff vs Admin).
- **Phase 3: Student Screens**:
  - Build `StudentDashboardView` (Welcome, My Cases, Your Next Steps, Recent Activity, Need Help?).
  - Build `/cases` (My Cases) and `/cases/[id]` (Case Details with restricted staff note masking).
  - Build `/request-support` (Support Request Form).
  - Build `/messages` (Case-linked Messages).
- **Phase 4: Staff & Admin Standardization**:
  - Standardize `/settings` with Admin User Management and Role Management.
  - Verify Staff Overview and Case Management conform to the locked visual design.
- **Phase 5: Automated Testing & Verification**:
  - Extend `test-contract.mjs` to validate 3-role permissions, student record isolation, and route guards.
  - Verify build (`npm test`) and live Next.js compilation.
