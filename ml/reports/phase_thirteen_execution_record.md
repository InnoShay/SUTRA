# SUTRA Phase Thirteen — Execution Record: Shadow-Mode Contract Hardening & Audit Closure

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Test Engineer  
**System Environment:** macOS Apple Silicon ARM64 (Darwin 25.6.0), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Git Branch:** `Neemay-ml`  

---

## 1. Execution Summary

Phase Thirteen performed a comprehensive, independent audit and contract hardening of SUTRA's Phase Twelve shadow-mode implementation across six distinct workstreams (A through F).

- **Phase Nature:** Code Auditing, Contract Hardening, Cryptographic Verification, Statistical Analysis, and Test Suite Expansion.
- **Strict Guardrails Enforced:**
  - **Zero production modifications:** Production Logistic Regression v1.0.0 at threshold `0.46` remains the sole active model in `backend/app/main.py`.
  - **No artifact overwriting:** The candidate model was not modified or overwritten to match markdown reports.
  - **Candidate scoring gated & blocked:** Candidate model execution is blocked by default (`candidate_provenance_verified=False`) due to historical documentation discrepancies.
  - **Zero unauthorized deployments or alerts:** Evaluation engine operates in strictly local, read-only testing mode.
- **Deliverables Generated:**
  - [`ml/reports/phase_thirteen_shadow_contract_audit.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_thirteen_shadow_contract_audit.md)
  - [`ml/reports/phase_thirteen_artifact_integrity_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_thirteen_artifact_integrity_report.md)
  - [`ml/reports/phase_thirteen_statistical_protocol_audit.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_thirteen_statistical_protocol_audit.md)
  - [`ml/reports/phase_thirteen_execution_record.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_thirteen_execution_record.md)
  - [`ml/tests/unit/test_phase_thirteen_shadow_contract.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_thirteen_shadow_contract.py) (12 comprehensive tests)
  - Updated [`ml/src/sutra_ml/evaluation/shadow_mode.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/evaluation/shadow_mode.py)
- **Final Audit Closure Verdict:** **Conditionally closed** — Technical contracts are hardened and verified, but candidate scoring remains blocked pending institutional provenance reconciliation, and live evaluation remains gated on authorized institutional DUA and ethics agreements.

---

## 2. Baseline & Production Integrity Check

