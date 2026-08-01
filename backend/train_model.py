"""
backend/train_model.py
========================
Trains the LandSense landslide risk classifier and records evaluation
metrics. Falls back to a synthetic dataset when no real labeled data
is available (e.g. for demos, hackathon judging, or first-time setup).

Functions
---------
generate_synthetic_landslide_dataset(samples=1000) -> pd.DataFrame
train_and_evaluate_model(data_path=None)           -> dict
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from typing import Optional

import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)
from sklearn.preprocessing import label_binarize

BASE_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(BASE_DIR, "model.joblib")
DB_PATH = os.path.join(BASE_DIR, "database.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

RISK_LABELS = ["Low", "Medium", "High"]
FEATURE_COLUMNS = ["rainfall_mm", "soil_moisture", "slope_angle"]


def generate_synthetic_landslide_dataset(samples: int = 1000) -> pd.DataFrame:
    """
    Generate a synthetic, roughly class-balanced landslide risk dataset
    to use as a fallback when no real labeled data is provided.

    Columns
    -------
    rainfall_mm    : float in [0, 300]
    soil_moisture  : float in [0, 100]
    slope_angle    : float in [0, 60]
    risk_label     : one of 'High', 'Medium', 'Low'

    Parameters
    ----------
    samples : int
        Number of rows to generate.

    Returns
    -------
    pd.DataFrame
    """
    rng = np.random.default_rng(seed=42)

    rainfall_mm = rng.uniform(0, 300, samples)
    soil_moisture = rng.uniform(0, 100, samples)
    slope_angle = rng.uniform(0, 60, samples)

    risk_labels = []
    for rain, moisture, slope in zip(rainfall_mm, soil_moisture, slope_angle):
        # A simple composite risk score drives the rule-based label so
        # classes stay reasonably balanced and the relationship between
        # features and label is learnable (not just noise).
        score = (rain / 300) * 0.5 + (moisture / 100) * 0.3 + (slope / 60) * 0.2
        # Small random jitter avoids a perfectly deterministic boundary,
        # which would make the classifier trivially overfit.
        score += rng.normal(0, 0.05)

        if score > 0.62 or (rain > 180 or slope > 30):
            risk_labels.append("High")
        elif score > 0.38:
            risk_labels.append("Medium")
        else:
            risk_labels.append("Low")

    df = pd.DataFrame({
        "rainfall_mm": rainfall_mm,
        "soil_moisture": soil_moisture,
        "slope_angle": slope_angle,
        "risk_label": risk_labels,
    })
    return df


def _ensure_database() -> None:
    """Create backend/database.db from schema.sql if it doesn't exist yet."""
    if os.path.exists(DB_PATH):
        return
    if not os.path.exists(SCHEMA_PATH):
        raise FileNotFoundError(
            f"Cannot initialize database: schema file not found at {SCHEMA_PATH}"
        )
    conn = sqlite3.connect(DB_PATH)
    try:
        with open(SCHEMA_PATH, "r") as f:
            conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()


def train_and_evaluate_model(data_path: Optional[str] = None) -> dict:
    """
    Train a RandomForestClassifier on landslide risk data, evaluate it,
    persist the trained model to disk, and log the evaluation metrics
    into the ``model_metrics`` table.

    Parameters
    ----------
    data_path : str, optional
        Path to a CSV file with columns matching FEATURE_COLUMNS plus
        'risk_label'. If not provided or the file doesn't exist, a
        synthetic dataset is generated instead.

    Returns
    -------
    dict
        The computed metrics: accuracy, precision, recall, f1_score,
        auc_roc, and the path the model was saved to.
    """
    try:
        # ---- 1. Load or synthesize data ----
        if data_path and os.path.exists(data_path):
            df = pd.read_csv(data_path)
            print(f"[train_model] Loaded real dataset from {data_path} ({len(df)} rows).")
        else:
            df = generate_synthetic_landslide_dataset(samples=1000)
            print(f"[train_model] No real dataset provided/found — using synthetic dataset "
                  f"({len(df)} rows).")

        missing_cols = [c for c in FEATURE_COLUMNS + ["risk_label"] if c not in df.columns]
        if missing_cols:
            raise ValueError(f"Dataset is missing required columns: {missing_cols}")

        # ---- 2. Split features / labels ----
        X = df[FEATURE_COLUMNS].copy()
        y = df["risk_label"].copy()

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )

        # ---- 3. Train ----
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=None,
            class_weight="balanced",
            random_state=42,
        )
        model.fit(X_train, y_train)

        # ---- 4. Predict & evaluate ----
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)

        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average="macro", zero_division=0)
        recall = recall_score(y_test, y_pred, average="macro", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)

        # Multiclass AUC-ROC: one-vs-rest, macro-averaged. Falls back to
        # binary AUC-ROC on the 'High' class if only two classes appear
        # in this particular split.
        classes_present = sorted(y_test.unique().tolist())
        if len(classes_present) > 2:
            y_test_bin = label_binarize(y_test, classes=model.classes_.tolist())
            auc_roc = roc_auc_score(y_test_bin, y_proba, average="macro", multi_class="ovr")
        elif len(classes_present) == 2 and "High" in model.classes_:
            high_idx = list(model.classes_).index("High")
            y_test_high = (y_test == "High").astype(int)
            auc_roc = roc_auc_score(y_test_high, y_proba[:, high_idx])
        else:
            auc_roc = float("nan")

        metrics = {
            "accuracy": float(accuracy),
            "precision": float(precision),
            "recall": float(recall),
            "f1_score": float(f1),
            "auc_roc": float(auc_roc) if not np.isnan(auc_roc) else 0.0,
        }

        print("[train_model] Evaluation metrics:")
        for k, v in metrics.items():
            print(f"  {k}: {v:.4f}")

        # ---- 5. Save model ----
        joblib.dump(model, MODEL_PATH)
        print(f"[train_model] Model saved to {MODEL_PATH}")

        # ---- 6. Persist metrics to model_metrics table ----
        try:
            _ensure_database()
            conn = sqlite3.connect(DB_PATH)
            try:
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO model_metrics
                        (accuracy, precision, recall, f1_score, auc_roc, evaluated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        metrics["accuracy"],
                        metrics["precision"],
                        metrics["recall"],
                        metrics["f1_score"],
                        metrics["auc_roc"],
                        datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    ),
                )
                conn.commit()
                print("[train_model] Metrics written to model_metrics table.")
            finally:
                conn.close()
        except sqlite3.Error as db_err:
            print(f"[train_model] WARNING: failed to write metrics to database: {db_err}")

        metrics["model_path"] = MODEL_PATH
        print("[train_model] Training complete.")
        return metrics

    except Exception as exc:
        print(f"[train_model] ERROR during training: {exc}")
        raise


if __name__ == "__main__":
    train_and_evaluate_model()
