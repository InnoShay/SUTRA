"""
SUTRA Phase Twenty-Three — Research Forecast Explorer API & Interactive Dashboard.

Serves the developer research interface at /research/explorer.
Allows interactive inspection and scoring of genuine OULAD registrations
across the frozen Day-30 and Day-60 research models (Logistic Regression & XGBoost).

GOVERNANCE SAFEGUARDS:
1. Strict research labeling: All outputs tagged with 'DEVELOPMENT_RESEARCH_ONLY'.
2. Operational prohibition: Model outputs are barred from automated student alerts or interventions.
3. No score conflation: Probability deltas explicitly documented as changes in research estimates, not causal risk shifts.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from sutra_ml.inference.research_scorer import (
    get_available_sample_registrations,
    get_registration_snapshots,
    score_research_forecast,
)

router = APIRouter(tags=["Research Explorer"])

REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
METRICS_PATH = REPO_ROOT / "ml" / "reports" / "metrics" / "phase_twenty_three_common_cohort_metrics.json"


class ScoreRequest(BaseModel):
    code_module: str
    code_presentation: str
    id_student: int


@router.get("/api/v1/research/registrations")
def list_common_cohort_registrations(limit: int = Query(50, ge=1, le=200)):
    """List sample registrations available in both Day-30 and Day-60 snapshots."""
    try:
        registrations = get_available_sample_registrations(limit=limit)
        return {
            "status": "success",
            "cohort_type": "COMMON_COHORT_DAY_60_ELIGIBLE",
            "count": len(registrations),
            "registrations": registrations,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/research/registration/{code_module}/{code_presentation}/{id_student}")
def get_registration_details(code_module: str, code_presentation: str, id_student: int):
    """Retrieve raw Day-30 and Day-60 feature values for a student registration."""
    try:
        return get_registration_snapshots(code_module, code_presentation, id_student)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/v1/research/score")
def score_registration(payload: ScoreRequest):
    """Run frozen Day-30 and Day-60 research models and return predictions and explanations."""
    try:
        result = score_research_forecast(payload.code_module, payload.code_presentation, payload.id_student)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/v1/research/audit-summary")
def get_audit_summary():
    """Return the precomputed statistical audit metrics for the common cohort."""
    if not METRICS_PATH.is_file():
        raise HTTPException(status_code=404, detail="Audit metrics file not found.")
    with open(METRICS_PATH) as f:
        data = json.load(f)
    return data


@router.get("/api/v1/research/export/{code_module}/{code_presentation}/{id_student}")
def export_research_record(code_module: str, code_presentation: str, id_student: int):
    """Export an immutable, labeled research audit package in JSON format."""
    try:
        forecast = score_research_forecast(code_module, code_presentation, id_student)
        snapshots = get_registration_snapshots(code_module, code_presentation, id_student)
        export_package = {
            "export_type": "SUTRA_RESEARCH_FORECAST_AUDIT_RECORD",
            "schema_version": "v23.0.0",
            "registration": forecast["registration"],
            "governance_metadata": forecast["governance_metadata"],
            "forecast_results": forecast["forecasts"],
            "input_snapshots": snapshots,
        }
        return JSONResponse(
            content=export_package,
            headers={
                "Content-Disposition": f"attachment; filename=sutra_research_{code_module}_{code_presentation}_{id_student}.json"
            },
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


RESEARCH_UI_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SUTRA — Research Forecast Explorer (Phase Twenty-Three)</title>
  <style>
    :root {
      --bg-primary: #090d16;
      --bg-surface: #0f172a;
      --bg-card: #1e293b;
      --bg-card-hover: #273549;
      --border: #334155;
      --border-accent: #3b82f6;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.2);
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --purple: #8b5cf6;
      --cyan: #06b6d4;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: var(--bg-primary); color: var(--text-main); min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #0b1120; border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 100; }
    .brand-group { display: flex; align-items: center; gap: 14px; }
    .brand { font-size: 1.3rem; font-weight: 800; letter-spacing: 0.05em; background: linear-gradient(135deg, #60a5fa, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .tag-research { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 0.72rem; padding: 3px 10px; border-radius: 9999px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .nav-links { display: flex; gap: 16px; align-items: center; }
    .nav-link { color: var(--text-muted); text-decoration: none; font-size: 0.85rem; font-weight: 600; transition: color 0.2s; }
    .nav-link:hover { color: var(--text-main); }
    
    /* Research Disclaimer Banner */
    .disclaimer-banner { background: rgba(239, 68, 68, 0.12); border-bottom: 1px solid rgba(239, 68, 68, 0.3); padding: 10px 28px; font-size: 0.8rem; color: #fca5a5; display: flex; align-items: center; gap: 10px; }
    .disclaimer-banner strong { color: #f87171; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.04em; }

    /* Layout */
    main { flex: 1; padding: 24px 28px; max-width: 1700px; margin: 0 auto; width: 100%; display: grid; grid-template-columns: 380px 1fr; gap: 24px; }
    
    /* Panels */
    .card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; }
    .card-header { font-size: 1rem; font-weight: 700; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; color: #e2e8f0; }
    
    /* Controls & Lists */
    .cohort-select { margin-bottom: 14px; }
    select, button, input { background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 0.85rem; outline: none; width: 100%; }
    select:focus, input:focus { border-color: var(--accent); }
    button { cursor: pointer; font-weight: 600; transition: all 0.2s; }
    button:hover { background: var(--bg-card-hover); border-color: var(--accent); }
    .btn-primary { background: var(--accent); border-color: var(--accent); color: white; }
    .btn-primary:hover { background: #2563eb; }
    .btn-export { background: #334155; border-color: #475569; color: #e2e8f0; margin-top: 10px; }
    .btn-export:hover { background: #475569; }

    .reg-list { max-height: calc(100vh - 280px); overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-right: 4px; }
    .reg-item { background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; cursor: pointer; transition: all 0.15s; }
    .reg-item:hover, .reg-item.active { border-color: var(--accent); background: var(--bg-card-hover); box-shadow: 0 0 12px var(--accent-glow); }
    .reg-item-top { display: flex; justify-content: space-between; font-weight: 700; font-size: 0.88rem; margin-bottom: 4px; }
    .reg-item-meta { font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 10px; }

    /* Results Dashboard */
    .results-area { display: flex; flex-direction: column; gap: 20px; }
    .scores-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .model-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 18px; display: flex; flex-direction: column; gap: 14px; position: relative; }
    .model-title { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; color: var(--cyan); display: flex; justify-content: space-between; }
    .prob-display { display: flex; align-items: baseline; gap: 10px; margin: 4px 0; }
    .prob-val { font-size: 2.2rem; font-weight: 800; letter-spacing: -0.02em; }
    .prob-val.high { color: #f87171; }
    .prob-val.medium { color: #fbbf24; }
    .prob-val.low { color: #34d399; }
    .prob-bar { height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden; position: relative; }
    .prob-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
    .thresh-marker { position: absolute; top: 0; bottom: 0; width: 2px; background: white; z-index: 2; }
    .thresh-legend { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); }

    /* Attribution & Explanations */
    .factors-box { display: flex; flex-direction: column; gap: 8px; }
    .factor-item { background: rgba(15, 23, 42, 0.6); border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid transparent; }
    .factor-item.risk { border-left-color: var(--danger); }
    .factor-item.protective { border-left-color: var(--success); }
    .factor-title { font-weight: 600; color: #e2e8f0; }
    .factor-val { font-family: monospace; font-size: 0.78rem; font-weight: 700; }
    .factor-val.risk { color: #fca5a5; }
    .factor-val.protective { color: #86efac; }

    /* Snapshot Comparison Table */
    .table-container { overflow-x: auto; margin-top: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: #0b1120; color: var(--text-muted); font-weight: 700; text-transform: uppercase; font-size: 0.72rem; }
    tr:hover { background: rgba(255, 255, 255, 0.02); }
    .badge { font-size: 0.7rem; padding: 2px 7px; border-radius: 9999px; font-weight: 700; }
    .badge-pass { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
    .badge-fail { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
    .badge-alert { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }

    .delta-banner { background: #0f172a; border: 1px solid var(--border); border-radius: 8px; padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
    .delta-val { font-weight: 800; font-size: 1rem; }
  </style>
</head>
<body>
  <header>
    <div class="brand-group">
      <div class="brand">SUTRA</div>
      <div class="tag-research">Phase 23 Research Forecast Explorer</div>
    </div>
    <div class="nav-links">
      <a href="/demo" class="nav-link">← Return to Operational Demo</a>
      <a href="/docs" class="nav-link" target="_blank">API Docs</a>
    </div>
  </header>

  <div class="disclaimer-banner">
    <strong>Audited Research Interface:</strong>
    <span>Evaluates frozen Phase 22 OULAD research models on historical common-cohort records. Probability changes reflect updated 60-day observation windows, NOT causal individualized intervention trajectories. Operational candidate gate remains closed.</span>
  </div>

  <main>
    <!-- Left Column: Common Cohort Registration Selector -->
    <div class="card">
      <div class="card-header">
        <span>Eligible Common Cohort</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);" id="sample-count">Loading...</span>
      </div>
      <div class="cohort-select">
        <input type="text" id="search-box" placeholder="Filter by Student ID or Module..." oninput="filterRegistrations()">
      </div>
      <div class="reg-list" id="reg-list-container">
        <!-- Populated via JS -->
      </div>
    </div>

    <!-- Right Column: Interactive Forecast & Explanations Dashboard -->
    <div class="results-area">
      <!-- Active Student Info & Action Bar -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 id="active-student-title" style="font-size: 1.2rem; font-weight: 800; color: #f8fafc;">Select a Registration</h2>
            <p id="active-student-meta" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Choose an eligible OULAD student record from the left panel to inspect dual-cutoff forecasts.</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn-primary" id="btn-score" onclick="executeScoring()" style="width: auto; padding: 8px 18px;" disabled>Run Research Models</button>
            <button class="btn-export" id="btn-export" onclick="exportAuditRecord()" style="width: auto; padding: 8px 16px; margin: 0;" disabled>Export JSON Audit</button>
          </div>
        </div>
      </div>

      <!-- Dual Cutoff Comparison Grid -->
      <div class="scores-grid" id="scores-grid-container" style="display: none;">
        <!-- Day 30 Model Card -->
        <div class="model-card">
          <div class="model-title">
            <span>Day-30 Milestone Model (LR)</span>
            <span style="color: var(--text-muted); font-size: 0.75rem;">v22.0.0</span>
          </div>
          <div class="prob-display">
            <span class="prob-val" id="d30-prob">0.00%</span>
            <span id="d30-alert-badge" class="badge"></span>
          </div>
          <div class="prob-bar">
            <div class="prob-fill" id="d30-fill" style="width: 0%; background: #3b82f6;"></div>
            <div class="thresh-marker" style="left: 46%;" title="Threshold 0.46"></div>
          </div>
          <div class="thresh-legend">
            <span>0.0</span>
            <span title="Serving Benchmark">τ = 0.46</span>
            <span>1.0</span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-top: 6px;">Top Linear Drivers (Log-Odds Attributions):</div>
          <div class="factors-box" id="d30-factors"></div>
        </div>

        <!-- Day 60 Model Card -->
        <div class="model-card">
          <div class="model-title">
            <span>Day-60 Milestone Model (LR)</span>
            <span style="color: var(--text-muted); font-size: 0.75rem;">v22.0.0</span>
          </div>
          <div class="prob-display">
            <span class="prob-val" id="d60-prob">0.00%</span>
            <span id="d60-alert-badge" class="badge"></span>
          </div>
          <div class="prob-bar">
            <div class="prob-fill" id="d60-fill" style="width: 0%; background: #8b5cf6;"></div>
            <div class="thresh-marker" style="left: 40%; background: #f59e0b;" title="Realigned Threshold 0.40"></div>
            <div class="thresh-marker" style="left: 46%;" title="Threshold 0.46"></div>
          </div>
          <div class="thresh-legend">
            <span>0.0</span>
            <span style="color: #f59e0b;">τ = 0.40</span>
            <span>τ = 0.46</span>
            <span>1.0</span>
          </div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); margin-top: 6px;">Top Linear Drivers (Log-Odds Attributions):</div>
          <div class="factors-box" id="d60-factors"></div>
        </div>
      </div>

      <!-- Delta Banner -->
      <div class="delta-banner" id="delta-banner-container" style="display: none;">
        <div>
          <span style="font-weight: 700; color: #e2e8f0;">Observation Window Delta (Day 60 - Day 30):</span>
          <span style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 2px;" id="delta-interpretation"></span>
        </div>
        <div class="delta-val" id="delta-val-badge"></div>
      </div>

      <!-- Permitted Feature Snapshot Comparison Table -->
      <div class="card" id="feature-table-card" style="display: none;">
        <div class="card-header">
          <span>Permitted Observable Feature Snapshots</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Strictly Censored: t ≤ 30 vs t ≤ 60</span>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Feature Identifier</th>
                <th>Day-30 Snapshot (t ≤ 30)</th>
                <th>Day-60 Snapshot (t ≤ 60)</th>
                <th>Observed Behavioral Delta</th>
              </tr>
            </thead>
            <tbody id="features-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  </main>

  <script>
    let allRegistrations = [];
    let selectedReg = null;

    async function init() {
      try {
        const res = await fetch('/api/v1/research/registrations?limit=50');
        const data = await res.json();
        allRegistrations = data.registrations || [];
        document.getElementById('sample-count').innerText = `${allRegistrations.length} Sample Records`;
        renderRegistrations(allRegistrations);
        if (allRegistrations.length > 0) {
          selectRegistration(allRegistrations[0]);
        }
      } catch (err) {
        console.error('Failed to load sample registrations:', err);
      }
    }

    function renderRegistrations(items) {
      const container = document.getElementById('reg-list-container');
      container.innerHTML = '';
      items.forEach(r => {
        const el = document.createElement('div');
        el.className = 'reg-item' + (selectedReg && selectedReg.id_student === r.id_student ? ' active' : '');
        el.onclick = () => selectRegistration(r);
        const resultClass = r.target === 1 ? 'badge-fail' : 'badge-pass';
        el.innerHTML = `
          <div class="reg-item-top">
            <span>Student #${r.id_student}</span>
            <span class="badge ${resultClass}">${r.raw_final_result}</span>
          </div>
          <div class="reg-item-meta">
            <span>Module: ${r.code_module} (${r.code_presentation})</span>
            <span>Clicks: ${r.d30_total_clicks} → ${r.d60_total_clicks}</span>
          </div>
        `;
        container.appendChild(el);
      });
    }

    function filterRegistrations() {
      const q = document.getElementById('search-box').value.toLowerCase();
      const filtered = allRegistrations.filter(r => 
        String(r.id_student).includes(q) || r.code_module.toLowerCase().includes(q) || r.code_presentation.toLowerCase().includes(q)
      );
      renderRegistrations(filtered);
    }

    async function selectRegistration(r) {
      selectedReg = r;
      renderRegistrations(allRegistrations);
      document.getElementById('active-student-title').innerText = `Student #${r.id_student} — ${r.code_module} (${r.code_presentation})`;
      document.getElementById('active-student-meta').innerText = `Historical Result: ${r.raw_final_result} (${r.target_label}) | VLE Clicks: Day 30 = ${r.d30_total_clicks}, Day 60 = ${r.d60_total_clicks} | Missed Deadlines at Day 60: ${r.d60_missed_assessments}`;
      document.getElementById('btn-score').disabled = false;
      document.getElementById('btn-export').disabled = false;
      
      // Auto-load features table
      await loadFeaturesTable(r);
      // Auto-run scoring
      await executeScoring();
    }

    async function loadFeaturesTable(r) {
      try {
        const res = await fetch(`/api/v1/research/registration/${r.code_module}/${r.code_presentation}/${r.id_student}`);
        const data = await res.json();
        const f30 = data.day30_snapshot.features;
        const f60 = data.day60_snapshot.features;
        const tbody = document.getElementById('features-tbody');
        tbody.innerHTML = '';
        
        const allKeys = Array.from(new Set([...Object.keys(f30), ...Object.keys(f60)]));
        allKeys.forEach(k => {
          const v30 = f30[k] !== undefined ? f30[k] : '-';
          const v60 = f60[k] !== undefined ? f60[k] : '-';
          let delta = '-';
          if (typeof v30 === 'number' && typeof v60 === 'number') {
            const diff = v60 - v30;
            delta = (diff > 0 ? '+' : '') + diff;
          }
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><code>${k}</code></td>
            <td><strong>${v30}</strong></td>
            <td><strong>${v60}</strong></td>
            <td><span style="color: ${delta.startsWith('+') ? '#60a5fa' : '#94a3b8'}">${delta}</span></td>
          `;
          tbody.appendChild(tr);
        });
        document.getElementById('feature-table-card').style.display = 'block';
      } catch (err) {
        console.error('Failed to load snapshot details:', err);
      }
    }

    async function executeScoring() {
      if (!selectedReg) return;
      try {
        const res = await fetch('/api/v1/research/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code_module: selectedReg.code_module,
            code_presentation: selectedReg.code_presentation,
            id_student: selectedReg.id_student,
          })
        });
        const data = await res.json();
        const lr = data.forecasts.logistic_regression;
        
        // Day 30 Card
        const p30 = lr.day30.predicted_probability;
        document.getElementById('d30-prob').innerText = (p30 * 100).toFixed(1) + '%';
        document.getElementById('d30-prob').className = 'prob-val ' + (p30 >= 0.46 ? 'high' : 'low');
        document.getElementById('d30-fill').style.width = (p30 * 100) + '%';
        document.getElementById('d30-fill').style.background = p30 >= 0.46 ? '#ef4444' : '#10b981';
        document.getElementById('d30-alert-badge').innerText = p30 >= 0.46 ? 'ALERT (τ ≥ 0.46)' : 'ON-TRACK';
        document.getElementById('d30-alert-badge').className = 'badge ' + (p30 >= 0.46 ? 'badge-fail' : 'badge-pass');

        // Day 60 Card
        const p60 = lr.day60.predicted_probability;
        document.getElementById('d60-prob').innerText = (p60 * 100).toFixed(1) + '%';
        document.getElementById('d60-prob').className = 'prob-val ' + (p60 >= 0.40 ? 'high' : 'low');
        document.getElementById('d60-fill').style.width = (p60 * 100) + '%';
        document.getElementById('d60-fill').style.background = p60 >= 0.40 ? '#ef4444' : '#10b981';
        document.getElementById('d60-alert-badge').innerText = p60 >= 0.40 ? 'ALERT (τ ≥ 0.40)' : 'ON-TRACK';
        document.getElementById('d60-alert-badge').className = 'badge ' + (p60 >= 0.40 ? 'badge-fail' : 'badge-pass');

        // Attributions
        renderFactors('d30-factors', lr.day30.top_risk_drivers, lr.day30.top_protective_factors);
        renderFactors('d60-factors', lr.day60.top_risk_drivers, lr.day60.top_protective_factors);

        // Delta
        const delta = lr.estimate_delta;
        document.getElementById('delta-val-badge').innerText = (delta > 0 ? '+' : '') + (delta * 100).toFixed(1) + '%';
        document.getElementById('delta-val-badge').style.color = delta > 0 ? '#f87171' : '#34d399';
        document.getElementById('delta-interpretation').innerText = 
          delta > 0.05 ? 'Day-60 research estimate reflects increased risk signals accumulated during Month 2 (e.g. inactive periods or missed deadlines).' :
          (delta < -0.05 ? 'Day-60 research estimate reflects protective engagement (active forum/content reading and completed assignments).' : 'Research estimate remained stable across early and midterm milestones.');

        document.getElementById('scores-grid-container').style.display = 'grid';
        document.getElementById('delta-banner-container').style.display = 'flex';
      } catch (err) {
        console.error('Failed to execute scoring:', err);
      }
    }

    function renderFactors(containerId, riskDrivers, protectiveDrivers) {
      const el = document.getElementById(containerId);
      el.innerHTML = '';
      (riskDrivers || []).slice(0, 2).forEach(f => {
        const d = document.createElement('div');
        d.className = 'factor-item risk';
        d.innerHTML = `<span class="factor-title">${f.display_title}</span><span class="factor-val risk">+${f.log_odds_contribution.toFixed(2)} log-odds</span>`;
        el.appendChild(d);
      });
      (protectiveDrivers || []).slice(0, 2).forEach(f => {
        const d = document.createElement('div');
        d.className = 'factor-item protective';
        d.innerHTML = `<span class="factor-title">${f.display_title}</span><span class="factor-val protective">${f.log_odds_contribution.toFixed(2)} log-odds</span>`;
        el.appendChild(d);
      });
    }

    function exportAuditRecord() {
      if (!selectedReg) return;
      window.location.href = `/api/v1/research/export/${selectedReg.code_module}/${selectedReg.code_presentation}/${selectedReg.id_student}`;
    }

    window.onload = init;
  </script>
</body>
</html>
"""


@router.get("/research/explorer", response_class=HTMLResponse)
def serve_research_explorer_dashboard():
    """Serve the interactive Research Forecast Explorer dashboard."""
    return HTMLResponse(content=RESEARCH_UI_HTML)
