PRAGMA foreign_keys = ON;

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

CREATE TABLE IF NOT EXISTS villages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    district    TEXT NOT NULL,
    state       TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    elevation_m REAL NOT NULL,
    slope_angle REAL NOT NULL,
    soil_type   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS predictions (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id             INTEGER NOT NULL,
    village_name           TEXT NOT NULL,
    risk_level             TEXT NOT NULL CHECK (risk_level IN ('High', 'Medium', 'Low')),
    landslide_probability  REAL NOT NULL CHECK (landslide_probability >= 0 AND landslide_probability <= 1),
    rainfall_mm            REAL NOT NULL,
    soil_moisture          REAL NOT NULL,
    slope_angle            REAL NOT NULL,
    timestamp              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (village_id) REFERENCES villages(id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_village_id ON predictions (village_id);
CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions (timestamp);

CREATE TABLE IF NOT EXISTS alerts (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    village_id          INTEGER NOT NULL,
    message             TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_by_user_id  INTEGER,
    decided_at          TEXT,
    FOREIGN KEY (village_id) REFERENCES villages(id),
    FOREIGN KEY (decided_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_village_id ON alerts (village_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);

CREATE TABLE IF NOT EXISTS citizens (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    name          TEXT NOT NULL,
    village_id    INTEGER NOT NULL,
    status        TEXT NOT NULL DEFAULT 'Unknown',
    location_lat  REAL NOT NULL DEFAULT 0.0,
    location_lng  REAL NOT NULL DEFAULT 0.0,
    last_updated  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (village_id) REFERENCES villages(id)
);

CREATE INDEX IF NOT EXISTS idx_citizens_user_id ON citizens (user_id);
CREATE INDEX IF NOT EXISTS idx_citizens_village_id ON citizens (village_id);

CREATE TABLE IF NOT EXISTS shelters (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    name               TEXT NOT NULL,
    village_id         INTEGER NOT NULL,
    capacity           INTEGER NOT NULL CHECK (capacity >= 0),
    current_occupancy  INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
    contact_number     TEXT NOT NULL,
    lat                REAL NOT NULL,
    lng                REAL NOT NULL,
    address            TEXT NOT NULL DEFAULT '',
    state              TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (village_id) REFERENCES villages(id)
);

CREATE INDEX IF NOT EXISTS idx_shelters_village_id ON shelters (village_id);

CREATE TABLE IF NOT EXISTS model_metrics (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    accuracy      REAL NOT NULL CHECK (accuracy >= 0 AND accuracy <= 1),
    precision     REAL NOT NULL CHECK (precision >= 0 AND precision <= 1),
    recall        REAL NOT NULL CHECK (recall >= 0 AND recall <= 1),
    f1_score      REAL NOT NULL CHECK (f1_score >= 0 AND f1_score <= 1),
    auc_roc       REAL NOT NULL CHECK (auc_roc >= 0 AND auc_roc <= 1),
    evaluated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    action     TEXT NOT NULL,
    resource   TEXT NOT NULL,
    details    TEXT NOT NULL,
    timestamp  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
