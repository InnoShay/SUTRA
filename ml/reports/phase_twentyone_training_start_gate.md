# SUTRA Phase Twenty-One — Training-Start Gate & Governance Verification Protocol

**Milestone:** CODEX 3.0 PS6 Dataset Acquisition & Evaluation Readiness  
**Document Type:** Formal Phase Transition Verification Protocol  
**Author:** Senior Applied ML Scientist, Data Acquisition Analyst, and Evaluation Protocol Auditor  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Date:** October 2026  
**Status:** Mandatory Pre-Training Enforcement Gate  

---

## 1. Executive Summary

Phase Twenty-Two training cannot commence based on informal assumptions or partial data extracts.

This document establishes the **SUTRA Training-Start Gate (v1.0.0)**: a rigorous, 10-point pass/fail checklist enforced by the [`LongitudinalDatasetValidator`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/data/longitudinal_validator.py). Every criterion must be formally certified before code execution for model fitting is authorized.

---

## 2. Workstream E — Ten-Point Training-Start Gate Checklist

```
TRAINING-START GATE VERIFICATION FLOW:
┌───────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ 1. Legal / Ethics Auth    │ ──► │ 2. Ingestion & Schema     │ ──► │ 3. Point-in-Time Check    │
│ (Signed DUA + IRB Cert)   │     │ (Zero Forbidden Columns)  │     │ (Zero Event Leakage)      │
└───────────────────────────┘     └───────────────────────────┘     └───────────────────────────┘
                                                                                  │
┌───────────────────────────┐     ┌───────────────────────────┐                   ▼
│ 6. Subgroup Power Audit   │ ◄── │ 5. Statistical Power      │ ◄── ┌───────────────────────────┐
│ (Per-department coverage) │     │ (N_eff & Minority Events) │     │ 4. Outcome Maturity       │
└─────────────┬─────────────┘     └───────────────────────────┘     │ (100% Final Registrar)   │
              │                                                     └───────────────────────────┘
              ▼
┌───────────────────────────┐     ┌───────────────────────────┐     ┌───────────────────────────┐
│ 7. Partition Freezing     │ ──► │ 8. Threshold Policy       │ ──► │ 9. Reproducibility Freeze │
│ (Train / Val / Test Hash) │     │ (Derived on Val, Not 0.46)│     │ (Commit SHA + Artifacts)  │
└───────────────────────────┘     └───────────────────────────┘     └─────────────┬─────────────┘
                                                                                  │
                                                                                  ▼
                                                                    ┌───────────────────────────┐
                                                                    │ 10. FORMAL SIGN-OFF       │
                                                                    │ PHASE 22 TRAINING START   │
                                                                    └───────────────────────────┘
```

### Detailed Gate Audit Criteria

| Gate Check # | Verification Requirement | Verification Method & Target Standard | Status |
|---|---|---|:---:|
| **Gate 1** | **Dataset Source & Permitted Use Documented** | Executed Data Use Agreement (DUA) and institutional permission on file. Clearly establishes educational early-warning research scope. | ❌ Pending Data |
| **Gate 2** | **Data Dictionary & Target Mapping Approved** | Schema validated against [`LongitudinalSnapshotRow`](file:///Users/neemaysmac/Desktop/Sutra/ml/src/sutra_ml/schemas/longitudinal_contract.py). Target mapped strictly to binary credit outcome ($1 = \text{Fail/Withdraw}, 0 = \text{Pass}$). | ✅ Contract Ready |
| **Gate 3** | **Point-in-Time Validation Passes** | Executed via `LongitudinalDatasetValidator.validate_dataframe()`. Verifies zero target leakage columns (`final_result`, etc.) and zero timestamp violations ($t_{\text{event}} \le T_{\text{cutoff}}$). | ✅ Validator Ready |
| **Gate 4** | **Mature Outcome Labels Verified** | $100.0\%$ final grades confirmed in registrar records. Zero ongoing grade appeals, zero unresolved incomplete deferrals ('I'). | ❌ Pending Data |
| **Gate 5** | **Statistical Power & Sample Size Verified** | Minimum $\ge 500$ effective positive events ($Y=1$) in test holdout. Effective sample size $N_{\text{eff}} = \frac{N}{1 + (m-1)\text{ICC}}$ certified. | ❌ Pending Data |
| **Gate 6** | **Subgroup & Departmental Coverage Reviewed** | Every major academic school/department contains $\ge 100$ positive events in test holdout to allow disaggregated calibration audits. | ❌ Pending Data |
| **Gate 7** | **Train, Validation, and Test Partitions Frozen** | Temporal boundaries fixed across contiguous terms. Student grouping enforced (`GroupKFold`). Hashed partition indices committed to repository. | ✅ Protocol Ready |
| **Gate 8** | **Pre-Specified Evaluation Metrics & Threshold Policy** | Primary metrics: PR-AUC, ECE (10 bins), Brier score, Recall at top $10\%$ triage capacity. Explicit policy: threshold $\theta^*$ derived on validation set; **0.46 threshold carryover strictly barred**. | ✅ Protocol Ready |
| **Gate 9** | **Reproducibility & Artifact Hashing Established** | Raw data SHA-256 hash, Git commit SHA, random seed, and pipeline configuration logged to `model_metadata.json`. | ✅ Invariant Ready |
| **Gate 10** | **Formal Governance & Ethics Sign-Off** | Institutional Review Board (IRB) exemption / research ethics approval certified. Client-side pseudonymization verified. | ❌ Pending Partner |

---

## 3. Enforcement Decision Rule

```
IF ALL 10 Gate Checks == CERTIFIED:
    AUTHORIZE: Phase Twenty-Two Model Training & Hyperparameter Tuning
ELSE:
    HALT: Maintain Baseline Logistic Regression v1.0.0 @ 0.46
    ACTION: Remediate Failing Checks Prior to Code Execution
```

**Current Operational Status:**
- SUTRA has pre-certified **6 out of 10 checks** on an engineering and architectural level (Gates 2, 3, 7, 8, 9).
- The remaining **4 checks** (Gates 1, 4, 5, 6, 10) require physical receipt of an institutional dataset and executed legal governance agreements.
- Model training is **strictly blocked** until all 10 checks pass.