| Component | Path / Parameter | Observed State | Status |
| :--- | :--- | :--- | :---: |
| **Production Model Artifact** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` (7,105 bytes) | **Pristine & Intact** |
| **Production Metadata** | `ml/artifacts/models/v1.0.0/model_metadata.json` | Selected threshold: `0.45999999999999996` ($\approx 0.46$) | **Pristine & Intact** |
| **Active Serving Threshold** | `backend/app/core/config.py` | `default_threshold = 0.46` | **Pristine & Intact** |
| **Production Serving Code** | `backend/app/main.py` | Exclusively loads v1.0.0 via `SutraRiskPredictor` | **Untouched** |
| **Candidate Artifact on Disk**| `ml/artifacts/experiments/phase_nine_module_relative/experimental_module_relative_lr.joblib` | SHA-256: `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` (13,025 bytes) | **Quarantined & Gated** |

---

## 3. Step-by-Step Audit Execution Log

### Step 1: Workstream A — Artifact Integrity & Provenance Investigation
- Recomputed SHA-256 for production and candidate model artifacts via shell tools and Python hashlib.
- Compared hashes across Phase Nine, Ten, Eleven, Twelve, and Thirteen reports.
- Discovered historical documentation discrepancy:
  - Phase Nine markdown report documented `951f2dd1...` (8,881 B).
  - On-disk artifact and `phase_nine_metrics.json` recorded `2a2727aa...` (13,025 B).
- Root cause: An early prototype run was documented in Phase Nine text, whereas the complete serialized pipeline with full transformer statistics was saved to disk.
- Adhered strictly to safeguards: Artifact was **not overwritten**.
- Implemented programmatic candidate gating in `ShadowModeEvaluator`: candidate execution defaults to `candidate_provenance_verified = False`, blocking candidate execution until explicitly authorized.

### Step 2: Workstream B — Dual-Scoring & Leakage Contract Hardening
- Replaced permissive schema ingestion with strict whitelist (`ALLOWED_COLUMNS`), rejecting unexpected fields, PII, and non-whitelisted metadata.
- Expanded leakage detection to 25 target and outcome naming variants (`final_grade`, `exam_score`, `withdrawal_date`, `is_withdrawn`, `attrition`, `post_d30_clicks`) using tokenized matching.
- Implemented non-finite numeric checks (`NaN`, $\pm\infty$, `None`) and categorical domain validation across all 6 categorical attributes.
- Verified that rejected rows are strictly quarantined and never converted into valid predictions, preserving the exact accounting invariant:
  $$\text{submitted} = \text{scored} + \text{rejected}$$

### Step 3: Workstream C — Canonical Fingerprinting & Duplicate Handling
- Built canonical serialization in `compute_canonical_fingerprint`: sorts keys, canonicalizes floats to 6 decimal places, and applies salted HMAC-SHA256.
- Implemented in-run duplicate rejection (identical fingerprints) and conflicting-ID rejection (identical ID, different payload).
- Formally documented the limitation of repository statelessness: cross-run deduplication cannot be guaranteed locally without an external persistent ACID store; specified the required database schema.

### Step 4: Workstream D — Statistical Protocol & Power Audit
- Audited the Phase Twelve power claim ($N \ge 3,500$ yields $90\%$ power at $\alpha=0.01$ for $\Delta \text{ROC-AUC} = 0.015$).
- Labeled the claim **UNVERIFIED PENDING SPECIFIED CORRELATION ASSUMPTIONS** due to missing parameters in Phase Twelve text.
- Formulated the exact Obuchowski/DeLong paired sample size equation and provided a sensitivity table demonstrating that $N=3,500$ requires paired correlation $\rho_{\text{paired}} \ge 0.89$.
- Formalized the Lexicographic Promotion Decision Tree, proving that ROC-AUC improvement alone is insufficient for model promotion.

### Step 5: Workstream E — Fairness & Subgroup Controls
- Implemented mathematical Disparate Impact Ratio (DIR) calculations enforcing the Four-Fifths rule ($0.80 \le \text{DIR} \le 1.25$).
- Added small-cell privacy suppression for $N < 5$ (`<5 (Suppressed for Privacy)`) and inconclusive flags for $5 \le N < 50$.
- Documented the strict boundary between repository code controls and required institutional infrastructure.

### Step 6: Workstream F — Test Suite Verification
- Authored 12 dedicated unit tests in [`ml/tests/unit/test_phase_thirteen_shadow_contract.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_thirteen_shadow_contract.py).
- Updated Phase Twelve tests to pass explicit candidate authorization for isolated testing.
- Executed the full automated test suite:
  `PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests`
- Result: **110 passed in 0.65s** (100% pass rate; zero regressions).

---

## 4. Test Suite Execution Output

```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```

**Results:**
- Total tests collected and executed: **110**
- Total passed: **110**
- Total failed: **0**
- Total duration: 0.65 seconds
- Exit code: 0

---

## 5. Audit Closure Decision

```
[FINAL GOVERNANCE VERDICT]
Conditionally Closed
```

### Rationale:
1. **Technical Contracts Hardened & Verified:** Dual-scoring isolation, fail-closed schema enforcement, expanded leakage detection, canonical fingerprinting, in-run duplicate handling, and subgroup disparity monitoring are fully implemented in code and verified by 110 automated unit tests.
2. **Candidate Provenance Bounded & Gated:** The Phase Nine candidate hash discrepancy is documented, investigated, and contained. Candidate execution is programmatically blocked by default in code, preventing unverified scoring.
3. **Institutional Prerequisites Bounded:** Production deployment, external data collection, and live scoring remain strictly barred until:
   - Institutional Data Use Agreement (DUA) is executed.
   - Ethics / Institutional Review Board (IRB) approval is granted.
   - A formal governance waiver reconciles the Phase Nine candidate documentation.
   - An authorized external ACID state store is provisioned for cross-run idempotency.
