# SUTRA Phase Twenty-One — Longitudinal Evaluation Design & Split Protocol

**Milestone:** CODEX 3.0 PS6 Dataset Acquisition & Evaluation Readiness  
**Author:** Senior Applied ML Scientist, Data Acquisition Analyst, and Evaluation Protocol Auditor  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Canonical Evaluation Protocol Specification  

---

## 1. Executive Summary

A critical ambiguity identified in Phase Twenty review was the potential conflict between **student-level grouped splitting** (keeping all observations for a given student in a single fold) and **temporal splitting** (training on earlier semesters and evaluating on a subsequent semester).

Because degree-seeking students routinely enroll across multiple contiguous semesters, these two rules conflict if an active student appears in both the historical training semesters and the prospective test semester.

This protocol formally resolves this ambiguity by defining **two complementary, strictly formalized evaluation settings**:
- **Setting 1: New-Student Generalization (Cohort Ingress Evaluation)**
- **Setting 2: Future-Term Ecological Deployment (Campus-Wide Production Evaluation)**

Additionally, this protocol establishes distinct evaluation criteria for Day-30 versus Day-60 models, reclassifies historical OULAD 2014J partitions, and provides a mathematically grounded review of effective sample size and statistical power.

---

## 2. Workstream C — Reconciling Student Grouping with Temporal Splitting

```
The Conceptual Conflict:
Student S_104 enrolls in Fall 2024 (Term 1) and also in Spring 2026 (Term 4).
  - Temporal Split Rule: Term 1 belongs to TRAIN; Term 4 belongs to TEST.
  - Student Grouping Rule: All records for S_104 must belong to ONE partition!

How SUTRA Resolves the Conflict: Two Dedicated Operational Settings
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Setting 1: Unseen-Student Generalization        │ Setting 2: Future-Term Ecological Deployment   │
│ ─────────────────────────────────────────────── │ ───────────────────────────────────────────────│
│ Deployment Question:                            │ Deployment Question:                           │
│ "How well does the model predict brand-new      │ "How well does the model predict the mixed     │
│ students entering the university with zero     │ operational campus population in a future term?"│
│ historical institutional footprint?"           │                                                │
│                                                 │                                                │
│ Partitioning Rule:                              │ Partitioning Rule:                             │
│ Strictly zero learner overlap.                  │ Strict temporal boundary at Term K-1.          │
│ Students in Test Term K must have ZERO          │ Students in Term K who took prior terms are    │
│ historical records in Terms 1..K-1.             │ allowed, using prior GPA/credits as inputs.    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Setting 1: New-Student Generalization (Cohort Ingress Evaluation)
- **Deployment Question:** *"How accurately does SUTRA forecast academic risk for incoming freshmen or transfer students who have no prior academic history at this institution?"*
- **Clinical Relevance:** Critical for early onboarding, orientation advisor triage, and identifying students at risk during their first semester of higher education.
- **Partitioning Protocol:**
  1. Clustered exclusively on `student_id_hash`.
  2. The Test Partition (Term $K$) contains **strictly unseen students**.
  3. Any student who took courses in Terms $1 \dots K-1$ and also enrolled in Term $K$ is **excluded from Setting 1 test evaluation** (or placed in Setting 2).
  4. Features available: Pre-course registration timeliness, high school qualification, and early term LMS/attendance behavior. (Prior cumulative institutional GPA is missing/null).
- **Leakage Safeguard:** Absolute zero student identity overlap between Train and Test:
  $$\text{Students}(\text{Train}) \cap \text{Students}(\text{Test}_{\text{Setting 1}}) = \emptyset$$

---

### Setting 2: Future-Term Ecological Deployment (Campus-Wide Production Evaluation)
- **Deployment Question:** *"How accurately does SUTRA forecast academic risk when deployed across the entire active student body in a future semester?"*
- **Clinical Relevance:** Matches the actual operational reality faced by an advising center, where $70\%-80\%$ of students enrolled in any given term are continuing sophomores, juniors, and seniors with established institutional transcripts.
- **Partitioning Protocol:**
  1. Strict temporal censoring at midnight preceding the launch of Term $K$:
     $$T_{\text{split}} = \text{Date}(\text{Term } K \text{ Start})$$
  2. **Training Partition:** All enrollment records for all students occurring in terms concluding strictly before $T_{\text{split}}$ (e.g. Terms $1 \dots K-1$).
  3. **Test Partition:** All active enrollments in Term $K$.
  4. **Continuing Student Feature Construction:** For a continuing student $S_i$ enrolled in Term $K$, their `prior_cumulative_gpa` and `term_credits_attempted` are computed strictly from historical terms $\le K-1$.
  5. **Label Censoring:** All Term $K$ outcomes are strictly unobserved and unblinded only after model predictions are generated.
- **Leakage Safeguard:** No backward-in-time leakage. While the student's *identity* was observed in training terms, their Term $K$ behavioral features and Term $K$ final grades were completely in the future.

---

## 3. Disaggregated Milestone Pipelines: Day 30 vs. Day 60

A major methodological error in longitudinal learning analytics is comparing Day-30 and Day-60 models as if they were competing on the same task.

```
Landmark Timeline:
Day 0               Day 30                               Day 60                             End of Term
  │                   │                                    │                                     │
  ├───────────────────┼────────────────────────────────────┼─────────────────────────────────────┤
  │ Inputs Available: │ Inputs Available:                  │ Inputs Available:                   │
  │ Pre-course only   │ Day-30 Clicks, Early Quiz          │ Day-60 Clicks, Midterm Exam, Att.   │
  │                   │ Pipeline: M_Day30                  │ Pipeline: M_Day60                   │
  │                   │ Focus: Early Warning Intervention  │ Focus: Midterm Course Correction    │
