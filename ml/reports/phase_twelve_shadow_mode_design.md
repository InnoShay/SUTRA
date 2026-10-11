# SUTRA Phase Twelve — Technical Shadow-Mode Architecture & System Design

**Date:** 2026-10-12  
**Role:** Senior ML Systems Architect & Governance Engineer  
**Status:** Pre-Deployment Technical Architecture Specification  
**Current Production Model:** Regularized Logistic Regression v1.0.0 (SHA-256: `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f`) at Threshold `0.46`  
**Experimental Shadow Candidate:** Phase Nine Module-Relative Logistic Regression (SHA-256: `2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25`)  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Executive Overview & Purpose

Following the governance findings of Phase Ten (which confirmed that historical OULAD data contains no untouched holdout) and Phase Eleven (which formally rejected KDD Cup 2015 due to structural and semantic incompatibility), the primary path for validating SUTRA's module-relative feature enhancement is a **prospective, read-only shadow-mode pilot** on a future academic cohort.

This document defines the technical architecture and execution contract for running the Phase Nine module-relative candidate alongside the active production model.

### Absolute Governance Constraints:
1. **Production Immutability:** Active serving in `backend/app/main.py` remains 100% powered by Logistic Regression v1.0.0 at threshold `0.46`.
2. **Intervention Blinding:** Candidate predictions are tagged strictly with `is_shadow: true` and `intervention_eligible: false`. They are mathematically prevented from triggering student alerts, advisor notifications, emails, or automated actions.
3. **No Unapproved Data Collection:** This design establishes the technical readiness contract. It does not assume institutional access, collect unauthorized data, or write records to production databases.

---

## 2. Shadow-Mode Architecture & Data Flow

The shadow-mode architecture operates as an asynchronous, decoupled secondary evaluation pipeline that taps into incoming Day-30 feature batches without intercepting or altering real-time production inference.

```
       Authorized Institutional Data Feed (Day-30 Cohort)
                             │
                             ▼
              [ 1. Ingestion & Pre-Validation ]
              - Cutoff Boundary Enforcement (date <= 30)
              - Leakage Column Rejection (final_result, score, etc.)
              - 25-Feature Schema & Finite Numeric Validation
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    [ Primary Serving Path ]     [ Shadow Evaluation Path ]
     (Active Production)          (Read-Only Candidate)
              │                             │
    Loads v1.0.0 Baseline         Loads Phase 9 Module-Relative
    SHA-256: 78a08227...          SHA-256: 2a2727aa...
              │                             │
    Predicts Risk Probability     Predicts Risk Probability
    Applies Threshold 0.46        Applies Threshold 0.46
    Synthesizes Evidence Card     Applies Module-Z Normalization
              │                             │
    Tags:                         Tags:
    is_production: true           is_shadow: true
    intervention_eligible: true   intervention_eligible: false (HARD-BLOCKED)
              │                             │
              ▼                             ▼
    [ Standard Advisory Queue ]   [ Isolated Audit Store ]
    (Subject to Human Review)     - UUID Run ID
                                  - SHA-256 Record Fingerprint
                                  - Paired Risk Probability Delta
                                  - Unseen Module Fallback Tracking
```

---

## 3. The Shadow-Mode Execution Contract

