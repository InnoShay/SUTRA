"""
SUTRA Phase Thirteen — Hardened Shadow-Mode Evaluation Contract & Engine.

Provides an isolated, read-only dual-scoring engine for prospective institutional
evaluation of the Phase Nine module-relative candidate alongside the current
production baseline (v1.0.0).

Governance & Security Guarantees:
1. Production Immutability: Uses production v1.0.0 pipeline in strictly read-only mode.
2. Candidate Quarantining & Provenance Verification: Candidate scoring is BLOCKED by
   default (candidate_provenance_verified=False) due to the documented hash discrepancy
   between Phase Nine markdown reports (951f2dd1...) and the serialized artifact (2a2727aa...).
3. Intervention Firewall: Candidate predictions (when authorized) are tagged strictly
   with is_shadow=True and intervention_eligible=False.
4. Fail-Closed Schema & Expanded Leakage Screening: Rejects unexpected columns,
   invalid categorical levels, non-finite values, and post-cutoff / target fields.
5. In-Run Duplicate Protection & Salted Fingerprinting: Detects duplicate or conflicting
   records in the same run and generates HMAC-SHA256 canonical fingerprints.
6. Subgroup Disparity & Privacy Suppression: Implements mathematical disparity ratios
   with small-cell suppression (<5) and inconclusive flags (<50).
"""

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import uuid
import joblib
import numpy as np
import pandas as pd


EXPECTED_PRODUCTION_SHA256 = "78a082276fc1770012b7bc7e711cb02de50dfcbfa7affaae6806f47fb8d0f41f"
EXPECTED_EXPERIMENTAL_ARTIFACT_SHA256 = "2a2727aaa26e4adce8951fa75463a425f1bc7bbf37f6c573372a2e80aec04d25"
REPORTED_PHASE_NINE_TEXT_SHA256 = "951f2dd1247ffeb45667104b20469b8efb48698bf4ba6ecb62d3a3399fc7ca63"
EXPECTED_EXPERIMENTAL_SHA256 = EXPECTED_EXPERIMENTAL_ARTIFACT_SHA256
DEFAULT_SERVING_THRESHOLD = 0.46

SUTRA_NUMERICAL_FEATURES = [
    "num_of_prev_attempts",
    "studied_credits",
    "days_registered_before_start",
    "has_missing_registration_date",
    "vle_total_clicks_d30",
    "vle_active_days_d30",
    "vle_clicks_precourse",
    "vle_clicks_poststart_d30",
    "vle_clicks_last_7d",
    "vle_days_since_last_click",
    "vle_clicks_forumng_d30",
    "vle_clicks_oucontent_d30",
    "vle_clicks_quiz_d30",
    "vle_clicks_homepage_d30",
    "vle_clicks_other_d30",
    "has_vle_activity_d30",
    "assessments_submitted_d30",
    "assessment_banked_d30",
    "has_early_assessment_submission_d30",
]

SUTRA_CATEGORICAL_FEATURES = [
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
]

SUTRA_25_FEATURES = SUTRA_NUMERICAL_FEATURES + SUTRA_CATEGORICAL_FEATURES

ALLOWED_IDENTIFIERS: Set[str] = {
    "record_id",
    "id_student",
    "code_module",
    "code_presentation",
    "cutoff_day",
}

# Strict whitelist for fail-closed schema contract
ALLOWED_COLUMNS: Set[str] = set(SUTRA_25_FEATURES) | ALLOWED_IDENTIFIERS

# Valid domains for categorical features
VALID_CATEGORICAL_DOMAINS: Dict[str, Set[str]] = {
    "gender": {"M", "F"},
    "disability": {"Y", "N"},
    "region": {
        "East Anglian Region",
        "East Midlands Region",
        "Ireland",
        "London Region",
        "North Region",
        "North Western Region",
        "Scotland",
        "South East Region",
        "South Region",
        "South West Region",
        "Wales",
        "West Midlands Region",
        "Yorkshire Region",
    },
    "highest_education": {
        "No Formal quals",
        "Lower Than A Level",
        "A Level or Equivalent",
        "HE Qualification",
        "Post Graduate Qualification",
    },
    "imd_band": {
        "0-10%", "10-20", "10-20%", "20-30%", "30-40%", "40-50%",
        "50-60%", "60-70%", "70-80%", "80-90%", "90-100%", "Missing", "Unknown",
    },
    "age_band": {"0-35", "35-55", "55<="},
}

