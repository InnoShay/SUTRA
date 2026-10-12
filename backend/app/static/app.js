/**
 * SUTRA — Phase 4 Frontend Logic: Advisor Review & Support Evidence Ledger
 */

// Application State
const state = {
  activePersona: "ADV-MAIN-01",
  activeCaseId: null,
  activeDetail: null,
  activeView: "queue",
  pendingDecisionKind: null,
  activeDraftId: null,
  activeStructuredDraft: null,
};

// Helper: HTTP API request with authorization header
async function apiRequest(endpoint, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer demo-token-${state.activePersona}`,
    ...(options.headers || {}),
  };

  const response = await fetch(endpoint, { ...options, headers });
  if (!response.ok) {
    let errMsg = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData.detail) errMsg = errData.detail;
    } catch (_) {}
    throw new Error(errMsg);
  }
  return response.json();
}

// Banner Utility
function showBanner(message, type = "info") {
  const banner = document.getElementById("status-banner");
  banner.style.display = "block";
  const alertClass = type === "error" ? "alert-rose" : (type === "success" ? "alert-emerald" : "alert-cyan");
  banner.className = `alert-box ${alertClass}`;
  banner.innerHTML = `<span>${message}</span>`;
  setTimeout(() => {
    banner.style.display = "none";
  }, 6000);
}

// Navigation View Switcher
function switchView(viewName) {
  state.activeView = viewName;
  document.querySelectorAll(".view-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  document.getElementById("view-queue").style.display = viewName === "queue" ? "block" : "none";
  document.getElementById("view-detail").style.display = viewName === "detail" ? "block" : "none";
  document.getElementById("view-timeline").style.display = viewName === "timeline" ? "block" : "none";
  const viewCohort = document.getElementById("view-cohort");
  if (viewCohort) viewCohort.style.display = viewName === "cohort" ? "block" : "none";

  if (viewName === "queue") {
    loadQueue();
  } else if (viewName === "cohort") {
    loadCohortAnalytics();
  } else if (state.activeCaseId) {
    if (viewName === "detail") renderCaseDetail();
    if (viewName === "timeline") renderLedgerAndTasks();
  }
}

// Format Date Utility
function formatDate(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch (_) {
    return isoStr;
  }
}

// ============================================================================
// SCREEN A: REVIEW QUEUE
// ============================================================================

async function loadQueue() {
  const tbody = document.getElementById("queue-tbody");
  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">Loading cases...</td></tr>`;

  try {
    const statusFilter = document.getElementById("queue-status-filter").value;
    const url = statusFilter ? `/api/v1/cases?status=${encodeURIComponent(statusFilter)}` : `/api/v1/cases`;
    const cases = await apiRequest(url);

    // Update campus badge
    const personaSelect = document.getElementById("persona-select");
    const selectedOption = personaSelect.options[personaSelect.selectedIndex].text;
    document.getElementById("queue-campus-badge").textContent = selectedOption.includes("REMOTE") ? "CAMPUS-REMOTE" : (selectedOption.includes("Admin") ? "ALL CAMPUSES" : "CAMPUS-MAIN");

    if (!cases || cases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No cases currently available in this queue. Click "Seed Demo Case" to initialize a synthetic student case.</td></tr>`;
      return;
    }

    tbody.innerHTML = cases.map(c => {
      const riskTierClass = c.risk_tier === "HIGH" ? "badge-high" : (c.risk_tier === "ELEVATED" ? "badge-elevated" : "badge-low");
      const statusClass = c.status === "APPROVED" ? "badge-approved" : (c.status === "REJECTED" ? "badge-rejected" : (c.status === "INFORMATION_REQUESTED" ? "badge-info-req" : "badge-draft"));
      const gateBadge = c.validation_passed ? `<span class="badge badge-pass">&check; PASS</span>` : `<span class="badge badge-fail">&times; FAIL</span>`;

      return `
        <tr>
          <td>
            <strong style="font-family: var(--font-mono); color: var(--text-primary);">${c.case_id}</strong><br>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${c.record_id}</span>
          </td>
          <td><span style="font-size: 0.8rem;">${c.campus_id}</span></td>
          <td><span class="badge ${riskTierClass}">${c.risk_tier}</span></td>
          <td><strong style="font-family: var(--font-mono); font-size: 0.85rem;">${c.risk_probability.toFixed(4)}</strong></td>
          <td>${gateBadge}</td>
          <td><span class="badge ${c.challenge_flags_count > 0 ? 'badge-elevated' : 'badge-pass'}">${c.challenge_flags_count} Flags</span></td>
          <td><span class="badge ${statusClass}">${c.status}</span></td>
          <td><span style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(c.updated_at)}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="selectCase('${c.case_id}')">
              Review
            </button>
          </td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--accent-rose); padding: 2rem;">Error loading queue: ${err.message}</td></tr>`;
  }
}

// Select case and transition to Screen B
async function selectCase(caseId) {
  state.activeCaseId = caseId;
  document.getElementById("nav-detail-btn").disabled = false;
  document.getElementById("nav-timeline-btn").disabled = false;

  try {
    const detail = await apiRequest(`/api/v1/cases/${caseId}`);
    state.activeDetail = detail;
    switchView("detail");
  } catch (err) {
    showBanner(`Failed to load case ${caseId}: ${err.message}`, "error");
  }
}

// ============================================================================
// SCREEN B: CASE REVIEW & EVIDENCE
// ============================================================================

