"""
backend/explain.py
====================
Generates a human-readable explanation for a landslide risk
prediction, so a disaster officer can see *why* the model flagged a
village before approving an alert.

Uses SHAP (shap.TreeExplainer) when the `shap` package is installed;
otherwise falls back to a rule-based explanation built from the
model's feature_importances_ and simple threshold checks against the
raw input values, so this module works even without the shap
dependency installed.

Functions
---------
explain_prediction(village_id, environmental_data) -> dict
"""

from __future__ import annotations

from typing import Optional

import numpy as np
import pandas as pd

from predict import load_model, FEATURE_COLUMNS
from preprocess import clean_sensor_data

try:
    import shap  # type: ignore
    _SHAP_AVAILABLE = True
except ImportError:
    _SHAP_AVAILABLE = False

# Reference thresholds used by the rule-based fallback explanation,
# consistent with the platform's documented risk factors (Section 4 of
# the project spec): antecedent rainfall and soil saturation are the
# two dominant landslide triggers.
THRESHOLDS = {
    "rainfall_mm": 180.0,      # mm — critical antecedent rainfall threshold
    "soil_moisture": 70.0,     # % — near-saturation threshold
    "slope_angle": 30.0,       # degrees — steep-slope threshold
}


def _rule_based_explanation(environmental_data: dict) -> tuple[str, dict]:
    """Build a plain-language explanation using fixed thresholds."""
    rainfall = float(environmental_data.get("rainfall_mm", 0.0))
    moisture = float(environmental_data.get("soil_moisture", 0.0))
    slope = float(environmental_data.get("slope_angle", 0.0))

    reasons = []
    factors = {}

    if rainfall > THRESHOLDS["rainfall_mm"]:
        reasons.append(
            f"cumulative rainfall is {rainfall:.0f}mm, exceeding the critical "
            f"threshold of {THRESHOLDS['rainfall_mm']:.0f}mm"
        )
        factors["rainfall_mm"] = round(min(rainfall / 300.0, 1.0), 2)
    else:
        factors["rainfall_mm"] = round(min(rainfall / 300.0, 1.0), 2)

    if moisture > THRESHOLDS["soil_moisture"]:
        reasons.append(
            f"soil moisture is {moisture:.0f}%, near saturation "
            f"(threshold {THRESHOLDS['soil_moisture']:.0f}%)"
        )
        factors["soil_moisture"] = round(min(moisture / 100.0, 1.0), 2)
    else:
        factors["soil_moisture"] = round(min(moisture / 100.0, 1.0), 2)

    if slope > THRESHOLDS["slope_angle"]:
        reasons.append(
            f"the slope is {slope:.0f}\u00b0, above the {THRESHOLDS['slope_angle']:.0f}\u00b0 "
            "steep-terrain threshold"
        )
        factors["slope_angle"] = round(min(slope / 60.0, 1.0), 2)
    else:
        factors["slope_angle"] = round(min(slope / 60.0, 1.0), 2)

    if reasons:
        explanation = (
            "Elevated landslide risk: " + "; ".join(reasons) + ". "
            "These conditions together significantly increase the likelihood of slope failure."
        )
    else:
        explanation = (
            f"Conditions are within normal ranges (rainfall {rainfall:.0f}mm, "
            f"soil moisture {moisture:.0f}%, slope {slope:.0f}\u00b0); landslide risk is low."
        )

    return explanation, factors


def _shap_explanation(model, environmental_data: dict) -> tuple[str, dict]:
    """Build an explanation using SHAP TreeExplainer values."""
    cleaned = clean_sensor_data(environmental_data)
    row = {col: float(cleaned.get(col, 0.0)) for col in FEATURE_COLUMNS}
    X = pd.DataFrame([row], columns=FEATURE_COLUMNS)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)

    # For multiclass models, shap_values is a list (one array per
    # class); pick the class the model actually predicted.
    predicted_class_idx = int(np.argmax(model.predict_proba(X)[0]))

    if isinstance(shap_values, list):
        # Older SHAP versions: list of (n_samples, n_features) arrays, one per class.
        values_for_class = shap_values[predicted_class_idx][0]
    elif isinstance(shap_values, np.ndarray) and shap_values.ndim == 3:
        # Newer SHAP versions: single (n_samples, n_features, n_classes) array.
        values_for_class = shap_values[0, :, predicted_class_idx]
    else:
        # Binary/regression case: a single 2D array (n_samples, n_features).
        values_for_class = shap_values[0]

    contributions = dict(zip(FEATURE_COLUMNS, [float(v) for v in values_for_class]))

    # Normalize magnitudes to a 0-1 "share of total contribution" for
    # easier interpretation on the dashboard.
    total_abs = sum(abs(v) for v in contributions.values()) or 1.0
    factors = {k: round(abs(v) / total_abs, 2) for k, v in contributions.items()}

    ranked = sorted(contributions.items(), key=lambda kv: abs(kv[1]), reverse=True)
    top_feature, top_value = ranked[0]
    direction = "increasing" if top_value > 0 else "decreasing"

    explanation = (
        f"The model's prediction is driven primarily by {top_feature.replace('_', ' ')} "
        f"(value {row[top_feature]:.1f}), {direction} the predicted risk the most, "
        f"followed by {ranked[1][0].replace('_', ' ')} and {ranked[2][0].replace('_', ' ')}."
    )
    return explanation, factors


def explain_prediction(village_id: str, environmental_data: dict) -> dict:
    """
    Produce a human-readable explanation for a landslide risk prediction.

    Parameters
    ----------
    village_id : str
        Identifier of the village this explanation is for (echoed back
        in the response for the caller's convenience).
    environmental_data : dict
        Same shape as expected by predict.predict_risk — at minimum
        'rainfall_mm', 'soil_moisture', 'slope_angle'.

    Returns
    -------
    dict
        {
            "village_id": str,
            "explanation": str,
            "factors": {feature_name: contribution_share, ...}
        }

    Raises
    ------
    ValueError
        If village_id is empty or environmental_data is not a usable dict.
    """
    if not village_id:
        raise ValueError("explain_prediction: 'village_id' must be a non-empty string.")
    if not isinstance(environmental_data, dict) or len(environmental_data) == 0:
        raise ValueError("explain_prediction: 'environmental_data' must be a non-empty dict.")

    cleaned = clean_sensor_data(environmental_data)

    try:
        model = load_model()
    except FileNotFoundError:
        # No trained model available yet — fall back to the pure
        # rule-based explanation so this endpoint still degrades
        # gracefully instead of throwing a 500.
        explanation, factors = _rule_based_explanation(cleaned)
        return {"village_id": village_id, "explanation": explanation, "factors": factors}

    if _SHAP_AVAILABLE:
        try:
            explanation, factors = _shap_explanation(model, cleaned)
        except Exception:
            # SHAP is installed but failed for this model/input shape —
            # fall back rather than surfacing an internal error.
            explanation, factors = _rule_based_explanation(cleaned)
    else:
        explanation, factors = _rule_based_explanation(cleaned)

    return {"village_id": village_id, "explanation": explanation, "factors": factors}


if __name__ == "__main__":
    # Smoke test: python backend/explain.py
    # (works with or without `shap` installed; with a trained model
    # if present, otherwise falls back to the rule-based path.)
    result = explain_prediction(
        "TestVillage",
        {"rainfall_mm": 250, "soil_moisture": 90, "slope_angle": 10},
    )
    print(result)
    assert result["village_id"] == "TestVillage"
    assert isinstance(result["explanation"], str) and len(result["explanation"]) > 0
    print("explain.py smoke test passed. SHAP available:", _SHAP_AVAILABLE)
