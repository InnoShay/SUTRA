# SUTRA Phase Thirteen — Shadow-Mode Contract Hardening & Evaluation Audit

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Test Engineer  
**Status:** Audit Closure Review Document  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Branch:** `Neemay-ml`  

---

## 1. Executive Summary

Phase Thirteen performed an independent audit and hardening of the shadow-mode evaluation engine established in Phase Twelve. This phase audited the dual-scoring pipeline, schema fail-closed guarantees, leakage detection, deterministic fingerprinting, duplicate handling, and fairness/subgroup disparity controls.

### Key Audit Findings & Hardening Actions:
1. **Schema Fail-Closed Whitelist (Workstream B):** Replaced permissive schema ingestion with a strict whitelist (`ALLOWED_COLUMNS`). Any unexpected column—including unapproved PII, metadata, or unmapped identifiers—now triggers an immediate fatal exception, guaranteeing data minimization.
2. **Expanded Leakage Protection (Workstream B):** Expanded the target/outcome blacklist from 9 to 25 canonical patterns, covering alternate naming conventions (`final_grade`, `exam_score`, `withdrawal_date`, `is_withdrawn`, `attrition`, `post_d30_clicks`) with tokenized matching that avoids naive substring collisions.
3. **Data Quality & Rejection Invariant (Workstream B):** Implemented strict checks for non-finite numeric values (`NaN`, $\pm\infty$, `None`) and categorical domain validation. Enforced the absolute operational invariant:
   $$\text{Total Records Submitted} = \text{Valid Records Scored} + \text{Rejected Records Count}$$
   Ensuring zero silent conversion of invalid inputs.
4. **Canonical Salted Fingerprinting & In-Run Duplicate Detection (Workstream C):** Implemented deterministic HMAC-SHA256 fingerprinting with key sorting, 6-decimal float rounding, and institutional salting. Implemented in-run duplicate and conflicting-ID rejection.
5. **Mathematical Subgroup Disparity & Privacy Suppression (Workstream E):** Built automated Disparate Impact Ratio (DIR) calculations enforcing the Four-Fifths rule, with strict privacy cell suppression ($N < 5$) and inconclusive labeling ($N < 50$).

---

## 2. Workstream B: Dual-Scoring & Leakage Contract Audit

### 2.1 Raw Feature Compatibility
Both models receive compatible raw inputs derived from the same Day-30 feature payload:
- **Production Baseline (v1.0.0):** Extracts the 25 pre-registered features (19 numerical, 6 categorical). Its `ColumnTransformer` applies `StandardScaler` to numerical features, `OneHotEncoder` to categoricals, and `remainder="drop"` to identifiers.
- **Experimental Candidate (Phase Nine):** Extracts the 25 baseline features plus `code_module`. Its `ModuleRelativeTransformer` standardizes 11 engagement features relative to module-specific training fold distributions ($z$-score), and falls back deterministically to global statistics for unseen disciplines (`code_module`).

### 2.2 Cutoff Semantics: Feature vs. Outcome Timestamps
- **Feature Cutoff:** Strictly enforced at calendar **Day 30** relative to course start ($t \le 30$). Telemetry recorded after Day 30 is strictly excluded.
- **Outcome Maturation:** Final academic results (`Fail`, `Pass`, `Distinction`) and withdrawal dates ($t_{\text{unreg}} > 30$) are determined at the end of the academic term ($t \approx 120\text{--}150$ days).
- **Temporal Enforcement in Code:** `ShadowModeEvaluator` enforces `cutoff_day == 30` and validates that no conflicting cutoff metadata exists in the input payload.

### 2.3 Fail-Closed Whitelist Policy
Previously, `validate_payload` only checked for missing required features and blacklisted leakage columns. If an institution inadvertently passed unapproved fields (e.g. `student_name`, `email`, `cumulative_gpa`), they passed silently into memory.

**Hardened Policy:**
```python
ALLOWED_IDENTIFIERS = {"record_id", "id_student", "code_module", "code_presentation", "cutoff_day"}
ALLOWED_COLUMNS = set(SUTRA_25_FEATURES) | ALLOWED_IDENTIFIERS
```
Any column outside `ALLOWED_COLUMNS` immediately raises a `ValueError`. This protects against data leakage and enforces institutional data minimization contracts.

### 2.4 Expanded Leakage Blacklist & Matching Policy
The blacklist was expanded to capture realistic operational naming conventions:
`final_result`, `target`, `outcome`, `unregistered`, `date_unregistration`, `unregistration_date`, `score`, `assessment_score`, `vle_clicks_post_d30`, `exam_score`, `final_score`, `grade`, `final_grade`, `withdrawn_date`, `withdrawal_date`, `date_withdrawal`, `is_withdrawn`, `dropout`, `attrition`, `passed`, `failed`, `post_d30_clicks`, `clicks_after_day30`, `unreg_date`, `status`, `result`.

**Matching Policy:**
Normalized token matching (lowercased, stripping spaces and dashes) is used. Naive substring matching (e.g., `"score" in col`) was explicitly avoided to prevent rejecting legitimate pre-registered features such as `has_early_assessment_submission_d30` or `assessments_submitted_d30`.

### 2.5 Input Validation & Rejection Accounting
- **Non-Finite Values:** Floats with `NaN`, $\pm\infty$, or `None` in numeric features are quarantined into `rejections`.
- **Categorical Domains:** Values in `gender`, `disability`, `region`, `highest_education`, `imd_band`, and `age_band` are validated against strict allowed sets. Invalid levels are rejected and logged.
- **Accounting Verification:** The evaluator guarantees that rejected records are excluded from scoring, and that `submitted == scored + rejected` holds without exception.

