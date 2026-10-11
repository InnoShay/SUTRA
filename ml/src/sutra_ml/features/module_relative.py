"""
Module-Relative Engagement Feature Transformer for SUTRA ML.

Standardizes Day-30 student engagement features relative to the student's specific
course module cohort (code_module), mitigating baseline volume discrepancies across disciplines.

Guarantees:
- Fit strictly on training fold statistics (module mean and standard deviation).
- Never leaks validation or test statistics into training folds.
- Fallback to training global statistics for unseen modules, low-sample modules, or near-zero variance.
- Extreme values clipped to [-5.0, 5.0] to maintain robust numerical conditioning.
"""

from typing import Any, Optional, Sequence
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

DEFAULT_ENGAGEMENT_FEATURES = [
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
]


class ModuleRelativeTransformer(BaseEstimator, TransformerMixin):
    """
    Standardizes specified engagement features within course modules (code_module).

    Computes:
        z_feature = (feature - module_mean) / module_std

    Fallback policy:
        If module is unseen, module sample size < min_module_samples,
        or module_std < std_eps, uses training global mean and standard deviation.
    """

    def __init__(
        self,
        module_col: str = "code_module",
        engagement_features: Optional[Sequence[str]] = None,
        min_module_samples: int = 10,
        std_eps: float = 1e-6,
        clip_bound: tuple[float, float] = (-5.0, 5.0),
        suffix: str = "_module_z",
    ):
        self.module_col = module_col
        self.engagement_features = list(engagement_features or DEFAULT_ENGAGEMENT_FEATURES)
        self.min_module_samples = min_module_samples
        self.std_eps = std_eps
        self.clip_bound = clip_bound
        self.suffix = suffix

        # Fitted parameters
        self.global_stats_: dict[str, dict[str, float]] = {}
        self.module_stats_: dict[str, dict[str, dict[str, float]]] = {}
        self.new_feature_names_: list[str] = []
        self.is_fitted_: bool = False

    def fit(self, X: pd.DataFrame, y: Optional[Any] = None) -> "ModuleRelativeTransformer":
        if not isinstance(X, pd.DataFrame):
            raise TypeError("ModuleRelativeTransformer expects a pandas DataFrame input.")

        if self.module_col not in X.columns:
            raise ValueError(f"Module column '{self.module_col}' not found in input DataFrame columns: {list(X.columns)}")

        missing_feats = [f for f in self.engagement_features if f not in X.columns]
        if missing_feats:
            raise ValueError(f"Required engagement features not found in DataFrame: {missing_feats}")

        self.global_stats_ = {}
        self.module_stats_ = {}
        self.new_feature_names_ = [f"{feat}{self.suffix}" for feat in self.engagement_features]

        # 1. Compute training-fold global fallback statistics
        for feat in self.engagement_features:
            series = pd.to_numeric(X[feat], errors="coerce")
            g_mean = float(series.mean()) if not series.empty else 0.0
            g_std = float(series.std(ddof=0)) if len(series) > 1 else 1.0
            if np.isnan(g_std) or g_std < self.std_eps:
                g_std = 1.0
            self.global_stats_[feat] = {"mean": g_mean, "std": g_std}

        # 2. Compute training-fold module-specific statistics
        grouped = X.groupby(self.module_col, observed=True)
        for module_id, group in grouped:
            mod_str = str(module_id)
            mod_count = len(group)
            self.module_stats_[mod_str] = {}

            for feat in self.engagement_features:
                if mod_count < self.min_module_samples:
                    # Fallback to global statistics if low sample support
                    self.module_stats_[mod_str][feat] = {
                        "mean": self.global_stats_[feat]["mean"],
                        "std": self.global_stats_[feat]["std"],
                        "count": mod_count,
                        "fallback_used": True,
                    }
                else:
                    feat_series = pd.to_numeric(group[feat], errors="coerce")
                    m_mean = float(feat_series.mean())
                    m_std = float(feat_series.std(ddof=0)) if len(feat_series) > 1 else 0.0

                    if np.isnan(m_std) or m_std < self.std_eps:
                        # Fallback std to global if near-zero variance
                        m_std = self.global_stats_[feat]["std"]

                    self.module_stats_[mod_str][feat] = {
                        "mean": m_mean,
                        "std": m_std,
                        "count": mod_count,
                        "fallback_used": False,
                    }

        self.is_fitted_ = True
        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not self.is_fitted_:
            raise RuntimeError("ModuleRelativeTransformer is not fitted. Call fit() before transform().")

        if not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        if self.module_col not in X.columns:
            raise ValueError(f"Module column '{self.module_col}' missing during transform.")

        X_out = X.copy()
        mod_series = X[self.module_col].astype(str)

        for feat in self.engagement_features:
            out_col = f"{feat}{self.suffix}"
            g_mean = self.global_stats_[feat]["mean"]
            g_std = self.global_stats_[feat]["std"]

            # Vectorized mapping for module means and stds
            mean_map = {
                mod: self.module_stats_[mod][feat]["mean"]
                for mod in self.module_stats_
            }
            std_map = {
                mod: self.module_stats_[mod][feat]["std"]
                for mod in self.module_stats_
            }

            # Map values; unseen modules automatically receive global fallback via fillna
            row_means = mod_series.map(mean_map).fillna(g_mean)
            row_stds = mod_series.map(std_map).fillna(g_std)

            # Standardize
            feat_vals = pd.to_numeric(X[feat], errors="coerce")
            z_vals = (feat_vals - row_means) / row_stds

            # Clip extreme values
            if self.clip_bound is not None:
                lower, upper = self.clip_bound
                z_vals = z_vals.clip(lower=lower, upper=upper)

            # Preserve NaN if original feature was NaN (downstream imputer will handle it)
            z_vals = z_vals.where(~feat_vals.isna(), np.nan)
            X_out[out_col] = z_vals

        return X_out

    def get_feature_names_out(self, input_features: Optional[Sequence[str]] = None) -> list[str]:
        if input_features is None:
            return self.new_feature_names_
        return list(input_features) + self.new_feature_names_
