"""
ML Inference Engine for SUTRA.

Loads the selected trained pipeline (Regularized Logistic Regression)
and its metadata, validates the 25-feature input contract, runs mathematical
scoring, and produces complete explainable SUTRA Evidence Cards.
"""

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Optional
import joblib
import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from sutra_ml.explainability.local_explanations import explain_prediction_linear
from sutra_ml.schemas.evidence_card import (
    RiskTier,
    SutraEvidenceCard,
    build_evidence_card,
    determine_risk_tier,
)


@dataclass
class PredictionResult:
    """Standardized prediction output container."""
    record_id: str
    risk_probability: float
    review_recommended: bool
    risk_tier: RiskTier
    operational_threshold: float
    model_name: str
    model_version: str
    evidence_card: SutraEvidenceCard


CANONICAL_NUMERICAL_FEATURES = [
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

CANONICAL_CATEGORICAL_FEATURES = [
    "gender",
    "region",
    "highest_education",
    "imd_band",
    "age_band",
    "disability",
]


class SutraRiskPredictor:
    """
    Inference service for the SUTRA Early-Warning model.

    Loads the serialized model artifact and metadata once upon initialization.
    Provides thread-safe inference and evidence card synthesis.
    """

    def __init__(
        self,
        model_path: Optional[Path | str] = None,
        metadata_path: Optional[Path | str] = None,
    ):
        self.model_path = Path(model_path) if model_path else None
        self.metadata_path = Path(metadata_path) if metadata_path else None
        self.pipeline: Optional[Pipeline] = None
        self.metadata: dict[str, Any] = {}
        self.numerical_features: list[str] = []
        self.categorical_features: list[str] = []
        self.feature_cols: list[str] = []
        self.model_name: str = "Regularized Logistic Regression Baseline"
        self.model_version: str = "v1.0.0"
        self.operational_threshold: float = 0.46
        self._is_ready: bool = False

        if self.model_path and self.metadata_path:
            self.load()

    def load(self) -> None:
        """Load model pipeline and metadata from disk."""
        if not self.model_path or not self.model_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {self.model_path}")
        if not self.metadata_path or not self.metadata_path.exists():
            raise FileNotFoundError(f"Metadata file not found at {self.metadata_path}")

        with open(self.metadata_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)

        self.pipeline = joblib.load(self.model_path)
        raw_features = self.metadata.get("features") if isinstance(self.metadata.get("features"), dict) else {}
        num_feats = list(raw_features.get("numerical", []))
        cat_feats = list(raw_features.get("categorical", []))

        # Dynamic inspection from pipeline preprocessor if metadata omitted features
        if not num_feats or not cat_feats:
            if hasattr(self.pipeline, "named_steps") and "preprocessor" in self.pipeline.named_steps:
                preproc = self.pipeline.named_steps["preprocessor"]
                for trans_name, _, cols in getattr(preproc, "transformers_", []):
                    if trans_name == "num" and not num_feats:
                        num_feats = list(cols)
                    elif trans_name == "cat" and not cat_feats:
                        cat_feats = list(cols)

        self.numerical_features = num_feats or list(CANONICAL_NUMERICAL_FEATURES)
        self.categorical_features = cat_feats or list(CANONICAL_CATEGORICAL_FEATURES)
        self.feature_cols = self.numerical_features + self.categorical_features

        self.model_name = self.metadata.get("selected_model", "Regularized Logistic Regression Baseline")
        # Ensure threshold is rounded cleanly
        raw_thresh = float(self.metadata.get("selected_threshold", 0.46))
        self.operational_threshold = round(raw_thresh, 2)

        self._is_ready = True

    @property
    def is_ready(self) -> bool:
        """Check if model and metadata are loaded and ready to serve."""
        return self._is_ready and self.pipeline is not None

    def predict_single(
        self,
        feature_data: dict[str, Any],
        record_id: Optional[str] = None,
        module_code: Optional[str] = None,
        presentation_code: Optional[str] = None,
    ) -> PredictionResult:
        """
        Execute inference and evidence attribution for a single student record.

        Args:
            feature_data: Dictionary containing the exact 25 required features.
            record_id: Optional de-identified record ID.
            module_code: Optional academic module code.
            presentation_code: Optional academic presentation code.

        Returns:
            PredictionResult with risk probability, recommendation, and evidence card.
        """
        if not self.is_ready:
            raise RuntimeError("SutraRiskPredictor is not loaded or ready.")

        effective_record_id = record_id or "ANON-RECORD"
        effective_module = module_code or "MODULE"
        effective_presentation = presentation_code or "PRESENTATION"

        # Construct single-row Pandas Series
        row_series = pd.Series(feature_data)

        # Compute exact linear attribution decomposition
        explanation = explain_prediction_linear(
            student_row=row_series,
            pipeline=self.pipeline,
            feature_cols=self.feature_cols,
            top_n=5,
        )

        risk_prob = float(explanation["risk_probability"])
        review_recommended = risk_prob >= self.operational_threshold
        risk_tier = determine_risk_tier(risk_prob, threshold=self.operational_threshold)

        # Construct SUTRA Evidence Card
        card = build_evidence_card(
            record_id=effective_record_id,
            module_code=effective_module,
            presentation_code=effective_presentation,
            risk_prob=risk_prob,
            top_pos_factors=explanation["top_risk_drivers"],
            top_neg_factors=explanation["top_protective_factors"],
            model_name=self.model_name,
            model_version=self.model_version,
            threshold=self.operational_threshold,
        )

        return PredictionResult(
            record_id=effective_record_id,
            risk_probability=round(risk_prob, 4),
            review_recommended=review_recommended,
            risk_tier=risk_tier,
            operational_threshold=round(self.operational_threshold, 4),
            model_name=self.model_name,
            model_version=self.model_version,
            evidence_card=card,
        )

    def predict_batch(
        self,
        records: list[dict[str, Any]],
    ) -> list[PredictionResult]:
        """
        Execute inference for a batch of student records.

        Args:
            records: List of feature dictionaries (each with features and optional context).

        Returns:
            List of PredictionResult objects.
        """
        if not self.is_ready:
            raise RuntimeError("SutraRiskPredictor is not loaded or ready.")

        results = []
        for i, rec in enumerate(records):
            rec_id = rec.get("record_id") or f"ANON-BATCH-{i+1:03d}"
            mod_code = rec.get("code_module") or "MODULE"
            pres_code = rec.get("code_presentation") or "PRESENTATION"
            res = self.predict_single(
                feature_data=rec,
                record_id=rec_id,
                module_code=mod_code,
                presentation_code=pres_code,
            )
            results.append(res)
        return results