---

## 3. Workstream C: Fingerprinting & Duplicate Handling Audit

### 3.1 Fingerprint Lifecycle & Canonical Serialization
To guarantee deterministic deduplication, `compute_canonical_fingerprint` executes the following sequence:
1. **Field Sorting:** Keys are sorted lexicographically (`sorted(SUTRA_25_FEATURES)`).
2. **Numeric Canonicalization:** Floating-point numbers are formatted to 6 decimal places (`f"{float(val):.6f}"`), eliminating floating-point serialization discrepancies across architectures.
3. **Canonical String Construction:** JSON serialization uses minimal separators (`separators=(',', ':')`) and UTF-8 encoding.
4. **Salted HMAC:** The canonical byte stream is hashed using `HMAC-SHA256` with an institutional salt:
   $$\text{fingerprint} = \text{HMAC-SHA256}(\text{canonical\_payload}, \text{institutional\_salt})[:16]$$

### 3.2 Duplicate & Collision Handling Scenarios
- **Identical Record in Same Run:** Detected via `seen_fingerprints`. The first occurrence is scored; duplicates are rejected with reason `Duplicate record in run`.
- **Conflicting Payload for Same Record ID in Same Run:** Detected via `seen_record_ids`. The first payload is scored; conflicting payloads are rejected with reason `Conflicting record_id with different payload in same run`.
- **Identical Record in Subsequent Runs:** Under the current stateless design, each invocation generates a fresh `run_id`. Identical records will generate identical fingerprints across runs.

### 3.3 Stateless Design Limitation & Required External Interface
**Architectural Gap:**
Because the SUTRA repository is stateless and does not maintain an external database, **cross-run deduplication and idempotency cannot be guaranteed locally**.

**Required Production Interface Contract:**
For an authentic institutional deployment, an external ACID state store must be implemented satisfying the following interface:
```sql
CREATE TABLE shadow_evaluation_records (
    run_cohort VARCHAR(32) NOT NULL,
    record_fingerprint VARCHAR(32) NOT NULL,
    record_id VARCHAR(64) NOT NULL,
    scored_at_utc TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (run_cohort, record_fingerprint)
);
```

---

## 4. Workstream E: Fairness, Subgroup Disparity & Privacy Controls

### 4.1 Mathematical Subgroup Disparity Metrics
To ensure objective, reproducible monitoring of early-warning equity, `ShadowBatchReport.compute_subgroup_disparity` implements the following mathematical formulations:

1. **Selection Parity / Disparate Impact Ratio (DIR):**
   $$\text{Alert Rate}(g) = \frac{\sum_{i \in g} \mathbb{I}(\hat{y}_i = 1)}{N_g}$$
   $$\text{DIR}(g) = \frac{\text{Alert Rate}(g)}{\text{Alert Rate}(G_{\text{ref}})}$$
   Under the standard **Four-Fifths Rule (EEOC)**, an adverse selection disparity is flagged if:
   $$\text{DIR}(g) < 0.80 \quad \text{or} \quad \text{DIR}(g) > 1.25$$

2. **False Positive Rate Parity Ratio (Burden Parity):**
   $$\text{FPR\_Ratio}(g) = \frac{\text{FPR}(g)}{\text{FPR}(G_{\text{ref}})} = \frac{P(\hat{Y}=1 \mid Y=0, G=g)}{P(\hat{Y}=1 \mid Y=0, G=G_{\text{ref}})}$$

### 4.2 Minimum Sample Size & Privacy Suppression Rules
- **Small-Cell Suppression ($N_g < 5$):** Cells with fewer than 5 records are marked as `PRIVACY_SUPPRESSED` (`<5 (Suppressed for Privacy)`), preventing deductive re-identification of vulnerable students.
- **Inconclusive Threshold ($5 \le N_g < 50$):** Subgroups with sample sizes below 50 are labeled `INCONCLUSIVE (N < 50)` because the resulting Wilson binomial confidence interval width ($> \pm 14\%$) makes disparity calculations statistically unreliable.
- **Evaluated Subgroups ($N_g \ge 50$):** Disparity ratios and Four-Fifths flags are fully computed and reported.

### 4.3 Separation of Code Controls vs. Institutional Infrastructure

| Control | Implemented in SUTRA Code | Institutional Infrastructure Dependency |
| :--- | :---: | :---: |
| **Fail-Closed Whitelist** | **YES** | None |
| **Leakage Blacklist Scan** | **YES** | None |
| **Canonical Salted Fingerprint** | **YES** | Key-vault custody of institutional salt |
| **Intervention Blinding Flag** | **YES** | Institutional advisory UI adherence |
| **Subgroup DIR & Privacy Masking**| **YES** | None |
| **At-Rest & In-Transit Encryption**| **NO** | Institutional TLS 1.3 & AES-256 storage |
| **Role-Based Access Control** | **NO** | Institutional Identity Provider (IdP/IAM) |
| **Retention Auto-Purge Cron** | **NO** | Institutional Database Lifecycle Policy |
| **Ethics & DUA Authorization** | **NO** | University Legal & IRB Governance |

---

## 5. Test Suite Verification

All hardened contracts were validated via 12 dedicated automated unit tests in [`ml/tests/unit/test_phase_thirteen_shadow_contract.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_thirteen_shadow_contract.py).

The complete SUTRA test suite was executed:
- **Command:** `PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests`
- **Result:** **110 passed in 0.65s** (Zero failures, zero regressions across ML and backend suites).
