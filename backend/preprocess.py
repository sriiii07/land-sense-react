"""
backend/preprocess.py
======================
Data preprocessing utilities for the LandSense landslide prediction
pipeline: sensor-reading cleanup, feature engineering, and feature
scaling. These functions sit between raw data ingestion
(data_ingest.py) and model training / inference (train_model.py,
predict.py).

Functions
---------
clean_sensor_data(raw_data)      -> dict
feature_engineering(df)          -> pd.DataFrame
scale_features(features)         -> np.ndarray
"""

from __future__ import annotations

import os
from typing import Any, Dict

import numpy as np
import pandas as pd
import joblib
from sklearn.preprocessing import StandardScaler

# Path where the fitted StandardScaler is persisted so that inference
# uses the exact same scaling parameters the model was trained with.
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.joblib")

# Default values used to impute missing sensor readings. These are
# conservative "safe" defaults (roughly a dry, low-risk baseline) so
# that a missing sensor never silently inflates the predicted risk.
DEFAULT_VALUES: Dict[str, float] = {
    "rainfall_mm": 0.0,
    "soil_moisture": 30.0,
    "pore_water_pressure": 0.0,
    "slope_angle": 15.0,
    "temperature": 25.0,
    "seismic_vibration": 0.0,
    "elevation_m": 0.0,
    "forecast_precip_24h": 0.0,
}


def clean_sensor_data(raw_data: dict) -> dict:
    """
    Detect and impute missing or null values in a raw sensor reading.

    For every key present in ``raw_data`` whose value is ``None``, the
    value is replaced with a sensible default (see ``DEFAULT_VALUES``).
    Unknown keys not covered by ``DEFAULT_VALUES`` and set to ``None``
    fall back to ``0``. Keys entirely absent from ``raw_data`` but
    present in ``DEFAULT_VALUES`` are added, so the returned dict is
    guaranteed to carry every expected sensor field.

    Parameters
    ----------
    raw_data : dict
        Dictionary of environmental fields, e.g.
        ``{'rainfall_mm': None, 'soil_moisture': 42.0}``.

    Returns
    -------
    dict
        A new dict with the same keys (plus any missing expected keys)
        where no value is ``None``.
    """
    if raw_data is None:
        raw_data = {}

    cleaned: Dict[str, Any] = dict(raw_data)  # shallow copy, don't mutate caller's dict

    # Fill in any missing-but-expected sensor fields first.
    for key, default in DEFAULT_VALUES.items():
        if key not in cleaned:
            cleaned[key] = default

    # Impute None / NaN values across every key present.
    for key, value in list(cleaned.items()):
        is_missing = value is None
        try:
            is_missing = is_missing or (isinstance(value, float) and np.isnan(value))
        except TypeError:
            pass

        if is_missing:
            cleaned[key] = DEFAULT_VALUES.get(key, 0.0)

    return cleaned


