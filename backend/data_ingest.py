"""
backend/data_ingest.py
========================
Simulates live environmental data ingestion for LandSense, in the
absence of real sensor/API integrations. Generates realistic-looking
readings, scores them with the trained model, and writes the result
into the `predictions` table.

Intended to be run as a background job (a separate thread, or an
external cron/scheduler) that calls `sync_telemetry_job()` on an
interval — see the note at the bottom of this file.

Functions
---------
fetch_current_environment() -> dict
sync_telemetry_job()        -> None
"""

from __future__ import annotations

import os
import random
import sqlite3
import time
from datetime import datetime, timezone

import predict

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "database.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

# Test/demo village used for simulated ingestion. In production this
# would loop over every real village_id from the `villages` reference
# table instead of a single hardcoded id.
TEST_VILLAGE_ID = 1
TEST_VILLAGE_NAME = "TestVillage"


def fetch_current_environment() -> dict:
    """
    Simulate fetching a live environmental sensor reading.

    Returns
    -------
    dict
        {
            "temperature": float,          # deg C, range [15, 35]
            "rainfall_mm": float,           # mm in the last interval, range [0, 20]
            "soil_moisture": float,         # %, range [30, 90]
            "seismic_vibration": float,     # arbitrary units, range [0, 5]
            "slope_angle": float,           # degrees, static-ish per site, range [5, 45]
            "timestamp": str,                # ISO 8601 UTC timestamp
        }
        Directly usable as input to predict.predict_risk().
    """
    reading = {
        "temperature": round(random.uniform(15, 35), 2),
        "rainfall_mm": round(random.uniform(0, 20), 2),
        "soil_moisture": round(random.uniform(30, 90), 2),
        "seismic_vibration": round(random.uniform(0, 5), 3),
        "slope_angle": round(random.uniform(5, 45), 2),
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    return reading


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


def sync_telemetry_job() -> None:
    """
    One iteration of the simulated telemetry sync job:

    1. Fetch a new (simulated) environmental reading.
    2. Score it with the trained model via predict.predict_risk().
    3. Insert the resulting prediction into the `predictions` table.

    Any database error is caught and logged rather than raised, so a
    single failed sync doesn't crash a long-running scheduler loop.

    Note
    ----
    This function performs a single sync. To run continuously (e.g.
    every 60 seconds), call it in a loop from a dedicated background
    thread or an external scheduler:

        import threading, time
        def _loop():
            while True:
                sync_telemetry_job()
                time.sleep(60)
        threading.Thread(target=_loop, daemon=True).start()

    Do not call this in a tight loop on the main FastAPI thread — run
    it on a background thread/process, or via a cron job that invokes
    this module, so it never blocks request handling.
    """
    try:
        reading = fetch_current_environment()
    except Exception as exc:
        print(f"[data_ingest] ERROR fetching environment reading: {exc}")
        return

    try:
        prediction = predict.predict_risk(reading)
    except FileNotFoundError as exc:
        print(f"[data_ingest] ERROR: no trained model available ({exc}). "
              "Run train_model.py first. Skipping this sync cycle.")
        return
    except Exception as exc:
        print(f"[data_ingest] ERROR predicting risk: {exc}")
        return

    try:
        _ensure_database()
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO predictions
                    (village_id, village_name, risk_level, landslide_probability,
                     rainfall_mm, soil_moisture, slope_angle, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    TEST_VILLAGE_ID,
                    TEST_VILLAGE_NAME,
                    prediction["risk_level"],
                    prediction["probability"],
                    reading["rainfall_mm"],
                    reading["soil_moisture"],
                    reading["slope_angle"],
                    reading["timestamp"],
                ),
            )
            conn.commit()
            print(
                f"[data_ingest] Synced reading for {TEST_VILLAGE_NAME} "
                f"(village_id={TEST_VILLAGE_ID}): risk={prediction['risk_level']} "
                f"(p={prediction['probability']:.2f}) at {reading['timestamp']}"
            )
        finally:
            conn.close()
    except sqlite3.Error as db_err:
        print(f"[data_ingest] ERROR writing prediction to database: {db_err}")
    except Exception as exc:
        print(f"[data_ingest] Unexpected ERROR during database write: {exc}")


if __name__ == "__main__":
    # Smoke test: python backend/data_ingest.py
    # Runs a single sync cycle and prints the resulting predictions row.
    sync_telemetry_job()

    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM predictions ORDER BY id DESC LIMIT 1")
        print("Latest predictions row:", cur.fetchone())
    finally:
        conn.close()

    # To run continuously every 60 seconds instead of a single cycle:
    #
    # while True:
    #     sync_telemetry_job()
    #     time.sleep(60)
