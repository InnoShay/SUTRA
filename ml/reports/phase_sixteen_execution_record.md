# SUTRA Phase Sixteen — Execution Record & Verification Log

**Date:** 2026-10-12  
**Role:** Senior ML Engineer (Reproducible Evaluation & Explainable ML)  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  
**Branch:** `Neemay-ml`  
**Status:** **Testing Playground Ready — Verified & Operational**

---

## 1. System & Runtime Environment

- **Operating System:** Darwin 24.6.0 (macOS, Apple Silicon ARM64)
- **Python Version:** 3.13.6 (`/Library/Frameworks/Python.framework/Versions/3.13/bin/python3`)
- **Key Dependencies:**
  - `scikit-learn`: 1.7.2
  - `xgboost`: 3.4.1
  - `pandas`: 2.2.3
  - `numpy`: 2.2.3
  - `pydantic`: 2.11.0
  - `fastapi`: 0.115.11
  - `rich`: 13.9.4
  - `pytest`: 9.1.1

---

## 2. Verification of Mandatory Safeguards

| Safeguard Verification Item | Target Standard | Observed State | Audit Outcome |
| :--- | :--- | :--- | :--- |
| **Production Model Artifact Path** | `ml/artifacts/models/v1.0.0/baseline_logistic_regression.joblib` | Unmodified | **VERIFIED** |
| **Production Model SHA-256** | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | **MATCH (VERIFIED)** |
| **Production Artifact Byte Size** | 7,105 bytes | 7,105 bytes | **MATCH (VERIFIED)** |
| **Active Operational Threshold** | `0.46` | `0.46` | **VERIFIED** |
| **Candidate Execution Gate** | `candidate_provenance_verified = False` | Defaults to False (`exp_blocked=True`) | **VERIFIED CLOSED** |
| **Synthetic Identity Labeling** | `record_id` prefixed with `SYNTH-` | All prefixed with `SYNTH-` | **VERIFIED** |
| **Prohibition of Synthetic Claims**| No synthetic metrics represented as accuracy | Explicit warnings and guardrails | **VERIFIED** |
| **Historical Partition Notice** | 2014J flagged as development evidence | Mandatory notice in evaluation reports | **VERIFIED** |

---

## 3. CLI Execution Traces & Exit Codes

### Command 1: Synthetic Dataset Generation
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/generate_synthetic_data.py --seed 42 --count 100
```
- **Exit Code:** `0`
- **Output:**
```
[*] Initializing SyntheticDataGenerator with seed=42...
[*] Generating 100 batch records...
    -> Saved 100 records to /Users/neemaysmac/Desktop/Sutra/ml/data/synthetic/synthetic_batch_100.json
    -> Saved 100 records to /Users/neemaysmac/Desktop/Sutra/ml/data/synthetic/synthetic_batch_100.csv
[*] Generating named demonstration scenarios...
    -> Saved 6 named scenarios to /Users/neemaysmac/Desktop/Sutra/ml/data/synthetic/named_scenarios.json
[*] Generating negative validation test cases...
    -> Saved 7 negative cases to /Users/neemaysmac/Desktop/Sutra/ml/data/synthetic/negative_test_cases.json
    -> Saved documentation to /Users/neemaysmac/Desktop/Sutra/ml/data/synthetic/README.md
[+] Synthetic dataset generation complete.
```

---

### Command 2: Playground — High Engagement Scenario
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --scenario HIGH_ENGAGEMENT_ON_TRACK --show-features
```
- **Exit Code:** `0`
- **Observed Result:**
  - Record: `SYNTH-SCENARIO-HIGH-01`
  - $P(\text{At-Risk}) = 0.0967$ (`LOW`)
  - Review Recommended: `NO`
  - Full evidence card decomposition with top risk and protective factors displayed.
  - Complete 25-feature vector displayed.

---

