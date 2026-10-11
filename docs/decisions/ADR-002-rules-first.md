# ADR-002 · Deterministic rules first, bounded ML decision-support integration
- **Status:** Accepted (Reconciled Canonical Target).
- **Context:** PS6 requires explainable evidence and accountable human action ("No Alert Without Action"). Machine learning models (e.g. trained on historical datasets such as OULAD) predict statistical correlations (e.g. Fail/Withdrawn outcome at Day-30 cutoff), not direct causal guarantees, student diagnoses, or automatic intervention directives. Furthermore, research demonstrates that temporal leakage (evaluating post-cutoff data) inflates reported model accuracy, and real-world institution data frequently deviates from open research datasets.
- **Decision:** 
  1. Primary operational alerts are driven by **immutable, versioned deterministic policy rules** evaluated against timestamped institutional observations.
  2. Machine learning predictions serve as **supplementary, decision-support early-warning signals** invoked only when the incoming data satisfies the verified feature schema and temporal assumptions.
  3. The official serving model baseline is **Regularized Logistic Regression v1.0.0** calibrated at decision threshold **0.46** (Day-30 academic early-warning cutoff).
  4. The candidate **Constrained XGBoost** model remains strictly research-only and offline until an explicit, documented promotion review verifies its calibration, fair error rates, and operational utility under a fixed alert workload.
  5. An ML signal output produces an **Evidence Card** containing probability, threshold, calibration status, top SHAP attributions, model version, and explicit limitations.
  6. Missing or stale data produces `unknown` / `insufficient_evidence`, never an invented zero or silent imputation.
- **Consequences:** 
  - Signals remain fully explainable to faculty, mentors, and academic advisors.
  - Zero unilateral or unreviewed automated interventions; every alert requires human review.
  - Clear architectural and conceptual separation between institution facts, ML statistical risk, and human case decisions.
- **Rejected Alternatives:** 
  - Black-box autonomous intervention dispatch.
  - Mandatory live ML dropout scoring without feature validation or temporal verification.
  - Unverified promotion of complex tree ensembles without calibration and alert-workload analysis.
- **Review Trigger:** Validated institutional data availability plus an empirical shadow-deployment report demonstrating superior decision utility under an accountable alert budget.
