# SUTRA ML Subsystem

SUTRA (**Student Support Orchestration Platform**) is an action-first early-warning system developed for CODEX 3.0 (PS6).

Core product principle:
> **"No Alert Without Action"**

The ML subsystem provides time-aware risk estimation and explainable feature attributions to feed the SUTRA backend policy workflow. The ML model is an evidence-backed early-warning indicator; it does not make unilateral decisions, execute interventions, or bypass human review.

---

## 1. Directory Structure

```text
ml/
├── configs/
│   └── data.yaml                   # Configuration for datasets, schemas, and audits
├── data/
│   ├── raw/                        # Pristine authentic OULAD files (protected from git)
│   ├── interim/                    # Intermediate snapshot extractions (future phases)
│   ├── processed/                  # Final train/val/test feature matrices (future phases)
│   ├── external/                   # External reference tables
│   └── sample/                     # Small, offline fixtures for unit and integration tests
├── notebooks/
│   └── exploratory_analysis/       # Scratch exploratory analysis (no production logic)
├── src/
│   └── sutra_ml/
│       ├── data/                   # Loaders, streaming chunk reader, validation, audit engine
│       ├── features/               # Feature engineering (Phase Two)
│       ├── labels/                 # Target label construction (Phase Two)
│       ├── models/                 # Model wrappers (Phase Three)
│       ├── training/               # Baseline & Candidate training routines (Phase Three)
│       ├── evaluation/             # Metrics, calibration, alert workload (Phase Four)
│       ├── explainability/         # SHAP attribution generation (Phase Four)
│       ├── inference/              # Inference engine (Phase Five)
│       └── schemas/                # Pydantic data contracts (Phase Five)
├── pipelines/
│   └── run_audit.py                # Deterministic CLI audit runner
├── scripts/
│   └── download_oulad.py           # Authentic dataset acquisition with checksum verification
├── artifacts/
│   └── models/                     # Serialized model binaries (future phases)
├── reports/
│   ├── data_audit/                 # Markdown data audit reports
│   ├── metrics/                    # Quantitative experiment reports
│   └── figures/                    # PR curves, calibration plots, SHAP graphs
├── tests/
│   ├── conftest.py                 # Pytest fixtures and sample configurations
│   ├── unit/                       # Unit tests for loaders, chunking, and calculations
│   ├── data_quality/               # Schema, primary key, null, and foreign key tests
│   ├── leakage/                    # Anti-leakage tests (Phase Two)
│   └── integration/                # End-to-end pipeline execution tests
├── pyproject.toml                  # Python package specification
└── README.md                       # This documentation
```

---

## 2. Environment Setup

Python 3.10+ is supported. Install dependencies:

```bash
cd ml
pip install -e .
pip install pytest pytest-cov pyyaml
```

---

## 3. Dataset Acquisition (OULAD)