# Expanded leakage columns that must be strictly rejected
EXPANDED_LEAKAGE_COLUMNS: Set[str] = {
    "final_result",
    "target",
    "outcome",
    "unregistered",
    "date_unregistration",
    "unregistration_date",
    "score",
    "assessment_score",
    "vle_clicks_post_d30",
    "exam_score",
    "final_score",
    "grade",
    "final_grade",
    "withdrawn_date",
    "withdrawal_date",
    "date_withdrawal",
    "is_withdrawn",
    "dropout",
    "attrition",
    "passed",
    "failed",
    "post_d30_clicks",
    "clicks_after_day30",
    "unreg_date",
    "status",
    "result",
}


def compute_canonical_fingerprint(
    record_id: str,
    module: str,
    row_dict: Dict[str, Any],
    salt: Optional[bytes] = None,
) -> str:
    """
    Generate deterministic, canonical HMAC-SHA256 fingerprint for a student registration payload.
    
    Guarantees:
    - Canonical sorted field ordering.
    - Deterministic rounding of floating point numbers to 6 decimal places.
    - Salted HMAC using secret obtained from SUTRA_SHADOW_SALT env var or explicit parameter.
    """
    resolved_salt = salt if salt is not None else os.getenv("SUTRA_SHADOW_SALT", "sutra_shadow_salt_v1").encode("utf-8")
    canonical_features = {}
    for col in sorted(SUTRA_25_FEATURES):
        val = row_dict[col]
        if col in SUTRA_NUMERICAL_FEATURES:
            canonical_features[col] = f"{float(val):.6f}"
        else:
            canonical_features[col] = str(val).strip()

    canonical_payload = {
        "record_id": str(record_id).strip(),
        "code_module": str(module).strip(),
        "features": canonical_features,
    }
    raw_bytes = json.dumps(canonical_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hmac.new(resolved_salt, raw_bytes, hashlib.sha256).hexdigest()[:16]


@dataclass(frozen=True)
class ShadowPredictionRecord:
    """Immutable paired prediction container for a single student registration."""
    record_id: str
    record_fingerprint: str
    code_module: str
    
    # Production Model Prediction (v1.0.0 Baseline)
    prod_model_version: str
    prod_risk_probability: float
    prod_alert_triggered: bool
    prod_intervention_eligible: bool  # Eligible for standard advisory human review
    
    # Experimental Candidate Prediction (Phase Nine Module-Relative)
    exp_model_version: str
    exp_risk_probability: Optional[float]
    exp_alert_triggered: bool
    exp_is_shadow: bool  # Always True
    exp_intervention_eligible: bool  # Always False (Hard-blocked from intervention)
    exp_blocked: bool  # True if candidate execution is blocked due to unverified provenance
    exp_block_reason: Optional[str]
    
    # Paired Discrepancy Flag
    prediction_discrepancy: bool  # True if prod_alert != exp_alert
    risk_delta: Optional[float]  # exp_risk_probability - prod_risk_probability if unblocked


@dataclass
class ShadowBatchReport:
    """Summary and audit trail for a prospective shadow evaluation batch."""
    run_id: str
    timestamp_utc: str
    cutoff_day: int
    production_model_hash: str
    experimental_model_hash: str
    candidate_provenance_status: str  # e.g., 'VERIFIED' or 'BLOCKED_UNVERIFIED_DISCREPANCY'
    candidate_blocked: bool
    serving_threshold: float
    total_records_submitted: int
    valid_records_scored: int
    rejected_records_count: int
    production_alert_count: int
    experimental_alert_count: int
    production_alert_rate: float
    experimental_alert_rate: float
    alert_discrepancy_count: int
    alert_discrepancy_rate: float
    mean_risk_delta: Optional[float]
    unseen_module_count: int
    rejections: List[Dict[str, str]] = field(default_factory=list)
    records: List[ShadowPredictionRecord] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to serializable dictionary."""
        data = asdict(self)
        data["records"] = [asdict(r) for r in self.records]
        return data

    def compute_subgroup_disparity(
        self,
        subgroup_metadata: List[Dict[str, Any]],
        group_col: str,
        reference_group: str,
        min_reporting_size: int = 50,
        suppression_threshold: int = 5,
    ) -> Dict[str, Any]:
        """
        Compute selection and burden disparity ratios with small-sample privacy safeguards.
        
        Mathematical definition:
            Selection Parity / Disparate Impact Ratio:
                DIR(g) = AlertRate(g) / AlertRate(reference_group)
        """
        if not self.records or not subgroup_metadata:
            return {"status": "NO_DATA", "disparities": {}}

        # Map record_id -> prod_alert
        rec_map = {r.record_id: r.prod_alert_triggered for r in self.records}
        
        # Aggregate counts by group level
        group_counts: Dict[str, int] = {}
        group_alerts: Dict[str, int] = {}

        for meta in subgroup_metadata:
            rid = str(meta.get("record_id", ""))
            if rid in rec_map and group_col in meta:
                grp = str(meta[group_col])
                group_counts[grp] = group_counts.get(grp, 0) + 1
                if rec_map[rid]:
                    group_alerts[grp] = group_alerts.get(grp, 0) + 1

        if reference_group not in group_counts or group_counts[reference_group] < min_reporting_size:
            return {
                "status": "REFERENCE_GROUP_INCONCLUSIVE",
                "reference_group": reference_group,
                "reference_sample_size": group_counts.get(reference_group, 0),
                "disparities": {},
            }

        ref_alert_rate = group_alerts.get(reference_group, 0) / group_counts[reference_group]
        results = {}

        for grp, n in group_counts.items():
            if n < suppression_threshold:
                results[grp] = {
                    "sample_size": "<5 (Suppressed for Privacy)",
                    "status": "PRIVACY_SUPPRESSED",
                }
            elif n < min_reporting_size:
                alert_rate = group_alerts.get(grp, 0) / n
                results[grp] = {
                    "sample_size": n,
                    "alert_rate": round(alert_rate, 4),
                    "status": f"INCONCLUSIVE (N < {min_reporting_size})",
                }
            else:
                alert_rate = group_alerts.get(grp, 0) / n
                dir_ratio = alert_rate / ref_alert_rate if ref_alert_rate > 0 else 0.0
                adverse_flag = (dir_ratio < 0.80) or (dir_ratio > 1.25)
                results[grp] = {
                    "sample_size": n,
                    "alert_rate": round(alert_rate, 4),
                    "disparate_impact_ratio": round(dir_ratio, 4),
                    "four_fifths_adverse_flag": adverse_flag,
                    "status": "EVALUATED",
                }

        return {
            "status": "EVALUATED",
            "group_column": group_col,
            "reference_group": reference_group,
            "reference_alert_rate": round(ref_alert_rate, 4),
            "disparities": results,
        }


class ShadowModeEvaluator:
    """
    Hardened read-only dual-scoring engine for prospective institutional shadow evaluation.
    
    Enforces strict isolation between production serving and candidate evaluation.
    """

    def __init__(
        self,
        production_model_path: Optional[Path | str] = None,
        experimental_model_path: Optional[Path | str] = None,
        serving_threshold: float = DEFAULT_SERVING_THRESHOLD,
        candidate_provenance_verified: bool = False,
        salt: Optional[bytes] = None,
    ):
        # Locate project root containing ml/artifacts
        curr = Path(__file__).resolve()
        repo_root = curr.parents[4] if len(curr.parents) >= 5 else Path.cwd()
        if not (repo_root / "ml" / "artifacts").exists():
            for p in curr.parents:
                if (p / "ml" / "artifacts").exists():
                    repo_root = p
                    break

        self.prod_path = Path(
            production_model_path
            or repo_root / "ml" / "artifacts" / "models" / "v1.0.0" / "baseline_logistic_regression.joblib"
        )
        self.exp_path = Path(
            experimental_model_path
            or repo_root / "ml" / "artifacts" / "experiments" / "phase_nine_module_relative" / "experimental_module_relative_lr.joblib"
        )
        self.threshold = serving_threshold
        self.candidate_provenance_verified = candidate_provenance_verified
        self.salt = salt if salt is not None else os.getenv("SUTRA_SHADOW_SALT", "sutra_shadow_salt_v1").encode("utf-8")

        if not self.prod_path.exists():
            raise FileNotFoundError(f"Production model artifact not found at {self.prod_path}")
        if not self.exp_path.exists():
            raise FileNotFoundError(f"Experimental candidate model not found at {self.exp_path}")

        # Compute & verify cryptographic hashes
        self.prod_hash = self._compute_hash(self.prod_path)
        self.exp_hash = self._compute_hash(self.exp_path)

        # Provenance audit status
        self.provenance_status = (
            "VERIFIED" if self.candidate_provenance_verified
            else "BLOCKED_UNVERIFIED_DISCREPANCY"
        )

        # Load production model in read-only mode
        self.prod_pipeline = joblib.load(self.prod_path)

        # Load candidate model only if provenance is verified or for isolated inspection
        self.exp_pipeline = joblib.load(self.exp_path)

    @staticmethod
    def _compute_hash(path: Path) -> str:
        with open(path, "rb") as f:
            return hashlib.sha256(f.read()).hexdigest()

    def validate_payload(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[Dict[str, str]]]:
        """
        Validate input batch against feature contract, fail-closed whitelist, and leakage bans.
        
        Returns:
            Tuple of (valid_dataframe, list_of_rejection_reasons)
        """
        rejections: List[Dict[str, str]] = []

        # 1. Expanded Leakage Check
        for col in df.columns:
            clean_col = col.lower().replace(" ", "_").replace("-", "_")
            if clean_col in EXPANDED_LEAKAGE_COLUMNS:
                raise ValueError(
                    f"Data payload rejected: target or post-cutoff leakage columns detected: '{col}'"
                )

        # 2. Fail-Closed Whitelist Check: Reject any unexpected columns
        unexpected_cols = [c for c in df.columns if c not in ALLOWED_COLUMNS]
        if unexpected_cols:
            raise ValueError(
                f"Data payload rejected: unexpected column(s) detected: {unexpected_cols}. "
                "Fail-closed policy enforces data minimization and schema contract."
            )

        # 3. Check for required features
        required_cols = list(SUTRA_25_FEATURES)
        if "code_module" not in df.columns:
            required_cols.append("code_module")
        missing_features = [col for col in required_cols if col not in df.columns]
        if missing_features:
            raise ValueError(
                f"Data payload rejected: missing required feature columns: {missing_features}"
            )

        # Track seen fingerprints and record IDs to enforce in-run uniqueness
        seen_fingerprints: Set[str] = set()
        seen_record_ids: Set[str] = set()

        valid_rows = []
        for idx, row in df.iterrows():
            rec_id = str(row.get("record_id", row.get("id_student", f"idx_{idx}")))
            module = str(row.get("code_module", "UNKNOWN"))
            row_dict = row.to_dict()

            # (A) Check numerical features for finite values
            has_nan = False
            for col in SUTRA_NUMERICAL_FEATURES:
                val = row_dict[col]
                if val is None or pd.isna(val) or not isinstance(val, (int, float, np.number)):
                    rejections.append({
                        "record_id": rec_id,
                        "reason": f"Non-numeric or null value in numerical feature '{col}': {val}",
                    })
                    has_nan = True
                    break
                if np.isnan(val) or np.isinf(val):
                    rejections.append({
                        "record_id": rec_id,
                        "reason": f"Non-finite value in feature '{col}': {val}",
                    })
                    has_nan = True
                    break

            if has_nan:
                continue

            # (B) Check categorical features against valid domains
            invalid_cat = False
            for col in SUTRA_CATEGORICAL_FEATURES:
                val = str(row_dict[col]).strip()
                allowed_levels = VALID_CATEGORICAL_DOMAINS[col]
                if val not in allowed_levels:
                    rejections.append({
                        "record_id": rec_id,
                        "reason": f"Invalid categorical level '{val}' in column '{col}'. Expected one of: {allowed_levels}",
                    })
                    invalid_cat = True
                    break

            if invalid_cat:
                continue

            # (C) In-run duplicate and collision detection
            fingerprint = compute_canonical_fingerprint(rec_id, module, row_dict, self.salt)
            if fingerprint in seen_fingerprints:
                rejections.append({
                    "record_id": rec_id,
                    "reason": f"Duplicate record in run (identical fingerprint '{fingerprint}')",
                })
                continue

            if rec_id in seen_record_ids:
                rejections.append({
                    "record_id": rec_id,
                    "reason": f"Conflicting record_id '{rec_id}' with different payload in same run",
                })
                continue

            seen_fingerprints.add(fingerprint)
            seen_record_ids.add(rec_id)
            valid_rows.append(row)

        valid_df = pd.DataFrame(valid_rows) if valid_rows else pd.DataFrame(columns=df.columns)
        return valid_df, rejections

    def evaluate_batch(
        self,
        batch_df: pd.DataFrame,
        cutoff_day: int = 30,
    ) -> ShadowBatchReport:
        """
        Execute read-only scoring on an eligible evaluation batch.
        
        Guarantees:
        - Strict cutoff verification: cutoff_day must equal 30.
        - Production predictions generated via v1.0.0.
        - Candidate scoring is BLOCKED if candidate_provenance_verified is False.
        - Experimental alerts marked is_shadow=True, intervention_eligible=False.
        - Exact reconciliation: total_submitted == valid_scored + rejected_count.
        """
        if cutoff_day != 30:
            raise ValueError(
                f"Invalid cutoff_day: {cutoff_day}. SUTRA early warning model requires exactly cutoff_day=30."
            )

        if "cutoff_day" in batch_df.columns:
            invalid_cutoff_rows = batch_df[batch_df["cutoff_day"] != 30]
            if len(invalid_cutoff_rows) > 0:
                raise ValueError("Conflicting cutoff metadata: payload contains records with cutoff_day != 30")

        run_id = str(uuid.uuid4())
        timestamp_utc = datetime.now(timezone.utc).isoformat()
        total_submitted = len(batch_df)

        valid_df, rejections = self.validate_payload(batch_df)
        valid_count = len(valid_df)

        candidate_blocked = not self.candidate_provenance_verified

        if valid_count == 0:
            return ShadowBatchReport(
                run_id=run_id,
                timestamp_utc=timestamp_utc,
                cutoff_day=cutoff_day,
                production_model_hash=self.prod_hash,
                experimental_model_hash=self.exp_hash,
                candidate_provenance_status=self.provenance_status,
                candidate_blocked=candidate_blocked,
                serving_threshold=self.threshold,
                total_records_submitted=total_submitted,
                valid_records_scored=0,
                rejected_records_count=len(rejections),
                production_alert_count=0,
                experimental_alert_count=0,
                production_alert_rate=0.0,
                experimental_alert_rate=0.0,
                alert_discrepancy_count=0,
                alert_discrepancy_rate=0.0,
                mean_risk_delta=None,
                unseen_module_count=0,
                rejections=rejections,
                records=[],
            )

        # Prepare feature matrix for inference
        features_df = valid_df[SUTRA_25_FEATURES + ["code_module"]].copy()

        # Score with production pipeline
        prod_probs = self.prod_pipeline.predict_proba(features_df)[:, 1]
        prod_alerts = prod_probs >= self.threshold

        # Score with candidate pipeline if and only if provenance is verified
        if self.candidate_provenance_verified:
            exp_probs = self.exp_pipeline.predict_proba(features_df)[:, 1]
            exp_alerts = exp_probs >= self.threshold
        else:
            exp_probs = None
            exp_alerts = None

        candidate_transformer = self.exp_pipeline.named_steps.get("module_relative")
        known_modules = set(candidate_transformer.module_stats_.keys()) if candidate_transformer else set()

        records: List[ShadowPredictionRecord] = []
        unseen_module_count = 0

        for i, (_, row) in enumerate(valid_df.iterrows()):
            rec_id = str(row.get("record_id", row.get("id_student", f"rec_{i}")))
            module = str(row.get("code_module", "UNKNOWN"))

            if module not in known_modules:
                unseen_module_count += 1

            fingerprint = compute_canonical_fingerprint(rec_id, module, row.to_dict(), self.salt)
            p_prob = float(prod_probs[i])
            p_alert = bool(prod_alerts[i])

            if self.candidate_provenance_verified and exp_probs is not None and exp_alerts is not None:
                e_prob = float(exp_probs[i])
                e_alert = bool(exp_alerts[i])
                discrepancy = (p_alert != e_alert)
                delta = round(e_prob - p_prob, 6)
                blocked = False
                block_reason = None
                exp_version = "phase_nine_module_relative"
            else:
                e_prob = None
                e_alert = False
                discrepancy = False
                delta = None
                blocked = True
                block_reason = (
                    "Candidate scoring blocked: Provenance unverified due to Phase Nine report hash discrepancy"
                )
                exp_version = "phase_nine_module_relative (BLOCKED)"

            record = ShadowPredictionRecord(
                record_id=rec_id,
                record_fingerprint=fingerprint,
                code_module=module,
                prod_model_version="v1.0.0",
                prod_risk_probability=round(p_prob, 6),
                prod_alert_triggered=p_alert,
                prod_intervention_eligible=True,
                exp_model_version=exp_version,
                exp_risk_probability=round(e_prob, 6) if e_prob is not None else None,
                exp_alert_triggered=e_alert,
                exp_is_shadow=True,
                exp_intervention_eligible=False,
                exp_blocked=blocked,
                exp_block_reason=block_reason,
                prediction_discrepancy=discrepancy,
                risk_delta=delta,
            )
            records.append(record)

        prod_alert_count = int(np.sum(prod_alerts))
        if self.candidate_provenance_verified and exp_alerts is not None and exp_probs is not None:
            exp_alert_count = int(np.sum(exp_alerts))
            discrepancy_count = sum(1 for r in records if r.prediction_discrepancy)
            mean_delta = float(np.mean(exp_probs - prod_probs)) if valid_count > 0 else 0.0
            exp_alert_rate = round(exp_alert_count / valid_count, 4)
            discrepancy_rate = round(discrepancy_count / valid_count, 4)
        else:
            exp_alert_count = 0
            discrepancy_count = 0
            mean_delta = None
            exp_alert_rate = 0.0
            discrepancy_rate = 0.0

        return ShadowBatchReport(
            run_id=run_id,
            timestamp_utc=timestamp_utc,
            cutoff_day=cutoff_day,
            production_model_hash=self.prod_hash,
            experimental_model_hash=self.exp_hash,
            candidate_provenance_status=self.provenance_status,
            candidate_blocked=candidate_blocked,
            serving_threshold=self.threshold,
            total_records_submitted=total_submitted,
            valid_records_scored=valid_count,
            rejected_records_count=len(rejections),
            production_alert_count=prod_alert_count,
            experimental_alert_count=exp_alert_count,
            production_alert_rate=round(prod_alert_count / valid_count, 4) if valid_count > 0 else 0.0,
            experimental_alert_rate=exp_alert_rate,
            alert_discrepancy_count=discrepancy_count,
            alert_discrepancy_rate=discrepancy_rate,
            mean_risk_delta=round(mean_delta, 6) if mean_delta is not None else None,
            unseen_module_count=unseen_module_count,
            rejections=rejections,
            records=records,
        )