def feature_engineering(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add engineered features to a historical sensor-reading DataFrame.

    Expects (at minimum) the columns ``rainfall_mm``, ``soil_moisture``,
    and ``timestamp``. Data is assumed to be roughly hourly and sorted
    (this function sorts by timestamp defensively if present).

    New columns added:
    - ``rainfall_3day``       : rolling 72-hour (3-record-window proxy,
                                 or true 72h window if timestamps allow)
                                 cumulative rainfall.
    - ``rainfall_intensity``  : rainfall_mm per hour since the previous
                                 reading (0 where it can't be computed).
    - ``saturation_index``    : soil_moisture normalized to a 0-1 scale
                                 assuming a 0-100 percentage input.

    Parameters
    ----------
    df : pd.DataFrame
        Historical sensor data, at least containing 'rainfall_mm' and
        'soil_moisture'. 'timestamp' is optional but recommended.

    Returns
    -------
    pd.DataFrame
        A copy of ``df`` with the engineered columns appended. Original
        columns and their order are preserved.
    """
    if df is None or len(df) == 0:
        # Return an empty frame with the expected extra columns so
        # downstream code doesn't have to special-case emptiness.
        empty = pd.DataFrame(columns=list(df.columns) + [
            "rainfall_3day", "rainfall_intensity", "saturation_index"
        ]) if df is not None else pd.DataFrame(
            columns=["rainfall_mm", "soil_moisture", "timestamp",
                     "rainfall_3day", "rainfall_intensity", "saturation_index"]
        )
        return empty

    out = df.copy()

    # Ensure the columns we depend on exist; fill with 0 if not.
    if "rainfall_mm" not in out.columns:
        out["rainfall_mm"] = 0.0
    if "soil_moisture" not in out.columns:
        out["soil_moisture"] = 0.0

    has_timestamp = "timestamp" in out.columns
    if has_timestamp:
        out["timestamp"] = pd.to_datetime(out["timestamp"], errors="coerce")
        out = out.sort_values("timestamp").reset_index(drop=True)

    # --- 72-hour cumulative rainfall ---
    if has_timestamp and out["timestamp"].notna().any():
        # True time-based 72h rolling sum, indexed by timestamp.
        temp = out.set_index("timestamp")
        rolling_sum = temp["rainfall_mm"].rolling("72h", min_periods=1).sum()
        out["rainfall_3day"] = rolling_sum.values
    else:
        # Fallback: assume hourly cadence, use a 3-row rolling window
        # (documented assumption per spec: "sum over last 3 records").
        out["rainfall_3day"] = out["rainfall_mm"].rolling(window=3, min_periods=1).sum()
    out["rainfall_3day"] = out["rainfall_3day"].fillna(0.0)

    # --- Rainfall intensity (mm per hour since previous reading) ---
    if has_timestamp and out["timestamp"].notna().any():
        hours_since_last = out["timestamp"].diff().dt.total_seconds() / 3600.0
        # First row (or any zero/negative/NaN gap) has no valid prior
        # interval — treat intensity as equal to the raw reading rate
        # over 1 hour to avoid division by zero.
        hours_since_last = hours_since_last.replace(0, np.nan)
        out["rainfall_intensity"] = (out["rainfall_mm"] / hours_since_last).fillna(out["rainfall_mm"])
    else:
        # No timestamp to derive a gap from — treat each reading as a
        # 1-hour interval, so intensity equals the raw rainfall value.
        out["rainfall_intensity"] = out["rainfall_mm"].fillna(0.0)

    out["rainfall_intensity"] = out["rainfall_intensity"].replace([np.inf, -np.inf], 0.0).fillna(0.0)

    # --- Soil saturation index (0-1, assuming soil_moisture is a 0-100 %) ---
    max_soil_moisture = 100.0
    out["saturation_index"] = (out["soil_moisture"].fillna(0.0) / max_soil_moisture).clip(lower=0.0, upper=1.0)

    return out


def scale_features(features: np.ndarray) -> np.ndarray:
    """
    Standardize (z-score normalize) a 2D array of feature values.

    If a previously fitted scaler exists at ``SCALER_PATH``, it is
    loaded and used to transform ``features`` (consistent scaling
    between training and inference). Otherwise, a new
    ``StandardScaler`` is fit on ``features`` and persisted to
    ``SCALER_PATH`` via ``joblib.dump`` for future calls.

    Parameters
    ----------
    features : np.ndarray
        2D array of shape (n_samples, n_features).

    Returns
    -------
    np.ndarray
        The scaled (mean=0, unit variance) feature array.

    Raises
    ------
    ValueError
        If ``features`` is empty or not array-like.
    """
    if features is None:
        raise ValueError("scale_features: 'features' must not be None.")

    features = np.asarray(features, dtype=float)

    if features.size == 0:
        raise ValueError("scale_features: 'features' is empty — cannot scale zero samples.")

    if features.ndim == 1:
        # Treat a single sample / single feature vector as one row.
        features = features.reshape(1, -1)

    if os.path.exists(SCALER_PATH):
        scaler: StandardScaler = joblib.load(SCALER_PATH)
        # Guard against a shape mismatch between the persisted scaler
        # and the incoming data (e.g. feature set changed upstream).
        if getattr(scaler, "n_features_in_", features.shape[1]) != features.shape[1]:
            scaler = StandardScaler()
            scaler.fit(features)
            joblib.dump(scaler, SCALER_PATH)
        scaled = scaler.transform(features)
    else:
        scaler = StandardScaler()
        scaler.fit(features)
        joblib.dump(scaler, SCALER_PATH)
        scaled = scaler.transform(features)

    return scaled


if __name__ == "__main__":
    # Minimal self-test / smoke test, run with: python backend/preprocess.py
    print("Testing clean_sensor_data...")
    sample = clean_sensor_data({"rainfall_mm": None, "soil_moisture": 42.0})
    assert all(v is not None for v in sample.values()), "clean_sensor_data left a None value"
    print("  OK ->", sample)

    print("Testing feature_engineering...")
    sample_df = pd.DataFrame({
        "rainfall_mm": [10, 20, 15, 5, 0, 40],
        "soil_moisture": [30, 35, 40, 38, 33, 45],
        "timestamp": pd.date_range("2026-08-01", periods=6, freq="h"),
    })
    engineered = feature_engineering(sample_df)
    assert {"rainfall_3day", "rainfall_intensity", "saturation_index"}.issubset(engineered.columns)
    print("  OK ->\n", engineered)

    print("Testing scale_features...")
    arr = np.array([[10.0, 30.0], [20.0, 40.0], [15.0, 35.0]])
    scaled_1 = scale_features(arr)
    scaled_2 = scale_features(arr)  # should reuse the persisted scaler
    assert np.allclose(scaled_1, scaled_2), "scaler was not reused across calls"
    print("  OK -> scaler persisted at", SCALER_PATH)

    print("Testing scale_features error on empty input...")
    try:
        scale_features(np.array([]))
        raise AssertionError("expected ValueError for empty input")
    except ValueError as e:
        print("  OK -> raised ValueError:", e)

    print("\nAll preprocess.py self-tests passed.")
