# SUTRA Phase Seventeen — Explainable Risk Signal Engine & ML Integration Boundary

**Status:** Operational & Validated  
**Module:** `ml/src/sutra_ml/signals/risk_signal_engine.py` and `integration_boundary.py`  
**Target Architecture:** CODEX 3.0 PS6 Student Success & Intervention Orchestration Engine  
**Governance Mandate:** Transparent Rule Heuristics, Least-Privilege Privacy, and Non-Punitive Follow-Ups

---

## 1. Executive Summary

The SUTRA Risk Signal Engine provides an explainable, multi-domain triage layer for the CODEX 3.0 Student Success Platform. Instead of presenting advisors with opaque machine learning probabilities or simplistic attendance percentages, the engine maps observable multisource student data to **actionable, evidence-grounded risk signals**.

### Core Tenets
1. **Explainability by Design:** Every signal provides explicit empirical evidence, the formula rule that triggered it, data freshness, confidence limitations, and a constructive next step.
2. **Supportive, Non-Punitive Actions:** The engine strictly refuses to recommend punitive sanctions, academic de-registration, or disciplinary penalties. Every recommended action focuses on removing barriers to learning.
3. **Least-Privilege Confidentiality:** Sensitive financial aid signals are quarantined from instructional faculty and peers, routing exclusively to financial aid counselors.
4. **Mandatory Human-in-the-Loop Discretion:** Signals are decision-support indicators. Conflicting indicators mandate human advisor review before outreach is initiated.

---

## 2. Signal Taxonomies & Schema Definition

Each detected signal is encapsulated in an immutable data structure (`RiskSignal`):

```python
class RiskSignal(BaseModel):
    signal_id: str                      # Unique key: 'SIG-ATT-CRIT-...'
    category: SignalCategory            # ATTENDANCE, ACADEMIC, LMS, FINANCIAL, PLACEMENT, FACULTY
    severity: SignalSeverity            # INFO, LOW, MEDIUM, HIGH, CRITICAL
    title: str                          # Human-readable headline
    evidence: dict[str, Any]            # Exact empirical metrics that triggered rule
    rule_description: str               # Formulaic trigger condition
    observation_freshness: str          # Source sync latency
    confidence_limitation: str          # Coverage and sensor limitations
    recommended_action: str             # Constructive, non-punitive intervention
    assigned_role: AssignedRole         # Role owner for follow-up
    is_confidential: bool               # Access boundary flag
```

---

## 3. Comprehensive Rule Inventory

The signal engine evaluates 12 deterministic rules across 8 functional categories:

