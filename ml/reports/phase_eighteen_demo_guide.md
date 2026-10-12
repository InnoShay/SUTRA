# SUTRA Phase Eighteen — Demonstration & Evaluation Guide

**Milestone:** CODEX 3.0 PS6 Student Success and Intervention Orchestration Prototype  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Target Environment:** Local Python 3.13 / macOS  

---

## 1. Quick Start & Execution Modes

SUTRA Phase Eighteen provides two evaluation interfaces:
1. **Interactive Single-Page Web Dashboard:** Served directly by FastAPI at `http://127.0.0.1:8000/demo` (and `http://127.0.0.1:8000/interventions/ui`).
2. **Terminal Automation Pipeline:** Direct CLI runner executing the 11-step acceptance workflow: `python3 ml/pipelines/run_intervention_workflow.py --acceptance-scenario`.

### Starting the Local Demonstration Server
From the repository root:
```bash
cd /Users/neemaysmac/Desktop/Sutra
PYTHONPATH=ml/src:. python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Open your browser to:
- **Interactive UI:** `http://127.0.0.1:8000/demo`
- **Swagger API Docs:** `http://127.0.0.1:8000/docs`

---

## 2. Nine-Point Acceptance Checklist Walkthrough

Use this guide to verify each item on the Phase Eighteen acceptance checklist.

### Checklist Item 1: Open a synthetic profile and inspect all available data domains
1. Open `http://127.0.0.1:8000/demo` and navigate to Tab 1: **Student 360 Explorer**.
2. Select `SYNTH-360-ATT-ANOMALY-02` (`ATTENDANCE_ANOMALY_STRONG_ACADEMIC`) from the left-hand profile list.
3. Verify that all 6 observation domains render with source freshness and domain metrics:
   - **Attendance:** Cumulative 82.0%, Recent 14d rate 42.0%, Consecutive absences 4, Trend `CRITICAL_DROP`, Sync freshness `1d ago`.
   - **Academics:** Cumulative GPA `3.70`, Current term average `84.0%`, Overdue assessments `0`, Failed count `0`, Academic standing `GOOD_STANDING`.
   - **LMS Participation:** Active learning days `20/30`, Platform logins `28`, Forum posts `8`, Study velocity `6.0h/wk`.
   - **Fee Status:** Access-controlled administrative status.
   - **Skills & Placement:** Technical benchmark `78.0%`, Soft skills `4.2/5`, Placement tier `READY`.
   - **Faculty Observations:** Note from Course Instructor (`EE301`) recording missed lectures but high online marks.

---

### Checklist Item 2: See risk signals with evidence, freshness, and recommended support
1. In the profile detail view, inspect the **Explainable Risk Signals Evaluated by Engine** section.
2. Confirm the three transparent rule signals:
   - `Critical Attendance Decline Detected` (Severity: `HIGH`):
     - **Evidence:** `{'consecutive_absences': 4, 'recent_attendance_pct': 42.0}`
     - **Rule Formula:** Consecutive absences $\ge 4$ OR recent attendance $< 50.0\%$.
     - **Recommended Action:** Supportive check-in to identify external obstacles.
   - `Divergent Indicators: Low Attendance with High Coursework Attainment` (Severity: `MEDIUM`):
     - **Evidence:** Recent attendance 42.0%, Term average 84.0%, GPA 3.70.
     - **Governance Mandate:** Mandatory human review. Strictly prohibits punitive attendance sanctions.

---

### Checklist Item 3: Approve or reject a recommendation with a recorded reason
1. Click **Propose Case** on the attendance signal or navigate to Tab 2: **Intervention Action Board**.
2. Click on case `CASE-2026-001` in the **1. Awaiting Review** column.
3. Review Step 1 in the management modal:
   - Enter mandatory review rationale:
     ```
     Verified attendance drop. High GPA indicates mastery. Student likely facing scheduling or transportation barriers. Approving supportive check-in; disciplinary action prohibited.
     ```
4. Click **Approve Recommendation**.
5. Observe the case card move immediately to column **2. Approved**, updating column counters in real time.
6. *To test rejection:* Click any unreviewed case, enter rationale, and click **Reject Recommendation** &rarr; transitions to `REJECTED`.

---

### Checklist Item 4: Assign a stakeholder and deadline
1. Click on the newly approved case in column **2. Approved**.
2. In Step 2 of the modal:
   - Select Designated Role: `ACADEMIC_ADVISOR`.
   - Enter Synthetic Assignee ID: `STAFF-ADV-04`.
   - Set Target Due Date: `2026-10-25`.
3. Click **Confirm Assignment**.
4. The case card transitions to column **3. Assigned**, displaying the assignee ID and due date.

---

### Checklist Item 5: Record follow-up and a synthetic outcome
1. Click on the assigned case in column **3. Assigned**, then click **Mark In-Progress** &rarr; moves to **4. In Progress**.
2. Click the case again in **4. In Progress**:
   - In Step 4 (Follow-Up Documentation), enter:
     ```
     Met with student for 30 minutes in advising office. Student disclosed family caretaking duties affecting morning commute. Arranged access to asynchronous lecture recordings and peer notes.
     ```
   - Click **Log Follow-Up** &rarr; transitions to **5. Follow-Up Recorded**.
