"""
backend/seed_db.py
==================
Seeds the LandSense database with sample villages, shelters, users,
and predictions. Idempotent: safe to run multiple times.

Usage:
    python seed_db.py
"""

import os
import sqlite3
import bcrypt
from datetime import datetime, timezone
import random

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "database.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def apply_schema(conn):
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    conn.commit()


def seed_users(conn):
    users = [
        ("admin@landsense.in", "Authority Admin", "admin123", "authority", 1),
        ("citizen@landsense.in", "Test Citizen", "citizen123", "citizen", 0),
        ("anil.kumar@ddma.kerala.gov.in", "Officer Anil Kumar", "admin123", "authority", 1),
    ]
    for email, name, pwd, role, is_auth in users:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            continue
        pwd_hash = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        conn.execute(
            "INSERT INTO users (email, password_hash, full_name, role, is_authority) VALUES (?, ?, ?, ?, ?)",
            (email, pwd_hash, name, role, is_auth),
        )
    conn.commit()
    print("[seed] Users seeded.")


def seed_villages(conn):
    villages = [
        ("Munnar", "Idukki", "Kerala", 10.0889, 77.0595, 1600, 35.0, "Laterite"),
        ("Wayanad", "Wayanad", "Kerala", 11.6854, 76.1320, 900, 28.0, "Clay"),
        ("Kodagu", "Kodagu", "Karnataka", 12.3375, 75.8069, 1100, 32.0, "Loam"),
        ("Uttarkashi", "Uttarkashi", "Uttarakhand", 30.7268, 78.4354, 1158, 40.0, "Rocky"),
        ("Chamoli", "Chamoli", "Uttarakhand", 30.4004, 79.3167, 1400, 38.0, "Sandy"),
        ("Pithoragarh", "Pithoragarh", "Uttarakhand", 29.5819, 80.2181, 1814, 42.0, "Clay"),
        ("Shimla", "Shimla", "Himachal Pradesh", 31.1048, 77.1734, 2200, 30.0, "Laterite"),
        ("Dharamshala", "Kangra", "Himachal Pradesh", 32.2190, 76.3234, 1457, 33.0, "Loam"),
        ("Mandi", "Mandi", "Himachal Pradesh", 31.7080, 76.9320, 800, 25.0, "Sandy"),
        ("Kalimpong", "Kalimpong", "West Bengal", 27.0660, 88.4710, 1250, 36.0, "Clay"),
        ("Darjeeling", "Darjeeling", "West Bengal", 27.0410, 88.2663, 2050, 38.0, "Laterite"),
        ("Gangtok", "East Sikkim", "Sikkim", 27.3389, 88.6065, 1650, 40.0, "Rocky"),
    ]
    for v in villages:
        existing = conn.execute("SELECT id FROM villages WHERE name = ? AND state = ?", (v[0], v[2])).fetchone()
        if existing:
            continue
        conn.execute(
            "INSERT INTO villages (name, district, state, lat, lng, elevation_m, slope_angle, soil_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            v,
        )
    conn.commit()
    print("[seed] Villages seeded.")


def seed_shelters(conn):
    shelters = [
        ("Munnar Relief Camp", 1, 500, 0, "+91-4865-222001", 10.0925, 77.0601, "Near Munnar Town Hall, Idukki", "Kerala"),
        ("Wayanad Community Shelter", 2, 800, 0, "+91-4936-202020", 11.6900, 76.1350, "Kalpetta Municipal Ground, Wayanad", "Kerala"),
        ("Kodagu Emergency Centre", 3, 400, 0, "+91-8272-225566", 12.3400, 75.8100, "Madikeri Stadium, Kodagu", "Karnataka"),
        ("Uttarkashi Shelter", 4, 600, 0, "+91-1374-222345", 30.7290, 78.4370, "District Collectorate, Uttarkashi", "Uttarakhand"),
        ("Chamoli Relief Base", 5, 450, 0, "+91-1372-251234", 30.4020, 79.3180, "Gopeshwar Bus Stand, Chamoli", "Uttarakhand"),
        ("Pithoragarh Safe Zone", 6, 350, 0, "+91-5964-225566", 29.5830, 80.2190, "Pithoragarh Town Ground", "Uttarakhand"),
        ("Shimla Emergency Shelter", 7, 700, 0, "+91-177-2812345", 31.1060, 77.1740, "Shimla Ridge Ground, Shimla", "Himachal Pradesh"),
        ("Dharamshala Relief Camp", 8, 550, 0, "+91-1892-222001", 32.2200, 76.3240, "McLeod Ganj Ground, Kangra", "Himachal Pradesh"),
        ("Mandi Community Centre", 9, 400, 0, "+91-1905-222334", 31.7090, 76.9330, "Mandi Town Hall", "Himachal Pradesh"),
        ("Kalimpong Relief Camp", 10, 500, 0, "+91-3552-255001", 27.0670, 88.4720, "Kalimpong Town Ground", "West Bengal"),
        ("Darjeeling Shelter", 11, 600, 0, "+91-354-2254321", 27.0420, 88.2670, "Chowrasta Ground, Darjeeling", "West Bengal"),
        ("Gangtok Emergency Base", 12, 450, 0, "+91-3592-202020", 27.3395, 88.6070, "MG Marg, Gangtok, Sikkim", "Sikkim"),
    ]
    for s in shelters:
        existing = conn.execute("SELECT id FROM shelters WHERE name = ?", (s[0],)).fetchone()
        if existing:
            continue
        conn.execute(
            "INSERT INTO shelters (name, village_id, capacity, current_occupancy, contact_number, lat, lng, address, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            s,
        )
    conn.commit()
    print("[seed] Shelters seeded.")


def seed_predictions(conn):
    villages = conn.execute("SELECT id, name FROM villages").fetchall()
    random.seed(42)
    for v in villages:
        existing = conn.execute("SELECT id FROM predictions WHERE village_id = ?", (v["id"],)).fetchone()
        if existing:
            continue
        rainfall = round(random.uniform(20, 200), 2)
        moisture = round(random.uniform(30, 90), 2)
        slope = round(random.uniform(10, 45), 2)
        prob = round(random.uniform(0.1, 0.95), 4)
        if prob >= 0.7:
            risk = "High"
        elif prob >= 0.4:
            risk = "Medium"
        else:
            risk = "Low"
        conn.execute(
            "INSERT INTO predictions (village_id, village_name, risk_level, landslide_probability, rainfall_mm, soil_moisture, slope_angle, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (v["id"], v["name"], risk, prob, rainfall, moisture, slope, datetime.now(timezone.utc).isoformat(timespec="seconds")),
        )
    conn.commit()
    print("[seed] Predictions seeded.")


def seed_alerts(conn):
    high_risk = conn.execute("SELECT village_id, village_name FROM predictions WHERE risk_level = 'High'").fetchall()
    for p in high_risk:
        existing = conn.execute("SELECT id FROM alerts WHERE village_id = ?", (p["village_id"],)).fetchone()
        if existing:
            continue
        conn.execute(
            "INSERT INTO alerts (village_id, message, status) VALUES (?, ?, ?)",
            (p["village_id"], f"High landslide risk detected in {p['village_name']}. Immediate evacuation may be required.", "pending"),
        )
    conn.commit()
    print("[seed] Alerts seeded.")


def main():
    print("[seed] Starting database seeding...")
    conn = get_db()
    try:
        apply_schema(conn)
        seed_users(conn)
        seed_villages(conn)
        seed_shelters(conn)
        seed_predictions(conn)
        seed_alerts(conn)
        print("[seed] Database seeding complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
