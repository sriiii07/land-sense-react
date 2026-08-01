"""
backend/predict.py
====================
Loads the trained landslide risk model (backend/model.joblib) once and
serves single-instance risk predictions from raw environmental data.

Functions
---------
load_model()                       -> sklearn estimator (cached)
predict_risk(environmental_data)   -> dict
"""

from __future__ import annotations

import os
from typing import Optional

import numpy as np
import pandas as pd
import joblib

from preprocess import clean_sensor_data

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")

FEATURE_COLUMNS = ["rainfall_mm", "soil_moisture", "slope_angle"]

# Module-level cache so the model is read from disk only once per
# process, regardless of how many times predict_risk() is called.
_model = None


def load_model():
    """
    Load and return the trained model from 'backend/model.joblib'.

    Uses a module-level cache (`_model`) so the model file is only
    read from disk once per process; subsequent calls return the
    cached estimator.

    Returns
    -------
    sklearn estimator
        The trained classifier (e.g. RandomForestClassifier).

    Raises
    ------
    FileNotFoundError
        If backend/model.joblib does not exist yet (run
        train_model.train_and_evaluate_model() first).
    """
    global _model
    if _model is not None:
        return _model

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"No trained model found at {MODEL_PATH}. "
            "Run `python backend/train_model.py` to train and save a model first."
        )

    _model = joblib.load(MODEL_PATH)
    return _model


def predict_risk(environmental_data: dict) -> dict:
    """
    Predict landslide risk for a single set of environmental readings.

    Parameters
    ----------
    environmental_data : dict
        Must be convertible to the model's expected feature set. At
        minimum should contain 'rainfall_mm', 'soil_moisture', and
        'slope_angle'. Missing/None values are imputed via
        preprocess.clean_sensor_data before scoring.

    Returns
    -------
    dict
        {
            "risk_level": "Low" | "Medium" | "High",
            "probability": float,          # probability of the predicted class
            "key_factors": [               # top contributing features
                {"feature": str, "importance": float, "value": float},
                ...
            ]
        }

    Raises
    ------
    ValueError
        If environmental_data is missing/malformed such that a valid
        input row cannot be built.
    FileNotFoundError
        If the trained model file is missing (propagated from
        load_model()).
    """
    if not isinstance(environmental_data, dict) or len(environmental_data) == 0:
        raise ValueError("predict_risk: 'environmental_data' must be a non-empty dict.")

    model = load_model()

    # Clean/impute missing sensor values before scoring.
    cleaned = clean_sensor_data(environmental_data)

    # Build the model input row in the exact column order the model
    # was trained on. Any expected feature absent from the cleaned
    # data defaults to 0.0 rather than raising, so a partial reading
    # still produces a (conservative) prediction.
    try:
        row = {col: float(cleaned.get(col, 0.0)) for col in FEATURE_COLUMNS}
    except (TypeError, ValueError) as exc:
        raise ValueError(f"predict_risk: could not convert input to numeric features: {exc}")

    X = pd.DataFrame([row], columns=FEATURE_COLUMNS)

    # ---- Predict probabilities for every class ----
    proba = model.predict_proba(X)[0]  # shape (n_classes,)
    classes = list(model.classes_)

    best_idx = int(np.argmax(proba))
    risk_level = classes[best_idx]
    probability_score = float(proba[best_idx])

    # ---- Key contributing factors ----
    # For tree-based models, use global feature_importances_ as a proxy
    # for "what usually drives this prediction", paired with this
    # instance's actual values so the officer sees both weight and reading.
    key_factors = []
    importances = getattr(model, "feature_importances_", None)
    if importances is not None:
        ranked = sorted(
            zip(FEATURE_COLUMNS, importances),
            key=lambda pair: pair[1],
            reverse=True,
        )
        for feature_name, importance in ranked[:3]:
            key_factors.append({
                "feature": feature_name,
                "importance": round(float(importance), 4),
                "value": row[feature_name],
            })
    else:
        # Fallback if the model doesn't expose feature_importances_:
        # report the raw input values with no ranking.
        key_factors = [{"feature": f, "importance": None, "value": row[f]} for f in FEATURE_COLUMNS]

    return {
        "risk_level": risk_level,
        "probability": round(probability_score, 4),
        "key_factors": key_factors,
    }


if __name__ == "__main__":
    # Smoke test: python backend/predict.py
    # Requires backend/model.joblib to already exist
    # (run train_model.py first if it doesn't).
    sample_input = {"rainfall_mm": 200, "soil_moisture": 80, "slope_angle": 25}
    result = predict_risk(sample_input)
    print("predict_risk(", sample_input, ") ->")
    print(result)

    # Confirm the cached loader only reads the file once.
    m1 = load_model()
    m2 = load_model()
    assert m1 is m2, "load_model() did not return the cached instance on the second call"
    print("load_model() caching verified OK.")
