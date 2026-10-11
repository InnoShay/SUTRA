# SUTRA Phase Fourteen — Execution Record: Candidate Provenance Reconciliation & Shadow Evaluation Gate

**Date:** 2026-10-12  
**Role:** Senior ML Model Governance Auditor & Reproducibility Engineer  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Git Branch:** `Neemay-ml`  

---

## 1. Execution Summary

Phase Fourteen performed a forensic provenance reconciliation of the Phase Nine candidate model, verified the inviolability of the shadow evaluation execution gate, established key custody boundaries for HMAC fingerprinting, and pre-registered the definitive Evaluation Gate Matrix and Lexicographic Decision Hierarchy.

- **Phase Nature:** Model Governance, Forensic Reproducibility, Cryptographic Security Audit, and Decision Matrix Formalization.
- **Strict Guardrails Enforced:**
  - **Zero production modifications:** Production Logistic Regression v1.0.0 at threshold `0.46` remains the sole serving model in `backend/app/main.py`.
  - **Zero artifact overwriting:** The physical candidate artifact was not modified or overwritten to match markdown reports.
  - **Candidate scoring gated & blocked:** `candidate_provenance_verified` remains `False` by default in `ShadowModeEvaluator`, refusing candidate execution.
  - **Zero unauthorized deployments or alerts:** Evaluation engine operates strictly in local testing mode.
- **Deliverables Generated:**
  - [`ml/reports/phase_fourteen_candidate_provenance_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fourteen_candidate_provenance_report.md)
  - [`ml/reports/phase_fourteen_shadow_gate_verification.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fourteen_shadow_gate_verification.md)
  - [`ml/reports/phase_fourteen_evaluation_gate_matrix.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fourteen_evaluation_gate_matrix.md)
  - [`ml/reports/phase_fourteen_execution_record.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fourteen_execution_record.md)
  - [`ml/tests/unit/test_phase_fourteen_provenance_gate.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_fourteen_provenance_gate.py) (8 new comprehensive tests)
- **Final Decision:**
  ```
  [FORMAL GOVERNANCE DECISION]
  Provenance Reconciled — Awaiting Explicit Governance Authorization
  ```

---

## 2. Baseline & Production Integrity Check

| Component | Path / Parameter | Observed State | Status |
| :--- | :--- | :--- | :---: |
| **Production Model Artifact** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` (7,105 bytes) | **Pristine & Intact** |
| **Production Metadata** | `ml/artifacts/models/v1.0.0/model_metadata.json` | Selected threshold: `0.45999999999999996` ($\approx 0.46$) | **Pristine & Intact** |
| **Active Serving Threshold** | `backend/app/core/config.py` | `default_threshold = 0.46` | **Pristine & Intact** |
| **Production Serving Code** | `backend/app/main.py` | Exclusively loads v1.0.0 via `SutraRiskPredictor` | **Untouched** |
| **Candidate Artifact on Disk**| `ml/artifacts/experiments/phase_nine_module_relative/experimental_module_relative_lr.joblib` | SHA-256: `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` (13,025 bytes) | **Reconciled & Gated** |

---

## 3. Step-by-Step Audit Progression

### Step 1: Workstream A — Forensic Provenance Reconciliation
- Extracted pipeline structure, fitted statistics, and coefficients from `experimental_module_relative_lr.joblib`:
  - `module_relative`: 7 university disciplines (`AAA` through `GGG`) and 11 standardized engagement features.
  - `classifier`: Regularized Logistic Regression ($C=1.0$, balanced weights, L2 penalty, coefficient shape `(1, 66)`).
- Re-executed inference on the 2014J semester holdout ($N=9,203$): reproduced saved outputs in `validation_metrics.json` and `phase_nine_metrics.json` exactly:
  $$\text{ROC-AUC} = 0.7345, \quad \text{PR-AUC} = 0.6742, \quad \text{Brier} = 0.2104, \quad \text{Alerts} = 5,209$$
- Reconciled root cause of documentation discrepancy: `951f2dd1...` was captured from an intermediate prototype run, whereas `2a2727aa...` is the direct artifact from the complete training pipeline.
- Formulated formal reconciliation report in [`phase_fourteen_candidate_provenance_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fourteen_candidate_provenance_report.md).

### Step 2: Workstream B — Execution Gate Verification
- Audited `ShadowModeEvaluator` in [`ml/src/sutra_ml/evaluation/shadow_mode.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/evaluation/shadow_mode.py).
- Verified that default initialization refuses candidate execution.
- Added tests for bypass attempts:
  - Injecting `candidate_provenance_verified = True` or other flags into DataFrame payloads fails closed via whitelist schema scan.
  - Attempting in-memory mutation of returned prediction dataclasses raises `FrozenInstanceError`.
  - Missing model files raise `FileNotFoundError`.
- Verified rejection logs do not leak raw student features or personal attributes.
- Documented findings in [`phase_fourteen_shadow_gate_verification.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fourteen_shadow_gate_verification.md).

### Step 3: Workstream C — Cryptographic Salt & Configuration Boundary
- Refactored HMAC salt resolution to draw from `SUTRA_SHADOW_SALT` environment variable configuration boundary.
- Proved that key rotation alters fingerprints, necessitating key versioning (`key_id: "inst-kms-2026-q4"`).
- Documented that salted fingerprints remain pseudonymous personal data under GDPR/FERPA.
- Re-confirmed the limitation of in-run deduplication and the requirement of an external ACID table for multi-batch production idempotency.

### Step 4: Workstream D & E — Evaluation Gate Matrix & Hierarchy
- Formulated the 8-dimension Evaluation Gate Matrix in [`phase_fourteen_evaluation_gate_matrix.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_fourteen_evaluation_gate_matrix.md).
- Formulated the Lexicographic Safety Hierarchy proving that ROC-AUC improvement alone cannot authorize promotion.
- Re-classified the 2014J holdout as historical development evidence, not prospective validation.
- Labeled the sample size claim unverified pending explicit documentation of paired correlation assumptions.

### Step 5: Workstream F — Automated Verification
- Authored 8 dedicated unit tests in [`ml/tests/unit/test_phase_fourteen_provenance_gate.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_fourteen_provenance_gate.py).
- Executed the full automated test suite:
  `PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests`
- Result: **118 passed in 0.68s** (100% pass rate; zero regressions across ML and backend suites).

---

## 4. Test Suite Execution Output

```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```

**Results:**
- Total tests executed: **118**
- Total passed: **118**
- Total failed: **0**
- Execution duration: 0.68 seconds
- Exit code: 0

---

## 5. Next Governance Milestone

Now that candidate provenance is reconciled through reproducible evidence:
1. **Human Governance Sign-Off:** The responsible ML Governance Reviewer must review the decision packet and sign an explicit decision memo authorizing `2a2727aa...` as the approved research candidate.
2. **Institutional Data Use Agreement (DUA):** Negotiate authorized DUA and IRB ethics approval with a partner institution.
3. **Data Pipeline Certification:** Certify the partner institution's extraction pipeline to enforce strict Day-30 temporal cutoff boundaries without post-cutoff leakage.
4. **Prospective Shadow Pilot:** Execute read-only shadow evaluation on an authentic future cohort, with outcomes blinded until final semester grade certification.
