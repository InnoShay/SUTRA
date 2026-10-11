# SUTRA Phase Fifteen — Execution Record: Candidate Authorization Packet & Gate Review

**Date:** 2026-10-12  
**Role:** Senior ML Governance Analyst & Evaluation Protocol Reviewer  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Git Branch:** `Neemay-ml`  

---

## 1. Execution Summary

Phase Fifteen prepared the formal Human Reviewer Authorization Packet and Gate Review for the Phase Nine module-relative Logistic Regression candidate model.

- **Phase Nature:** Model Governance, Protocol Review, Decision Packet Preparation, and Integrity Auditing.
- **Strict Guardrails Enforced:**
  - **Zero production modifications:** Production Logistic Regression v1.0.0 at threshold `0.46` remains active in `backend/app/main.py`.
  - **Gate remains locked:** `candidate_provenance_verified` remains `False` by default in `ShadowModeEvaluator`.
  - **Zero model modifications:** Artifacts were neither retrained nor modified.
  - **Zero external interventions or data collection:** Execution was conducted purely in local audit mode.
  - **Human signature fields preserved:** The Decision Form leaves all signature, identity, and approval fields blank for human execution.
- **Deliverables Generated:**
  - [`ml/reports/phase_fifteen_candidate_authorization_packet.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_candidate_authorization_packet.md)
  - [`ml/reports/phase_fifteen_evaluation_gate_consistency_review.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_evaluation_gate_consistency_review.md)
  - [`ml/reports/phase_fifteen_human_decision_form.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_human_decision_form.md)
  - [`ml/reports/phase_fifteen_execution_record.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_execution_record.md)
- **Final Governance Status:**
  ```
  [PHASE FIFTEEN STATUS]
  Packet Prepared — Awaiting Human Review
  ```

---

## 2. Baseline & Production Integrity Check

| Component | Path / Parameter | Observed State | Status |
| :--- | :--- | :--- | :---: |
| **Production Model Artifact** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` (7,105 bytes) | **Pristine & Intact** |
| **Production Metadata** | `ml/artifacts/models/v1.0.0/model_metadata.json` | Selected threshold: `0.45999999999999996` ($\approx 0.46$) | **Pristine & Intact** |
| **Active Serving Threshold** | `backend/app/core/config.py` | `default_threshold = 0.46` | **Pristine & Intact** |
| **Production Serving Code** | `backend/app/main.py` | Exclusively serves v1.0.0 via `SutraRiskPredictor` | **Untouched** |
| **Candidate Artifact on Disk**| `ml/artifacts/experiments/phase_nine_module_relative/experimental_module_relative_lr.joblib` | SHA-256: `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` (13,025 bytes) | **Quarantined & Gated** |

---

## 3. Workstream Progression & Review Findings

### Step 1: Workstream A — Authorization Evidence Dossier
- Re-examined candidate metadata, pipeline code, and validation outputs.
- Compiled candidate profile: 26 inputs, 36 modeled features, 11 module-standardized relative features, regularized Logistic Regression with balanced weights.
- Documented internal retrospective development metrics on OULAD ($N = 18,263$ OOF: $\Delta \text{ROC-AUC} = +0.0254$, $\Delta \text{False Alarms} = -400$; $N=9,203$ secondary holdout: $\Delta \text{ROC-AUC} = +0.0238$, $\Delta \text{False Alarms} = -154$).
- Highlighted module-level false positive shifts: AAA (+13), BBB (-342), CCC (-4), DDD (+113), EEE (+67), FFF (+100), GGG (-347).
- Formatted complete dossier in [`phase_fifteen_candidate_authorization_packet.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_candidate_authorization_packet.md).

### Step 2: Workstream B — Evaluation Gate Consistency Review
- Resolved the ambiguity between the lexicographic hierarchy and hard vetoes:
  - Formulated Layer 1 Absolute Safety & Governance Vetoes (Provenance, Leakage, Recall drop $>2.0\%$, False alarms $\ge 0$, $\text{ECE} > 0.070$, Subgroup $\text{DIR} \notin [0.80, 1.25]$).
  - Defined vetoes as strictly non-compensatory: higher ROC-AUC cannot override a safety or false alarm failure.
- Formalized exact statistical tests:
  - False alarm reduction: One-sided Paired McNemar Test on discordant non-failing students ($y=0$) at $\alpha = 0.01$.
  - Discrimination: DeLong correlated ROC test and student-clustered bootstrap ($B = 1,000$).
  - Calibration: Dual assessment via Brier score and 10-bin ECE.
- Formatted review in [`phase_fifteen_evaluation_gate_consistency_review.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_evaluation_gate_consistency_review.md).

### Step 3: Workstream C — Human Decision Form
- Authored the blank, standardized decision instrument in [`phase_fifteen_human_decision_form.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fifteen_human_decision_form.md).
- Form contains explicit fields for reviewer identity, role, three decision options, scope/expiry bounds (180 days, single cohort), permitted environment, prohibited actions, and signature block.
- Left all approval, identity, and signature entries blank.

### Step 4: Workstream D — Institutional Readiness Boundary
Documented the explicit boundaries separating local repository verification from institutional governance:

| Prerequisite | Repository Test Status | Institutional Boundary Requirement |
| :--- | :---: | :--- |
| **Code Isolation & Blinding** | **Verified (118 Tests)** | Institutional advisory UI integration |
| **Fail-Closed Whitelist** | **Verified (118 Tests)** | None |
| **Candidate Execution Gate** | **Verified (Locked)** | Human Reviewer signature on Phase 15 Form |
| **Institutional Governance Sponsor** | **Out of Scope** | Formal appointment by University Academic Dean |
| **Data Use Agreement (DUA)** | **Out of Scope** | Executed legal contract defining telemetry scope |
| **IRB / Academic Ethics Approval** | **Out of Scope** | University Ethics Committee review/exemption |
| **Telemetry Extraction Pipeline** | **Out of Scope** | Institutional certification of Day-30 cutoff boundary |
| **KMS / Key Custody Architecture** | **Out of Scope** | Institutional HSM key vault deployment for salt |

---

## 4. Test Suite Execution Output

```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```

**Results:**
- Total tests executed: **118**
- Total passed: **118**
- Total failed: **0**
- Execution duration: 0.58 seconds
- Exit code: 0

---

## 5. Next Governance Milestone

Phase Fifteen is complete. The authorization packet and decision form are ready for the designated human governance reviewer.

**The next milestone belongs exclusively to the human reviewer:**
1. Review the Candidate Authorization Packet and Gate Review.
2. Formally select an option on the Decision Form and execute signature.
3. If approved for research-only shadow evaluation, proceed to institutional DUA and pipeline certification before any prospective data is ingested.
