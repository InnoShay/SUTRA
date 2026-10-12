# SUTRA Happiness Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the SUTRA Happiness Index as a fully integrated, production-ready feature across Student, Counselor/Faculty, and Administration dashboards with explainable scoring, strict privacy safeguards, typed API integration contracts, and comprehensive tests.

**Architecture:** Extend SUTRA's Next.js and TypeScript frontend architecture. Add dedicated domain types in `types.ts`, pure scoring and privacy calculation functions in `happinessScoring.ts`, weekly pulse definitions in `happinessData.ts`, API signatures in `api.ts` (with demo fixtures in `skillhub-data.ts` and state hooks in `skillhub-store.tsx`), a lightweight student pulse modal in `HappinessPulseModal.tsx`, shared aggregate analytics components in `components/happiness/`, and embed them into the role-specific dashboards.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript 5, Tailwind CSS, Lucide React, Node.js assert test harness.

## Global Constraints
- Primary scope: Frontend implementation and API integration layer.
- Backend constraint: Do not independently modify backend database models, migrations, or database schemas (owned by backend teammate).
- Anti-gamification: Never rank students, never create leaderboards, never use index for academic eligibility, discipline, or individual risk scoring.
- Privacy threshold: Minimum group threshold of 10 valid respondents before reporting aggregate scores. Suppress sub-threshold data honestly.
- Calculation integrity: Positively worded 1–5 normalization `((response - 1) / 4) * 100`, dimension score is mean of valid dimension responses (missing excluded, never treated as neutral/zero), Happiness Index is mean of 6 equal-weighted valid dimension scores.
- Demo mode: Respect `isDemoMode()` (`NEXT_PUBLIC_SUTRA_DEMO_MODE`). Clearly label demo data. Never silently fabricate live data in normal mode.
- Git constraint: Do not commit or push changes. Preserve existing uncommitted changes.

---

### Task 1: Domain Definitions, Scoring Engine & Unit Tests
**Files:**
- Create: `frontend/lib/happinessData.ts`
- Create: `frontend/lib/happinessScoring.ts`
- Create: `frontend/__tests__/happinessScoring.test.ts`
- Modify: `frontend/lib/types.ts`

**Interfaces:**
- Consumes: None (core domain definitions)
- Produces: `HappinessDimensionKey`, `HAPPINESS_DIMENSIONS`, `HAPPINESS_QUESTIONS`, `normalizeResponse`, `computeDimensionScore`, `computeHappinessIndex`, `getHappinessInterpretationBand`, `isGroupPrivacyProtected`.

- [ ] **Step 1: Define Happiness Index TypeScript interfaces in `frontend/lib/types.ts`**
  Add `HappinessDimensionKey`, `HappinessQuestion`, `HappinessPulseSubmissionRequest`, `HappinessPulseSubmissionResponse`, `HappinessPulseStatusResponse`, `HappinessDimensionScoreDTO`, `HappinessIndexAggregateResponse`, `HappinessTrendPointDTO`, `HappinessTrendResponse`.

- [ ] **Step 2: Create questionnaire definitions in `frontend/lib/happinessData.ts`**
  Export 6 dimensions, 6 weekly questions (1 per dimension), 5-point agreement scale options, privacy disclosures, and provisional interpretation bands.

- [ ] **Step 3: Create pure calculation and privacy functions in `frontend/lib/happinessScoring.ts`**
  Implement `normalizeResponse`, `computeDimensionScore`, `computeHappinessIndex`, `getHappinessInterpretationBand`, and `isGroupPrivacyProtected`.

- [ ] **Step 4: Create unit test suite in `frontend/__tests__/happinessScoring.test.ts`**
  Write tests covering:
  - Likert scale validation (1 to 5 only).
  - Score normalization ((r-1)/4)*100.
  - Dimension mean calculation with valid responses.
  - Missing responses excluded (not treated as neutral or zero).
  - Equal weighting across 6 dimensions.
  - Privacy threshold enforcement (< 10 respondents returns suppressed/insufficient).
  - Interpretation band boundaries.

