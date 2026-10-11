# SUTRA Phase Twelve — Institutional Pilot Readiness & Privacy Safeguards Checklist

**Date:** 2026-10-12  
**Role:** Senior ML Systems Auditor & Governance Engineer  
**Purpose:** Pre-Pilot Governance Verification Gate for Prospective Shadow Evaluation  
**Scope:** Institutional Prerequisites, Privacy Architecture, Legal Governance, and Safety Gates  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Governance & Leadership Accountability

Before any prospective evaluation pipeline can receive live institutional telemetry, the following institutional roles and governance instruments must be formally appointed and executed:

| Requirement | Description | Status | Verification Criteria |
| :--- | :--- | :---: | :--- |
| **Named Institutional Sponsor** | Senior university officer (e.g. Dean of Academic Affairs, VP of Student Success) accountable for pilot oversight. | `PENDING INSTITUTION` | Formal appointment letter with explicit operational boundaries. |
| **Responsible ML Reviewer** | Lead ML Governance Engineer responsible for evaluating model parity, leakage prevention, and protocol compliance. | `ASSIGNED` | Antigravity AI Systems Governance Lead. |
| **Academic Ethics Sign-off** | Institutional Review Board (IRB) or Academic Research Ethics Committee approval. | `PENDING INSTITUTION` | Ethics approval or formal institutional exemption for quality improvement. |
| **Data Use Agreement (DUA)** | Executed legal contract defining authorized data scope, permitted use, and liabilities. | `PENDING INSTITUTION` | Signed DUA referencing SUTRA Phase Twelve evaluation protocol. |

---

## 2. Privacy, Ethics & Data Minimization Safeguards

The evaluation pipeline strictly enforces the principle of **data minimization**: only telemetry directly necessary for computing the 25 pre-registered predictors may be transmitted.

### 2.1 Identity De-Identification & Minimization Contract
- **No Direct Identifiers:** Full student names, email addresses, national insurance / SSN numbers, phone numbers, postal addresses, and birth dates are **strictly prohibited** from the evaluation payload.
- **Pseudonymous Learner Tokens:** All identifiers must be one-way cryptographically hashed using a salted HMAC-SHA256 function managed exclusively within the institution's key vault:
  $$\text{pseudonymous\_id} = \text{HMAC-SHA256}(\text{raw\_student\_id}, \text{institutional\_salt})$$
- **Restricted Demographic Categorization:** Demographics are collected only as broad binned categories (`imd_band` deciles, `age_band` 20-year intervals, `highest_education` levels) to prevent micro-targeting or deductive re-identification.

### 2.2 Storage, Access & Retention Policy
- **Encryption Standards:** All data in transit must use TLS 1.3; data at rest must use AES-256 encryption.
- **Access Control:** Role-Based Access Control (RBAC) ensuring only designated ML auditors have read access to shadow logs.
- **Retention & Mandatory Deletion:** Raw feature payloads must be automatically purged 90 days after academic term outcome certification. Only aggregated, anonymized metric summaries may be retained permanently.
- **Zero Third-Party Egress:** Models run entirely on institutional premises or inside an isolated, non-egress VPC. No telemetry is shared with external cloud LLMs or third-party APIs.

---

## 3. Telemetry & Feature Contract Readiness

The institution's data engineering team must certify that the extraction pipeline satisfies SUTRA's strict Day-30 temporal boundary:

- [ ] **Strict Day-30 Boundary Certification:** All clickstream logs (`studentVle`) and assessment submission events (`studentAssessment`) are filtered with $t \le 30$.
- [ ] **Assessment Score Exclusion:** Coursework scores and diagnostic marks are excluded from the payload to avoid grading latency leakage.
- [ ] **Leakage Scan Passed:** Automated scan verifies zero presence of `final_result`, `unregistration_date`, `course_outcome`, or exam scores.
- [ ] **Module Code Mapping:** Course department codes are mapped to recognizable discipline strings or fall back to verified general clusters.

---

## 4. Operational Safety & Intervention Firewall

To protect student well-being and maintain experimental validity, the shadow candidate model is **completely decoupled from student interventions**:

```
[ CRITICAL SAFETY INVARIANT ]
Under NO circumstances may predictions from the Phase Nine experimental
candidate be displayed to academic advisors, sent to students, or used
to trigger interventions during the shadow-mode evaluation.
```

- [x] **Hardcoded Blinding in Code:** Verified that `exp_intervention_eligible = False` and `exp_is_shadow = True` are immutable dataclass fields in [`ml/src/sutra_ml/evaluation/shadow_mode.py`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/evaluation/shadow_mode.py).
- [x] **Advisory Interface Isolation:** Academic advisors continue to receive only the active production v1.0.0 Evidence Cards at threshold `0.46`.
- [x] **Zero Production Endpoint Impact:** Production endpoints (`/predict`, `/batch_predict`, `/health`) remain unmodified and run exclusively on v1.0.0.
- [x] **Idempotent Audit Recording:** Dual predictions are logged to an isolated audit file with unique UUIDv4 `run_id` and SHA-256 payload fingerprints.

---

## 5. Incident Response & Rapid Rollback Plan

If an unexpected operational anomaly or technical failure occurs during the shadow evaluation:

| Severity Level | Trigger Condition | System Action | Escalation Procedure |
| :--- | :--- | :--- | :--- |
| **Severity 1 (Critical)** | Production API latency increases by $> 50\text{ms}$ or memory usage spikes. | Immediate disablement of shadow evaluation runner via kill-switch. | Production serving continues uninterrupted on v1.0.0; incident review within 2 hours. |
| **Severity 2 (High)** | Data payload contains target/leakage columns. | Immediate batch abort; quarantine payload. | Notify institutional data engineer; log incident in audit record. |
| **Severity 3 (Medium)** | Unseen module frequency exceeds $15\%$ of incoming cohort. | Flag for governance review; continue shadow run using global fallbacks. | Auditor analyzes curriculum changes; no disruption to production. |

---

## 6. Pre-Promotion Verification & Governance Gate

Prior to any consideration of promoting the module-relative model to production (v2.0.0):

- [ ] Complete semester outcomes certified by Institutional Examination Board.
- [ ] Blinded outcomes merged with pre-registered Day-30 predictions by an independent auditor.
- [ ] Pre-registered statistical tests executed with $B = 1,000$ student-cluster bootstrap iterations.
- [ ] Formal Verification Memo submitted demonstrating:
  1. $\Delta \text{ROC-AUC} \ge +0.015$ ($p < 0.01$).
  2. Statistically significant decrease in advisor false alarms.
  3. No worsening of demographic disparity ratios $> 5\%$.
  4. Stable calibration ($\text{ECE} \le 0.050$).
- [ ] Unanimous sign-off from Academic Sponsor, ML Lead, and Institutional Reviewer.

*Until all checklists above are complete and formally signed off, SUTRA remains locked in production on Logistic Regression v1.0.0 at threshold 0.46.*