function renderCaseDetail() {
  const d = state.activeDetail;
  if (!d) return;

  // Header banner
  document.getElementById("detail-case-id").textContent = d.case.case_id;
  document.getElementById("detail-record-id").textContent = d.case.record_id;
  document.getElementById("detail-campus-id").textContent = d.case.campus_id;

  const statusBadge = document.getElementById("detail-status-badge");
  statusBadge.textContent = d.case.status;
  statusBadge.className = `badge ${d.case.status === 'APPROVED' ? 'badge-approved' : (d.case.status === 'REJECTED' ? 'badge-rejected' : 'badge-draft')}`;

  document.getElementById("detail-plan-version-badge").textContent = `Plan v${d.case.current_plan_version}`;

  // Panel 1: ML Evidence Card
  const card = d.evidence_card;
  document.getElementById("card-risk-prob").textContent = card.risk_probability.toFixed(4);
  document.getElementById("card-threshold").textContent = card.operational_threshold.toFixed(2);
  const tierBadge = document.getElementById("card-risk-tier-badge");
  tierBadge.textContent = `${card.risk_tier} RISK`;
  tierBadge.className = `badge ${card.risk_tier === 'HIGH' ? 'badge-high' : 'badge-moderate'}`;

  const driversList = document.getElementById("card-drivers-list");
  if (card.top_risk_drivers && card.top_risk_drivers.length > 0) {
    driversList.innerHTML = card.top_risk_drivers.map(drv => `
      <div class="factor-item">
        <div class="factor-desc">
          <strong>${drv.factor_title}</strong>: ${drv.observed_raw_value}<br>
          <span style="color: var(--text-muted); font-size: 0.75rem;">${drv.plain_english_summary}</span>
        </div>
        <div class="factor-weight pos">+${drv.contribution_weight.toFixed(2)}</div>
      </div>
    `).join("");
  } else {
    driversList.innerHTML = `<span style="font-size: 0.8rem; color: var(--text-muted);">No dominant risk drivers.</span>`;
  }

  // Panel 2: Agent 1 Signal Interpretation
  const interp = d.signal_interpretation;
  if (interp) {
    document.getElementById("agent1-summary").textContent = interp.summary;
    document.getElementById("agent1-velocity").textContent = interp.velocity_assessment;

    const citContainer = document.getElementById("agent1-citations");
    if (interp.evidence_references && interp.evidence_references.length > 0) {
      citContainer.innerHTML = interp.evidence_references.map(c => `
        <div style="font-size: 0.775rem; background: rgba(0,0,0,0.25); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); margin-bottom: 0.35rem;">
          <span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600;">${c.feature_name} = ${c.cited_value}</span>
          ${c.rationale ? `<span style="color: var(--text-secondary);"> &mdash; ${c.rationale}</span>` : ''}
        </div>
      `).join("");
    } else {
      citContainer.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted);">None</span>`;
    }

    const infoReqContainer = document.getElementById("agent1-info-requests-container");
    if (interp.information_requests && interp.information_requests.length > 0) {
      infoReqContainer.style.display = "block";
      document.getElementById("agent1-info-requests").innerHTML = interp.information_requests.map(q => `<li>${q}</li>`).join("");
    } else {
      infoReqContainer.style.display = "none";
    }
  }

  // Panel 3: Agent 2 Intervention Proposal
  const prop = d.intervention_proposal;
  if (prop) {
    document.getElementById("agent2-intervention-id").textContent = prop.selected_intervention_id;
    document.getElementById("agent2-target-role").textContent = prop.target_role;
    document.getElementById("agent2-rationale").textContent = prop.rationale;
    document.getElementById("agent2-alternatives").textContent = prop.alternative_intervention_ids?.join(", ") || "None";
  }

  // Panel 4: Agent 3 Support Plan
  const currentPlan = d.current_plan;
  if (currentPlan) {
    document.getElementById("agent3-plan-title").textContent = currentPlan.plan_title;
    document.getElementById("agent3-target-window").textContent = currentPlan.target_window_days;
    const planBadge = document.getElementById("agent3-plan-status-badge");
    if (currentPlan.is_advisor_modified) {
      planBadge.textContent = `ADVISOR MODIFIED (v${currentPlan.version_number})`;
      planBadge.className = "badge badge-approved";
    } else {
      planBadge.textContent = `ORIGINAL DRAFT (v${currentPlan.version_number})`;
      planBadge.className = "badge badge-draft";
    }

    const stepsTbody = document.getElementById("agent3-steps-tbody");
    stepsTbody.innerHTML = (currentPlan.action_steps || []).map(step => `
      <tr>
        <td><strong>${step.step_number}</strong></td>
        <td>${step.action_description}</td>
        <td><span class="badge badge-moderate">${step.suggested_role}</span></td>
        <td><strong>${step.target_days}d</strong></td>
      </tr>
    `).join("");

    const reqList = document.getElementById("agent3-requirements");
    reqList.innerHTML = (currentPlan.evidence_requirements || []).map(r => `<li>${r}</li>`).join("") || "<li>Standard advisor check-in notes</li>";
  }

  // Panel 5: Gate Validation & Advisory Challenge
  const valSummary = d.validation_summary;
  const gateBadge = document.getElementById("val-gate-badge");
  gateBadge.textContent = valSummary.passed ? "PASSED" : "FAILED";
  gateBadge.className = `badge ${valSummary.passed ? 'badge-pass' : 'badge-fail'}`;

  const findingsList = document.getElementById("val-findings-list");
  if (valSummary.findings && valSummary.findings.length > 0) {
    findingsList.innerHTML = valSummary.findings.map(f => `
      <div style="color: ${f.severity === 'ERROR' ? 'var(--accent-rose)' : 'var(--accent-amber)'}; margin-bottom: 0.25rem;">
        &bull; <strong>${f.code}</strong>: ${f.message} (${f.field})
      </div>
    `).join("");
  } else {
    findingsList.innerHTML = `<span style="color: var(--accent-emerald);">&check; All required deterministic schema, catalog, and numerical boundary checks passed.</span>`;
  }

  const chal = d.evidence_challenge;
  if (chal) {
    document.getElementById("agent4-flags-badge").textContent = `${chal.flags_count} Advisory Flags`;
    document.getElementById("agent4-summary").textContent = chal.critique_summary;
    const chalList = document.getElementById("agent4-findings-list");
    if (chal.findings && chal.findings.length > 0) {
      chalList.innerHTML = chal.findings.map(f => `
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 0.5rem; margin-bottom: 0.35rem; font-size: 0.775rem;">
          <span class="badge badge-elevated">${f.severity}</span>
          <strong style="margin-left: 0.35rem; color: var(--text-primary);">${f.target}:</strong>
          <span style="color: var(--text-secondary);">${f.reason}</span>
        </div>
      `).join("");
    } else {
      chalList.innerHTML = `<span style="font-size: 0.75rem; color: var(--text-muted);">No advisory challenge flags raised.</span>`;
    }
  }

  // Load Phase 5 Communication Drafting
  loadCommunicationTemplatesAndDrafts(d.case.case_id);
}

// ============================================================================
// AGENT 5: STAKEHOLDER COMMUNICATION DRAFTING
// ============================================================================

