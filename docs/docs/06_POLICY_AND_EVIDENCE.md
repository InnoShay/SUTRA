# 06 · Versioned Policy Engine, Evidence Packets & ML Evidence Cards

## 1. Hybrid Policy Evaluation Strategy

SUTRA combines **transparent deterministic rules** with **bounded ML early-warning indicators**:
1. **Deterministic Policies (Core Alert Engine):** Rule-based evaluations authored by institutional experts that evaluate student observations against configured academic thresholds.
2. **Machine Learning Model (Decision-Support Signal):** Evaluated strictly when the student's available observations satisfy the Day-30 feature contract. The ML output is formatted as a standardized **Evidence Card** attached to the signal review queue.

> **Principle:** A rule or model probability identifies a situation requiring human attention. It does not explain personal circumstances, diagnose a student, or guarantee failure.

---

## 2. Pure Policy Evaluator Contract (Python / Pydantic v2)

```python
class PolicyEvaluationRequest(BaseModel):
    institution_id: UUID
    external_student_ref: str
    policy_version_id: UUID
    as_of_at: datetime
    authorized_observations: list[ObservationDTO]
    quality_summary: QualitySummaryDTO

class TriggeredRule(BaseModel):
    rule_key: str
    rationale_code: str
    evidence_refs: list[str]
    observed_values: dict[str, Any]
    suggested_interventions: list[str]

class PolicyEvaluationResult(BaseModel):
    result: Literal["attention_suggested", "no_rule_triggered", "unknown"]
    quality_state: Literal["sufficient", "insufficient_evidence", "stale_source", "conflicting_source"]
    triggered_rules: list[TriggeredRule]
    missing_or_stale_domains: list[str]
    explanation_template_key: str
```

The evaluator is **pure, deterministic, and side-effect-free**. Given the exact same frozen evidence packet and policy version, it will always output the identical evaluation result.

---

## 3. Machine Learning Evidence Card Output

When the ML pipeline runs, its prediction is packaged into an **Evidence Card** presented to human reviewers:

```json
{
  "card_type": "ml_early_warning_evidence",
  "model_name": "logistic_regression_baseline",
  "model_version": "1.0.0",
  "prediction_cutoff": "Day 30",
  "risk_probability": 0.68,
  "threshold": 0.46,
  "classification": "At_Risk",
  "calibration_status": "platt_calibrated",
  "top_attributions": [
    {"feature": "vle_days_since_last_click", "value": 18.0, "attribution": 0.28, "direction": "increases_risk"},
    {"feature": "vle_clicks_last_7d", "value": 4.0, "attribution": -0.22, "direction": "increases_risk"},
    {"feature": "assessments_submitted_d30", "value": 0.0, "attribution": 0.19, "direction": "increases_risk"}
  ],
  "limitations": [
    "Trained on historical Open University course registrations; not calibrated for non-modular curricula.",
    "Early assessment grades were excluded to avoid temporal leakage.",
    "Represents statistical correlation, not causal certainty or personal diagnosis."
  ]
}
```

---

## 4. Immutable Policy Versions

Every policy is versioned and stored in `policy_versions`:
- `policy_key`: Unique string identifier (e.g. `academic_support_d30`).
- `version`: Monotonically increasing integer.
- `status`: `draft`, `published`, or `retired`.
- `rules_definition`: Validated JSON array of rule predicates and threshold values.
- `evaluator_version`: Code version of the evaluator engine.
- `checksum`: SHA256 digest of the canonical rules definition.

Published versions are **strictly immutable**. Any change to thresholds or rules requires publishing version $N+1$.

---

## 5. Evidence Packet Minimum

Every generated `Signal` links to an immutable `EvidencePacket` containing:
- Frozen observation IDs and source versions available at `as_of_at`.
- Redacted, normalized values required to justify the trigger.
- Explicit freshness, completeness, and missingness metrics.
- SHA256 digest of the evidence payload.
- Approved retention class and scheduled expiration timestamp.

Sensitive financial records and confidential counselling notes are **strictly omitted** from general evidence packets.

---

## 6. Human Review & Reasoned Override Workflow

When an authorized reviewer inspects a signal, four actions are available:
1. **Approve:** Accepts the suggested intervention and moves to case creation.
2. **Modify:** Selects an alternative intervention from the `intervention_catalog` with an explicit reason code (e.g. `REVIEWER_SELECTED_ALTERNATIVE`).
3. **Dismiss:** Closes the signal without case creation, recording actor rationale (e.g. `STUDENT_RESOLVED_EXTERNALLY`).
4. **Request More Data:** Flags the signal for follow-up data collection when evidence is stale or conflicting.

An override **never mutates** the original machine-generated signal; it records a distinct, timestamped `SignalReview` or `CaseEvent` linked to the reviewer's identity.

---

## 7. Replay & Reproducibility Tests

1. `test_deterministic_replay_produces_identical_output`: Re-evaluating the same frozen evidence packet and policy version produces bit-for-bit identical results and explanation codes.
2. `test_late_observations_excluded_from_replay`: Adding an observation with `available_at > as_of_at` does not alter the historical replay.
3. `test_missing_required_metric_yields_unknown`: Evaluating with a missing critical denominator returns `unknown` rather than `no_rule_triggered`.
4. `test_evidence_digest_mismatch_raises_integrity_error`: Tampering with stored evidence packet JSON triggers an audit integrity exception.
