"""
Scikit-learn pipeline constructors for SUTRA ML baseline and candidate models.

Guarantees that all preprocessing (scaling, one-hot encoding, imputers)
is learned strictly on training partitions to prevent data snooping.
"""

from typing import Any
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier


def build_preprocessor(
    numerical_features: list[str],
    categorical_features: list[str],
) -> ColumnTransformer:
    """
    Construct ColumnTransformer for numerical scaling and categorical one-hot encoding.
    Unseen categorical levels in test/validation folds are gracefully ignored (all-zero vector).
    """
    num_transformer = StandardScaler()
    cat_transformer = OneHotEncoder(
        handle_unknown="ignore",
        sparse_output=False,
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", num_transformer, numerical_features),
            ("cat", cat_transformer, categorical_features),
        ],
        remainder="drop",
    )
    return preprocessor


def build_logistic_regression_pipeline(
    numerical_features: list[str],
    categorical_features: list[str],
    params: dict[str, Any],
) -> Pipeline:
    """
    Build regularized Logistic Regression baseline pipeline.
    """
    clean_params = {k: v for k, v in params.items() if k != "model_type"}
    preprocessor = build_preprocessor(numerical_features, categorical_features)
    classifier = LogisticRegression(**clean_params)

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])


def build_xgboost_pipeline(
    numerical_features: list[str],
    categorical_features: list[str],
    params: dict[str, Any],
) -> Pipeline:
    """
    Build XGBoost candidate classifier pipeline.
    """
    clean_params = {k: v for k, v in params.items() if k != "model_type"}
    preprocessor = build_preprocessor(numerical_features, categorical_features)
    classifier = XGBClassifier(**clean_params)

    return Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", classifier),
    ])
