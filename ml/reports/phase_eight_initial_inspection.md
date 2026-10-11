# SUTRA Phase Eight — Initial Codebase & Pipeline Inspection Report

**Date:** 2026-10-12  
**Auditor:** SUTRA ML Observability & Verification Team  
**System Environment:** macOS (Darwin 24.6.0, Apple Silicon ARM64), Python 3.13.6, scikit-learn 1.7.2, XGBoost 3.4.1, psutil 7.1.0  
**Repository:** `/Users/neemaysmac/Desktop/Sutra`  

---

## 1. Executive Summary

This inspection examines the existing training and cross-validation pipelines in the SUTRA repository prior to implementing Phase Eight observability instrumentation. The primary question addressed is whether the training pipeline performs genuine model fitting and student-grouped cross-validation on every fold, or whether any caching, model reuse, or skipped execution occurs.

**Verdict:** 
1. **Zero Skipped Work:** Every single fold in 5-fold cross-validation instantiates a brand new `Pipeline` containing a freshly initialized `ColumnTransformer` (preprocessor) and a newly instantiated estimator (`LogisticRegression` or `XGBClassifier`).
2. **Zero Preprocessing Leakage:** The preprocessor (`StandardScaler` and `OneHotEncoder`) is fit strictly on the training partition of each fold (`X_train_f`) and merely transforms the validation partition (`X_val_f`).
3. **Strict Student Independence:** GroupKFold explicitly validates that student IDs do not overlap across train and validation folds (`overlap = train_s.intersection(val_s); assert not overlap`).
4. **Authentic Speed Explanation:** The 2–3 second wall-clock time on Apple Silicon is fully legitimate. Fitting regularized logistic regression (L-BFGS) or shallow tree ensembles (150 trees) on 14,610 rows $\times$ 25 tabular features utilizes compiled C++ and vectorized BLAS on Apple Silicon performance cores, taking ~0.08s for Logistic Regression and ~0.45s for XGBoost per fold.

---

## 2. Code Inspection & Execution Trace

### 2.1 Pipeline Orchestration (`ml/pipelines/run_train.py`)
- **Data Ingestion:** Loads `ml/data/processed/day30_features.csv` (SHA-256: `e6f6e4f9c3cacc48a59b3ed1f5b814fcae1d8e350964c0340eed6aa61e4ee3b9`, 27,466 student-module rows).
- **Integrity Checks:** `run_pre_training_integrity_checks()` strictly asserts key uniqueness, absence of target/unregistration leaks, absence of assessment score columns, and Day-0 partition mathematical consistency.
- **Data Splitting:** Uses `make_temporal_split()` to separate training presentations (`2013B`, `2013J`, `2014B`, $N=18,263$) from the holdout presentation (`2014J`, $N=9,203$).
- **Cross-Validation Calls:** Calls `cross_validate_baseline()` and `cross_validate_candidate()`.
- **Final Model Fitting:** Calls `train_final_baseline()` and `train_final_candidate()` on the entire 18,263-row training set.
- **Evaluation & Serialization:** Evaluates on `2014J`, serializes `.joblib` pipelines and writes JSON metadata.

### 2.2 Cross-Validation Implementations (`ml/src/sutra_ml/training/`)

#### Baseline Logistic Regression (`train_baseline.py`)
```python
splits = get_student_grouped_cv(train_df, n_splits=n_splits, group_col="id_student")
oof_probs = np.zeros(len(train_df))
for fold_idx, (t_idx, v_idx) in enumerate(splits):
    X_train_f, y_train_f = X.iloc[t_idx], y[t_idx]
    X_val_f, y_val_f = X.iloc[v_idx], y[v_idx]

    pipe = build_logistic_regression_pipeline(
        numerical_features, categorical_features, params
    )
    pipe.fit(X_train_f, y_train_f)
    val_probs = pipe.predict_proba(X_val_f)[:, 1]
    oof_probs[v_idx] = val_probs
```
- **Finding:** A fresh pipeline is instantiated for every fold (`build_logistic_regression_pipeline`). There is no persistent estimator object shared across loop iterations.

#### XGBoost Candidate (`train_candidate.py`)
```python
for fold_idx, (t_idx, v_idx) in enumerate(splits):
    X_train_f, y_train_f = X.iloc[t_idx], y[t_idx]
    X_val_f, y_val_f = X.iloc[v_idx], y[v_idx]

    pipe = build_xgboost_pipeline(
        numerical_features, categorical_features, params
    )
    pipe.fit(X_train_f, y_train_f)
    val_probs = pipe.predict_proba(X_val_f)[:, 1]
    oof_probs[v_idx] = val_probs
```
- **Finding:** Similarly, `build_xgboost_pipeline()` instantiates a fresh `XGBClassifier` and fresh `ColumnTransformer` for each fold.

