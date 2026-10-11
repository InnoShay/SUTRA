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

## 6. Running Automated Tests

Run the full offline test suite:
```bash
PYTHONPATH=ml/src python3 -m pytest ml/tests
```

All 26 automated tests validate:
- **Data Quality:** Table presence, column presence, primary key uniqueness, null detection, foreign key integrity.
- **Unit Logic:** Fast line counting, streaming chunk iterators, missingness calculations, cohort partitioning, target mapping, unengaged student imputation.
- **Leakage Prevention:** Hard temporal boundary ($t \le 30$ included, $t > 30$ dropped), zero post-cutoff VLE clicks in features, zero post-cutoff assessment submissions in features, exclusion of unverified assessment scores, zero row multiplication, and complete exclusion of target labels / unregistration dates from predictors.
- **Integration:** End-to-end execution of both the data audit pipeline and the data preparation pipeline on test fixtures.

---

## 7. Scope Boundaries & Current Phase

We adhere strictly to phase-by-phase authorization:
- **Phase Zero:** ML Architecture & Research Plan (**Approved**).
- **Phase One:** Workspace Initialization & OULAD Data Audit (**Completed & Approved**).
- **Phase Two:** Day-30 Temporal Snapshots, Feature Engineering & Label Validation (**Completed**).
- **Phase Three (Next):** Model Training (Regularized Logistic Regression Baseline vs. Tuned XGBoost Candidate).
- **Prohibitions during Phase Two:** No models trained, no performance metrics calculated, no hyperparameter tuning, no remote commits pushed.
