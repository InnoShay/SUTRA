"""
SUTRA Phase Eighteen Demonstration Web UI.

Serves an interactive single-page dashboard at /demo and /interventions/ui.
Demonstrates the complete end-to-end PS6 student success journey:
Student 360 -> Risk Signals -> Review -> Assignment -> Follow-up -> Outcome -> Cohort Metrics.
"""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

router = APIRouter(tags=["Demo UI"])

DEMO_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SUTRA PS6 — Student Success & Intervention Orchestration Platform</title>
  <style>
    :root {
      --bg-primary: #0a0e17;
      --bg-surface: #111827;
      --bg-card: #1f2937;
      --bg-card-hover: #283548;
      --border: #374151;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.25);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --purple: #8b5cf6;
      --cyan: #06b6d4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg-primary); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #0f172a; border-bottom: 1px solid var(--border); padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .logo-group { display: flex; align-items: center; gap: 12px; }
    .brand { font-size: 1.25rem; font-weight: 800; letter-spacing: 0.05em; background: linear-gradient(135deg, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .tag { font-size: 0.72rem; padding: 3px 8px; border-radius: 9999px; font-weight: 600; text-transform: uppercase; }
    .tag-synth { background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); }
    .tag-safe { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .controls { display: flex; align-items: center; gap: 14px; }
    .role-badge { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-muted); }
    select, button, input, textarea { background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border); border-radius: 6px; padding: 7px 12px; font-size: 0.85rem; outline: none; }
    select:focus, input:focus, textarea:focus { border-color: var(--accent); }
    button { cursor: pointer; font-weight: 600; transition: all 0.2s; }
    button:hover { background: var(--bg-card-hover); border-color: var(--accent); }
    .btn-primary { background: var(--accent); border-color: var(--accent); color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-success { background: var(--success); border-color: var(--success); color: white; }
    .btn-danger { background: var(--danger); border-color: var(--danger); color: white; }
    .btn-sm { padding: 4px 8px; font-size: 0.75rem; }

    /* Nav Tabs */
    .nav-bar { background: var(--bg-surface); border-bottom: 1px solid var(--border); display: flex; padding: 0 24px; gap: 8px; }
    .nav-tab { padding: 12px 18px; font-size: 0.9rem; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; }
    .nav-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .nav-tab:hover { color: var(--text-main); }

    /* Main Container */
    main { flex: 1; padding: 24px; max-width: 1600px; margin: 0 auto; width: 100%; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Grid & Cards */
    .grid-2 { display: grid; grid-template-columns: 360px 1fr; gap: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px; }
    .card-title { font-size: 1rem; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; }

    /* Student List */
    .student-list { max-height: calc(100vh - 220px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; }
    .student-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.15s; }
    .student-item:hover, .student-item.active { border-color: var(--accent); background: var(--bg-card-hover); }
    .student-item-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 0.88rem; margin-bottom: 4px; }
    .student-item-meta { font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 8px; flex-wrap: wrap; }

    /* 360 Profile Display */
    .domain-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
    .domain-box { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 14px; }
    .domain-header { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--cyan); margin-bottom: 10px; display: flex; justify-content: space-between; }
    .stat-row { display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 6px; }
    .stat-label { color: var(--text-muted); }
    .stat-val { font-weight: 600; }

    /* Risk Signals */
    .signals-container { display: flex; flex-direction: column; gap: 12px; margin-top: 14px; }
    .signal-card { background: var(--bg-card); border-left: 4px solid var(--accent); border-radius: 6px; padding: 14px; border-top: 1px solid var(--border); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .signal-card.CRITICAL { border-left-color: var(--danger); }
    .signal-card.HIGH { border-left-color: var(--warning); }
    .signal-card.MEDIUM { border-left-color: var(--purple); }
    .signal-card.LOW { border-left-color: var(--cyan); }
    .signal-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .signal-title { font-weight: 700; font-size: 0.92rem; }
    .signal-desc { font-size: 0.82rem; color: #d1d5db; margin-bottom: 8px; }
    .evidence-box { background: #0f172a; border-radius: 4px; padding: 8px 10px; font-family: monospace; font-size: 0.75rem; color: #94a3b8; margin-bottom: 10px; }
    .signal-action-row { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed var(--border); }
    .signal-rec { font-size: 0.8rem; color: #a78bfa; font-weight: 500; }

    /* Workflow Board */
    .board-columns { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; overflow-x: auto; min-height: 600px; }
    .board-column { background: #131b2e; border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; min-width: 230px; }
    .column-header { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; display: flex; justify-content: space-between; }
    .column-cards { display: flex; flex-direction: column; gap: 10px; flex: 1; }
    .case-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 12px; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; }
    .case-card:hover { border-color: var(--accent); }
    .case-card.overdue { border-color: var(--danger); background: rgba(239, 68, 68, 0.08); }
    .case-id { font-weight: 800; color: #60a5fa; font-size: 0.82rem; }
    .case-student { font-size: 0.78rem; color: #cbd5e1; margin-top: 2px; }
    .case-type { font-size: 0.75rem; color: var(--purple); font-weight: 600; margin-top: 4px; }
    .case-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.72rem; color: var(--text-muted); }

    /* Modals */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75); display: none; align-items: center; justify-content: center; z-index: 200; }
    .modal-overlay.active { display: flex; }
    .modal { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 10px; width: 620px; max-width: 95vw; max-height: 90vh; overflow-y: auto; padding: 24px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .form-group { margin-bottom: 14px; }
    .form-group label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; }

    /* Audit Trail */
    .audit-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; max-height: 220px; overflow-y: auto; }
    .audit-entry { background: #0f172a; border-left: 3px solid var(--cyan); border-radius: 4px; padding: 8px 12px; font-size: 0.75rem; }
    .audit-time { color: var(--text-muted); font-size: 0.7rem; }
  </style>
</head>
<body>
  <header>
    <div class="logo-group">
      <div class="brand">SUTRA</div>
      <span style="font-size: 0.88rem; font-weight: 600; color: #cbd5e1;">PS6 Intervention Orchestration</span>
      <span class="tag tag-synth">Synthetic Demonstration</span>
      <span class="tag tag-safe">Zero External Messaging</span>
    </div>
    <div class="controls">
      <div class="role-badge">
        <span>Active Role:</span>
        <select id="userRoleSelect" onchange="onRoleChanged()">
          <option value="ACADEMIC_ADVISOR">Academic Advisor</option>
          <option value="FINANCIAL_AID_COUNSELOR">Financial Aid Counselor (Authorized)</option>
          <option value="COURSE_INSTRUCTOR">Course Instructor</option>
          <option value="CAREER_PLACEMENT_OFFICER">Career Placement Officer</option>
          <option value="STUDENT_SUCCESS_COORDINATOR">Student Success Coordinator</option>
        </select>
      </div>
      <button class="btn-sm" onclick="resetStore()">Reset Demo Store</button>
    </div>
  </header>

  <nav class="nav-bar">
    <div class="nav-tab active" onclick="switchTab('explorer')">1. Student 360 Explorer</div>
    <div class="nav-tab" onclick="switchTab('board')">2. Intervention Action Board</div>
    <div class="nav-tab" onclick="switchTab('cohort')">3. Cohort Outcomes & Analytics</div>
    <div class="nav-tab" onclick="switchTab('ml-boundary')">4. ML Governance Boundary</div>
  </nav>

  <main>
    <!-- TAB 1: 360 Explorer -->
    <div id="tab-explorer" class="tab-content active">
      <div class="grid-2">
        <div class="card">
          <div class="card-title">
            <span>Synthetic Profiles</span>
            <span id="profileCountBadge" class="tag tag-synth">Loading...</span>
          </div>
          <div style="margin-bottom: 10px;">
            <input type="text" id="profileSearch" placeholder="Filter by scenario or key..." style="width: 100%;" oninput="filterProfileList()">
          </div>
          <div class="student-list" id="studentListContainer">
            <!-- Populated via JS -->
          </div>
        </div>

        <div>
          <div class="card" id="profileDetailCard">
            <div class="card-title">
              <div>
                <span id="detailStudentKey">Select a student</span>
                <span id="detailScenarioTag" class="tag tag-synth" style="margin-left: 8px;"></span>
              </div>
              <span id="detailProgramYear" style="font-size: 0.82rem; color: var(--text-muted);"></span>
            </div>

            <!-- 6 Domains -->
            <div class="domain-grid">
              <!-- 1. Attendance -->
              <div class="domain-box">
                <div class="domain-header"><span>1. Attendance</span> <span id="attTrendTag" class="tag tag-safe"></span></div>
                <div class="stat-row"><span class="stat-label">Overall Rate:</span><span class="stat-val" id="statOverallAtt">-</span></div>
                <div class="stat-row"><span class="stat-label">Recent 14d Rate:</span><span class="stat-val" id="statRecentAtt">-</span></div>
                <div class="stat-row"><span class="stat-label">Consecutive Absences:</span><span class="stat-val" id="statConsecAbs">-</span></div>
                <div class="stat-row"><span class="stat-label">Sync Freshness:</span><span class="stat-val" id="statAttFreshness">-</span></div>
              </div>

              <!-- 2. Academics -->
              <div class="domain-box">
                <div class="domain-header"><span>2. Academics</span> <span id="acadStandingTag" class="tag tag-safe"></span></div>
                <div class="stat-row"><span class="stat-label">Cumulative GPA:</span><span class="stat-val" id="statGPA">-</span></div>
                <div class="stat-row"><span class="stat-label">Term Average:</span><span class="stat-val" id="statTermAvg">-</span></div>
                <div class="stat-row"><span class="stat-label">Assessments Overdue:</span><span class="stat-val" id="statOverdueAssess">-</span></div>
                <div class="stat-row"><span class="stat-label">Failed Count:</span><span class="stat-val" id="statFailedCount">-</span></div>
              </div>

              <!-- 3. LMS Participation -->
              <div class="domain-box">
                <div class="domain-header"><span>3. LMS Participation</span></div>
                <div class="stat-row"><span class="stat-label">Active Days (D30):</span><span class="stat-val" id="statActiveDays">-</span></div>
                <div class="stat-row"><span class="stat-label">Total Logins:</span><span class="stat-val" id="statLogins">-</span></div>
                <div class="stat-row"><span class="stat-label">Forum Posts:</span><span class="stat-val" id="statForum">-</span></div>
                <div class="stat-row"><span class="stat-label">Weekly Velocity:</span><span class="stat-val" id="statStudyHours">-</span></div>
              </div>

              <!-- 4. Fee & Financial Aid (Role Restricted) -->
              <div class="domain-box">
                <div class="domain-header"><span>4. Fee Status</span> <span id="feeRestrictedBadge" class="tag tag-synth"></span></div>
                <div class="stat-row"><span class="stat-label">Payment Status:</span><span class="stat-val" id="statFeeStatus">-</span></div>
                <div class="stat-row"><span class="stat-label">Days Past Due:</span><span class="stat-val" id="statDaysPastDue">-</span></div>
                <div class="stat-row"><span class="stat-label">Financial Hold:</span><span class="stat-val" id="statFinHold">-</span></div>
                <div class="stat-row"><span class="stat-label">Emergency Aid Eligible:</span><span class="stat-val" id="statBursary">-</span></div>
              </div>

              <!-- 5. Skills & Placement -->
              <div class="domain-box">
                <div class="domain-header"><span>5. Skills & Career</span> <span id="placementTierTag" class="tag tag-safe"></span></div>
                <div class="stat-row"><span class="stat-label">Technical Score:</span><span class="stat-val" id="statTechScore">-</span></div>
                <div class="stat-row"><span class="stat-label">Soft Skills:</span><span class="stat-val" id="statSoftSkills">-</span></div>
                <div class="stat-row"><span class="stat-label">Resume Certified:</span><span class="stat-val" id="statResume">-</span></div>
                <div class="stat-row"><span class="stat-label">Mock Interview:</span><span class="stat-val" id="statMockInterview">-</span></div>
              </div>

              <!-- 6. Faculty Feedback -->
              <div class="domain-box">
                <div class="domain-header"><span>6. Faculty Observations</span></div>
                <div id="facultyObsContainer" style="font-size: 0.75rem; color: #d1d5db; max-height: 85px; overflow-y: auto;">
                  No recent notes.
                </div>
              </div>
            </div>

            <!-- Risk Signals Section -->
            <div class="card-title" style="margin-top: 10px;">
              <span>Explainable Risk Signals Evaluated by Engine</span>
              <span id="signalCountTag" class="tag tag-synth">0 Detected</span>
            </div>
            <div class="signals-container" id="signalsContainer">
              <div style="font-size: 0.85rem; color: var(--text-muted);">Select a student to evaluate operational risk signals.</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: Intervention Action Board -->
    <div id="tab-board" class="tab-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700;">Intervention Lifecycle State Machine</h2>
          <p style="font-size: 0.8rem; color: var(--text-muted);">Recommended &rarr; Awaiting Review &rarr; Approved &rarr; Assigned &rarr; In Progress &rarr; Follow-Up Recorded &rarr; Closed</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-sm" onclick="loadBoardCases()">Refresh Board</button>
        </div>
      </div>
      <div class="board-columns">
        <!-- 1. Awaiting Review -->
        <div class="board-column">
          <div class="column-header"><span>1. Awaiting Review</span> <span id="colCount-AWAITING_REVIEW">0</span></div>
          <div class="column-cards" id="col-AWAITING_REVIEW"></div>
        </div>
        <!-- 2. Approved -->
        <div class="board-column">
          <div class="column-header"><span>2. Approved</span> <span id="colCount-APPROVED">0</span></div>
          <div class="column-cards" id="col-APPROVED"></div>
        </div>
        <!-- 3. Assigned -->
        <div class="board-column">
          <div class="column-header"><span>3. Assigned</span> <span id="colCount-ASSIGNED">0</span></div>
          <div class="column-cards" id="col-ASSIGNED"></div>
        </div>
        <!-- 4. In Progress -->
        <div class="board-column">
          <div class="column-header"><span>4. In Progress</span> <span id="colCount-IN_PROGRESS">0</span></div>
          <div class="column-cards" id="col-IN_PROGRESS"></div>
        </div>
        <!-- 5. Follow-Up Recorded -->
        <div class="board-column">
          <div class="column-header"><span>5. Follow-Up</span> <span id="colCount-FOLLOW_UP_RECORDED">0</span></div>
          <div class="column-cards" id="col-FOLLOW_UP_RECORDED"></div>
        </div>
        <!-- 6. Closed -->
        <div class="board-column">
          <div class="column-header"><span>6. Closed</span> <span id="colCount-CLOSED">0</span></div>
          <div class="column-cards" id="col-CLOSED"></div>
        </div>
      </div>
    </div>

    <!-- TAB 3: Cohort Outcomes -->
    <div id="tab-cohort" class="tab-content">
      <h2 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 16px;">Cohort-Level Dynamic Aggregates & Outcomes</h2>
      <div class="grid-4" style="margin-bottom: 20px;">
        <div class="card">
          <div style="font-size: 0.78rem; color: var(--text-muted);">Total Synthetic Cohort</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: #60a5fa;" id="kpiCohortSize">100</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Fully simulated 360 profiles</div>
        </div>
        <div class="card">
          <div style="font-size: 0.78rem; color: var(--text-muted);">Profiles Requiring Review</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: var(--warning);" id="kpiRequiringReview">-</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Rule-evaluated signals present</div>
        </div>
        <div class="card">
          <div style="font-size: 0.78rem; color: var(--text-muted);">Assigned & In-Progress</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: var(--purple);" id="kpiActiveCases">-</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Active supportive cases</div>
        </div>
        <div class="card">
          <div style="font-size: 0.78rem; color: var(--text-muted);">Overdue Cases</div>
          <div style="font-size: 1.8rem; font-weight: 800; color: var(--danger);" id="kpiOverdueCases">-</div>
          <div style="font-size: 0.72rem; color: var(--text-muted);">Escalation policy flagged</div>
        </div>
      </div>

      <div class="grid-3">
        <div class="card">
          <div class="card-title">Intervention by Status</div>
          <div id="cohortStatusBreakdown" style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
        <div class="card">
          <div class="card-title">Intervention by Type</div>
          <div id="cohortTypeBreakdown" style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
        <div class="card">
          <div class="card-title">Recorded Outcome Categories</div>
          <div id="cohortOutcomeBreakdown" style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
      </div>
    </div>

    <!-- TAB 4: ML Governance Boundary -->
    <div id="tab-ml-boundary" class="tab-content">
      <div class="card" style="max-width: 900px; margin: 0 auto;">
        <div class="card-title">
          <span>SUTRA Architecture & Ethical Governance Contract</span>
          <span class="tag tag-safe">Active Serving Invariant</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 14px; font-size: 0.85rem; line-height: 1.5;">
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
            <strong style="color: #60a5fa;">Production Model Baseline (Day-30 OULAD):</strong>
            <p style="margin-top: 4px;">Regularized Logistic Regression Baseline (v1.0.0)</p>
            <p><strong>Serving Decision Threshold:</strong> 0.46 (frozen)</p>
            <p><strong>Artifact SHA-256:</strong> <code style="color: #6ee7b7;">78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f</code></p>
            <p><strong>Input Space:</strong> 25 strictly observable Day-30 features</p>
          </div>
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
            <strong style="color: var(--warning);">Phase Nine Module-Relative Candidate Status:</strong>
            <p style="margin-top: 4px;">Candidate gate remains <span class="tag tag-synth" style="color: #f87171; border-color: #f87171;">BLOCKED</span> by default (candidate_provenance_verified = False). Intervention-ineligible.</p>
          </div>
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; border: 1px solid var(--border);">
            <strong style="color: var(--cyan);">Ethical Safeguards & PS6 Mandates:</strong>
            <ul style="margin-left: 20px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
              <li><strong>Separation of ML and Rules:</strong> Synthetic 360-degree indicators are transparent rule heuristics, NEVER fabricated into an OULAD retraining claim.</li>
              <li><strong>Zero External Messaging:</strong> No actual emails, text messages, or notifications are triggered in this prototype.</li>
              <li><strong>Non-Punitive Action:</strong> Disciplinary, grading, or punitive recommendations are strictly forbidden.</li>
              <li><strong>Confidentiality Isolation:</strong> Fee hold and financial aid indicators are restricted to Financial Aid Counselors.</li>
              <li><strong>Mandatory Human Review:</strong> No automated intervention assignment or execution.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- MODALS -->
  <!-- Case Action Modal -->
  <div class="modal-overlay" id="caseActionModal">
    <div class="modal">
      <div class="modal-header">
        <h3 id="modalCaseTitle" style="font-size: 1.1rem; font-weight: 700;">Case Management</h3>
        <button onclick="closeModal('caseActionModal')">&times;</button>
      </div>
      <div id="modalCaseBody">
        <!-- Dynamic content injected depending on state -->
      </div>
    </div>
  </div>

  <script>
    let currentRole = "ACADEMIC_ADVISOR";
    let profilesList = [];
    let selectedStudentKey = null;

    async function init() {
      await loadProfiles();
      await loadBoardCases();
      await loadCohortMetrics();
    }

    function switchTab(tabId) {
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      event.target.classList.add("active");
      document.getElementById("tab-" + tabId).classList.add("active");
      if (tabId === "board") loadBoardCases();
      if (tabId === "cohort") loadCohortMetrics();
    }

    function onRoleChanged() {
      currentRole = document.getElementById("userRoleSelect").value;
      if (selectedStudentKey) {
        selectStudent(selectedStudentKey);
      }
      loadBoardCases();
      loadCohortMetrics();
    }

    async function loadProfiles() {
      try {
        const res = await fetch("/api/v1/interventions/profiles?user_role=" + currentRole);
        profilesList = await res.json();
        document.getElementById("profileCountBadge").innerText = profilesList.length + " Loaded";
        renderProfileList(profilesList);
        if (profilesList.length > 0 && !selectedStudentKey) {
          selectStudent(profilesList[0].student_key);
        }
      } catch (e) {
        console.error(e);
      }
    }

    function renderProfileList(list) {
      const c = document.getElementById("studentListContainer");
      c.innerHTML = "";
      list.forEach(p => {
        const item = document.createElement("div");
        item.className = "student-item" + (p.student_key === selectedStudentKey ? " active" : "");
        item.onclick = () => selectStudent(p.student_key);
        item.innerHTML = `
          <div class="student-item-header">
            <span>${p.student_key}</span>
            <span class="tag ${p.signals_count > 0 ? 'tag-synth' : 'tag-safe'}">${p.signals_count} Signals</span>
          </div>
          <div class="student-item-meta">
            <span>${p.scenario_name || p.department}</span>
            <span>Att: ${p.overall_attendance_pct}%</span>
            <span>GPA: ${p.cumulative_gpa}</span>
          </div>
        `;
        c.appendChild(item);
      });
    }

    function filterProfileList() {
      const q = document.getElementById("profileSearch").value.toLowerCase();
      const filtered = profilesList.filter(p => 
        p.student_key.toLowerCase().includes(q) || 
        (p.scenario_name && p.scenario_name.toLowerCase().includes(q)) ||
        p.department.toLowerCase().includes(q)
      );
      renderProfileList(filtered);
    }

    async function selectStudent(key) {
      selectedStudentKey = key;
      renderProfileList(profilesList);
      try {
        const res = await fetch("/api/v1/interventions/profiles/" + key + "?user_role=" + currentRole);
        const data = await res.json();
        const p = data.profile;

        document.getElementById("detailStudentKey").innerText = p.student_key;
        document.getElementById("detailScenarioTag").innerText = p.scenario_name || "CUSTOM_BATCH";
        document.getElementById("detailProgramYear").innerText = `${p.department} — Year ${p.program_year} (${p.academic_term})`;

        // 1. Attendance
        document.getElementById("statOverallAtt").innerText = p.attendance.overall_attendance_pct + "%";
        document.getElementById("statRecentAtt").innerText = p.attendance.recent_attendance_pct + "%";
        document.getElementById("statConsecAbs").innerText = p.attendance.consecutive_absences;
        document.getElementById("statAttFreshness").innerText = p.attendance.source_freshness_days + "d ago";
        document.getElementById("attTrendTag").innerText = p.attendance.attendance_trend;

        // 2. Academics
        document.getElementById("statGPA").innerText = p.academics.cumulative_gpa;
        document.getElementById("statTermAvg").innerText = p.academics.current_term_average_pct + "%";
        document.getElementById("statOverdueAssess").innerText = p.academics.assessments_overdue;
        document.getElementById("statFailedCount").innerText = p.academics.failed_assessments_count;
        document.getElementById("acadStandingTag").innerText = p.academics.academic_standing;

        // 3. LMS
        document.getElementById("statActiveDays").innerText = p.participation.active_learning_days_d30 + "/30";
        document.getElementById("statLogins").innerText = p.participation.total_platform_logins_d30;
        document.getElementById("statForum").innerText = p.participation.discussion_forum_posts;
        document.getElementById("statStudyHours").innerText = p.participation.weekly_study_velocity_hours + "h/wk";

        // 4. Fee (Confidentiality handling)
        const isFin = (currentRole === "FINANCIAL_AID_COUNSELOR");
        if (!isFin) {
          document.getElementById("feeRestrictedBadge").innerText = "RESTRICTED";
          document.getElementById("statFeeStatus").innerText = "[CONFIDENTIAL]";
          document.getElementById("statDaysPastDue").innerText = "—";
          document.getElementById("statFinHold").innerText = "[RESTRICTED]";
          document.getElementById("statBursary").innerText = "—";
        } else {
          document.getElementById("feeRestrictedBadge").innerText = "AUTHORIZED";
          document.getElementById("statFeeStatus").innerText = p.fee_status.status;
          document.getElementById("statDaysPastDue").innerText = p.fee_status.days_past_due + "d";
          document.getElementById("statFinHold").innerText = p.fee_status.has_financial_hold ? "HOLD ACTIVE" : "None";
          document.getElementById("statBursary").innerText = p.fee_status.bursary_eligibility_flag ? "ELIGIBLE" : "No";
        }

        // 5. Skills
        document.getElementById("statTechScore").innerText = p.skills_placement.technical_skills_score + "%";
        document.getElementById("statSoftSkills").innerText = p.skills_placement.soft_skills_rating + "/5";
        document.getElementById("statResume").innerText = p.skills_placement.resume_reviewed ? "Certified" : "Pending";
        document.getElementById("statMockInterview").innerText = p.skills_placement.mock_interview_completed ? "Completed" : "Not Taken";
        document.getElementById("placementTierTag").innerText = p.skills_placement.placement_readiness_tier;

        // 6. Faculty
        const facC = document.getElementById("facultyObsContainer");
        if (p.faculty_observations && p.faculty_observations.length > 0) {
          facC.innerHTML = p.faculty_observations.map(o => `
            <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed var(--border);">
              <strong>${o.course_code} (${o.faculty_role}):</strong> ${o.summary_notes}
              <div style="color: var(--text-muted); font-size: 0.7rem;">Sentiment: ${o.sentiment} | Rec: ${o.action_recommended_by_faculty || 'None'}</div>
            </div>
          `).join("");
        } else {
          facC.innerHTML = "<div>No behavioral flags recorded.</div>";
        }

        // Signals
        const sigC = document.getElementById("signalsContainer");
        document.getElementById("signalCountTag").innerText = data.risk_signals.length + " Detected";
        if (data.risk_signals.length === 0) {
          sigC.innerHTML = "<div style='font-size: 0.82rem; color: var(--success);'>No active risk signals triggered. Student is on track.</div>";
        } else {
          sigC.innerHTML = data.risk_signals.map(s => `
            <div class="signal-card ${s.severity}">
              <div class="signal-top">
                <span class="signal-title">${s.title}</span>
                <span class="tag tag-synth">${s.severity}</span>
              </div>
              <div class="signal-desc">${s.rule_description}</div>
              <div class="evidence-box">Evidence: ${JSON.stringify(s.evidence)}</div>
              <div class="signal-action-row">
                <div class="signal-rec">&bull; Recommended Support: ${s.recommended_action} (${s.assigned_role})</div>
                <button class="btn-sm btn-primary" onclick="initiateCase('${p.student_key}', '${s.signal_id}')">Propose Case</button>
              </div>
            </div>
          `).join("");
        }
      } catch (e) {
        console.error(e);
      }
    }

    async function initiateCase(studentKey, signalId) {
      try {
        const res = await fetch("/api/v1/interventions/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_key: studentKey,
            signal_id: signalId,
            intervention_type: "ADVISOR_CHECK_IN",
            priority: "HIGH",
            created_by_role: currentRole,
            created_by_id: "STAFF-DEMO-01",
            notes: "Initiated from 360 profile explorer."
          })
        });
        const c = await res.json();
        alert("Case " + c.case_id + " initiated in status: " + c.status + ". Proceeding to Action Board.");
        switchTab("board");
      } catch (e) {
        alert("Error creating case: " + e);
      }
    }

    async function loadBoardCases() {
      try {
        const res = await fetch("/api/v1/interventions/cases?user_role=" + currentRole);
        const cases = await res.json();

        const cols = ["AWAITING_REVIEW", "APPROVED", "ASSIGNED", "IN_PROGRESS", "FOLLOW_UP_RECORDED", "CLOSED"];
        cols.forEach(col => {
          document.getElementById("col-" + col).innerHTML = "";
          document.getElementById("colCount-" + col).innerText = "0";
        });

        const counts = {};
        cols.forEach(col => counts[col] = 0);

        cases.forEach(c => {
          let col = c.status;
          if (col === "RECOMMENDED") col = "AWAITING_REVIEW";
          if (!document.getElementById("col-" + col)) return;

          counts[col] = (counts[col] || 0) + 1;
          const card = document.createElement("div");
          card.className = "case-card" + (c.is_overdue ? " overdue" : "");
          card.onclick = () => openCaseModal(c.case_id);
          card.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
              <span class="case-id">${c.case_id}</span>
              ${c.is_overdue ? '<span class="tag tag-synth" style="color: #f87171; border-color: #f87171;">OVERDUE</span>' : ''}
              ${c.is_confidential ? '<span class="tag tag-synth" style="color: #c084fc; border-color: #c084fc;">CONFIDENTIAL</span>' : ''}
            </div>
            <div class="case-student">${c.student_key}</div>
            <div class="case-type">${c.intervention_type}</div>
            <div class="case-footer">
              <span>${c.assigned_role || 'Unassigned'}</span>
              <span>Due: ${c.due_date || '—'}</span>
            </div>
          `;
          document.getElementById("col-" + col).appendChild(card);
        });

        cols.forEach(col => {
          document.getElementById("colCount-" + col).innerText = counts[col];
        });
      } catch (e) {
        console.error(e);
      }
    }

    async function openCaseModal(caseId) {
      const res = await fetch("/api/v1/interventions/cases/" + caseId + "?user_role=" + currentRole);
      const c = await res.json();

      document.getElementById("modalCaseTitle").innerText = `${c.case_id} — ${c.student_key} (${c.status})`;
      const b = document.getElementById("modalCaseBody");

      let actionHtml = "";
      if (c.status === "RECOMMENDED" || c.status === "AWAITING_REVIEW") {
        actionHtml = `
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
            <strong>Step 1: Human Review Gate</strong>
            <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">Review supporting evidence before committing to an intervention.</p>
            <div class="form-group" style="margin-top: 10px;">
              <label>Review Rationale / Decision Justification (Required):</label>
              <textarea id="reviewRationale" rows="2" placeholder="e.g. Verified attendance drop; high grades indicate health/commute issue rather than disengagement."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-primary" onclick="submitReview('${c.case_id}', true)">Approve Recommendation</button>
              <button class="btn-danger" onclick="submitReview('${c.case_id}', false)">Reject Recommendation</button>
            </div>
          </div>
        `;
      } else if (c.status === "APPROVED") {
        actionHtml = `
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
            <strong>Step 2: Assign Stakeholder & Set Deadline</strong>
            <div class="form-group" style="margin-top: 8px;">
              <label>Designated Role:</label>
              <select id="assignRole">
                <option value="ACADEMIC_ADVISOR">Academic Advisor</option>
                <option value="COURSE_INSTRUCTOR">Course Instructor</option>
                <option value="FINANCIAL_AID_COUNSELOR">Financial Aid Counselor</option>
                <option value="CAREER_PLACEMENT_OFFICER">Career Placement Officer</option>
              </select>
            </div>
            <div class="form-group">
              <label>Synthetic Assignee ID:</label>
              <input type="text" id="assigneeId" value="STAFF-ADV-04">
            </div>
            <div class="form-group">
              <label>Target Due Date:</label>
              <input type="date" id="assignDueDate" value="2026-10-25">
            </div>
            <button class="btn-primary" onclick="submitAssignment('${c.case_id}')">Confirm Assignment</button>
          </div>
        `;
      } else if (c.status === "ASSIGNED") {
        actionHtml = `
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
            <strong>Step 3: Workflow Actions</strong>
            <div style="display: flex; gap: 8px; margin-top: 10px;">
              <button class="btn-primary" onclick="submitProgress('${c.case_id}')">Mark In-Progress</button>
              <button class="btn-warning" onclick="submitEscalate('${c.case_id}')">Trigger Overdue Escalation Flag</button>
            </div>
          </div>
        `;
      } else if (c.status === "IN_PROGRESS" || c.status === "FOLLOW_UP_RECORDED") {
        actionHtml = `
          <div style="background: #0f172a; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
            <strong>Step 4: Record Follow-Up or Final Outcome</strong>
            <div class="form-group" style="margin-top: 8px;">
              <label>Follow-Up Documentation Notes:</label>
              <textarea id="followUpNotes" rows="2" placeholder="Document simulated student contact attempt, discussion, and support delivered..."></textarea>
            </div>
            <button class="btn-primary" onclick="submitFollowUp('${c.case_id}')" style="margin-bottom: 14px;">Log Follow-Up</button>

            <hr style="border-color: var(--border); margin: 12px 0;">

            <strong>Step 5: Record Case Outcome & Close</strong>
            <div class="form-group" style="margin-top: 8px;">
              <label>Standardized Outcome Category:</label>
              <select id="outcomeCategory">
                <option value="STUDENT_ENGAGEMENT_IMPROVED">Student engagement improved in the synthetic scenario</option>
                <option value="SUPPORT_DELIVERED_FOLLOW_UP_REQUIRED">Support delivered; follow-up required</option>
                <option value="NO_MEASURABLE_CHANGE">No measurable change in simulated observations</option>
                <option value="UNABLE_TO_CONTACT">Unable to contact in the simulated scenario</option>
                <option value="REFERRED_TO_ANOTHER_SERVICE">Referred to another support service</option>
                <option value="CASE_CLOSED_AFTER_REVIEW">Case closed after human review</option>
              </select>
            </div>
            <div class="form-group">
              <label>Outcome Notes & Human Assessment:</label>
              <textarea id="outcomeNotes" rows="2" placeholder="e.g. Met student in person. Remedial tutoring scheduled. Attendance returned to normal."></textarea>
            </div>
            <button class="btn-success" onclick="submitOutcome('${c.case_id}')">Record Outcome & Close Case</button>
          </div>
        `;
      }

      b.innerHTML = `
        <div style="font-size: 0.82rem; margin-bottom: 14px;">
          <div><strong>Intervention Type:</strong> ${c.intervention_type}</div>
          <div><strong>Priority:</strong> ${c.priority} | <strong>Overdue:</strong> ${c.is_overdue}</div>
          <div><strong>Assignee:</strong> ${c.assignee_id || 'None'} (${c.assigned_role || 'Unassigned'})</div>
          <div><strong>Due Date:</strong> ${c.due_date || 'None'}</div>
          ${c.follow_up_notes ? `<div style="margin-top:6px; color:#a78bfa;"><strong>Follow-up Notes:</strong> ${c.follow_up_notes}</div>` : ''}
          ${c.outcome_notes ? `<div style="margin-top:6px; color:#34d399;"><strong>Outcome:</strong> ${c.outcome_category} — ${c.outcome_notes}</div>` : ''}
        </div>
        ${actionHtml}
        <div style="margin-top: 14px;">
          <strong style="font-size: 0.85rem;">Immutable Audit Trail:</strong>
          <div class="audit-list">
            ${c.audit_history.map(a => `
              <div class="audit-entry">
                <div style="display: flex; justify-content: space-between;">
                  <strong>${a.action} (${a.from_status} &rarr; ${a.to_status})</strong>
                  <span class="audit-time">${a.timestamp.substring(0,19)}</span>
                </div>
                <div>Actor: ${a.actor_role} (${a.actor_id})</div>
                <div style="color: #94a3b8;">${a.rationale}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;

      document.getElementById("caseActionModal").classList.add("active");
    }

    function closeModal(id) {
      document.getElementById(id).classList.remove("active");
    }

    async function submitReview(caseId, approved) {
      const rationale = document.getElementById("reviewRationale").value;
      if (!rationale || rationale.length < 5) return alert("Rationale must have at least 5 characters.");
      await fetch(`/api/v1/interventions/cases/${caseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewer_role: currentRole,
          reviewer_id: "STAFF-REV-01",
          approved: approved,
          rationale: rationale
        })
      });
      closeModal("caseActionModal");
      await loadBoardCases();
      await loadCohortMetrics();
    }

    async function submitAssignment(caseId) {
      const role = document.getElementById("assignRole").value;
      const assignee = document.getElementById("assigneeId").value;
      const dueDate = document.getElementById("assignDueDate").value;
      await fetch(`/api/v1/interventions/cases/${caseId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_by_role: currentRole,
          assigned_by_id: "STAFF-COORD-01",
          assigned_role: role,
          assignee_id: assignee,
          due_date: dueDate
        })
      });
      closeModal("caseActionModal");
      await loadBoardCases();
      await loadCohortMetrics();
    }

    async function submitProgress(caseId) {
      await fetch(`/api/v1/interventions/cases/${caseId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_role: currentRole,
          actor_id: "STAFF-ASSIGNEE-01",
          notes: "Supportive contact initiated with student in simulated scenario."
        })
      });
      closeModal("caseActionModal");
      await loadBoardCases();
      await loadCohortMetrics();
    }

    async function submitFollowUp(caseId) {
      const notes = document.getElementById("followUpNotes").value;
      if (!notes || notes.length < 10) return alert("Follow-up notes must have at least 10 characters.");
      await fetch(`/api/v1/interventions/cases/${caseId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_role: currentRole,
          actor_id: "STAFF-ASSIGNEE-01",
          follow_up_notes: notes,
          follow_up_method: "In-Person Advising Office"
        })
      });
      closeModal("caseActionModal");
      await loadBoardCases();
      await loadCohortMetrics();
    }

    async function submitOutcome(caseId) {
      const cat = document.getElementById("outcomeCategory").value;
      const notes = document.getElementById("outcomeNotes").value;
      if (!notes || notes.length < 10) return alert("Outcome notes must have at least 10 characters.");
      await fetch(`/api/v1/interventions/cases/${caseId}/outcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_role: currentRole,
          actor_id: "STAFF-ASSIGNEE-01",
          outcome_category: cat,
          outcome_notes: notes,
          close_case: true
        })
      });
      closeModal("caseActionModal");
      await loadBoardCases();
      await loadCohortMetrics();
    }

    async function submitEscalate(caseId) {
      await fetch(`/api/v1/interventions/cases/${caseId}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor_role: currentRole,
          actor_id: "STAFF-LEAD-01",
          escalation_reason: "Target due date elapsed without documented follow-up."
        })
      });
      closeModal("caseActionModal");
      await loadBoardCases();
      await loadCohortMetrics();
    }

    async function loadCohortMetrics() {
      try {
        const res = await fetch("/api/v1/interventions/cohort-metrics?user_role=" + currentRole);
        const m = await res.json();

        document.getElementById("kpiCohortSize").innerText = m.synthetic_cohort_size;
        document.getElementById("kpiRequiringReview").innerText = m.profiles_with_signals_requiring_review;
        document.getElementById("kpiActiveCases").innerText = m.assigned_interventions + m.in_progress_interventions;
        document.getElementById("kpiOverdueCases").innerText = m.overdue_cases_count;

        // Status breakdown
        const sC = document.getElementById("cohortStatusBreakdown");
        sC.innerHTML = Object.entries(m.status_breakdown).map(([k, v]) => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed var(--border);">
            <span style="color:var(--text-muted);">${k}:</span>
            <span style="font-weight:700;">${v}</span>
          </div>
        `).join("");

        // Type breakdown
        const tC = document.getElementById("cohortTypeBreakdown");
        tC.innerHTML = Object.entries(m.intervention_type_breakdown).map(([k, v]) => `
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed var(--border);">
            <span style="color:var(--text-muted);">${k}:</span>
            <span style="font-weight:700;">${v}</span>
          </div>
        `).join("");

        // Outcome breakdown
        const oC = document.getElementById("cohortOutcomeBreakdown");
        oC.innerHTML = Object.entries(m.outcome_categories_breakdown).length === 0 
          ? "<div style='color:var(--text-muted);'>No closed cases yet.</div>"
          : Object.entries(m.outcome_categories_breakdown).map(([k, v]) => `
            <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px dashed var(--border);">
              <span style="color:var(--text-muted);">${k}:</span>
              <span style="font-weight:700; color:#34d399;">${v}</span>
            </div>
          `).join("");
      } catch (e) {
        console.error(e);
      }
    }

    async function resetStore() {
      if (confirm("Reset demonstration cases to standard seed state?")) {
        await fetch("/api/v1/interventions/reset", { method: "POST" });
        alert("Store reset to initial demonstration state.");
        await loadBoardCases();
        await loadCohortMetrics();
      }
    }

    window.onload = init;
  </script>
</body>
</html>
"""

@router.get("/demo", response_class=HTMLResponse, summary="SUTRA Interactive Demonstration UI")
@router.get("/interventions/ui", response_class=HTMLResponse, summary="SUTRA Intervention Dashboard")
def get_demo_ui():
    """Serves the complete single-page demonstration interface."""
    return HTMLResponse(content=DEMO_HTML, status_code=200)