### Command 3: Playground — Low Engagement At-Risk Scenario
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --scenario LOW_ENGAGEMENT_AT_RISK
```
- **Exit Code:** `0`
- **Observed Result:**
  - Record: `SYNTH-SCENARIO-LOW-02`
  - $P(\text{At-Risk}) = 0.9287$ (`HIGH`)
  - Review Recommended: `YES`
  - Top drivers: low active days ($+0.5891$), days inactive ($+0.5359$), lower education ($+0.2869$).

---

### Command 4: Playground — 100-Record Synthetic Batch
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --batch-synthetic --export ml/reports/playground_batch_100_results.json
```
- **Exit Code:** `0`
- **Observed Result:**
  - Total Scored: 100 records
  - Mean Latency: 1.43 ms/record
  - Alerts Recommended: 77 (77.0%)
  - Score Range: [0.2153, 0.9063]
  - Results exported to `ml/reports/playground_batch_100_results.json`.

---

### Command 5: Playground — Negative Schema Validation Suite
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_playground.py --negative-tests
```
- **Exit Code:** `0`
- **Observed Result:**
  - `missing_required_feature`: REJECTED (PASS)
  - `forbidden_target_leakage`: REJECTED (PASS)
  - `forbidden_grade_leakage`: REJECTED (PASS)
  - `invalid_categorical_level`: REJECTED (PASS)
  - `non_finite_numeric_nan`: REJECTED (PASS)
  - `non_finite_numeric_inf`: REJECTED (PASS)
  - `negative_numeric_constraint`: REJECTED (PASS)

---

### Command 6: Labeled Historical Data Evaluation (2014J Partition)
```bash
PYTHONPATH=ml/src:. python3 ml/pipelines/run_evaluate_labeled_data.py \
    --data-path ml/data/processed/day30_features.csv \
    --presentation 2014J \
    --threshold 0.46 \
    --output-json ml/reports/metrics/evaluation_labeled_run.json
```
- **Exit Code:** `0`
- **Observed Result:**
  - Total Evaluated Records: 9,203
  - Prevalence: 40.70%
  - ROC-AUC: 0.7216
  - PR-AUC: 0.6502
  - Brier Score: 0.2103
  - ECE (10 bins): 0.0681
  - MCE: 0.0967
  - Recall (Safety): 69.78% (2,614 catches / 3,746 at-risk)
  - Precision: 55.56%
  - Specificity: 61.68%
  - Alert Rate: 51.12% (4,705 alerts, 2,091 false alarms)
  - Governance Notice: `HISTORICAL PARTITION NOTICE: Presentation 2014J represents previously inspected development evidence. It must NEVER be reported as an untouched prospective test set.`

---

### Command 7: Unit Test Suite Execution
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests/unit/test_phase_sixteen_playground.py
```
- **Exit Code:** `0`
- **Outcome:** `13 passed in 0.86s`

---

### Command 8: Full Repository Regression Test Suite
```bash
PYTHONPATH=ml/src:. python3 -m pytest ml/tests backend/tests
```
- **Exit Code:** `0`
- **Outcome:** `131 passed in 0.77s`

---

## 4. Deliverables Index

The following deliverables were implemented, tested, and validated:
1. `ml/src/sutra_ml/data/synthetic.py`: Deterministic synthetic dataset generator with seed configuration.
2. `ml/pipelines/generate_synthetic_data.py`: CLI script generating synthetic datasets, scenarios, and negative test cases.
3. `ml/src/sutra_ml/testing/playground.py`: Core playground runner with `rich` UI formatting, batch statistics, and negative testing.
4. `ml/pipelines/run_playground.py`: Interactive CLI tool with terminal menu and direct command flags.
5. `ml/src/sutra_ml/evaluation/dataset_evaluator.py`: Real labeled dataset evaluator with strict leakage safeguards and ECE/Brier reporting.
6. `ml/pipelines/run_evaluate_labeled_data.py`: CLI runner for labeled evaluation.
7. `ml/tests/unit/test_phase_sixteen_playground.py`: 13 comprehensive unit tests.
8. `ml/reports/phase_sixteen_testing_playground_guide.md`: Detailed user-facing manual testing guide.
9. `ml/reports/phase_sixteen_synthetic_data_report.md`: Technical documentation of synthetic datasets and scenarios.
10. `ml/reports/phase_sixteen_execution_record.md`: This execution record.

---

## 5. Final Status

**Status: Testing Playground Ready — Verified & Operational**

All workstreams completed. The developer can now manually inspect predictions, test scenarios, evaluate batches, and verify fail-closed schema defenses with complete observability.
