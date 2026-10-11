# SUTRA Synthetic Dataset Directory

This directory contains synthetically generated student engagement records created specifically for **developer testing, inference pipeline verification, and interactive playground demonstrations**.

## Generated Artifacts (Seed: 42)
- `synthetic_batch_100.json`: 100 schema-compliant synthetic student records formatted as JSON.
- `synthetic_batch_100.csv`: Same 100 records formatted as CSV.
- `named_scenarios.json`: Curated scenarios illustrating distinct engagement archetypes:
  1. `HIGH_ENGAGEMENT_ON_TRACK`: High LMS clicks, active study velocity, early submission.
  2. `LOW_ENGAGEMENT_AT_RISK`: Low/negligible LMS engagement, inactivity, no early submission.
  3. `MIXED_SIGNALS_MODERATE`: High pre-course clicks followed by post-start disengagement.
  4. `EDGE_CASE_ZERO_VALUES`: Minimal valid boundary values (0 clicks, 0 submissions).
  5. `EDGE_CASE_MAX_VALUES`: Upper valid boundary values (3,200 clicks, 240 credits).
  6. `UNSEEN_MODULE_FALLBACK`: Novel module code (`XXX`) testing graceful pipeline fallback.
- `negative_test_cases.json`: Explicitly invalid records testing schema gate rejections (missing fields, NaN/Inf, extra leakage attributes, invalid categoricals).

## CRITICAL METHODOLOGICAL SAFEGUARDS
1. **Strict Synthetic Identity**: All records are generated pseudo-randomly using empirical Day-30 parameter bounds. All identifiers are prefixed with `SYNTH-` and do **NOT** correspond to any real individuals.
2. **Absence of Real Target Labels**: These records do **NOT** possess authentic academic outcomes. No ground-truth outcomes are assigned.
3. **PROHIBITION OF ACCURACY/PERFORMANCE CLAIMS**: Model accuracy, precision, recall, F1-score, ROC-AUC, PR-AUC, and calibration statistics **MUST NEVER** be computed or claimed using synthetic data. Synthetic records exist strictly to test software mechanics, schema compliance, latency, and explanation presentation.
4. **Non-Causal Representation**: The feature correlations in synthetic data are mathematical approximations and do not reflect real-world causal psychological or behavioral dynamics.
