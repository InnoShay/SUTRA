# SUTRA UI Parity & Regression Audit Report
**Original Source (Reference):** `D:\Programming\hackathon2026\hackingly`  
**Target Repository:** `D:\Programming\hackathon2026\sutra` (`sutra/frontend`)  
**Audit Date:** October 12, 2026  
**Auditor:** Senior Frontend Architect, UI Regression Investigator & Design Systems Engineer  
**Status:** Audit Completed · Awaiting User Authorization Prior to Implementation  

---

## 1. Executive Summary

This comprehensive audit investigates the structural, visual, and architectural divergence between the original UI in the **Hackingly** repository and the current implementation inside the **SUTRA** repository (`frontend/`).

### Key Findings:
1. **The Original Visual Baseline Exists in Hackingly:**
   The original UI created by Haruto-x-Okura is an Apple-inspired educational platform design ("SkillHub") defined by a floating, pure-white elevated canvas (`.floating-window` with 32px rounded corners and subtle multi-layer drop shadows) set against a soft neutral backdrop (`#ECEFF3`).
2. **Root Cause of the Dashboard UI Regression:**
   The visual and structural divergence in `sutra/frontend/app/dashboard/page.tsx` was introduced in commit `d0c7dda` ("feat(phase5): adapt existing frontend to verified FastAPI backend contracts"). To satisfy backend contract requirements, several heavy operational surfaces were added directly into the dashboard page:
   - A dark, full-width **"No Alert Without Action"** banner (`bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900`) pushing down the grid.
   - Text label overwrites converting clean educational metrics into backend telemetry (`Active Learners` ➔ `Evaluated Cohort`, `New Enrollments` ➔ `Generated Alerts`, `Advanced UI/UX Design` ➔ `Advanced Academic Mentoring`).
   - A full-width **Priority Review Queue** table with signal triage buttons.
   - A full-width **Active Case Lifecycle Tracker** table with 10-state progression badges.
   - An intrusive **ADR-004 Institutional Privacy** lock card.
3. **AppShell & Shell Geometry are Intact:**
   The foundational layout shell (`AppShell.tsx`), floating window tokens, and global CSS in `sutra/frontend` are structurally identical to `hackingly`. The perceived "layout breakage" is primarily caused by **content-level intrusion** within individual page templates (dashboard, courses, community) where massive tables and banners disrupted the intended Apple-style whitespace, card proportions, and grid rhythm.
4. **Feasibility of Restoration:**
   The original UI can be restored with high fidelity without sacrificing SUTRA's verified backend contracts, Supabase authentication, or role-based privacy fencing. The solution is architectural separation: restore the dashboard to its clean Apple aesthetic, and route the operational case machine and triage queues into dedicated views or dedicated tabs as originally designed in `SUTRA_UI_UX_PRD.md`.

---

## 2. Repository and Git State

### 2.1 Original Source Repository (`hackingly`)
* **Location:** `D:\Programming\hackathon2026\hackingly`
* **Current Branch:** `refactor/sidebar-shell-layout`
* **Tracking Remote:** `origin` (`https://github.com/harshwardhan1507/hackingly.git`), `upstream` (`https://github.com/aryanexe07/hackingly.git`)
* **Working Tree:** Clean (only `website/package-lock.json` modified).
* **Recent Commits:**
  - `b7de369` — *test: add route verification suite and npm test command*
  - `786fa52` — *Merge upstream/main into refactor/sidebar-shell-layout*
  - `7b15934` — *feat: make Sutra platform interactive and dynamic across all views*
  - `85b11ac` — *style: refine AppShell sidebar layout and styling*