async function loadCommunicationTemplatesAndDrafts(caseId) {
  const d = state.activeDetail;
  const isApproved = d && ['APPROVED', 'IN_PROGRESS', 'TASKS_COMPLETED'].includes(d.case.status);

  const unapprovedNotice = document.getElementById("comm-plan-unapproved-notice");
  const drafterControls = document.getElementById("comm-drafter-controls");
  const draftEditor = document.getElementById("comm-draft-editor");

  if (!isApproved) {
    if (unapprovedNotice) unapprovedNotice.style.display = "block";
    if (drafterControls) drafterControls.style.display = "none";
    if (draftEditor) draftEditor.style.display = "none";
  } else {
    if (unapprovedNotice) unapprovedNotice.style.display = "none";
    if (drafterControls) drafterControls.style.display = "grid";

    // Load available templates if not loaded
    const select = document.getElementById("comm-template-select");
    if (select && select.children.length === 0) {
      try {
        const templates = await apiRequest(`/api/v1/cases/${caseId}/communication-templates`);
        select.innerHTML = templates.map(t => `<option value="${t.template_id}">${t.template_name} (${t.purpose})</option>`).join("");
      } catch (err) {
        console.error("Failed loading communication templates:", err);
      }
    }
  }

  // Load past drafts
  try {
    const drafts = await apiRequest(`/api/v1/cases/${caseId}/communication-drafts`);
    const list = document.getElementById("comm-past-drafts-list");
    if (list) {
      if (!drafts || drafts.length === 0) {
        list.innerHTML = `<p style="font-size: 0.8rem; color: var(--text-muted);">No communication drafts for this case yet.</p>`;
      } else {
        list.innerHTML = drafts.map(draft => `
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.65rem; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="display: flex; gap: 0.4rem; align-items: center; margin-bottom: 0.2rem;">
                <span class="badge ${draft.human_review_status === 'APPROVED_FOR_USE' ? 'badge-pass' : (draft.human_review_status === 'DISCARDED' ? 'badge-fail' : 'badge-draft')}">${draft.human_review_status}</span>
                <strong style="font-size: 0.8rem; color: var(--text-primary);">${draft.subject || draft.template_id}</strong>
                <span style="font-size: 0.7rem; color: var(--accent-indigo);">&bull; Role: ${draft.intended_role}</span>
              </div>
              <p style="font-size: 0.75rem; color: var(--text-secondary); max-width: 580px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${draft.message_body}</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="loadDraftIntoEditor('${draft.draft_id}')">View / Edit</button>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("Failed loading drafts:", err);
  }
}

window.loadDraftIntoEditor = async function(draftId) {
  try {
    const draft = await apiRequest(`/api/v1/cases/${state.activeCaseId}/communication-drafts/${draftId}`);
    state.activeDraftId = draft.draft_id;

    document.getElementById("comm-draft-id-display").textContent = draft.draft_id;
    document.getElementById("comm-draft-subject").value = draft.subject || "";
    document.getElementById("comm-draft-body").value = draft.message_body || "";
    document.getElementById("comm-draft-role-badge").textContent = `ROLE: ${draft.intended_role}`;

    const statusBadge = document.getElementById("comm-draft-status-badge");
    statusBadge.textContent = draft.human_review_status;
    statusBadge.className = `badge ${draft.human_review_status === 'APPROVED_FOR_USE' ? 'badge-pass' : (draft.human_review_status === 'DISCARDED' ? 'badge-fail' : 'badge-draft')}`;

    const refsList = document.getElementById("comm-draft-references");
    if (draft.grounded_plan_step_refs && draft.grounded_plan_step_refs.length > 0) {
      refsList.innerHTML = draft.grounded_plan_step_refs.map(r => `<li>${r}</li>`).join("");
    } else {
      refsList.innerHTML = `<li>Approved Plan v${state.activeDetail.case.current_plan_version}</li>`;
    }

    document.getElementById("comm-draft-editor").style.display = "block";
  } catch (err) {
    showBanner(`Failed to load draft: ${err.message}`, "error");
  }
};

async function generateCommunicationDraft() {
  const templateId = document.getElementById("comm-template-select").value;
  const intendedRole = document.getElementById("comm-role-select").value;

  if (!state.activeCaseId) return;

  try {
    showBanner("Agent 5 is formulating role-tailored draft anchored to approved plan...", "info");
    const draft = await apiRequest(`/api/v1/cases/${state.activeCaseId}/communication-drafts`, {
      method: "POST",
      body: JSON.stringify({
        template_id: templateId,
        intended_role: intendedRole,
      }),
    });

    showBanner("Agent 5 communication draft formulated. Awaiting human review.", "success");
    await loadCommunicationTemplatesAndDrafts(state.activeCaseId);
    window.loadDraftIntoEditor(draft.draft_id);
  } catch (err) {
    showBanner(`Drafting failed: ${err.message}`, "error");
  }
}

async function saveCommunicationDraft() {
  if (!state.activeDraftId) return;
  const subject = document.getElementById("comm-draft-subject").value.trim();
  const body = document.getElementById("comm-draft-body").value.trim();

  try {
    await apiRequest(`/api/v1/cases/${state.activeCaseId}/communication-drafts/${state.activeDraftId}`, {
      method: "PATCH",
      body: JSON.stringify({
        subject: subject,
        message_body: body,
      }),
    });
    showBanner("Communication draft changes saved successfully.", "success");
    await loadCommunicationTemplatesAndDrafts(state.activeCaseId);
  } catch (err) {
    showBanner(`Failed to save draft: ${err.message}`, "error");
  }
}

async function approveCommunicationDraft() {
  if (!state.activeDraftId) return;
  const subject = document.getElementById("comm-draft-subject").value.trim();
  const body = document.getElementById("comm-draft-body").value.trim();

  try {
    await apiRequest(`/api/v1/cases/${state.activeCaseId}/communication-drafts/${state.activeDraftId}`, {
      method: "PATCH",
      body: JSON.stringify({
        subject: subject,
        message_body: body,
        review_status: "APPROVED_FOR_USE",
        review_notes: "Advisor approved draft for stakeholder engagement guidance.",
      }),
    });
    showBanner("Draft approved for advisor reference. (No external message sent).", "success");
    await loadCommunicationTemplatesAndDrafts(state.activeCaseId);
    window.loadDraftIntoEditor(state.activeDraftId);
  } catch (err) {
    showBanner(`Failed to approve draft: ${err.message}`, "error");
  }
}

async function discardCommunicationDraft() {
  if (!state.activeDraftId) return;

  try {
    await apiRequest(`/api/v1/cases/${state.activeCaseId}/communication-drafts/${state.activeDraftId}`, {
      method: "PATCH",
      body: JSON.stringify({
        review_status: "DISCARDED",
        review_notes: "Advisor discarded draft.",
      }),
    });
    showBanner("Draft marked as discarded.", "info");
    await loadCommunicationTemplatesAndDrafts(state.activeCaseId);
    window.loadDraftIntoEditor(state.activeDraftId);
  } catch (err) {
    showBanner(`Failed to discard draft: ${err.message}`, "error");
  }
}

// ============================================================================
// SCREEN C: ADVISOR DECISION ACTIONS
// ============================================================================

function openDecisionModal(kind) {
  state.pendingDecisionKind = kind;
  const modal = document.getElementById("modal-decision");
  const title = document.getElementById("decision-modal-title");
  const desc = document.getElementById("decision-modal-desc");
  const modContainer = document.getElementById("modify-plan-container");
  const notes = document.getElementById("decision-notes-input");

  notes.value = "";
  modContainer.style.display = kind === "MODIFY" ? "flex" : "none";

  if (kind === "APPROVE") {
    title.textContent = "Approve Proposed Support Plan";
    desc.textContent = "Approving this plan will atomically commit the decision and create actionable support tasks assigned to the specified catalog roles.";
    notes.placeholder = "e.g., Reviewed ML evidence card and agreed with proactive digital onboarding outreach.";
  } else if (kind === "MODIFY") {
    title.textContent = "Modify Support Plan & Approve";
    desc.textContent = "Provide customized action steps. A new versioned plan (v2+) will be created and linked to this decision while preserving the original AI draft.";
    notes.placeholder = "e.g., Shortened outreach target window to 2 days for urgent attendance support.";
  } else if (kind === "REJECT") {
    title.textContent = "Reject Proposed Support Plan";
    desc.textContent = "Rejecting this proposal halts plan execution and creates no tasks. Document the clinical or administrative reason.";
    notes.placeholder = "e.g., Verified learner has already submitted assessment via alternative platform.";
  } else if (kind === "REQUEST_INFO") {
    title.textContent = "Request Additional Information";
    desc.textContent = "Places case on hold while advisor or module tutor gathers clarifying evidence.";
    notes.placeholder = "e.g., Waiting for response on external caregiving commitments.";
  }

  modal.classList.add("open");
}

async function submitDecision() {
  const d = state.activeDetail;
  if (!d) return;

  const kind = state.pendingDecisionKind;
  const notes = document.getElementById("decision-notes-input").value.trim();

  if (!notes) {
    alert("Decision notes and documented rationale are strictly mandatory.");
    return;
  }

  const payload = {
    decision_kind: kind,
    reviewed_plan_version: d.case.current_plan_version,
    notes: notes,
    idempotency_key: `IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };

  if (kind === "MODIFY") {
    const title = document.getElementById("mod-plan-title").value.trim();
    const days = parseInt(document.getElementById("mod-plan-days").value, 10);
    const step1Desc = document.getElementById("mod-step1-desc").value.trim();
    const step1Role = document.getElementById("mod-step1-role").value;

    payload.modified_plan = {
      plan_title: title,
      target_window_days: days,
      is_draft: false,
      rationale: notes,
      action_steps: [
        {
          step_number: 1,
          step_id: "MOD-STEP-1",
          action_description: step1Desc,
          suggested_role: step1Role,
          target_days: Math.min(days, 5),
          follow_up_evidence: "Advisor verified direct contact note",
        }
      ],
      evidence_requirements: ["Advisor contact verification note"],
      limitations_and_questions: [],
    };
  }

  try {
    const updated = await apiRequest(`/api/v1/cases/${d.case.case_id}/decision`, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    state.activeDetail = updated;
    document.getElementById("modal-decision").classList.remove("open");
    showBanner(`Decision ${kind} committed successfully.`, "success");
    renderCaseDetail();
    switchView("timeline");
  } catch (err) {
    alert(`Failed to commit decision: ${err.message}`);
  }
}

// ============================================================================
// SCREEN D: LEDGER TIMELINE & TASKS
// ============================================================================

function renderLedgerAndTasks() {
  const d = state.activeDetail;
  if (!d) return;

  // 1. Tasks
  const tasksTbody = document.getElementById("tasks-tbody");
  document.getElementById("tasks-count-badge").textContent = `${d.tasks.length} Tasks`;

  if (!d.tasks || d.tasks.length === 0) {
    tasksTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No tasks created yet. Plan must be approved by an authorized advisor first.</td></tr>`;
  } else {
    tasksTbody.innerHTML = d.tasks.map(t => {
      const isDone = t.status === "COMPLETED";
      const statusBadge = isDone ? `<span class="badge badge-pass">COMPLETED</span>` : `<span class="badge badge-elevated">${t.status}</span>`;
      return `
        <tr>
          <td><strong>#${t.step_number}</strong></td>
          <td><code style="font-size: 0.75rem;">${t.task_id}</code></td>
          <td>${t.action_description}</td>
          <td><span class="badge badge-moderate">${t.assigned_role}</span></td>
          <td>${t.target_days}d</td>
          <td>${statusBadge}</td>
          <td><span style="font-size: 0.75rem; color: var(--text-secondary);">${t.completion_note || '—'}</span></td>
          <td>
            ${!isDone ? `<button class="btn btn-primary btn-sm" onclick="openTaskModal('${t.task_id}')">Update</button>` : `<span style="font-size: 0.75rem; color: var(--accent-emerald);">&check; Done</span>`}
          </td>
        </tr>
      `;
    }).join("");
  }

  // 2. Follow-ups
  const fuList = document.getElementById("followup-list");
  if (d.follow_ups && d.follow_ups.length > 0) {
    fuList.innerHTML = d.follow_ups.map(fu => {
      let actions = [];
      let obs = [];
      let stmts = [];
      let refs = [];
      let qns = [];

      try { if (fu.reported_actions_json) actions = JSON.parse(fu.reported_actions_json); } catch(_) {}
      try { if (fu.staff_observations_json) obs = JSON.parse(fu.staff_observations_json); } catch(_) {}
      try { if (fu.student_statements_json) stmts = JSON.parse(fu.student_statements_json); } catch(_) {}
      try { if (fu.evidence_refs_json) refs = JSON.parse(fu.evidence_refs_json); } catch(_) {}
      try { if (fu.unresolved_questions_json) qns = JSON.parse(fu.unresolved_questions_json); } catch(_) {}

      const isStructured = Boolean(fu.is_structured);

      return `
      <div style="background: rgba(0,0,0,0.25); border: 1px solid ${isStructured ? 'rgba(139, 92, 246, 0.4)' : 'var(--border-subtle)'}; border-radius: var(--radius-sm); padding: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem;">
          <div>
            <strong>${fu.actor_id}</strong> (${fu.actor_role})
            <span class="badge" style="margin-left: 0.5rem; ${isStructured ? 'background: rgba(139, 92, 246, 0.2); color: #c4b5fd;' : 'background: rgba(255,255,255,0.08); color: var(--text-secondary);'}">
              ${isStructured ? 'STRUCTURED &amp; CONFIRMED' : 'RAW NOTE'}
            </span>
          </div>
          <span>${formatDate(fu.created_at)}</span>
        </div>

        <p style="font-size: 0.825rem; color: var(--text-primary); margin-bottom: 0.35rem;">${fu.observation_note}</p>

        ${isStructured ? `
          <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid var(--border-subtle); font-size: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem;">
            ${actions.length ? `<div><span style="color: var(--accent-emerald); font-weight: 600;">Reported Actions:</span> ${actions.join('; ')}</div>` : ''}
            ${obs.length ? `<div><span style="color: var(--accent-cyan); font-weight: 600;">Staff Observations:</span> ${obs.join('; ')}</div>` : ''}
            ${stmts.length ? `<div><span style="color: var(--accent-amber); font-weight: 600;">Student Statements:</span> ${stmts.join('; ')}</div>` : ''}
            ${refs.length ? `<div><span style="color: var(--text-muted); font-weight: 600;">Evidence Refs:</span> ${refs.join('; ')}</div>` : ''}
            ${qns.length ? `<div><span style="color: var(--accent-rose); font-weight: 600;">Unresolved Questions:</span> ${qns.join('; ')}</div>` : ''}
          </div>
        ` : ''}

        ${fu.evidence_reference ? `<span style="font-size: 0.7rem; color: var(--accent-cyan); font-family: var(--font-mono); display: inline-block; margin-top: 0.25rem;">Ref: ${fu.evidence_reference}</span>` : ''}
      </div>
      `;
    }).join("");
  } else {
    fuList.innerHTML = `<p style="font-size: 0.825rem; color: var(--text-muted);">No follow-up observation notes recorded.</p>`;
  }

  // 3. Outcome
  const outBadge = document.getElementById("outcome-status-display");
  outBadge.textContent = d.case.outcome_status;
  outBadge.className = `badge ${d.case.outcome_status === 'RECORDED' ? 'badge-pass' : 'badge-draft'}`;
  document.getElementById("outcome-summary-display").textContent = d.case.outcome_summary || "No subsequent academic course assessment available yet.";
  document.getElementById("outcome-time-display").textContent = formatDate(d.case.outcome_recorded_at);
  document.getElementById("outcome-by-display").textContent = d.case.outcome_recorded_by || "—";

  // 4. Chronological Audit Ledger
  const timeline = document.getElementById("ledger-timeline");
  if (!d.audit_events || d.audit_events.length === 0) {
    timeline.innerHTML = `<p style="color: var(--text-muted);">Audit ledger empty.</p>`;
    return;
  }

  timeline.innerHTML = d.audit_events.map(evt => {
    let payloadSummary = "";
    try {
      const p = JSON.parse(evt.payload_canonical_json);
      payloadSummary = Object.entries(p).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(" | ");
    } catch (_) {
      payloadSummary = evt.payload_canonical_json;
    }

    return `
      <div class="timeline-item">
        <div class="timeline-node"></div>
        <div class="timeline-header">
          <span>Seq #${evt.seq_id} &bull; <strong>${evt.event_type}</strong></span>
          <span>${formatDate(evt.timestamp)}</span>
        </div>
        <div class="timeline-title">${evt.event_type.replace(/_/g, ' ')}</div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">
          Actor: <strong style="color: var(--text-primary);">${evt.actor_id}</strong> (${evt.actor_role})
        </p>
        <p style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.25rem; font-family: var(--font-mono); word-break: break-all;">
          ${payloadSummary}
        </p>
        <div class="timeline-hashes">
          <span>Prev: <code>${evt.prev_entry_hash.substring(0, 10)}...</code></span>
          <span>Hash: <code>${evt.entry_hash.substring(0, 10)}...</code></span>
        </div>
      </div>
    `;
  }).join("");
}

// Open Task Completion Modal
function openTaskModal(taskId) {
  document.getElementById("task-modal-id").value = taskId;
  document.getElementById("task-modal-note").value = "";
  document.getElementById("modal-task-complete").classList.add("open");
}

// Save Task Status
async function submitTaskUpdate() {
  const taskId = document.getElementById("task-modal-id").value;
  const newStatus = document.getElementById("task-modal-status").value;
  const note = document.getElementById("task-modal-note").value.trim();

  try {
    await apiRequest(`/api/v1/tasks/${taskId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus, completion_note: note }),
    });

    document.getElementById("modal-task-complete").classList.remove("open");
    showBanner(`Task ${taskId} status updated.`, "success");
    // Reload case
    const updated = await apiRequest(`/api/v1/cases/${state.activeCaseId}`);
    state.activeDetail = updated;
    renderLedgerAndTasks();
  } catch (err) {
    alert(`Failed to update task: ${err.message}`);
  }
}

// Submit Follow-up
async function submitFollowup() {
  const note = document.getElementById("followup-note-input").value.trim();
  const ref = document.getElementById("followup-ref-input").value.trim() || null;

  if (!note) {
    alert("Follow-up note is mandatory.");
    return;
  }

  try {
    await apiRequest(`/api/v1/cases/${state.activeCaseId}/follow-up`, {
      method: "POST",
      body: JSON.stringify({ observation_note: note, evidence_reference: ref }),
    });

    document.getElementById("modal-followup").classList.remove("open");
    showBanner("Follow-up observation recorded.", "success");
    const updated = await apiRequest(`/api/v1/cases/${state.activeCaseId}`);
    state.activeDetail = updated;
    renderLedgerAndTasks();
  } catch (err) {
    alert(`Failed to record follow-up: ${err.message}`);
  }
}

// ============================================================================
// AGENT 6: FOLLOW-UP NOTE STRUCTURING & CONFIRMATION
// ============================================================================

async function structureFollowupNote() {
  const rawNote = document.getElementById("followup-note-input").value.trim();
  if (!rawNote) {
    alert("Please enter a follow-up interaction note first.");
    return;
  }

  try {
    showBanner("Agent 6 is structuring interaction note into provenance categories...", "info");
    const draft = await apiRequest(`/api/v1/cases/${state.activeCaseId}/follow-ups/structure-note`, {
      method: "POST",
      body: JSON.stringify({ raw_note: rawNote }),
    });

    state.activeStructuredDraft = draft;
    document.getElementById("agent6-draft-id").textContent = draft.draft_id;

    const renderList = (id, items) => {
      const el = document.getElementById(id);
      if (items && items.length > 0) {
        el.innerHTML = items.map(item => `<li>${item}</li>`).join("");
      } else {
        el.innerHTML = `<li style="color: var(--text-muted); font-style: italic;">None reported</li>`;
      }
    };

    renderList("agent6-reported-actions", draft.reported_actions_taken);
    renderList("agent6-staff-observations", draft.staff_observations);
    renderList("agent6-student-statements", draft.attributed_student_statements);
    renderList("agent6-evidence-refs", draft.documented_evidence_references);
    renderList("agent6-unresolved-questions", draft.unresolved_questions_or_concerns);

    const outcomeBox = document.getElementById("agent6-outcome-evidence-box");
    if (draft.potential_outcome_evidence) {
      document.getElementById("agent6-outcome-evidence-text").textContent = draft.potential_outcome_evidence;
      outcomeBox.style.display = "block";
    } else {
      outcomeBox.style.display = "none";
    }

    document.getElementById("agent6-structured-preview").style.display = "block";
    showBanner("Agent 6 structured note draft ready. Please review before confirmation.", "success");
  } catch (err) {
    showBanner(`Structuring failed: ${err.message}`, "error");
  }
}

async function confirmStructuredNote() {
  if (!state.activeStructuredDraft) return;

  try {
    await apiRequest(`/api/v1/cases/${state.activeCaseId}/follow-ups/confirm-structured`, {
      method: "POST",
      body: JSON.stringify({
        draft_id: state.activeStructuredDraft.draft_id,
        reported_actions_taken: state.activeStructuredDraft.reported_actions_taken,
        staff_observations: state.activeStructuredDraft.staff_observations,
        attributed_student_statements: state.activeStructuredDraft.attributed_student_statements,
        documented_evidence_references: state.activeStructuredDraft.documented_evidence_references,
        unresolved_questions_or_concerns: state.activeStructuredDraft.unresolved_questions_or_concerns,
        confirmation_notes: "Human confirmed Agent 6 structured breakdown.",
      }),
    });

    document.getElementById("modal-followup").classList.remove("open");
    document.getElementById("followup-note-input").value = "";
    document.getElementById("followup-ref-input").value = "";
    document.getElementById("agent6-structured-preview").style.display = "none";
    state.activeStructuredDraft = null;

    showBanner("Structured follow-up confirmed to Support Evidence Ledger. Student course outcome remains UNOBSERVED.", "success");
    const updated = await apiRequest(`/api/v1/cases/${state.activeCaseId}`);
    state.activeDetail = updated;
    renderLedgerAndTasks();
  } catch (err) {
    showBanner(`Confirmation failed: ${err.message}`, "error");
  }
}

async function rejectStructuredNote() {
  if (!state.activeStructuredDraft) return;

  try {
    await apiRequest(`/api/v1/cases/${state.activeCaseId}/follow-ups/reject-structured`, {
      method: "POST",
      body: JSON.stringify({
        draft_id: state.activeStructuredDraft.draft_id,
        rejection_reason: "Advisor opted not to record AI structuring.",
      }),
    });

    document.getElementById("agent6-structured-preview").style.display = "none";
    state.activeStructuredDraft = null;
    showBanner("Agent 6 structured draft rejected. You may edit the note or record raw text.", "info");
  } catch (err) {
    showBanner(`Rejection failed: ${err.message}`, "error");
  }
}

// Submit Outcome
async function submitOutcome() {
  const statusVal = document.getElementById("outcome-status-input").value;
  const summary = document.getElementById("outcome-summary-input").value.trim();

  if (!summary) {
    alert("Outcome summary is mandatory.");
    return;
  }

  try {
    await apiRequest(`/api/v1/cases/${state.activeCaseId}/outcome`, {
      method: "POST",
      body: JSON.stringify({ outcome_status: statusVal, outcome_summary: summary }),
    });

    document.getElementById("modal-outcome").classList.remove("open");
    showBanner("Student course outcome recorded.", "success");
    const updated = await apiRequest(`/api/v1/cases/${state.activeCaseId}`);
    state.activeDetail = updated;
    renderLedgerAndTasks();
  } catch (err) {
    alert(`Failed to record outcome: ${err.message}`);
  }
}

// Seed Synthetic Case
async function submitSeed() {
  const scenarioName = document.getElementById("seed-scenario-select").value;
  const btn = document.getElementById("btn-submit-seed");
  btn.disabled = true;
  btn.textContent = "Running ML & Pipeline...";

  try {
    const detail = await apiRequest(`/api/v1/cases/seed`, {
      method: "POST",
      body: JSON.stringify({ scenario_name: scenarioName }),
    });

    document.getElementById("modal-seed").classList.remove("open");
    showBanner(`Synthetic case ${detail.case.case_id} seeded successfully with authentic ML inference!`, "success");
    state.activeCaseId = detail.case.case_id;
    state.activeDetail = detail;
    document.getElementById("nav-detail-btn").disabled = false;
    document.getElementById("nav-timeline-btn").disabled = false;
    switchView("detail");
  } catch (err) {
    alert(`Seeding failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = "Run Pipeline & Seed Case";
  }
}

// Audit Verification
async function runAuditVerification(caseId = null) {
  const modal = document.getElementById("modal-audit-result");
  const content = document.getElementById("audit-verification-content");
  content.innerHTML = `<p style="color: var(--text-muted);">Verifying cryptographic SHA-256 hash chain...</p>`;
  modal.classList.add("open");

  try {
    const url = caseId ? `/api/v1/audit/verify?case_id=${caseId}` : `/api/v1/audit/verify`;
    const res = await apiRequest(url);

    content.innerHTML = `
      <div class="alert-box ${res.is_valid ? 'alert-emerald' : 'alert-rose'}" style="margin-bottom: 1rem;">
        <strong>${res.is_valid ? '&check; CHAIN INTEGRITY FULLY VERIFIED' : '&times; TAMPERING OR CORRUPTION DETECTED'}</strong>
      </div>
      <table class="queue-table" style="font-size: 0.85rem;">
        <tr><td><strong>Validation Result:</strong></td><td>${res.is_valid ? 'Valid (Zero Mismatches)' : 'Corrupted / Broken Link'}</td></tr>
        <tr><td><strong>Total Audit Events:</strong></td><td>${res.total_events}</td></tr>
        <tr><td><strong>Events Verified:</strong></td><td>${res.verified_events}</td></tr>
        <tr><td><strong>Corrupted Sequence ID:</strong></td><td>${res.corrupted_seq_id !== null ? res.corrupted_seq_id : 'None'}</td></tr>
        <tr><td><strong>Integrity Details:</strong></td><td>${res.message}</td></tr>
      </table>
      <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 1rem;">
        Note: The Support Evidence Ledger implements an application-level backward SHA-256 hash pointer chain and SQLite database-level triggers to detect and prevent unauthorized edits.
      </p>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color: var(--accent-rose);">Verification check failed: ${err.message}</p>`;
  }
}

// ============================================================================
// EVENT LISTENERS INITIALIZATION
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Navigation
  document.querySelectorAll(".view-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  // Persona Switcher
  const personaSelect = document.getElementById("persona-select");
  personaSelect.addEventListener("change", (e) => {
    state.activePersona = e.target.value;
    showBanner(`Switched actor to ${e.target.value}`, "info");
    if (state.activeView === "queue") loadQueue();
  });

  // Refresh Queue
  document.getElementById("btn-refresh-queue").addEventListener("click", loadQueue);
  document.getElementById("queue-status-filter").addEventListener("change", loadQueue);

  // Jump from Detail to Ledger
  document.getElementById("btn-jump-to-ledger").addEventListener("click", () => switchView("timeline"));

  // Decision Buttons (Screen C)
  document.getElementById("btn-action-approve").addEventListener("click", () => openDecisionModal("APPROVE"));
  document.getElementById("btn-action-modify").addEventListener("click", () => openDecisionModal("MODIFY"));
  document.getElementById("btn-action-reject").addEventListener("click", () => openDecisionModal("REJECT"));
  document.getElementById("btn-action-request-info").addEventListener("click", () => openDecisionModal("REQUEST_INFO"));
  document.getElementById("btn-submit-decision-confirm").addEventListener("click", submitDecision);

  // Task Actions
  document.getElementById("btn-submit-task-update").addEventListener("click", submitTaskUpdate);

  // Agent 5 Communication Drafter Listeners
  const btnGenComm = document.getElementById("btn-generate-comm-draft");
  if (btnGenComm) btnGenComm.addEventListener("click", generateCommunicationDraft);
  const btnSaveComm = document.getElementById("btn-save-comm-draft");
  if (btnSaveComm) btnSaveComm.addEventListener("click", saveCommunicationDraft);
  const btnApprComm = document.getElementById("btn-approve-comm-draft");
  if (btnApprComm) btnApprComm.addEventListener("click", approveCommunicationDraft);
  const btnDiscComm = document.getElementById("btn-discard-comm-draft");
  if (btnDiscComm) btnDiscComm.addEventListener("click", discardCommunicationDraft);

  // Follow-up & Note Intelligence (Agent 6) Actions
  document.getElementById("btn-add-followup").addEventListener("click", () => {
    document.getElementById("modal-followup").classList.add("open");
  });
  document.getElementById("btn-submit-followup").addEventListener("click", submitFollowup);

  const btnStructNote = document.getElementById("btn-structure-note");
  if (btnStructNote) btnStructNote.addEventListener("click", structureFollowupNote);
  const btnConfStruct = document.getElementById("btn-confirm-structured");
  if (btnConfStruct) btnConfStruct.addEventListener("click", confirmStructuredNote);
  const btnRejStruct = document.getElementById("btn-reject-structured");
  if (btnRejStruct) btnRejStruct.addEventListener("click", rejectStructuredNote);

  // Outcome Actions
  document.getElementById("btn-record-outcome").addEventListener("click", () => {
    document.getElementById("modal-outcome").classList.add("open");
  });
  document.getElementById("btn-submit-outcome").addEventListener("click", submitOutcome);

  // Seed Modal
  document.getElementById("btn-seed-modal").addEventListener("click", () => {
    document.getElementById("modal-seed").classList.add("open");
  });
  document.getElementById("btn-submit-seed").addEventListener("click", submitSeed);

// ============================================================================
// SCREEN E: COHORT ANALYTICS & SUPPORT EVIDENCE LEDGER EXPORT
// ============================================================================

let currentExportPackage = null;

function getActiveCohortCampus() {
  const sel = document.getElementById("cohort-campus-select");
  if (sel) return sel.value;
  if (state.activePersona === "ADV-REMOTE-02") return "CAMPUS-REMOTE";
  if (state.activePersona === "ADMIN-01") return "CAMPUS-SYSTEM";
  return "CAMPUS-MAIN";
}

async function loadCohortAnalytics() {
  const campus = getActiveCohortCampus();
  const campusBadge = document.getElementById("cohort-campus-badge");
  if (campusBadge) campusBadge.textContent = campus;

  try {
    const packet = await apiRequest(`/api/v1/cohort/analytics?campus_id=${encodeURIComponent(campus)}`);

    // Total Cases
    const mTotal = packet.metrics.find(m => m.metric_id === "M_CASE_COUNT_TOTAL");
    document.getElementById("metric-total-cases").textContent = mTotal ? mTotal.value : 0;

    // High-Risk Tier
    const mHighTier = packet.metrics.find(m => m.metric_id === "M_TIER_HIGH");
    const highRiskEl = document.getElementById("metric-high-risk-tier");
    if (mHighTier) {
      if (mHighTier.is_suppressed) {
        highRiskEl.innerHTML = `<span class="metric-suppressed-badge">SUPPRESSED (N &lt; 5)</span>`;
      } else {
        highRiskEl.textContent = mHighTier.value;
      }
    } else {
      highRiskEl.textContent = "0";
    }

    // Approved Plans
    const mApproved = packet.metrics.find(m => m.metric_id === "M_STAGE_APPROVED");
    document.getElementById("metric-approved-plans").textContent = mApproved ? mApproved.value : 0;

    // Support Tasks Total
    const mTasksTotal = packet.metrics.find(m => m.metric_id === "M_TASKS_TOTAL");
    document.getElementById("metric-total-tasks").textContent = mTasksTotal ? mTasksTotal.value : 0;

    // Task Completion Rate
    const mTaskRate = packet.metrics.find(m => m.metric_id === "M_TASK_COMPLETION_RATE");
    document.getElementById("metric-task-rate").textContent = mTaskRate ? `${mTaskRate.value}%` : "0.0%";

    // Unobserved Outcomes
    const mUnobserved = packet.metrics.find(m => m.metric_id === "M_OUTCOME_UNOBSERVED");
    document.getElementById("metric-unobserved-outcomes").textContent = mUnobserved ? mUnobserved.value : 0;

  } catch (err) {
    showBanner(`Failed to load cohort analytics: ${err.message}`, "error");
  }
}

async function generateCohortReport() {
  const campus = getActiveCohortCampus();
  const btn = document.getElementById("btn-generate-cohort-report");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `Synthesizing Narrative...`;

  try {
    const report = await apiRequest("/api/v1/cohort/report", {
      method: "POST",
      body: JSON.stringify({
        campus_id: campus,
        min_cohort_threshold: 5,
        grouping_dimension: "ALL_CAMPUS_CASES",
      }),
    });

    renderCohortReport(report);
    showBanner("Agent 7 Cohort Learning Report generated and verified successfully.", "success");
  } catch (err) {
    showBanner(`Report generation failed: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function renderCohortReport(report) {
  const card = document.getElementById("cohort-report-card");
  card.style.display = "block";

  document.getElementById("report-version-badge").textContent = `v${report.agent_version || "1.0.0"}`;
  document.getElementById("report-snapshot-badge").textContent = report.snapshot_id;
  document.getElementById("report-timestamp").textContent = formatDate(report.created_at);
  document.getElementById("report-summary-narrative").textContent = report.summary_narrative;

  // Observed Patterns
  const patternsEl = document.getElementById("report-observed-patterns");
  patternsEl.innerHTML = "";
  (report.observed_patterns || []).forEach(p => {
    const div = document.createElement("div");
    div.className = "pattern-item";
    div.innerHTML = `<span class="pattern-bullet">&bull;</span><span>${p}</span>`;
    patternsEl.appendChild(div);
  });

  // Metric Citations
  const citationsEl = document.getElementById("report-metric-citations");
  citationsEl.innerHTML = "";
  (report.metric_references || []).forEach(ref => {
    const span = document.createElement("span");
    span.className = "citation-chip";
    span.textContent = ref;
    citationsEl.appendChild(span);
  });

  // Missing Evidence
  const missingEl = document.getElementById("report-missing-evidence");
  missingEl.innerHTML = "";
  (report.missing_or_insufficient_evidence || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    missingEl.appendChild(li);
  });

  // Limitations
  const limitationsEl = document.getElementById("report-limitations");
  limitationsEl.innerHTML = "";
  (report.limitations_and_caveats || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    limitationsEl.appendChild(li);
  });

  // Review Questions
  const questionsEl = document.getElementById("report-review-questions");
  questionsEl.innerHTML = "";
  (report.institutional_review_questions || []).forEach(item => {
    const li = document.createElement("li");
    li.textContent = item;
    questionsEl.appendChild(li);
  });

  card.scrollIntoView({ behavior: "smooth" });
}

async function exportAuditLedger() {
  const campus = getActiveCohortCampus();
  const btn = document.getElementById("btn-export-audit-ledger");
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `Verifying Chain...`;

  try {
    const pkg = await apiRequest(`/api/v1/audit/export?campus_id=${encodeURIComponent(campus)}`);
    currentExportPackage = pkg;

    const card = document.getElementById("ledger-export-card");
    card.style.display = "block";

    const validityBadge = document.getElementById("export-validity-badge");
    if (pkg.is_chain_valid) {
      validityBadge.className = "badge badge-approved";
      validityBadge.textContent = "SHA-256 CHAIN VALID";
    } else {
      validityBadge.className = "badge badge-rejected";
      validityBadge.textContent = "TAMPER DETECTED";
    }

    document.getElementById("export-timestamp").textContent = formatDate(pkg.exported_at);
    document.getElementById("export-by").textContent = pkg.exported_by;
    document.getElementById("export-total-events").textContent = pkg.total_events;

    const tbody = document.getElementById("export-events-tbody");
    tbody.innerHTML = "";
    (pkg.events || []).forEach(ev => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 0.75rem;">${ev.seq_id}</td>
        <td><span class="badge badge-info" style="font-size: 0.7rem;">${ev.event_type}</span></td>
        <td style="font-family: var(--font-mono); font-size: 0.75rem;">${ev.case_id}</td>
        <td style="font-size: 0.75rem; color: var(--text-muted);">${ev.actor_id} (${ev.actor_role})</td>
        <td style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ev.prev_entry_hash}">${ev.prev_entry_hash}</td>
        <td style="font-family: var(--font-mono); font-size: 0.65rem; color: var(--accent-cyan); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${ev.entry_hash}">${ev.entry_hash}</td>
        <td style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(ev.timestamp)}</td>
      `;
      tbody.appendChild(tr);
    });

    card.scrollIntoView({ behavior: "smooth" });
    showBanner(`Export package verified: ${pkg.total_events} canonical audit events.`, "success");
  } catch (err) {
    showBanner(`Audit export failed: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

function downloadLedgerJson() {
  if (!currentExportPackage) {
    showBanner("No export package available to download.", "error");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentExportPackage, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `sutra_support_evidence_ledger_${getActiveCohortCampus()}_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

  // Audit Verification Buttons
  document.getElementById("btn-verify-audit").addEventListener("click", () => runAuditVerification());
  document.getElementById("btn-verify-timeline-audit").addEventListener("click", () => runAuditVerification(state.activeCaseId));

  // Screen E Cohort & Export Listeners
  const btnRefreshCohort = document.getElementById("btn-refresh-cohort");
  if (btnRefreshCohort) btnRefreshCohort.addEventListener("click", loadCohortAnalytics);

  const selCohortCampus = document.getElementById("cohort-campus-select");
  if (selCohortCampus) selCohortCampus.addEventListener("change", loadCohortAnalytics);

  const btnGenCohort = document.getElementById("btn-generate-cohort-report");
  if (btnGenCohort) btnGenCohort.addEventListener("click", generateCohortReport);

  const btnExportLedger = document.getElementById("btn-export-audit-ledger");
  if (btnExportLedger) btnExportLedger.addEventListener("click", exportAuditLedger);

  const btnDownloadJson = document.getElementById("btn-download-export-json");
  if (btnDownloadJson) btnDownloadJson.addEventListener("click", downloadLedgerJson);

  // Modal Closers
  document.querySelectorAll("[data-close]").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
    });
  });

  // Initial load
  loadQueue();
});
