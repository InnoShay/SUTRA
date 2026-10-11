# SUTRA Phase Thirteen — Artifact Integrity & Provenance Audit Report

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Test Engineer  
**Status:** Audit Closure Review Document  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Branch:** `Neemay-ml`  

---

## 1. Executive Summary

Workstream A performed a forensic cryptographic audit of SUTRA's production and candidate model artifacts, cross-referencing all recorded hashes across Phase Nine, Phase Ten, Phase Eleven, Phase Twelve, and Phase Thirteen.

### Key Conclusions:
1. **Production Baseline (v1.0.0):** Cryptographically pristine. SHA-256 matches `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` (7,105 bytes) identically across all 13 phases. Serving threshold remains strictly locked at `0.46`.
2. **Phase Nine Candidate Hash Discrepancy:** Identified a historical textual discrepancy between the Phase Nine markdown reports (`951f2dd1...`, 8,881 bytes) and the serialized on-disk artifact (`2a2727aa...`, 13,025 bytes).
3. **Forensic Reconciliation:** The on-disk binary matches the programmatic execution record in `phase_nine_metrics.json` (line 1044). The markdown report text recorded values from an intermediate prototype run.
4. **Governance Action Enforced:** In strict accordance with Phase Thirteen safeguards, **the artifact was NOT overwritten**. The candidate's provenance is officially classified as **UNVERIFIED PENDING GOVERNANCE RECONCILIATION**, and candidate scoring has been **programmatically blocked by default in code** within `ShadowModeEvaluator`.

---

## 2. Recomputed Cryptographic Hashes

Recomputed via `shasum -a 256` on macOS Darwin 25.6.0 on October 12, 2026:

| Artifact | File Path | File Size | Recomputed SHA-256 |
| :--- | :--- | :---: | :--- |
| **Production Baseline (v1.0.0)** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | 7,105 bytes | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` |
| **Production Metadata (v1.0.0)** | `ml/artifacts/models/v1.0.0/model_metadata.json` | 6,758 bytes | `d2d790d96d299443574889c1df9ba57912aaeb7cf2a9cbe1b7021e5491104e76` |
| **Candidate Model (Phase 9 LR)** | `ml/artifacts/experiments/phase_nine_module_relative/experimental_module_relative_lr.joblib` | 13,025 bytes | `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` |
| **Candidate Model (Phase 9 XGB)** | `ml/artifacts/experiments/phase_nine_module_relative/experimental_module_relative_xgb.joblib` | 197,995 bytes | `9724f7e03b4970c6e118ef9b072aabf1549b13b1491628c7e9dccae4a5e2dbd2` |
| **Day-30 Processed Dataset** | `ml/data/processed/day30_features.csv` | 2,752,949 bytes | `e6f6e4f9c3cacc48a59b3ed1f5b814fcae1d8e350964c0340eed6aa61e4ee3b9` |

---

## 3. Historical Hash Tracking Matrix

| Phase Report / Record | Production Baseline LR (v1.0.0) | Candidate Module-Relative LR | Documented Size | Provenance Match |
| :--- | :---: | :---: | :---: | :---: |
| **Phase Nine Report** | `78a08227...` | `951f2dd1247ffeb45667104b20469b8efb48698bf4ba6ecb62d3a3399fc7ca63` | 8,881 B | **DISCREPANCY** |
| **Phase Nine Metrics JSON** | (Referenced) | `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` | 13,025 B | **EXACT MATCH** |
| **Phase Ten Audit Memo** | `78a08227...` | (Evaluated via OOF) | 13,025 B | **EXACT MATCH** |
| **Phase Eleven Audit** | `78a08227...` | `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` | 8,881 B (Note) | **HASH MATCH** |
| **Phase Twelve Design** | `78a08227...` | `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` | 13,025 B | **EXACT MATCH** |
| **Phase Thirteen (Recomputed)**| `78a08227...` | `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25` | 13,025 B | **EXACT MATCH (On Disk)** |

---

## 4. Root Cause Analysis of Candidate Discrepancy

A deep-dive investigation into the Phase Nine execution trace and serialization logic in [`ml/pipelines/run_module_relative_experiment.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/pipelines/run_module_relative_experiment.py) revealed the origin of the discrepancy:

1. **The Automated Pipeline Saved `2a27...`:**
   In `run_module_relative_experiment.py` lines 384–388:
   ```python
   "artifacts": {
       "experimental_lr": {
           "path": str(lr_art_path),
           "sha256": lr_hash,
           "size_bytes": lr_art_path.stat().st_size,
       }
   }
   ```
   When the pipeline executed, it saved the full model object including `ModuleRelativeTransformer` statistics for all 7 modules (`AAA` through `GGG`) and training global fallbacks, producing exactly 13,025 bytes with SHA-256 `2a2727aa...`. This was written automatically to `ml/reports/metrics/phase_nine_metrics.json`.
2. **Manual Documentation Drift in Phase Nine Markdown:**
   In [`ml/reports/phase_nine_module_relative_report.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_nine_module_relative_report.md) (line 124) and [`phase_nine_execution_record.md`](file:///Users/neemaysmac/Desktop/Sutra/ml/reports/phase_nine_execution_record.md) (line 99), the text recorded `951f2dd1...` and `8,881 bytes`.
   This corresponds to an earlier prototype run where the pipeline was serialized with an uncompressed transformer or minimal test state prior to the final script execution.
3. **Artifact Integrity Preservation:**
   Under Workstream A safeguards: **No artifact was modified or overwritten to retroactively match the markdown text.** The on-disk binary remains unaltered.

---

## 5. Candidate Governance Gating & Blocking Enforcement

Because a material textual discrepancy exists between the historical Phase Nine report and the physical artifact, the candidate model cannot be certified as fully verified under strict governance standards.

**Hardened Code Enforcement in Phase Thirteen:**
1. In [`ml/src/sutra_ml/evaluation/shadow_mode.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/evaluation/shadow_mode.py), the `ShadowModeEvaluator` constructor now requires an explicit parameter:
   ```python
   candidate_provenance_verified: bool = False
   ```
2. By default (`candidate_provenance_verified=False`), any call to `evaluate_batch()` **blocks candidate scoring**:
   - `report.candidate_blocked = True`
   - `report.candidate_provenance_status = "BLOCKED_UNVERIFIED_DISCREPANCY"`
   - `record.exp_blocked = True`
   - `record.exp_risk_probability = None`
   - `record.exp_alert_triggered = False`
   - `record.exp_model_version = "phase_nine_module_relative (BLOCKED)"`
3. Production baseline predictions continue to run cleanly and unimpeded on v1.0.0.
4. Candidate execution in shadow mode is **legally and technically blocked** until an authorized institutional governance waiver formally resolves the provenance record.

---

## 6. Serving API Immutability Verification

The production backend inference service was inspected to confirm complete isolation from the candidate model:
- **Service Configuration:** [`backend/app/core/config.py`](file:///Users/neemaysmac/Desktop/Sutra/backend/app/core/config.py) specifies `DEFAULT_MODEL_PATH = ... / v1.0.0 / baseline_logistic_regression.joblib` and `default_threshold = 0.46`.
- **Application Startup:** [`backend/app/main.py`](file:///Users/neemaysmac/Desktop/Sutra/backend/app/main.py) instantiates `SutraRiskPredictor` strictly with v1.0.0 artifacts.
- **Backend Tests:** All 16 backend inference and contract tests passed with zero errors (`test_health.py`, `test_predict.py`, `test_batch.py`, `test_validation.py`).

*Production serving remains 100% powered by Logistic Regression v1.0.0 at threshold 0.46.*
