-- ============================================================
-- LandSense Landslide Prediction & Emergency Alert System
-- SQLite Database Schema
--
-- Usage:
--   sqlite3 backend/database.db < backend/schema.sql
--
-- This script is idempotent: every statement uses
-- CREATE TABLE IF NOT EXISTS, so it is safe to re-run against
-- an existing database without dropping data.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------
-- users
-- Authority officers and citizen accounts.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name     TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('authority', 'citizen')),
    is_authority  INTEGER NOT NULL DEFAULT 0 CHECK (is_authority IN (0, 1)),
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ------------------------------------------------------------
-- predictions
-- Every model inference run, one row per village per run.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS predictions (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id             INTEGER NOT NULL,
    village_name           TEXT NOT NULL,
    risk_level             TEXT NOT NULL CHECK (risk_level IN ('High', 'Medium', 'Low')),
    landslide_probability  REAL NOT NULL CHECK (landslide_probability >= 0 AND landslide_probability <= 1),
    rainfall_mm            REAL NOT NULL,
    soil_moisture          REAL NOT NULL,
    slope_angle            REAL NOT NULL,
    timestamp              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_predictions_village_id ON predictions (village_id);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp   ON predictions (timestamp);

-- ------------------------------------------------------------
-- alerts
-- Candidate alerts raised by the model, awaiting / holding an
-- authority decision.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id          INTEGER NOT NULL,
    message             TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_by_user_id  INTEGER,
    decided_at          TEXT,
    FOREIGN KEY (decided_by_user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_village_id ON alerts (village_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status     ON alerts (status);

-- ------------------------------------------------------------
-- citizens
-- Registered residents, linked 1:1 to a users row (role='citizen').
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizens (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    name          TEXT NOT NULL,
    village_id    INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'I''m Safe' CHECK (status IN ('I''m Safe', 'Need Help')),
    location_lat  REAL NOT NULL,
    location_lng  REAL NOT NULL,
    last_updated  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_citizens_user_id    ON citizens (user_id);
CREATE INDEX IF NOT EXISTS idx_citizens_village_id ON citizens (village_id);

-- ------------------------------------------------------------
-- shelters
-- Designated safe shelters with live occupancy.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shelters (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT NOT NULL,
    village_id         INTEGER NOT NULL,
    capacity           INTEGER NOT NULL CHECK (capacity >= 0),
    current_occupancy  INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
    contact_number     TEXT NOT NULL,
    lat                REAL NOT NULL,
    lng                REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shelters_village_id ON shelters (village_id);

-- ------------------------------------------------------------
-- audit_logs
-- Immutable record of every sensitive action (approvals,
-- rejections, logins, occupancy edits, etc.).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    action     TEXT NOT NULL,
    resource   TEXT NOT NULL,
    details    TEXT NOT NULL,
    timestamp  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);

-- ------------------------------------------------------------
-- model_metrics
-- One row per model evaluation run (train_model.py appends here).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_metrics (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    accuracy      REAL NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    precision     REAL NOT NULL CHECK (precision >= 0 AND precision <= 1),
    recall        REAL NOT NULL CHECK (recall >= 0 AND recall <= 1),
    f1_score      REAL NOT NULL CHECK (f1_score >= 0 AND f1_score <= 1),
    auc_roc       REAL NOT NULL CHECK (auc_roc >= 0 AND auc_roc <= 1),
    evaluated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Seed data (safe to keep — idempotent via INSERT OR IGNORE)
-- A minimal starter authority account and a few villages'
-- shelters so the API has something to return on first run.
-- Password hash below corresponds to plaintext "admin123"
-- hashed with bcrypt at setup time; replace before production use.
-- ------------------------------------------------------------
INSERT OR IGNORE INTO users (id, email, password_hash, full_name, role, is_authority)
VALUES (1, 'anil.kumar@ddma.kerala.gov.in', '$2b$12$mm0LXGjae4c0R6h7hxUfguKZMuRr6BXRj824uz/RlfM.vK26.m1rq', 'Officer Anil Kumar', 'authority', 1);

INSERT OR IGNORE INTO shelters (id, name, village_id, capacity, current_occupancy, contact_number, lat, lng)
VALUES
    (1, 'Govt. LP School, Meppadi',     1024, 250, 180, '+91-4936-220011', 11.593, 76.145),
    (2, 'Community Hall, Kalpetta',     1024, 400, 260, '+91-4936-220022', 11.608, 76.083),
    (3, 'Govt. HSS, Elappully',         2048, 300, 300, '+91-4923-220033', 10.790, 76.660),
    (4, 'Panchayat Hall, Kavalangad',   3012, 180, 95,  '+91-4822-220044', 9.724,  76.756),
    (5, 'Govt. UP School, Vellarimala', 4055, 150, 40,  '+91-4936-220055', 11.455, 76.075);