| Rule ID | Category | Severity | Trigger Condition | Assigned Role | Recommended Supportive Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SIG-ATT-CRIT` | Attendance | `CRITICAL` / `HIGH` | Consecutive absences $\ge 4$ OR recent attendance $< 50.0\%$ | `ACADEMIC_ADVISOR` | Supportive check-in to identify personal, medical, or commute barriers. Avoid punitive attendance penalties. |
| `SIG-ATT-WARN` | Attendance | `MEDIUM` | Overall $-$ Recent attendance $> 15.0\%$ OR trend `DECLINING` | `ACADEMIC_ADVISOR` | Automated advisory notification regarding course attendance policy and tutoring services. |
| `SIG-ACAD-FAIL`| Academic | `CRITICAL` / `HIGH` | Failed assessments $\ge 2$ OR term score $< 50.0\%$ OR standing `PROBATION` | `ACADEMIC_ADVISOR` | Connect student with subject-specific peer tutoring and schedule academic advising plan. |
| `SIG-ACAD-DUE` | Academic | `MEDIUM` | Overdue scheduled assessment milestones $\ge 1$ | `COURSE_INSTRUCTOR` | Instructor outreach to clarify assignment expectations and explore extension eligibility. |
| `SIG-PART-INACT`| Participation| `HIGH` | LMS dormancy $\ge 14$ days OR active days $\le 2$ | `ACADEMIC_ADVISOR` | Verify platform access; confirm student credentials and computer/internet availability. |
| `SIG-PART-SLOW` | Participation| `MEDIUM` | Weekly study hours $< 2.0$ AND term score $< 65.0\%$ | `ACADEMIC_ADVISOR` | Academic coaching on study planning, time management, and self-directed learning. |
| `SIG-FIN-BURS` | Financial Aid | `HIGH` / `MEDIUM` | Fee status `OVERDUE` OR `has_financial_hold` is True | `FINANCIAL_AID_COUNSELOR` (Confidential) | Financial aid counseling: review emergency bursary fund eligibility; structure affordable plan; waive holds. |
| `SIG-FIN-SCHOL`| Financial Aid | `INFO` | Fee status `SCHOLARSHIP_PENDING` | `FINANCIAL_AID_COUNSELOR` (Confidential) | Monitor institutional grant disbursement; ensure administrative holds remain suppressed. |
| `SIG-PLACE-GAP`| Placement | `MEDIUM` | Program Year $\ge 3$ AND placement tier `NEEDS_SUPPORT` | `CAREER_PLACEMENT_OFFICER` | Schedule resume review clinic and mock technical interview workshop. |
| `SIG-FAC-CONC` | Faculty | `HIGH` / `MEDIUM` | Faculty sentiment `CONCERN` or `URGENT_CONCERN` | `ACADEMIC_ADVISOR` | Advisor reviews instructor observation notes; coordinates targeted academic follow-up. |
| `SIG-CONF-ATT` | Conflicting | `MEDIUM` | Recent attendance $< 50.0\%$ AND term score $\ge 80.0\%$ | `ACADEMIC_ADVISOR` | **Mandatory Human Review**: Student demonstrates content mastery; investigate external life clashes. |
| `SIG-CONF-LMS` | Conflicting | `MEDIUM` | LMS logins $\ge 25$ AND completed assessments $= 0$ (due $\ge 1$) | `ACADEMIC_ADVISOR` | **Mandatory Human Review**: Student active online but submits zero work; probe submission anxiety. |

---

## 4. Architectural Isolation Boundary

The system establishes an unambiguous contract separating machine learning models from prototype rules:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SUTRA 360 INTEGRATION BOUNDARY                        │
├──────────────────────────────────────┬──────────────────────────────────────┤
│ COMPONENT 1: OULAD ML BASELINE       │ COMPONENT 2: RISK SIGNAL ENGINE      │
│ • Model: Logistic Regression v1.0.0  │ • Engine: Rule-Based Heuristics      │
│ • Features: 25 Day-30 OULAD Features │ • Features: 6 Multisource Domains    │
│ • Threshold: 0.46                    │ • Outputs: Explainable Risk Signals  │
│ • Nature: Statistical ML Probability │ • Nature: Transparent Heuristics     │
│ • ZERO Access to Attendance/Fee/Skill│ • ZERO Reliance on Black-Box Models  │
├──────────────────────────────────────┴──────────────────────────────────────┤
│ COMPONENT 3: PROTOTYPE COMPOSITE TRIAGE INDEX (0 - 100)                      │
│ • Nature: Configurable Rule-Summation Heuristic                              │
│ • Purpose: Queue sorting and dashboard triage only                           │
│ • MANDATORY GOVERNANCE DISCLAIMER: NOT A MACHINE LEARNING PROBABILITY        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prototype Composite Priority Formula
To enable dashboard sorting, active signals are summed into a prototype index:
$$\text{Composite Index} = \min\left(100, \sum 30 \cdot N_{\text{crit}} + 20 \cdot N_{\text{high}} + 10 \cdot N_{\text{med}} + 5 \cdot N_{\text{low}}\right)$$

- $\text{Index} \ge 50 \implies \mathbf{CRITICAL}$
- $30 \le \text{Index} < 50 \implies \mathbf{HIGH}$
- $15 \le \text{Index} < 30 \implies \mathbf{MEDIUM}$
- $\text{Index} < 15 \implies \mathbf{LOW}$

**Governance Guardrail:** This composite index is explicitly labeled across all UIs and reports as an operational priority heuristic. It is never combined with or confused for the OULAD model probability.
