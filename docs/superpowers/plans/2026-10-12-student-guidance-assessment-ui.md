# Student Guidance Assessment UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Student Guidance Assessment results UI into a modern executive coaching dashboard with dynamic wide modal layout, Lucide vector icons, complete non-truncated descriptions, sleek metric progress bars, styled counselor discussion cards, and high-impact actions—without any emojis.

**Architecture:** 
1. Upgrade `GuidanceReportView.tsx` with an Executive Summary Ribbon, Lucide dimension iconography, full descriptions, gradient progress bars with scale milestones, styled talking-point chips, and print support.
2. Upgrade `StudentGuidanceAssessmentModal.tsx` to dynamically expand its container to `max-w-4xl` on Step 9 (report view) while retaining compact `max-w-2xl` for questionnaire steps.
3. Ensure visual parity in `app/assessment/page.tsx` when rendering the report on the standalone page.

**Tech Stack:** Next.js 14 / React 18, Tailwind CSS, Lucide React icons, TypeScript.

## Global Constraints
- **NO emojis**: Rely strictly on bold font weights, uppercase micro-labels, and Lucide SVG icons.
- **Maintain Deterministic Scoring**: Do not alter scoring calculations or interpretation band boundaries in `assessmentScoring.ts`.
- **Maintain Non-Clinical Framing**: Keep all disclaimers explicit that this is a self-reflection tool, not a clinical diagnosis or ranking.

---

### Task 1: Redesign `GuidanceReportView.tsx`

**Files:**
- Modify: `d:\Programming\hackathon2026\sutra\frontend\components\assessment\GuidanceReportView.tsx`

**Interfaces:**
- Consumes: `AssessmentReportResult`, `DimensionScoreResult`, `ASSESSMENT_DISCLAIMER`
- Produces: Enhanced `GuidanceReportView` component

- [ ] **Step 1: Update imports and map dimension Lucide icons**
Import `BookOpen`, `Target`, `Clock`, `HeartHandshake`, `Compass`, `MessageSquareQuote`, `Printer`, `Flag`, `Sparkles`, `CheckCircle2`, `AlertCircle`, `Info`, `PhoneCall`, `RotateCcw`, `ArrowRight` from `lucide-react`. Define icon lookup function:
```tsx
function getDimensionIcon(key: string) {
  switch (key) {
    case "learning_approach":
      return BookOpen;
    case "motivation_engagement":
      return Target;
    case "confidence_self_efficacy":
      return Sparkles;
    case "planning_time_management":
      return Clock;
    case "coping_support":
      return HeartHandshake;
    case "aspirations_career":
      return Compass;
    default:
      return Sparkles;
  }
}
```

- [ ] **Step 2: Implement Executive Summary Ribbon**
Replace duplicated title banner with:
- Top distribution counters:
  - Count of `Current resource` dimensions (Emerald pill)
  - Count of `Mixed / developing` dimensions (Sky pill)
  - Count of `Explore support` dimensions (Amber pill)
- Scale guide indicator (`Scale 1.00 – 5.00 • Self-reflection mean`)
- Compact non-clinical disclaimer box

- [ ] **Step 3: Redesign `DimensionScoreCard` subcomponent**
- Display dimension Lucide icon in a tinted `rounded-xl` container
- Render full title and full description (no `line-clamp-1` ellipsis)
- Refined interpretation band pill badge
- Friendly score display: `Score: X.XX / 5.00`
- Sleek gradient progress bar with scale marks (`1.0 (Low)`, `3.0 (Moderate)`, `5.0 (Strong)`)
- Styled "Counselor Discussion Point" callout card with `MessageSquareQuote` icon and bold header

- [ ] **Step 4: Redesign Focus Areas (Q19/Q20), Counseling CTA Banner & Footer**
- Styled reflection cards for Q19 (Challenge) and Q20 (Session Goal)
- High-contrast Counselor CTA banner with emerald button and `Free • Confidential • Student-Led` badge
- Add Print / Save Summary button with `window.print()` handler

- [ ] **Step 5: Verify build with TypeScript compiler**
Run `npx tsc --noEmit` or verify page loads without syntax errors.

- [ ] **Step 6: Commit changes**
```bash
git add frontend/components/assessment/GuidanceReportView.tsx
git commit -m "feat(ui): redesign guidance report view with executive coaching aesthetics"
```

---

### Task 2: Dynamic Modal Sizing in `StudentGuidanceAssessmentModal.tsx`

**Files:**
- Modify: `d:\Programming\hackathon2026\sutra\frontend\components\assessment\StudentGuidanceAssessmentModal.tsx`

**Interfaces:**
- Consumes: `currentStep`, `report`
- Produces: Dynamic width modal (`max-w-2xl` for steps 0–8, `max-w-4xl` for step 9)

- [ ] **Step 1: Update modal dialog wrapper class**
Update the modal card container class based on `currentStep`:
```tsx
const isReportStep = currentStep === 9;
// Class: isReportStep ? "max-w-4xl" : "max-w-2xl"
```
Ensure smooth transition (`transition-all duration-300`).

- [ ] **Step 2: Update modal header title for Step 9**
When on Step 9, show clear header subtitle: "Confidential Self-Reflection Summary • Ready for Counselor Discussion".

- [ ] **Step 3: Test modal in dev server**
Ensure modal opens, completes step 8, transitions smoothly into `max-w-4xl` report view with no layout shifting or overflow glitches.

- [ ] **Step 4: Commit changes**
```bash
git add frontend/components/assessment/StudentGuidanceAssessmentModal.tsx
git commit -m "feat(ui): make student guidance assessment modal dynamically expand for report view"
```

---

### Task 3: Assessment Page Parity & Responsive Polish

**Files:**
- Modify: `d:\Programming\hackathon2026\sutra\frontend\app\assessment\page.tsx`

- [ ] **Step 1: Check report container styling in `app/assessment/page.tsx`**
Ensure that when `assessmentReport` is displayed on the standalone `/assessment` route, the outer container accommodates `max-w-4xl` or `max-w-5xl` for optimal reading flow.

- [ ] **Step 2: Verify responsive behavior on mobile and tablet viewport**
Verify cards stack neatly in 1 column on `< md` screens and 2 columns on `md+` screens.

- [ ] **Step 3: Commit changes**
```bash
git add frontend/app/assessment/page.tsx
git commit -m "feat(ui): polish standalone assessment page layout parity"
```

---

### Task 4: Verification and Visual Quality Audit

**Files:**
- Run: Jest assessment tests (`__tests__/assessmentScoring.test.ts`)
- Run: Next.js dev server check

- [ ] **Step 1: Run unit test suite**
Run: `npm test` or `npx jest __tests__/assessmentScoring.test.ts`
Expected: PASS with 100% passing tests.

- [ ] **Step 2: Verify build and Next.js compilation**
Ensure `GET /assessment` and `GET /dashboard` compile with 200 OK and no React hydration warnings.

- [ ] **Step 3: Final commit**
```bash
git commit -m "chore: verify student guidance assessment ui overhaul"
```