The shadow evaluation contract is formalized in Python in [`ml/src/sutra_ml/evaluation/shadow_mode.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/evaluation/shadow_mode.py) through the `ShadowModeEvaluator` class:

### 3.1 Input Payload Validation
1. **Required Identifiers:** Each record must supply `record_id` (or pseudonymous student token) and `code_module` (course department/subject).
2. **Required Features (25 Columns):**
   - **19 Numerical:** `num_of_prev_attempts`, `studied_credits`, `days_registered_before_start`, `has_missing_registration_date`, `vle_total_clicks_d30`, `vle_active_days_d30`, `vle_clicks_precourse`, `vle_clicks_poststart_d30`, `vle_clicks_last_7d`, `vle_days_since_last_click`, `vle_clicks_forumng_d30`, `vle_clicks_oucontent_d30`, `vle_clicks_quiz_d30`, `vle_clicks_homepage_d30`, `vle_clicks_other_d30`, `has_vle_activity_d30`, `assessments_submitted_d30`, `assessment_banked_d30`, `has_early_assessment_submission_d30`.
   - **6 Categorical:** `gender`, `region`, `highest_education`, `imd_band`, `age_band`, `disability`.
3. **Leakage Blacklist (Automatic Rejection):**
   Any payload containing `final_result`, `target`, `outcome`, `unregistered`, `date_unregistration`, `unregistration_date`, `score`, `assessment_score`, or `vle_clicks_post_d30` raises a fatal validation exception.

### 3.2 Dual Inference Execution
For every validated record $i$:
1. **Production Scoring:**
   $$P_{\text{prod}}(y=1 \mid \mathbf{x}_i) = \sigma\left(\mathbf{w}_{\text{v1}}^\top \phi_{\text{baseline}}(\mathbf{x}_i)\right)$$
   $$\text{Alert}_{\text{prod}} = \mathbb{I}\left(P_{\text{prod}} \ge 0.46\right)$$
2. **Shadow Candidate Scoring:**
   $$P_{\text{exp}}(y=1 \mid \mathbf{x}_i) = \sigma\left(\mathbf{w}_{\text{exp}}^\top \phi_{\text{module-rel}}(\mathbf{x}_i)\right)$$
   $$\text{Alert}_{\text{exp}} = \mathbb{I}\left(P_{\text{exp}} \ge 0.46\right)$$
3. **Intervention Firewall:**
   `record.exp_intervention_eligible = False` is enforced by immutable dataclass attributes (`frozen=True`), preventing accidental integration into messaging or advisory notification systems.

### 3.3 Audit Trail & Idempotency
Each evaluation batch produces an immutable `ShadowBatchReport`:
- `run_id`: Fresh UUIDv4 uniquely identifying the evaluation execution.
- `timestamp_utc`: ISO-8601 UTC timestamp of execution.
- `production_model_hash` & `experimental_model_hash`: Cryptographically verified SHA-256 hashes matching approved model artifacts.
- `record_fingerprint`: 16-character SHA-256 hash of `(record_id, code_module, feature_values)` ensuring deduplication and idempotency.
- `alert_discrepancy_count`: Count of records where production and shadow candidate disagree on alert status ($\text{Alert}_{\text{prod}} \ne \text{Alert}_{\text{exp}}$).

---

## 4. Failure Modes & Graceful Degradation

| Failure Mode | Detection Mechanism | System Action | Risk Mitigation |
| :--- | :--- | :--- | :--- |
| **Target / Post-Cutoff Leakage** | Header scan against `LEAKAGE_COLUMNS` | Hard abort: Entire batch rejected with HTTP 422 / fatal error | Completely blocks contaminated data from entering evaluation |
| **Missing Features** | Schema check against 25 required columns | Hard abort: Payload rejected with explicit missing column list | Prevents arbitrary or silent imputation |
| **Non-Finite Numeric Inputs** | Per-row `np.isnan()` / `np.isinf()` check | Record rejected and logged in `rejections` list | Prevents model numerical instability |
| **Unseen Course Module** | Lookup against `transformer.module_stats_` | Graceful fallback to global training mean and standard deviation | Zero runtime crash; tracked in `unseen_module_count` metric |
| **Artifact Hash Mismatch** | Startup comparison against known SHA-256 | Hard abort during initialization | Prevents running unapproved or modified model binaries |

---

## 5. Security & Isolation Verification

The isolation contract was verified via automated testing in [`ml/tests/unit/test_phase_twelve_shadow_mode.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_twelve_shadow_mode.py):
- **7 new dedicated unit tests** verified:
  - Cryptographic hash matching for production and experimental models.
  - Zero leakage of candidate alerts to intervention systems (`exp_intervention_eligible == False`).
  - Strict payload rejection upon injection of `final_result` or `date_unregistration`.
  - Seamless global fallback for unseen module codes (`COMPUTING_999`).
  - Deterministic fingerprinting across repeated identical executions.
- All 98 SUTRA repository tests pass cleanly in 0.55s.