- [ ] **Step 5: Run unit tests using `npx -y tsx` to verify pass**
  Run `npx -y tsx __tests__/happinessScoring.test.ts`.

---

### Task 2: API Client, Demo Fixtures, Store Integration & Documentation
**Files:**
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/skillhub-data.ts`
- Modify: `frontend/lib/skillhub-store.tsx`
- Modify: `docs/API_INTEGRATION_REGISTRY.md`

**Interfaces:**
- Consumes: `types.ts`, `happinessData.ts`, `happinessScoring.ts`
- Produces: `api.proposed.submitHappinessPulse`, `api.proposed.getHappinessStatus`, `api.proposed.getHappinessAggregate`, `api.proposed.getHappinessTrends`, `DEMO_HAPPINESS_AGGREGATE`, `DEMO_HAPPINESS_TRENDS`, store state & actions.

- [ ] **Step 1: Add proposed endpoints to `frontend/lib/api.ts`**
  Implement typed methods for submitting pulse check-in, retrieving student check-in status, fetching aggregate index data, and fetching historical trends under `api.proposed`.

- [ ] **Step 2: Add pitch-ready demo fixtures in `frontend/lib/skillhub-data.ts`**
  Create realistic, explainable demo aggregate data and 8-week historical trend data matching the 6 dimensions.

- [ ] **Step 3: Wire store state and actions in `frontend/lib/skillhub-store.tsx`**
  Expose `happinessAggregate`, `happinessTrends`, `studentPulseSubmitted`, `submitStudentHappinessPulse`, and `refreshHappinessData`. Respect `demoActive` flag so normal mode never mixes fake data with live state.

- [ ] **Step 4: Document the new endpoints in `docs/API_INTEGRATION_REGISTRY.md`**
  Add full endpoint specifications, authorization rules, request/response schemas, privacy thresholds, and server-side invariants for the backend teammate.

---

### Task 3: Student Experience — Weekly Happiness Pulse Card & Modal
**Files:**
- Create: `frontend/components/student/HappinessPulseModal.tsx`
- Modify: `frontend/components/student/StudentDashboardView.tsx`

**Interfaces:**
- Consumes: `useSkillHub()`, `HAPPINESS_QUESTIONS`, `HAPPINESS_DIMENSIONS`, `submitStudentHappinessPulse`
- Produces: Accessible interactive 6-question pulse flow, dashboard entry card.

- [ ] **Step 1: Implement `HappinessPulseModal.tsx`**
  Features:
  - 6 dimensions presented with clear question wording.
  - 5-point Likert agreement radio/button controls with accessible keyboard states.
  - Clear progress indicator ("Question X of 6").
  - Back, Next, and Skip/Review controls.
  - Optional reflection text input with transparent privacy and usage disclosure.
  - In-flight submission locking (prevents duplicate submissions).
  - Preservation of entered responses if submission fails (with actionable retry).
  - Genuine completion state with reassuring feedback ("Thank you for checking in").

- [ ] **Step 2: Add "Your Weekly Happiness Pulse" Card to `StudentDashboardView.tsx`**
  Place a clean, minimal card on the student dashboard:
  - Copy: "Your Weekly Happiness Pulse" / "A quick check-in to help us improve your college experience." / "About 1–2 minutes".
  - Shows completion status if already completed this week.
  - "Start check-in" button opens `HappinessPulseModal`.
  - Non-ranking, non-diagnostic statement.

---

### Task 4: Aggregate Analytics & Reporting Visualizations
**Files:**
- Create: `frontend/components/happiness/HappinessIndexSummaryCard.tsx`
- Create: `frontend/components/happiness/HappinessWeeklyTrendChart.tsx`
- Create: `frontend/components/happiness/HappinessDimensionBreakdown.tsx`
- Create: `frontend/components/happiness/HappinessAnalyticsView.tsx`

**Interfaces:**
- Consumes: `HappinessIndexAggregateResponse`, `HappinessTrendResponse`, `HappinessDimensionKey`
- Produces: Reusable aggregate visual components for staff and administrators.

- [ ] **Step 1: Implement `HappinessIndexSummaryCard.tsx`**
  Displays:
  - Current Happiness Index (0–100 scale).
  - Previous-period index and absolute point change (e.g., `+3.2 pts`).
  - Reporting period label.
  - Total valid responses count.
  - Participation rate (when denominator is present).
  - Interpretation band badge (Strong, Positive, Needs Attention, Priority for Review).
  - Privacy data sufficiency indicator (insufficient/suppressed warning if < 10 responses).

- [ ] **Step 2: Implement `HappinessWeeklyTrendChart.tsx`**
  Responsive SVG line chart showing Happiness Index across successive weekly reporting periods:
  - Real data points with period labels.
  - Accessible table alternative / screen-reader descriptions.
  - Handles missing data points cleanly without zero imputation.
  - Clean empty state when no historical data exists.

- [ ] **Step 3: Implement `HappinessDimensionBreakdown.tsx`**
  Comparable grid/list of the 6 dimensions:
  - Dimension title and description.
  - Dimension score (0–100).
  - Period-over-period change.
  - Neutral interpretation text.

- [ ] **Step 4: Implement composite `HappinessAnalyticsView.tsx`**
  Combines summary, trend chart, dimension breakdown, data quality disclosures, and institutional initiative tracking.

---

### Task 5: Stakeholder Access Integration
**Files:**
- Modify: `frontend/components/counselor/CounselorDashboardView.tsx`
- Modify: `frontend/app/counselor/analytics/page.tsx`
- Modify: `frontend/components/admin/AdminDashboardView.tsx`
- Modify: `frontend/app/analytics/page.tsx`

**Interfaces:**
- Consumes: `HappinessAnalyticsView.tsx`, role context from `useSkillHub()`
- Produces: Integrated views for Counselor/Faculty and Administration.

- [ ] **Step 1: Integrate into Counselor Views**
  Add Happiness Index aggregate card to `CounselorDashboardView.tsx` and integrate Happiness Index tab/section in `app/counselor/analytics/page.tsx` with staff-scoped insights and follow-up guidance.
- [ ] **Step 2: Integrate into Administration Views**
  Add Happiness Index institutional overview card to `AdminDashboardView.tsx` and add "Happiness Index" tab to `app/analytics/page.tsx` alongside existing cohort/model tabs.
- [ ] **Step 3: Verify Role & Privacy Isolation**
  Ensure students cannot see staff aggregate analytics, counselors only see aggregate scope, and administration sees institutional level.

---

### Task 6: Testing, Contract Verification & Quality Checks
**Files:**
- Modify: `frontend/scripts/test-contract.mjs`
- Test: `npm test`
- Build: `npm run build`

- [ ] **Step 1: Expand `test-contract.mjs` with Happiness Index suite**
  Add Section 24 in `test-contract.mjs`:
  - 6 dimensions and questions verified.
  - Equal weighting and normalization math verified.
  - 10-respondent privacy threshold enforced.
  - Role-based separation and non-ranking invariants checked.
  - Student card and pulse check-in modal verified.
  - Staff & Admin analytics views verified.
- [ ] **Step 2: Execute `npm test` (`tsc --noEmit && node scripts/test-contract.mjs`)**
  Ensure all existing + new contract tests pass.
- [ ] **Step 3: Execute `npm run build` (`next build`)**
  Verify clean production build without TypeScript or bundling errors.
- [ ] **Step 4: Prepare Final Implementation Report**
  Document delivered features, API status, scoring rules, tests, remaining backend requirements, and Git status.