The Open University Learning Analytics Dataset (OULAD) is the primary dataset for time-aware early warning experiments:
- **Official Source:** [KMi Open Dataset](https://analyse.kmi.open.ac.uk/open_dataset)
- **Official DOI:** `10.6084/m9.figshare.5081998.v1`
- **Official MD5:** `7412686fd77cf0e0ee1e8c3e9b354308`

### Automated Acquisition:
From the repository root (`/Users/neemaysmac/Desktop/Sutra`):
```bash
python3 ml/scripts/download_oulad.py
```
This downloads `anonymisedData.zip`, verifies the MD5 hash, unpacks the 7 CSV files into `ml/data/raw/`, and generates `ml/data/raw/provenance.json`.

### Manual Acquisition (Fallback):
If automated download is blocked:
1. Download `anonymisedData.zip` from [Figshare DOI 10.6084/m9.figshare.5081998.v1](https://doi.org/10.6084/m9.figshare.5081998).
2. Place the zip archive in `ml/data/raw/anonymisedData.zip`.
3. Run `python3 ml/scripts/download_oulad.py`.

---

## 4. Running the Data Quality & Integrity Audit

To audit the 7 authentic OULAD tables and produce the verified audit report:
```bash
python3 ml/pipelines/run_audit.py
```

### Report Output:
The report is saved to:
`ml/reports/data_audit/oulad_audit_report.md`

It details:
- Exact row counts, column counts, and memory strategies.
- Granular column null counts, percentages, and data types.
- Key uniqueness checks for each table.
- Referential integrity verification across course presentations, assessments, and registrations.
- Unfiltered raw outcome distributions (with explicit warnings regarding Day-30 active cohort distinctions).
- Documented unresolved questions regarding score availability timings.

---

## 5. Running Temporal Snapshot & Feature Engineering (Phase Two)

To extract the Day-30 active cohort, build time-bounded features, and generate the binary target:
```bash
python3 ml/pipelines/run_prep.py
```

### Outputs Generated:
- **Interim Active Cohort:** `ml/data/interim/day30_cohort_raw.csv` (27,466 active student registrations)
- **Processed Feature Dataset:** `ml/data/processed/day30_features.csv` (27,466 rows, 25 feature columns, 3 key columns, target labels)
- **Data Preparation Report:** `ml/reports/data_audit/data_preparation_report.md`

---

## 6. Running Model Training & Evaluation (Phase Three)

To train the regularized Logistic Regression baseline and XGBoost candidate, evaluate cross-validation, and score the held-out temporal presentation:
```bash
python3 ml/pipelines/run_train.py
```

### Outputs Generated:
- **Model Artifacts:** `ml/artifacts/models/v1.0.0/`
  - `baseline_logistic_regression.joblib` (Fitted Pipeline)
  - `candidate_xgboost.joblib` (Fitted Pipeline)
  - `model_metadata.json` (Serialized schema, parameters, metrics)
- **Quantitative Metrics JSON:** `ml/reports/metrics/model_comparison.json`
- **Evaluation Report:** `ml/reports/model_evaluation_report.md`

---

## 7. Running Explainability, Calibration & Evidence Cards (Phase Four)

To generate local and global explanations, calculate empirical probability calibration (ECE/MCE/Brier), assess subgroup disparities, and produce sample SUTRA Evidence Cards:
```bash
python3 ml/pipelines/run_explain.py
```

### Outputs Generated:
- **Calibration Metrics JSON:** `ml/reports/metrics/calibration_metrics.json`
- **Phase Four Report:** `ml/reports/phase_four_explainability_report.md`
- **Pydantic Evidence Card Contract:** `ml/src/sutra_ml/schemas/evidence_card.py`
- **Explainability Engine:** `ml/src/sutra_ml/explainability/` (`local_explanations.py`, `global_explanations.py`)

---

## 8. Running Automated Tests

Run the full offline test suite:
```bash
PYTHONPATH=ml/src python3 -m pytest ml/tests
```

All 39 automated tests validate:
- **Data Quality (9 tests):** Table presence, column presence, primary key uniqueness, null detection, foreign key integrity.
- **Unit Logic (11 tests):** Fast line counting, streaming chunk iterators, missingness calculations, cohort partitioning, target mapping, unengaged student imputation.
- **Leakage Prevention (4 tests):** Hard temporal boundary ($t \le 30$ included, $t > 30$ dropped), zero post-cutoff VLE clicks in features, zero post-cutoff assessment submissions in features, exclusion of unverified assessment scores, zero row multiplication, and complete exclusion of target labels / unregistration dates from predictors.
- **Training & Evaluation (6 tests):** Temporal split integrity, zero cross-fold student leakage under `GroupKFold`, Scikit-learn preprocessing pipelines, XGBoost fit/predict, metric calculations, and threshold optimization.
- **Explainability & Calibration (7 tests):** Feature prefix cleaning and name mapping, linear log-odds decomposition additivity ($w_0 + \sum \phi_j == \text{margin}$), tree SHAP additivity ($\text{bias} + \sum \phi_j == \text{margin}$), robust missing value handling, calibration assessment metrics (Brier, ECE, MCE, reliability bins), SUTRA Evidence Card Pydantic schema validation and tier thresholds, global feature ranking consistency.
- **Integration (2 tests):** End-to-end execution of data audit and data preparation pipelines on test fixtures.

---

## 9. Scope Boundaries & Current Phase

We adhere strictly to phase-by-phase authorization:
- **Phase Zero:** ML Architecture & Research Plan (**Approved**).
- **Phase One:** Workspace Initialization & OULAD Data Audit (**Completed & Approved**).
- **Phase Two:** Day-30 Temporal Snapshots, Feature Engineering & Label Validation (**Completed & Approved**).
- **Phase Three:** Model Training & Evaluation (**Completed & Reviewed**).
- **Phase Four:** Model Explainability, Calibration & Evidence Cards (**Completed**).
- **Phase Five (Pending Authorization):** FastAPI Backend, Case Management API & Support Orchestration.
- **Prohibitions during Phase Four:** No FastAPI backend, no frontend, no automatic intervention triggers, no unapproved remote pushes. All code stays cleanly isolated and auditable.