```

### Specific Evaluation Rules:
1. **Independent Pipelines:**
   - $M_{\text{Day 30}}$ is trained and evaluated using features observed $\le \text{Day 30}$.
   - $M_{\text{Day 60}}$ is trained and evaluated using features observed $\le \text{Day 60}$.
2. **Distinct Benchmarks:**
   - $M_{\text{Day 30}}$ metrics evaluate how well the system identifies risk early enough for non-urgent advising check-ins.
   - $M_{\text{Day 60}}$ metrics evaluate how well the system confirms or revises risk following midterm grades.
3. **Trajectory Slope Evaluation:**
   Rather than comparing accuracy between milestones, the longitudinal evaluation reports trajectory change:
   $$\Delta \hat{P}_{\text{risk}} = \hat{P}_{\text{Day 60}} - \hat{P}_{\text{Day 30}}$$
   The evaluation assesses whether positive $\Delta \hat{P}$ (escalating risk) correlates with eventual course failure, and whether negative $\Delta \hat{P}$ (decreasing risk) correlates with successful completion.

---

## 4. Status of Historical OULAD 2014J Partition

### Formal Classification:
$$\mathbf{2014\text{J} \text{ IS OFFICIALLY CLASSIFIED AS PREVIOUSLY INSPECTED DEVELOPMENT EVIDENCE.}}$$

- **Evidential History:** Semester $2014\text{J}$ was used as the temporal test partition in Phase Three, audited for subgroup error disparities in Phase Six, and inspected for uncertainty calibration in Phase Ten.
- **Consequence:** Because model architectures, feature subsets, and thresholds were iterated with knowledge of $2014\text{J}$ performance, **$2014\text{J}$ can never be cited as an untouched independent final test set** for any new model candidate.
- **Future Requirement:** Any new prospective model candidate must be evaluated on a genuinely untouched, previously uninspected historical term (e.g., from an institutional partner) that was completely sealed during feature engineering and pipeline design.

---

## 5. Statistical Power & Sample Size Requirements: Derivation & Audit

Phase Twenty proposed planning criteria of **$\ge 4$ contiguous terms** and **$\ge 500$ positive test cases**. We formally review the mathematical derivations and assumptions required to substantiate these targets.

### 5.1. Effective Sample Size Derivation
When observations are clustered within students (multiple courses per term, multiple terms per degree), standard i.i.d. variance formulas underestimate standard error.

The **Intraclass Correlation Coefficient (ICC)** across student clusters is:
$$\text{ICC} = \frac{\sigma^2_{\text{student}}}{\sigma^2_{\text{student}} + \sigma^2_{\text{residual}}}$$
For an average cluster size $m$ (average course enrollments per student observed over the study window), the **Design Effect (DE)** is:
$$\text{DE} = 1 + (m - 1) \cdot \text{ICC}$$
And the **Effective Sample Size** ($N_{\text{eff}}$) is:
$$N_{\text{eff}} = \frac{N_{\text{total}}}{\text{DE}}$$

#### Empirical Audit of Assumptions:
- In higher education, students take approximately $m \approx 4$ courses per semester.
- In educational literature, $\text{ICC}$ for student academic outcomes typically ranges between $0.15$ and $0.35$.
- *Under $\text{ICC} = 0.25$ and $m = 4$:*
  $$\text{DE} = 1 + (4 - 1) \cdot 0.25 = 1 + 0.75 = 1.75$$
  $$N_{\text{eff}} = \frac{N_{\text{total}}}{1.75} \approx 0.57 \cdot N_{\text{total}}$$
- **Operational Reality:** A nominal test set of $2,000$ course registrations represents only approximately **$1,140$ statistically independent observations**.

### 5.2. Power for Detecting PR-AUC Differences
To detect a statistically meaningful improvement of $\Delta \text{PR-AUC} \ge 0.05$ between a candidate model and the baseline at significance level $\alpha = 0.05$ with $80\%$ power ($1 - \beta = 0.80$):
- **Minority Outcome Requirement:** The test holdout must contain at least **$500$ effective positive events** ($Y = 1$, At-Risk).
- At an institutional at-risk prevalence of $30\%$, $500$ positive events requires an effective sample size of:
  $$N_{\text{eff}} \ge \frac{500}{0.30} \approx 1,667 \text{ independent observations}$$
- Accounting for the Design Effect ($\text{DE} = 1.75$), the nominal test partition must contain at least:
  $$N_{\text{nominal}} = 1,667 \cdot 1.75 \approx 2,917 \text{ course registrations}$$
- **Audit Conclusion:** The planning criterion of $500$ positive cases is statistically defensible **if and only if** the total test holdout contains $\ge 3,000$ nominal course registrations across at least $\ge 750$ distinct students. If a partner dataset provides fewer registrations, subgroup power claims must be marked unverified.