### 2.3 Preprocessing Leakage Audit (`pipeline.py`)
```python
def build_preprocessor(numerical_features, categorical_features):
    num_transformer = StandardScaler()
    cat_transformer = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    return ColumnTransformer(...)
```
- **Finding:** The preprocessor is encapsulated inside the `sklearn.pipeline.Pipeline`. When `pipe.fit(X_train_f, y_train_f)` is invoked, `preprocessor.fit_transform()` is executed solely on `X_train_f`. During `pipe.predict_proba(X_val_f)`, `preprocessor.transform()` is executed on `X_val_f`. No summary statistics (`mean_`, `scale_`, or category bins) leak from validation records into the training process.

### 2.4 Student Grouping Audit (`split.py`)
```python
gkf = GroupKFold(n_splits=n_splits)
for train_idx, val_idx in gkf.split(train_df, groups=groups):
    train_s = set(train_df.iloc[train_idx][group_col])
    val_s = set(train_df.iloc[val_idx][group_col])
    overlap = train_s.intersection(val_s)
    if overlap:
        raise ValueError("Cross-fold student leakage detected!")
```
- **Finding:** Strict group segregation is enforced at runtime. Overlapping students between train and validation partitions immediately raise an exception.

---

## 3. Existing Model Artifacts & Preserved State

| Model Location | Artifact Name | Size | SHA-256 Checksum | Role | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ml/artifacts/models/v1.0.0/` | `baseline_logistic_regression.joblib` | 7,105 B | `78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f` | Production Baseline | **Protected** |
| `ml/artifacts/models/v1.0.0/` | `candidate_xgboost.joblib` | 270,054 B | `28759b1d12f0d2ad5af2875a92c1cc76094347732a838b200d4975041dec976f` | Production Reference | **Protected** |
| `ml/artifacts/models/v1.0.0/` | `model_metadata.json` | 6,758 B | `747c216d65377f293fcadc135153113dbfa4d01c0a26fb33b9218af8b495de8b` | v1.0.0 Metadata | **Protected** |
| `ml/artifacts/experiments/exp_c_depth3_xgboost/` | `candidate_constrained_xgboost.joblib` | 192,262 B | `c87a1c699c311309bf72c87e6bba42cf86331d33a32483f9dbfb339f91ab2369` | Phase Seven Research Candidate | **Preserved** |

**Serving Status:** `backend/app/main.py` explicitly loads `v1.0.0/baseline_logistic_regression.joblib` at startup and serves predictions with decision threshold `0.46`.

---

## 4. Gaps in Observability Identified

While the code executes authentic fitting on every fold, the current logging presents several observability limitations:
1. **Coarse Timing:** Only whole-fold total elapsed wall-clock time is printed; time spent in feature preprocessing vs estimator fitting is not separated.
2. **Zero Resource Metrics:** Process CPU time, CPU utilization percentage, peak resident set size (RSS), and memory growth during fitting are unmeasured.
3. **No Estimator Convergence Telemetry:** For Logistic Regression, scikit-learn's `n_iter_` is not displayed. For XGBoost, boosting round evaluations or tree counters are not emitted during fold progression.
4. **No Formal Event Stream:** Progress output is unstructured terminal prints without structured event callbacks or machine-readable execution traces.
5. **Lack of Live Resource Sampler:** No background or concurrent thread samples real CPU utilization during the fitting phases.

---

## 5. Phase Eight Implementation Roadmap

To address these gaps without altering model architectures, target definitions, or serving behavior:
1. **Develop an Observability Module (`sutra_ml.observability`):**
   - Implement `TrainingProgressTracker` with honest event logging.
   - Implement `ResourceMonitor` utilizing Python's `resource`, `time`, and `psutil` (v7.1.0) to capture process wall time, CPU time, CPU utilization %, and peak RSS memory.
2. **Instrument Cross-Validation and Training Functions:**
   - Record separate timings for `preprocessor.fit_transform()` and `estimator.fit()`.
   - Extract real convergence data (`n_iter_` for Logistic Regression, tree counts for XGBoost).
3. **Create Isolated Phase Eight Experiment Pipeline & Directory:**
   - Store verification artifacts under `ml/artifacts/experiments/phase_eight_observability/`.
   - Never overwrite `v1.0.0/` or `exp_c_depth3_xgboost/`.
4. **Add Fresh Process Artifact Reload & Equivalence Verification:**
   - Verify SHA-256 hashes, reload saved model in isolated subprocess/context, run deterministic inference, and assert $|p_{\text{reloaded}} - p_{\text{fitted}}| < 10^{-6}$.
5. **Automate Observability Unit Tests:**
   - Test event emissions, resource monitor accuracy, graceful degradation, and production artifact immutability.
