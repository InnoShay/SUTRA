# ADR-005 · ML Serving Boundary, Governance, and Lifecycle Separation
- **Status:** Accepted (Reconciled Canonical Target).
- **Context:** The ML subsystem (`sutra_ml`) provides early-warning risk scores and SHAP explainability. Handoff reports describe a deployed Logistic Regression v1.0.0 model at threshold 0.46 and standalone inference endpoints (`/predict`, `/model-info`). Inspection of the actual codebase confirms that Phase Two (Day-30 feature extraction and anti-leakage tests) is verified in `ml/`, while Phase Three (model training and serialization) is scheduled. We must define clear boundaries, governance, and backwards-compatible API adapters.
- **Decision:**
  1. **Deployment Boundary:** Integrate `sutra_ml` directly into the FastAPI application via an isolated internal module (`app.ml.service`). The product backend owns persistence, authorization, and workflow; the ML module owns feature validation, inference, and evidence card formatting.
  2. **Serving Baseline vs Candidate:**
     - Designated serving baseline: **Regularized Logistic Regression v1.0.0** at decision threshold **0.46** (Day-30 academic early-warning cutoff).
     - Research candidate: **Constrained XGBoost** remains offline / research-only. Promotion to serving requires a documented promotion review verifying calibration, alert workload, and fairness.
  3. **Repository Ground Truth:** Ground documentation in verified repo reality (`ml/src/sutra_ml/features`, `labels`, `data` verified; `models` and `artifacts` in Phase 3 backlog).
  4. **API Compatibility Adapter:** Expose ML operations under the canonical product API (`/api/v1/ml/model-info`, `/api/v1/ml/predict`, `/api/v1/ml/predict/batch`), while providing root-level compatibility aliases (`/model-info`, `/predict`, `/predict/batch`, `/ready`) to prevent breaking external scripts or teammates.
  5. **Conditions Justifying Future Microservice Split:**
     - Resource isolation: Need for dedicated GPU / high-memory compute nodes.
     - Scaling independence: Inference request volume significantly outpaces CRUD workflow traffic.
     - Dependency conflicts: Python version or C-library incompatibilities between scientific packages and application dependencies.
- **Consequences:**
  - Zero inter-process latency and zero separate container overhead for the current deployment.
  - Full transparency regarding model readiness; prevents treating planned artifacts as confirmed code.
  - Backward compatibility guaranteed for all consumer integration points.
- **Rejected Alternatives:**
  - Mandatory separate ML microservice by default (rejected: premature operational complexity).
  - Silent promotion of XGBoost candidate without documented review.
- **Review Trigger:** Phase Three training completion and model artifact verification in `ml/artifacts/models/`.