### 2.2 Target Repository (`sutra`)
* **Location:** `D:\Programming\hackathon2026\sutra`
* **Current Branch:** `feat/sutra-landing-page`
* **Tracking Remote:** `origin` (`https://github.com/InnoShay/SUTRA.git`)
* **Existing Relevant Feature Branch:** `feat/responsive-apple-ui` exists locally and on remote (`remotes/origin/feat/responsive-apple-ui`).
* **Branch Lineage in SUTRA:**
  1. Commit `cc08e74` on `feat/responsive-apple-ui`: *feat(frontend): integrate responsive Apple-inspired UI* (merged via PR #1 `52962cd` into `main`).
  2. Commit `d0c7dda` on `main`: *feat(phase5): adapt existing frontend to verified FastAPI backend contracts* (introduced the backend contracts and dashboard content changes).
* **Git History Relationship:**
  The `hackingly` and `sutra` repositories have **unrelated Git histories** (different root commits and git object IDs). They cannot and must not be merged via `git merge`. Restoration must be performed via selective component adaptation.

---

## 3. Original UI Inventory (Hackingly Baseline)

The original UI in `hackingly` is a complete, responsive Next.js 14 App Router application with the following verified screen and component inventory:

| Category | Component / Page | Original Path in `hackingly` | Visual & Functional Role |
| :--- | :--- | :--- | :--- |
| **Shell** | `AppShell.tsx` | `components/AppShell.tsx` | Fixed left sidebar, elevated floating white canvas window (`.floating-window`), search modal trigger, notification drawer, user avatar. |
| **Header** | Top Search & Actions | In `components/AppShell.tsx` | Search pill (`⌘K`), messages trigger, notification bell with unread badge, profile menu. |
| **Dashboard** | Main Dashboard | `app/dashboard/page.tsx` | 2-column grid: `Growth Overview` with dual-layer tick progress bar, `Live Class Card` with student avatar stack, `Learning Analytics` 3-metric sub-cards, and `EngagementChart`. |
| **Courses** | Course Catalog | `app/courses/page.tsx` | Tabbed filter (`All Courses`, `Published`, `Drafts`, `Archived`), course cards with thumbnails, progress metrics, quick live session toggles, and duplicate/delete actions. |
| **Students** | Directory | `app/students/page.tsx` | Tabbed filter (`All Students`, `Active`, `At Risk`, `Completed`, `Inactive`), search bar, student cards with attendance/grade sparklines, Quick View modal trigger. |
| **Student 360°**| Profile View | `app/students/[id]/page.tsx` | Student header, contact details, enrolled courses list, attendance breakdown, direct messaging form. |
| **Community** | Discussion Hub | `app/community/page.tsx` | Featured discussion card, tag filters, discussion list with like counts and reply counts, upcoming community event card. |
| **Analytics** | Cohort Overview | `app/analytics/page.tsx` | Timeframe toggle (`This Week`, `This Month`, `This Year`), 4 summary metric cards, 2x2 grid containing `LearningProgressChart`, `EngagementChart`, `RadialProgressGauge`, and `ActivityHeatmap`. |
| **Settings** | User Preferences | `app/settings/page.tsx` | Profile details, notification toggles, display density settings, account security. |
| **Help** | Support Center | `app/help/page.tsx` | FAQs, documentation links, contact helpdesk card. |
| **Primitives** | Progress Gauge | `components/RadialProgressGauge.tsx` | SVG circular gauge with animated completion percentage. |
| **Primitives** | Tick Progress Bar | `components/SkillHubProgressBar.tsx` | Two-layer progress bar with hatched tick overlay (`.skill-ticks-bg`). |
| **Primitives** | Engagement Chart | `components/EngagementChart.tsx` | Smooth SVG line chart with timeframe data switching. |
| **Primitives** | Heatmap | `components/ActivityHeatmap.tsx` | GitHub-style 7-day contribution grid with intensity shading. |

---

## 4. Current SUTRA UI Inventory (`sutra/frontend`)

The current frontend inside `sutra/frontend` maintains the same routing structure and design tokens, but its page content has diverged significantly:

| Path in `sutra/frontend` | Baseline Alignment | Divergence Status | Nature of Divergence |
| :--- | :--- | :--- | :--- |
| `app/layout.tsx` | Preserved | Preserved | Imports Inter & Plus Jakarta Sans, renders `<SkillHubProvider>` and `<AppShell>`. |
| `app/globals.css` | Preserved + Extended | Preserved | All original tokens (`.floating-window`, `.skill-card`, `.skill-ticks-bg`) preserved; added 3D perspective classes for landing page. |
| `tailwind.config.js` | Preserved + Extended | Preserved | Preserved `skill` palette and fonts; added `brand` and `slate` tokens. |
| `components/AppShell.tsx` | Modified | Adapted | Added Backend Status Pill (`Backend Online`) and Persona Switcher dropdown in the top bar. |
| `app/dashboard/page.tsx` | Regressed | Structurally Disrupted | Overlaid with black "No Alert Without Action" banner, Priority Review Queue table, and Active Case Lifecycle Tracker. |
| `app/courses/page.tsx` | Regressed | Replaced | Course cards replaced with "Interventions & Support Catalog" and ML threshold sliders. |
| `app/community/page.tsx` | Regressed | Modified | Discussion forum rewired into a 10-state case transitions view. |
| `app/students/page.tsx` | Adapted | Functionally Gated | Preserved cards grid; added full-screen lock banner for Leadership role (`ADR-004`). |
| `app/students/[id]/page.tsx`| Adapted | Functionally Extended | Added 6-domain observations and privacy fencing tabs. |
| `app/analytics/page.tsx` | Adapted | Re-labeled | Layout intact; labels re-pointed to live telemetry metrics. |
| `components/SignalReviewModal.tsx` | Missing in Source | SUTRA Addition | Required by Phase 5 contract for reviewing early warning signals. |
| `lib/api.ts` & `lib/types.ts` | Missing in Source | SUTRA Addition | Centralized typed client for FastAPI backend contracts. |

---

## 5. Component Comparison Matrix

| Component Name | Original Hackingly Path | Current SUTRA Path | Visual Status | Functional Status | Recommended Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AppShell** | `components/AppShell.tsx` | `frontend/components/AppShell.tsx` | Identical (Shell & Sidebar) | Extended with Persona Switcher & Backend Pill | **B. ADAPT ORIGINAL** (Preserve Persona Switcher and Backend Pill inside the pristine Apple top bar) |
| **Dashboard Page** | `app/dashboard/page.tsx` | `frontend/app/dashboard/page.tsx` | Heavily Regressed | Overloaded with operational tables | **D. REBUILD FROM ORIGINAL DESIGN** (Restore pristine 2-column Apple layout; extract triage and cases into dedicated tab/drawer) |
| **Growth Overview Card** | In `app/dashboard/page.tsx` | In `frontend/app/dashboard/page.tsx` | Text & Label Divergence | Dynamic data binding intact | **A. RESTORE ORIGINAL** (Restore "Growth Overview" styling, clean typography, and dual-layer tick progress bar) |
| **Live Class Card** | In `app/dashboard/page.tsx` | In `frontend/app/dashboard/page.tsx` | Modified Title | Interactive live toggle intact | **A. RESTORE ORIGINAL** (Restore "Advanced UI/UX Design" and avatar stack presentation) |
| **Learning Analytics Card**| In `app/dashboard/page.tsx` | In `frontend/app/dashboard/page.tsx` | Text & Label Divergence | Timeframe switcher intact | **A. RESTORE ORIGINAL** (Restore 3 sub-cards: Total Students, Avg. Learning Time, Completion Rate) |
| **EngagementChart** | `components/EngagementChart.tsx` | `frontend/components/EngagementChart.tsx` | Identical | Identical | **C. PRESERVE CURRENT** |
| **Courses Page** | `app/courses/page.tsx` | `frontend/app/courses/page.tsx` | Completely Replaced | Converted to Interventions Catalog | **B. ADAPT ORIGINAL** (Restore course cards grid UI while mapping to intervention catalog data) |
| **Students Directory** | `app/students/page.tsx` | `frontend/app/students/page.tsx` | Preserved | Added Leadership Privacy Shield | **C. PRESERVE CURRENT** (Retains original UI with necessary ADR-004 compliance) |
| **Student 360° Profile** | `app/students/[id]/page.tsx` | `frontend/app/students/[id]/page.tsx` | Extended | Multi-domain telemetry | **B. ADAPT ORIGINAL** (Keep 6-domain data but align visual cards with original rounded styling) |
| **Community Page** | `app/community/page.tsx` | `frontend/app/community/page.tsx` | Content Replaced | Cases embedded in forum | **B. ADAPT ORIGINAL** (Restore forum aesthetics while retaining case discussion link) |
| **Analytics Page** | `app/analytics/page.tsx` | `frontend/app/analytics/page.tsx` | Preserved 2x2 Grid | Real data connected | **C. PRESERVE CURRENT** |
| **SignalReviewModal** | *None* | `frontend/components/SignalReviewModal.tsx` | Clean Modal | Required for Phase 5 | **C. PRESERVE CURRENT** (Ensure typography and border radius match design tokens) |
| **GlobalSearchModal** | `components/GlobalSearchModal.tsx` | `frontend/components/GlobalSearchModal.tsx` | Identical | Identical | **C. PRESERVE CURRENT** |
| **NewCourseModal** | `components/NewCourseModal.tsx` | `frontend/components/NewCourseModal.tsx` | Identical | Identical | **C. PRESERVE CURRENT** |

---

## 6. Confirmed Visual Regressions & Root Causes

### Regression 1: Cluttered & Broken Dashboard Proportions
* **Original Behavior:** The dashboard presents a clean, Apple-like command center: a 2-column grid (`5 cols` left, `7 cols` right) with balanced cards, generous whitespace, and a clear focal hierarchy.
* **Current Behavior:** Users see a massive, dark "No Alert Without Action" banner at the top, followed by the grid, followed by two dense, wide data tables spanning the entire bottom of the window.
* **Root Cause:** In `sutra/frontend/app/dashboard/page.tsx` (lines 155–210 and 445–580), the Phase 5 implementation directly inlined the operational triage queue and case lifecycle tracker into the dashboard root.
* **Recommended Correction:** 
  1. Restore the primary dashboard view to the original 2-column layout.
  2. Move the **Priority Review Queue** and **Case Tracker** into either:
     - A secondary tab on the dashboard (`Overview` vs. `Triage & Cases`), or
     - Dedicated workspace sub-routes (`/signals` and `/cases`) as specified in `SUTRA_UI_UX_PRD.md`.
* **Risk:** Low. Data queries remain untouched; only visual placement is modified.

### Regression 2: Overwritten Educational Copy and Telemetry Clutter
* **Original Behavior:** Clear, intuitive product labels: `Growth Overview`, `Active Learners`, `New Enrollments`, `Total Enrollments`, `Learning Analytics`, `Total Students`, `Avg. Learning Time`, `Completion Rate`.
* **Current Behavior:** Technical jargon and raw telemetry: `Support Pipeline Overview`, `Evaluated Cohort`, `Generated Alerts`, `Orchestrated Cases`, `Intervention & Learning Analytics`, `Students In Scope`, `Avg. Action Time`.
* **Root Cause:** Direct text replacements in `sutra/frontend/app/dashboard/page.tsx` lines 219, 259, 270, 281, 362, 400, 411, and 425.
* **Recommended Correction:** Restore the clean educational labels while binding the underlying values dynamically to the SUTRA store.

### Regression 3: Displaced Course Cards Grid
* **Original Behavior:** `app/courses/page.tsx` features high-fidelity visual cards for courses (Figma UI/UX, Typography, Web Design) with thumbnail images, status pills, progress indicators, and interactive live badges.
* **Current Behavior:** The course cards were replaced with utilitarian intervention catalog cards and ML threshold sliders.
* **Root Cause:** Complete rewrite of `app/courses/page.tsx` in commit `d0c7dda`.
* **Recommended Correction:** Restore the original course cards UI and card component structure, and house the ML threshold governance in a dedicated "Catalog Settings" or "Governance" view.

---

## 7. Design System & Global Style Audit

### 7.1 Design Tokens Comparison
Both repositories use the same core Apple-inspired design tokens configured in `app/globals.css` and `tailwind.config.js`:

| Token | Hackingly Baseline | Current SUTRA (`frontend/`) | Parity Status |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `#ECEFF3` | `#ECEFF3` | **100% Match** |
| **Floating Window Surface**| `#FFFFFF`, `border-radius: 2rem` | `#FFFFFF`, `border-radius: 2rem` | **100% Match** |
| **Subtle Card Surface** | `#F8F9FA`, `border-radius: 1.125rem` | `#F8F9FA`, `border-radius: 1.125rem` | **100% Match** |
| **Heading Font** | `'Plus Jakarta Sans'`, sans-serif | `'Plus Jakarta Sans'`, sans-serif | **100% Match** |
| **Body Font** | `'Inter'`, sans-serif | `'Inter'`, sans-serif | **100% Match** |
| **Tick Progress Bar** | Repeating linear gradient (#CBD5E1) | Repeating linear gradient (#CBD5E1) | **100% Match** |
| **Accent Green** | `#22C55E` (`skill-green`) | `#22C55E` (`skill-green`) | **100% Match** |
| **Live Pulse Animation** | `animate-live-pulse` (2s bezier) | `animate-live-pulse` (2s bezier) | **100% Match** |

### 7.2 Sidebar Geometry & Floating Container Check
The user specifically asked whether the current dashboard has introduced a disconnected sidebar bubble or container.
* **Inspection Finding:** In both repositories, the sidebar is a transparent container (`.sidebar-shell`) positioned on the grey canvas base (`#ECEFF3`). The main content area is wrapped in `.floating-window` (solid white, elevated with 32px rounded corners and subtle shadow).
* **Conclusion:** There is **no structural regression** in the sidebar container itself. The visual perception of a "broken layout" occurs because the contents inside `.floating-window` overflowed with massive dark banners and multi-column tables, breaking the clean, airy proportions.

---

## 8. Functional Compatibility Audit

Restoring the original UI must **not** break SUTRA's backend integration:
1. **FastAPI Client (`lib/api.ts`):** Must remain active. It fetches `/api/signals`, `/api/cases`, `/api/students`, and `/api/interventions`.
2. **Supabase JWT & Multi-Campus Headers (`lib/demo-auth.ts`):** Must remain untouched.
3. **ADR-004 Privacy Safeguards:** Leadership role restriction from individual student PII must be maintained.
4. **10-State Case Machine:** State transitions (`NEW` ➔ `TRIAGED` ➔ `UNDER_REVIEW` ➔ `ACTIONABLE` ➔ `ASSIGNED` ➔ `ACCEPTED` ➔ `IN_PROGRESS` ➔ `FOLLOW_UP_REQUIRED` ➔ `RESOLVED` ➔ `CLOSED`) must remain operational.
5. **No Alert Without Action Rule:** Mandatory rationale capture on signal review must be preserved.

---

## 9. Data and Mock-Data Audit

| Component | Hackingly Data Source | SUTRA Data Source | Restoration Strategy |
| :--- | :--- | :--- | :--- |
| **Dashboard Growth Metrics** | Hardcoded in page state | Derived from `signals` & `cases` in `store` | Keep live derivation; format cleanly with original UI typography |
| **Live Class Card** | Hardcoded in `skillhub-data.ts` | Filtered from `courses` in `store` | Bind directly to store; restore original card visuals |
| **Analytics Metrics** | Hardcoded in page state | Derived from `students` & `signals` | Bind directly to store; restore original labels |
| **Courses Grid** | `courses` array in `skillhub-data.ts` | `courses` + `interventions` | Render original course cards with store binding |
| **Student Directory** | `students` array in `skillhub-data.ts` | `students` from API/seed | Direct reuse of original card markup with store data |
| **Signal Review Queue** | *Did not exist* | `signals` from FastAPI `/api/signals` | Present in dedicated tab or drawer; do not crowd main dashboard |

---

## 10. Dependency and Asset Audit

### Dependencies (`package.json`)
* Both projects use **Next.js 14.2.15**, **React 18.3.1**, **Lucide React 0.453.0**, **Tailwind CSS 3.4.14**, and **clsx / tailwind-merge**.
* SUTRA includes `eslint` and `eslint-config-next` in `devDependencies`.
* **Zero new dependencies** are required to restore the original UI.

### Assets (`public/assets/`)
* All 13 image assets from `hackingly/public/assets/` (avatars, course thumbnails, login illustrations) are already present in `sutra/frontend/public/assets/`.
* No missing assets or broken paths exist.

---

## 11. Routing and Layout Findings

* **Root Route (`/`):** Renders the public landing page cleanly. `AppShell.tsx` line 52 correctly excludes `/` and `/login` from the authenticated dashboard shell.
* **Dashboard Routes (`/dashboard`, `/courses`, `/students`, `/community`, `/analytics`, `/settings`, `/help`):** All render inside `<AppShell>`, wrapped in `<SkillHubProvider>`.
* **Layout Separation:** No changes to routing or App Router layouts are necessary. The restoration is strictly component- and page-template-level.

---

## 12. Risk Assessment

| Risk Area | Severity | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Backend Data Disconnection** | High | Triage actions or API sync stops working | Never revert `lib/store.tsx`, `lib/api.ts`, or `lib/types.ts`. Adapt UI templates to existing store selectors. |
| **Contract Test Failure** | High | `npm run test` fails | Ensure all 5 contract tests (ADR-004, 10-state machine, review validation, catalog keys, zero service secrets) pass after every file change. |
| **Visual Regressions Re-introduced** | Medium | Dashboard remains cluttered | Follow the exact JSX structure from `hackingly/app/dashboard/page.tsx`. |
| **Merge Conflicts** | Low | Git branches diverge | Perform restoration on a clean dedicated branch (`feat/restore-original-apple-ui`) branched from current working tree. |

---

## 13. Prioritized Restoration Plan

### Phase P0: Clean Dashboard Restoration (Highest Priority)
* **Goal:** Restore `app/dashboard/page.tsx` to the original Apple 2-column layout.
* **Action:**
  1. Restore the original top header (`Welcome back, Sarah!` + `+ New Course`).
  2. Restore the original `Growth Overview` card, `Live Class` card, `Learning Analytics` card, and `EngagementChart`.
  3. Relocate the SUTRA Action Bar, Priority Review Queue, and Active Case Lifecycle Tracker into a clean tabbed view (`Overview` | `Triage & Cases`) within the dashboard, preserving full functionality while restoring visual calm.

### Phase P1: Courses & Interventions Visual Harmony
* **Goal:** Restore the visual richness of `app/courses/page.tsx`.
* **Action:**
  1. Restore the original course cards grid with thumbnails, progress bars, and status filters.
  2. Embed intervention policies cleanly within course detail drawers or a dedicated catalog sub-tab.

### Phase P2: Community & Case Hub Alignment
* **Goal:** Restore `app/community/page.tsx`.
* **Action:**
  1. Restore the original community forum layout (featured discussion, tag filters, event join card).
  2. Map support case discussions seamlessly into the discussion card format.

### Phase P3: Quality Assurance & Verification
* **Goal:** Verify zero functional or visual regressions.
* **Action:**
  1. Run `npm run test` (`tsc --noEmit && node scripts/test-contract.mjs`).
  2. Run `npm run build` to verify static page generation.
  3. Validate interactive persona switching and responsive mobile drawers.

---

## 14. Recommended File-by-File Changes

| File to Modify in SUTRA | Nature of Change | Justification |
| :--- | :--- | :--- |
| `frontend/app/dashboard/page.tsx` | **Adapt Original** | Replace bloated tables with original 2-column grid; add subtle tab switcher for `Overview` vs `Operational Triage`. |
| `frontend/components/AppShell.tsx` | **Refine Styling** | Ensure Persona Switcher and Backend Pill match Apple subtle button styles (`#F8F9FA` with 16px radius). |
| `frontend/app/courses/page.tsx` | **Adapt Original** | Reintroduce course cards grid; connect to interventions store. |
| `frontend/app/community/page.tsx` | **Adapt Original** | Reintroduce forum visual structure; bind case entries to discussion cards. |
| `frontend/app/students/[id]/page.tsx` | **Preserve & Polish** | Retain 6-domain telemetry while ensuring card radii and typography match original design tokens. |

---

## 15. Validation and Testing Plan

1. **TypeScript Typecheck:** Run `npx tsc --noEmit` to ensure zero compilation or type errors.
2. **Contract & Security Suite:** Run `node scripts/test-contract.mjs` to verify:
   - All 5 ADR-004 personas and privacy fences pass.
   - 10-state case machine transitions remain valid.
   - Mandatory substantive rationale on signal review is enforced.
   - Zero private keys or service-role tokens exposed to browser.
3. **Next.js Production Build:** Run `npm run build` to verify clean prerendering of all 12 routes.
4. **Visual Review:** Verify in browser on mobile (375px), tablet (768px), and desktop (1440px).

---

## 16. Unresolved Questions for User Review

1. **Dashboard Triage Placement:** Do you prefer having a tab switcher (`[ Overview ] [ Triage & Cases ]`) on `/dashboard`, or would you prefer a dedicated sidebar item for `Cases` (`/cases`) and `Signals` (`/signals`) as originally outlined in `SUTRA_UI_UX_PRD.md`?
2. **Live Course Card Subject:** Should the dynamic live card display `Advanced UI/UX Design` (the original mockup text) or `Advanced Academic Mentoring` (the SUTRA domain text)?
3. **Persona Switcher Visibility:** Should the Persona Switcher remain visible in the top navigation bar during the demo, or should it be relocated to the User Profile dropdown?

---

## 17. Recommended Git Strategy

1. **Do not modify `main` directly.**
2. Check out a dedicated feature branch in `sutra`:
   ```bash
   git checkout -b feat/restore-original-apple-ui
   ```
3. Apply the adaptations file-by-file following the prioritized restoration plan.
4. Verify with `npm run test` and `npm run build`.
5. Present the diff to the user for explicit review before committing or merging.

---

## 18. Explicit List of Files Inspected

### In `hackingly`:
* `D:\Programming\hackathon2026\hackingly\app\dashboard\page.tsx`
* `D:\Programming\hackathon2026\hackingly\app\courses\page.tsx`
* `D:\Programming\hackathon2026\hackingly\app\students\page.tsx`
* `D:\Programming\hackathon2026\hackingly\app\students\[id]\page.tsx`
* `D:\Programming\hackathon2026\hackingly\app\community\page.tsx`
* `D:\Programming\hackathon2026\hackingly\app\analytics\page.tsx`
* `D:\Programming\hackathon2026\hackingly\app\settings\page.tsx`
* `D:\Programming\hackathon2026\hackingly\app\help\page.tsx`
* `D:\Programming\hackathon2026\hackingly\components\AppShell.tsx`
* `D:\Programming\hackathon2026\hackingly\components\EngagementChart.tsx`
* `D:\Programming\hackathon2026\hackingly\components\LearningProgressChart.tsx`
* `D:\Programming\hackathon2026\hackingly\components\SkillHubProgressBar.tsx`
* `D:\Programming\hackathon2026\hackingly\components\RadialProgressGauge.tsx`
* `D:\Programming\hackathon2026\hackingly\components\ActivityHeatmap.tsx`
* `D:\Programming\hackathon2026\hackingly\components\GlobalSearchModal.tsx`
* `D:\Programming\hackathon2026\hackingly\components\NewCourseModal.tsx`
* `D:\Programming\hackathon2026\hackingly\components\DiscussionDetailModal.tsx`
* `D:\Programming\hackathon2026\hackingly\components\StudentProfileModal.tsx`
* `D:\Programming\hackathon2026\hackingly\app\globals.css`
* `D:\Programming\hackathon2026\hackingly\tailwind.config.js`
* `D:\Programming\hackathon2026\hackingly\package.json`
* `D:\Programming\hackathon2026\hackingly\SUTRA_UI_UX_PRD.md`

### In `sutra`:
* `D:\Programming\hackathon2026\sutra\frontend\app\dashboard\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\courses\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\students\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\students\[id]\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\community\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\analytics\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\settings\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\help\page.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\components\AppShell.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\components\SignalReviewModal.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\components\EngagementChart.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\components\LearningProgressChart.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\components\SkillHubProgressBar.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\app\globals.css`
* `D:\Programming\hackathon2026\sutra\frontend\tailwind.config.js`
* `D:\Programming\hackathon2026\sutra\frontend\package.json`
* `D:\Programming\hackathon2026\sutra\frontend\lib\skillhub-store.tsx`
* `D:\Programming\hackathon2026\sutra\frontend\lib\api.ts`
* `D:\Programming\hackathon2026\sutra\frontend\lib\types.ts`
* `D:\Programming\hackathon2026\sutra\frontend\lib\demo-auth.ts`
