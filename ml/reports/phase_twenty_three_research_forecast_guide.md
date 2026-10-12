# SUTRA Phase Twenty-Three — Research Forecast Explorer User Guide

**Milestone:** CODEX 3.0 PS6 Research Forecast Explorer  
**Roles:** Senior Applied ML Scientist, Research Inference Engineer  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Execution Timestamp:** 2026-10-12T06:48:00+05:30  
**Interface Route:** [`http://localhost:8000/research/explorer`](http://localhost:8000/research/explorer)  

---

## 1. Overview & Architecture

The **Research Forecast Explorer** is a local-only interactive inspection tool designed for ML engineers, data scientists, and institutional researchers to audit predictions from SUTRA's frozen Phase Twenty-Two research models without deploying them to production.

```
+---------------------------------------------------------------------------------+
|                       RESEARCH FORECAST EXPLORER UI                             |
|                                                                                 |
|  [ Eligible Common Cohort ]  --->  [ Dual Milestone Scoring ]  --->  [ Explanations ]
|  - Student #11391 (AAA/2013J)       - Day-30 LR: 49.5% (Alert)         - Credit Load (+0.31)
|  - Student #28400 (AAA/2013J)       - Day-60 LR: 42.1% (On-Track)      - HE Qual (-0.42)
|  - Student #31604 (AAA/2013J)       - Estimate Delta: -7.4%            - Active Clicks (-0.38)
+---------------------------------------------------------------------------------+
```

### Core Capabilities:
1. **Common Cohort Exploration:** Select any eligible student registration from the historical common cohort ($N = 26,361$).
2. **Side-by-Side Snapshot Auditing:** Inspect permitted Day-30 ($t \le 30$) and Day-60 ($t \le 60$) feature values in an aligned comparison table.
3. **Dual-Cutoff Research Scoring:** Run the saved Day-30 and Day-60 Logistic Regression models (and XGBoost benchmarks) against their respective feature vectors.
4. **Log-Odds Attributions:** View mathematical feature attributions (top risk drivers and top protective factors) decomposed via exact linear coefficients.
5. **One-Click JSON Audit Export:** Export an immutable, cryptographically labeled research audit record for local archival and audit verification.

---

## 2. Navigating the Explorer Interface

### 2.1 Accessing the Dashboard
- Start the SUTRA local server:
  ```bash
  PYTHONPATH=ml/src:. python3 -m uvicorn backend.app.main:create_app --factory --port 8000
  ```
- Open your browser to: **[`http://localhost:8000/research/explorer`](http://localhost:8000/research/explorer)**
- Or click the **"Phase 23 Research Explorer"** navigation link in the top bar of the operational demo (`/demo`).

### 2.2 Selecting a Registration
The left-hand sidebar lists eligible common-cohort registrations.
- **Search Bar:** Filter registrations by Student ID (e.g. `11391`), Course Module (`AAA`, `BBB`, `CCC`, `DDD`), or Presentation (`2013J`, `2014J`).
- **Registration Card:** Displays Student ID, Module Presentation, Historical Final Outcome (`Pass`, `Fail`, `Withdrawn`, `Distinction`), and total clicks at Day 30 vs. Day 60.

### 2.3 Inspecting Permitted Feature Snapshots
Clicking a student record populates the **Permitted Observable Feature Snapshots** table:
- **Feature Identifier:** Exact snake_case variable name (e.g. `vle_total_clicks`, `missed_assessments`, `late_submissions`).
- **Day-30 Value ($t \le 30$):** Features observable on or before Day 30.
- **Day-60 Value ($t \le 60$):** Features observable on or before Day 60.
- **Observed Behavioral Delta:** The marginal behavioral change during Month 2 (e.g., $+105$ study clicks, $+1$ late submission).
- **Leakage Protection:** Note that `final_result`, `date_unregistration`, and assessment marks (`score`) are **completely absent** from the table.

### 2.4 Running Research Forecasts & Comparing Milestones
Click **"Run Research Models"** (or auto-runs upon selection):
- **Day-30 Card:**
  - Displays predicted risk probability $\hat{p}_{\text{D30}}$.
  - Compares against production serving benchmark threshold ($\tau = 0.46$).
  - Shows top risk-contributing factors (red) and protective factors (green).
- **Day-60 Card:**
  - Displays updated predicted risk probability $\hat{p}_{\text{D60}}$.
  - Compares against serving benchmark ($\tau = 0.46$) and realigned operating threshold ($\tau = 0.40$).
  - Shows updated risk and protective factors reflecting Month-2 activity.
- **Observation Window Delta Banner:**
  - Displays the mathematical difference $\Delta p = \hat{p}_{\text{D60}} - \hat{p}_{\text{D30}}$.
  - Provides a contextual explanation (e.g., *"Day-60 research estimate reflects protective engagement (active forum/content reading and completed assignments)"*).

### 2.5 Exporting Research Records
Click **"Export JSON Audit"**:
- Downloads a structured file named `sutra_research_{module}_{presentation}_{student_id}.json`.
- Contains registration keys, governance disclaimer, model versions, predicted probabilities, threshold alerts, and raw snapshot vectors.

---

## 3. Explanation Framework & Non-Causal Disclaimers

### Exact Linear Log-Odds Decomposition
For Logistic Regression models, the interface computes:
$$\text{margin} = w_0 + \sum_{j=1}^{M} w_j \cdot z_j \quad \implies \quad P(y=1) = \frac{1}{1 + e^{-\text{margin}}}$$
Where:
- $w_0$ is the model intercept.
- $z_j$ is the standardized and one-hot encoded design feature.
- $\phi_j = w_j \cdot z_j$ is the feature attribution in log-odds space.

### Human-Readable Feature Mapping

| Encoded Feature Name | Interface Display Title | Attribution Meaning |
|---|---|---|
| `num__studied_credits` | Registered Credit Load | Academic workload at matriculation |
| `num__vle_total_clicks` | Total VLE Activity Clicks | Overall platform study volume |
| `num__vle_days_since_last_click` | Days Inactive Since Last Access | Recency of active engagement |
| `num__missed_assessments` | Missed Assessment Deadlines (Day 60) | Unsubmitted scheduled assignments |
| `num__late_submissions` | Late Assignment Submissions | Submissions past syllabus deadline |
| `num__on_time_submissions` | On-Time Assignment Submissions | Submissions meeting syllabus deadline |
| `cat__highest_education_HE Qualification` | Highest Education: HE Qualification | Prior university-level education |
| `cat__imd_band_0-10%` | Deprivation Band: 0-10% | Highest deprivation decile |

### Mandatory Governance Disclaimers:
1. **Statistical Associations are Not Causal:** Features with high positive log-odds indicate observational correlation with academic struggle in distance learning. They do not prove that altering the feature will causally guarantee student success.
2. **Score Deltas are Updated Observations:** A drop in probability (e.g. from $49.5\%$ to $42.1\%$) indicates that the model observed positive behaviors during Month 2. It does not represent an individualized clinical diagnosis.

---

## 4. REST API Endpoint Reference

| HTTP Method | Endpoint Path | Description |
|---|---|---|
| `GET` | `/api/v1/research/registrations?limit=50` | List eligible common-cohort registrations. |
| `GET` | `/api/v1/research/registration/{mod}/{pres}/{sid}` | Retrieve raw Day-30 and Day-60 feature vectors. |
| `POST` | `/api/v1/research/score` | Score registration across all 4 research models. |
| `GET` | `/api/v1/research/audit-summary` | Retrieve statistical common-cohort audit metrics. |
| `GET` | `/api/v1/research/export/{mod}/{pres}/{sid}` | Export JSON audit record with complete metadata. |
| `GET` | `/research/explorer` | Serve the interactive HTML dashboard. |
