# Design Specification: Student Guidance Assessment UI Overhaul

**Date:** 2026-10-12  
**Status:** Approved  
**Scope:** Frontend UI enhancement for `StudentGuidanceAssessmentModal` and `GuidanceReportView` (`components/assessment/` and `app/assessment/page.tsx`).

---

## 1. Objectives & Design Principles

1. **Executive Coaching Dashboard Feel**: Elevate the results screen from a cramped, boxy list to an empowering, professional dashboard for student self-reflection.
2. **Breathing Room & Balanced Proportions**: Expand modal width to `max-w-4xl` for the completed guidance report so that 2-column cards do not truncate text or squish data.
3. **No Emojis; Professional Typography & Lucide SVGs**: Rely strictly on font hierarchy (bold headings, uppercase micro-labels, tabular numbers) and vector Lucide icons (`BookOpen`, `Target`, `Sparkles`, `Clock`, `HeartHandshake`, `Compass`, `MessageSquareQuote`).
4. **Actionable Discussion Prompts**: Transform the discussion topic from a dry footnote into a prominent, styled talking-point card designed for counselor/mentor conversations.
5. **Clear Interpretation Bands & Summary Ribbon**: Provide an executive summary counter at the top (e.g., *Current Resources*, *Developing Areas*, *Explore Support*) with a discreet scale legend.

---

## 2. Modal & Layout Architecture

### 2.1 Dynamic Modal Container (`StudentGuidanceAssessmentModal.tsx`)
- Steps 0–8 (Consent, 6 Dimensions, Reflection, Review): Modal maintains a focused width `max-w-2xl` (672px).
- Step 9 (Guidance Report View): Modal width expands to `max-w-4xl` (896px) with responsive margins (`p-3 sm:p-6`) and `max-h-[92vh]`.
- Top header: Retains title "Student Guidance Assessment", subtitle "Confidential Self-Reflection Summary", and accessible close button (`X`).

### 2.2 Cohesive Header Ribbon (`GuidanceReportView.tsx`)
- Replaces duplicate nested titles with an Executive Summary Ribbon:
  - **Count Pills**: Quick-status distribution:
    - `[count] Current Resources` (Emerald badge: `bg-emerald-50 text-emerald-800 border-emerald-200`)
    - `[count] Developing Areas` (Sky badge: `bg-sky-50 text-sky-800 border-sky-200`)
    - `[count] Explore Support` (Amber badge: `bg-amber-50 text-amber-800 border-amber-200`)
  - **Scale Legend**: Clean inline indicator: `Scale 1.00 – 5.00 • Arithmetic Mean`.
  - **Non-Clinical Context Note**: Compact card with `Info` icon confirming that scores are self-reported for mentoring discussions without automated ranking or clinical diagnosis.

---

## 3. Dimension Score Cards Specification

### 3.1 Dimension-Specific Lucide Icon Mapping
- `learning_approach`: `BookOpen` (p-2.5 bg-neutral-100 text-neutral-800 rounded-xl)
- `motivation_engagement`: `Target`
- `confidence_self_efficacy`: `Sparkles`
- `planning_time_management`: `Clock`
- `coping_support`: `HeartHandshake`
- `aspirations_career`: `Compass`

### 3.2 Card Layout & Typography
- **Top Row**:
  - Left: Vector icon in subtle rounded container + Dimension title in bold (`text-sm font-bold text-neutral-900`) + Full dimension description (`text-xs text-neutral-500 leading-normal`, **no line clamp truncation**).
  - Right: Clean pill badge with Lucide indicator icon:
    - *Explore support* (Amber)
    - *Mixed / developing* (Sky)
    - *Current resource* (Emerald)
    - *Insufficient responses* (Neutral)
- **Middle Metric & Progress Bar**:
  - Score readout: `Score: X.XX / 5.00` in tabular bold font.
  - Progress Bar: Height 8px (`h-2`), rounded-full, with clean gradient fills based on score band.
  - Scale milestones: Underneath the bar, subtle typography marks `1.0 (Low)`, `3.0 (Moderate)`, `5.0 (Strong)`.
- **Bottom Callout: Counselor Talking Point**:
  - Container: `bg-neutral-50 rounded-xl p-3 border border-neutral-200/70`.
  - Header: `MessageSquareQuote` icon + **"Recommended Talking Point for Mentor / Counselor"** in bold micro-type.
  - Text: The dimension suggestion in readable `text-xs text-neutral-700 leading-relaxed`.

---

## 4. Focus Areas for Counseling (Q19 & Q20)

- Styled cards for student responses:
  - **Priority Challenge (Q19)**: Bold prompt with custom notes in quotes if provided.
  - **Session Goal (Q20)**: Bold desired outcome for counseling.
- Professional border and subtle neutral background.

---

## 5. Counseling Call-to-Action Banner & Footer Controls

### 5.1 Call-to-Action Banner
- Background: `bg-neutral-900 text-white rounded-2xl p-5`.
- Headline: **Ready to Discuss These Reflections?**
- Badges: `Free • Confidential • Student-Led` in micro-type.
- Action: High-contrast `Request Counselor Call` button (`bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold`) with `PhoneCall` and `ArrowRight` icons.

### 5.2 Footer Utility Controls
- `Retake Reflection` button with `RotateCcw` icon.
- `Print / Save Summary` button (`window.print()`).
- `Done` button to close the modal.

---

## 6. Implementation Files Affected
- `components/assessment/GuidanceReportView.tsx` (Complete card layout & executive ribbon redesign)
- `components/assessment/StudentGuidanceAssessmentModal.tsx` (Dynamic modal sizing `max-w-4xl` for report step, print support)
- `app/assessment/page.tsx` (Consistent styling in the page view)