3. Re-open the case in **5. Follow-Up Recorded**:
   - Select Outcome Category: `STUDENT_ENGAGEMENT_IMPROVED`.
   - Enter Outcome Notes:
     ```
     Student resumed attendance for all afternoon recitations. Asynchronous modules completed. Academic performance sustained at 3.7 GPA. Case goals achieved.
     ```
   - Click **Record Outcome & Close Case**.
4. Case moves to **6. Closed**.

---

### Checklist Item 6: See the case history update and cohort metrics recalculate
1. Re-open the closed case from column **6. Closed**:
   - Scroll to **Immutable Audit Trail**.
   - Verify all 6 events in sequence:
     1. `CREATE_CASE_PROPOSAL` (`RECOMMENDED`)
     2. `REVIEW_APPROVAL` (`RECOMMENDED` &rarr; `APPROVED`)
     3. `ASSIGN_STAKEHOLDER` (`APPROVED` &rarr; `ASSIGNED`)
     4. `START_IN_PROGRESS` (`ASSIGNED` &rarr; `IN_PROGRESS`)
     5. `RECORD_FOLLOW_UP_NOTES` (`IN_PROGRESS` &rarr; `FOLLOW_UP_RECORDED`)
     6. `RECORD_OUTCOME_AND_CLOSE` (`FOLLOW_UP_RECORDED` &rarr; `CLOSED`)
2. Switch to Tab 3: **Cohort Outcomes & Analytics**:
   - Verify that **Closed Cases with Documented Outcomes** incremented dynamically.
   - Verify the live status, priority, type, and outcome distribution charts.

---

### Checklist Item 7: Demonstrate an overdue case and a restricted financial-aid case
1. **Overdue Case Demonstration:**
   - In the Action Board, locate `CASE-2026-003` (`SYNTH-360-OVERDUE-09`).
   - Notice the prominent red `OVERDUE` badge and red border.
   - Click the card to view details: target due date was `2026-10-05` (prior to simulation anchor `2026-10-15`).
   - Click **Trigger Overdue Escalation Flag** &rarr; updates escalation level from `OVERDUE_FLAGGED` to `SUPERVISOR_NOTIFIED`.
2. **Confidential Financial-Aid Demonstration:**
   - On the header, ensure the Active Role selector is set to `Academic Advisor`.
   - Go to Tab 1 and select `SYNTH-360-FIN-SUPPORT-04` (`FINANCIAL_SUPPORT_NEEDED`).
   - In Domain 4 (Fee Status), observe:
     - Badge: `RESTRICTED`
     - Status: `[CONFIDENTIAL]`
     - Financial Hold: `[RESTRICTED]`
   - Go to Tab 2: Notice that confidential financial aid cases are masked from view.
   - **Switch Role:** In header, change Active Role to `Financial Aid Counselor (Authorized)`.
   - Observe Domain 4 immediately unlock:
     - Badge: `AUTHORIZED`
     - Status: `OVERDUE` (38 days past due)
     - Financial Hold: `HOLD ACTIVE`
     - Emergency Aid Eligible: `ELIGIBLE`
   - Notice `CASE-2026-002` appear on the Action Board with purple `CONFIDENTIAL` badge.

---

### Checklist Item 8: Verify that no real messages or interventions are triggered
1. Verify the header security indicator: `Zero External Messaging`.
2. Inspect `ml/src/sutra_ml/interventions/engine.py`: no SMTP, Twilio, webhook, or external notification libraries are imported or invoked.
3. Every staff member ID (`STAFF-ADV-04`, `STAFF-AID-01`), student key (`SYNTH-360-*`), and outreach note is synthetic.

---

### Checklist Item 9: Run automated tests and verify production integrity
Run the automated test suite in your terminal:
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```
Expected output:
```
============================= 157 passed in 0.98s ==============================
```
Confirm:
- Baseline Logistic Regression v1.0.0 artifact SHA-256 remains: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`
- Serving decision threshold remains: `0.46`
- Phase Nine module-relative candidate execution gate remains: `BLOCKED`

---

## 3. Terminal Automated Acceptance Scenario Execution

To run the complete 11-step acceptance scenario directly from the command line:
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_intervention_workflow.py --acceptance-scenario
```
Output confirms:
- Loading `ATTENDANCE_ANOMALY_STRONG_ACADEMIC`
- Inspecting conflicting GPA 3.7 vs attendance drop
- Human review approval with mandatory rationale
- Assignment to `STAFF-ADV-04` with deadline `2026-10-25`
- Transition to `IN_PROGRESS`
- Logging follow-up advising notes
- Recording outcome `STUDENT_ENGAGEMENT_IMPROVED` and case closure
- Dynamic recalculation of cohort metrics
- Rejection of a false positive recommendation
- Overdue escalation detection
- Confidential financial aid access restriction

---

## 4. Reset & Seed Instructions

To reset the demonstration database to its initial clean state at any time:
- **Via Web UI:** Click **Reset Demo Store** in the top navigation bar.
- **Via CLI:** Run `python3 ml/pipelines/run_intervention_workflow.py --reset`.
- **Via REST API:** Send `POST http://127.0.0.1:8000/api/v1/interventions/reset`.
