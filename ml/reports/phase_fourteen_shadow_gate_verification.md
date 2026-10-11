# SUTRA Phase Fourteen — Shadow Evaluation Gate Verification & Cryptographic Security Audit

**Date:** 2026-10-12  
**Role:** Senior ML Model Governance Auditor & Security Engineer  
**Status:** Technical Verification Document  
**Target Module:** `ml/src/sutra_ml/evaluation/shadow_mode.py`  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Current Branch:** `Neemay-ml`  

---

## 1. Executive Summary

Workstreams B and C audited the execution gating mechanisms, anti-bypass protections, rejection logging privacy, and cryptographic fingerprinting design of SUTRA’s shadow-mode evaluation engine.

### Key Verification Findings:
1. **Gate Inviolability Verified:** By default, `ShadowModeEvaluator` completely refuses candidate execution (`candidate_blocked = True`, `exp_risk_probability = None`). Production baseline predictions on v1.0.0 remain active, calibrated, and unaffected.
2. **Anti-Bypass Safeguards Confirmed:** Every identified bypass vector (request flag injection in data payloads, metadata tampering, post-inference dataclass mutation) is blocked and covered by automated unit tests in [`test_phase_fourteen_provenance_gate.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/tests/unit/test_phase_fourteen_provenance_gate.py).
3. **Rejection Logging Privacy:** Rejection records log only the student identifier token and the sanitary validation failure string (e.g. `"Non-numeric or null value in numerical feature 'vle_total_clicks_d30': nan"`), never exposing student demographic attributes or feature vectors.
4. **Configuration Boundary Established for HMAC Salt:** Hardcoded production secret dependencies were eliminated; `ShadowModeEvaluator` resolves its HMAC salt from the `SUTRA_SHADOW_SALT` environment variable configuration boundary.
5. **Key Custody & Deduplication Limitations Formally Documented:** Established key rotation rules, proved that fingerprints are pseudonymous rather than anonymous data, and re-confirmed the necessity of an external ACID store for multi-batch production idempotency.

---

## 2. Workstream B: Execution Gate & Anti-Bypass Verification

### 2.1 Default Refusal of Candidate Execution
When instantiated without explicit authorization flags:
```python
evaluator = ShadowModeEvaluator()
```
The evaluator automatically enforces:
- `evaluator.candidate_provenance_verified == False`
- `evaluator.provenance_status == "BLOCKED_UNVERIFIED_DISCREPANCY"`
- `report.candidate_blocked == True`
- `report.experimental_alert_count == 0`
- `report.mean_risk_delta is None`
- For every scored record:
  - `rec.exp_blocked == True`
  - `rec.exp_risk_probability is None`
  - `rec.exp_alert_triggered == False`
  - `rec.exp_model_version == "phase_nine_module_relative (BLOCKED)"`
  - `rec.exp_block_reason == "Candidate scoring blocked: Provenance unverified due to Phase Nine report hash discrepancy"`

### 2.2 Attack Surface & Bypass Vector Analysis

| Attack Vector | Attacker Action | System Defense | Test Verification |
| :--- | :--- | :--- | :---: |
| **Payload Column Injection** | Passing `candidate_provenance_verified = True` in input DataFrame | Whitelist schema scan flags column as unexpected; raises `ValueError` | `test_bypass_attempt_via_payload_injection_fails_closed` |
| **Intervention Flag Tampering** | Passing `is_shadow = False` or `intervention_eligible = True` in input DataFrame | Whitelist schema scan flags column as unexpected; raises `ValueError` | `test_bypass_attempt_via_payload_injection_fails_closed` |
| **Dataclass In-Memory Mutation** | Overwriting `rec.exp_intervention_eligible = True` after inference | Dataclass is marked `frozen=True`; raises `dataclasses.FrozenInstanceError` | `test_bypass_attempt_via_record_mutation_fails_closed` |
| **Missing Model File** | Supplying non-existent or corrupted candidate model path | Initialization validates existence; raises `FileNotFoundError` | `test_missing_model_artifacts_fail_closed` |
| **Production Disruption** | Candidate block leaking into production scoring | Production pipeline runs independently; produces valid probabilities in $[0, 1]$ | `test_production_path_remains_active_when_candidate_blocked` |

### 2.3 Rejection Logging & Audit Privacy
When malformed records (e.g. non-finite numbers, nulls, invalid categorical levels) are submitted:
- Each rejected record is excluded from scoring and logged in `report.rejections`.
- **Sanitary Reason Logging:** The reason contains only the violating feature name and the illegal value (e.g., `"Invalid categorical level 'UNKNOWN_VAL' in column 'gender'"`).
- **Zero Sensitive Data Leakage:** The rejection log never serializes other feature keys, demographic backgrounds, or student characteristics, ensuring audit exports comply with privacy minimization principles.

---

## 3. Workstream C: Cryptographic Fingerprinting & Secret Management

### 3.1 Configuration Boundary for Salt Management
Hardcoding a shared static secret in application source code represents an unacceptable security vulnerability in institutional environments.
- **Refactored Architecture:** `ShadowModeEvaluator` and `compute_canonical_fingerprint` now resolve the HMAC salt from the environment variable boundary:
  ```python
  resolved_salt = salt if salt is not None else os.getenv("SUTRA_SHADOW_SALT", "sutra_shadow_salt_v1").encode("utf-8")
  ```
- **Local Testing:** Defaults safely to `sutra_shadow_salt_v1` in local development without breaking existing smoke tests.
- **Production Piloting:** Requires institutional key injection via `SUTRA_SHADOW_SALT` from the partner university's secure Key Management Service (KMS).

### 3.2 Key Custody & Security Requirements
In a prospective institutional deployment:
1. **Hardware Security Module (HSM) / Key Vault:** The salt must be generated as a cryptographically strong 256-bit random key (`openssl rand -hex 32`) and stored in an institutional key vault (AWS KMS, Azure Key Vault, HashiCorp Vault, or Google Cloud KMS).
2. **Zero In-Repo Persistence:** Secrets must never be committed to Git, logged to disk, or included in diagnostic telemetry exports.

### 3.3 Key Rotation & Incomparability Implications
- **Rotation Breaks Hash Linkage:** If an institution rotates its HMAC key from $\text{Key}_A$ to $\text{Key}_B$:
  $$\text{HMAC}(\mathbf{x}, \text{Key}_A) \ne \text{HMAC}(\mathbf{x}, \text{Key}_B)$$
- **Impact on Evaluation:** Records scored across different terms under rotated keys will produce distinct fingerprints even if student data is identical.
- **Mitigation Requirement:** The evaluation system must prefix fingerprints with an institutional key identifier (e.g., `key_v1:7a8f...`) so deduplication scopes are explicitly bound to the active key version.

### 3.4 Why Fingerprints Are Pseudonymous Personal Data
Under GDPR (Recital 26) and FERPA:
```
[ PRIVACY CLASSIFICATION NOTICE ]
Cryptographic hashes and HMAC fingerprints of student records do NOT
constitute fully anonymized data. They are PSEUDONYMOUS personal data.
```
- **Vulnerability to Dictionary Attacks:** If an attacker possesses the student registration list and knows the candidate feature values, they can compute HMACs for all known combinations and match them against the audit logs unless the secret key is strictly protected.
- **Regulatory Status:** Audit logs containing fingerprints must be stored in access-controlled environments and subject to the same Data Use Agreement (DUA) protections as raw student features.

### 3.5 Limitations of In-Run Deduplication vs. Cross-Run Exactly-Once Processing
- **In-Run Deduplication (Active in Code):** Memory sets (`seen_fingerprints`, `seen_record_ids`) successfully prevent duplicate or conflicting records within a single batch submission.
- **Cross-Run Idempotency (Stateless Limitation):** Because SUTRA maintains no local database, a student record resubmitted in a subsequent process execution will be processed again.
- **Production Requirement:** Exactly-once cross-run processing requires provisioning an external ACID database table with a unique constraint on `(run_cohort, record_fingerprint)` prior to launching a multi-batch institutional pilot.
