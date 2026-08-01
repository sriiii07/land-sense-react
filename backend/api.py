"""
backend/api.py
================
FastAPI server for the LandSense Landslide Prediction & Emergency
Alert System. Wires together the database (schema.sql), the ML
pipeline (predict.py / explain.py / data_ingest.py), and the
notification service (notification_service.py) behind a REST API
consumed by the authority dashboard and citizen app.

Run with:
    uvicorn backend.api:app --reload --port 8000

Interactive docs (Swagger UI) are then available at:
    http://localhost:8000/docs
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel, EmailStr, Field

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import data_ingest
import explain as explain_module
import notification_service
import predict as predict_module

# ------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------
BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "database.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

# NOTE: in production this MUST come from an environment variable /
# secrets manager, never hardcoded. A hardcoded key is used here only
# so the demo runs out of the box.
SECRET_KEY = os.environ.get("LANDSENSE_SECRET_KEY", "landsense-dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

app = FastAPI(
    title="LandSense API",
    description="Backend API for the AI-Powered Landslide Prediction & Emergency Response Platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------
# Database helpers
# ------------------------------------------------------------------
def get_db() -> sqlite3.Connection:
    """Open a new SQLite connection with row access by column name."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def ensure_database() -> None:
    """Create backend/database.db from schema.sql if it doesn't exist.

    If the database exists but has not been initialized with the expected
    schema (for example if it was created empty), then apply schema.sql.
    """
    if not os.path.exists(SCHEMA_PATH):
        raise RuntimeError(f"schema.sql not found at {SCHEMA_PATH}; cannot initialize database.")

    should_create_schema = False
    if not os.path.exists(DB_PATH):
        should_create_schema = True
    else:
        conn = sqlite3.connect(DB_PATH)
        try:
            row = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            ).fetchone()
            if row is None:
                should_create_schema = True
        finally:
            conn.close()

    if not should_create_schema:
        return

    conn = sqlite3.connect(DB_PATH)
    try:
        with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
            conn.executescript(f.read())
        conn.commit()
    finally:
        conn.close()


@app.on_event("startup")
def on_startup() -> None:
    """Ensure the database and its schema exist before serving requests."""
    ensure_database()


def log_audit(conn: sqlite3.Connection, user_id: int, action: str, resource: str, details: str) -> None:
    """Write a row to audit_logs. Caller is responsible for commit()."""
    conn.execute(
        "INSERT INTO audit_logs (user_id, action, resource, details, timestamp) VALUES (?, ?, ?, ?, ?)",
        (user_id, action, resource, details, datetime.now(timezone.utc).isoformat(timespec="seconds")),
    )


# ------------------------------------------------------------------
# Pydantic v2 schemas
# ------------------------------------------------------------------
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    is_authority: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class MessageResponse(BaseModel):
    success: bool
    message: str


class PredictionOut(BaseModel):
    id: int
    village_id: int
    village_name: str
    risk_level: str
    landslide_probability: float
    rainfall_mm: float
    soil_moisture: float
    slope_angle: float
    timestamp: str


class PredictionSummary(BaseModel):
    total_villages: int
    high_risk_count: int
    medium_risk_count: int
    low_risk_count: int
    last_updated: Optional[str]


class EnvironmentalInput(BaseModel):
    rainfall_mm: float
    soil_moisture: float
    slope_angle: float


class ExplainOut(BaseModel):
    village_id: str
    explanation: str
    factors: dict


class ModelPerformanceOut(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    auc_roc: float
    evaluated_at: str


class AlertOut(BaseModel):
    id: int
    village_id: int
    message: str
    status: str
    created_at: str
    decided_by_user_id: Optional[int]
    decided_at: Optional[str]


class CitizenOut(BaseModel):
    id: int
    user_id: int
    name: str
    village_id: int
    status: str
    location_lat: float
    location_lng: float
    last_updated: str


class CitizenStatusUpdate(BaseModel):
    user_id: int
    status: str = Field(..., description="One of \"I'm Safe\" or \"Need Help\"")


class ShelterOut(BaseModel):
    id: int
    name: str
    village_id: int
    capacity: int
    current_occupancy: int
    contact_number: str
    lat: float
    lng: float


class ShelterOccupancyUpdate(BaseModel):
    current_occupancy: int = Field(..., ge=0)


# ------------------------------------------------------------------
# Auth helpers
# ------------------------------------------------------------------
def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def get_password_hash(plain_password: str) -> str:
    """Hash a plaintext password with bcrypt, returning a str for DB storage."""
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _row_to_user_out(row: sqlite3.Row) -> UserOut:
    return UserOut(
        id=row["id"],
        email=row["email"],
        full_name=row["full_name"],
        role=row["role"],
        is_authority=bool(row["is_authority"]),
    )


def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> UserOut:
    """Decode the bearer JWT and load the corresponding user from the DB."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if token is None:
        raise credentials_exception
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    finally:
        conn.close()

    if row is None:
        raise credentials_exception
    return _row_to_user_out(row)


def get_current_authority(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    """Require the current user to hold an authority role."""
    if not current_user.is_authority:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This action requires disaster management authority privileges.",
        )
    return current_user


# ------------------------------------------------------------------
# Auth routes
# ------------------------------------------------------------------
@app.post("/api/auth/login", response_model=LoginResponse, tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate with email (as 'username') + password, return a JWT."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (form_data.username,)).fetchone()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error during login: {exc}")
    finally:
        conn.close()

    if row is None or not verify_password(form_data.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"user_id": row["id"], "email": row["email"], "is_authority": bool(row["is_authority"])}
    )
    return LoginResponse(access_token=access_token, user=_row_to_user_out(row))


@app.post("/api/auth/forgot-password", response_model=MessageResponse, tags=["auth"])
def forgot_password(payload: ForgotPasswordRequest):
    """
    Mock password-reset request. Always returns 200 so the endpoint
    can't be used to enumerate which emails are registered. In
    production this would generate a reset token and email it via a
    real provider (e.g. SES/SendGrid); here it just logs the request.
    """
    print(f"[api] Password reset requested for {payload.email} (mock — no email sent).")
    return MessageResponse(success=True, message="If that email is registered, a reset link has been sent.")


@app.get("/api/me", response_model=UserOut, tags=["auth"])
def read_me(current_user: UserOut = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return current_user


# ------------------------------------------------------------------
# Prediction & analytics routes
# ------------------------------------------------------------------
@app.get("/api/predictions/today", response_model=List[PredictionOut], tags=["predictions"])
def predictions_today(current_user: UserOut = Depends(get_current_user)):
    """Return today's prediction runs across all villages."""
    start_of_today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM predictions WHERE timestamp >= ? ORDER BY timestamp DESC",
            (start_of_today,),
        ).fetchall()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()
    return [PredictionOut(**dict(r)) for r in rows]


@app.get("/api/predictions/summary", response_model=PredictionSummary, tags=["predictions"])
def predictions_summary(current_user: UserOut = Depends(get_current_user)):
    """Aggregate counts of villages by their most recent risk level."""
    conn = get_db()
    try:
        # Most recent prediction per village_id.
        rows = conn.execute(
            """
            SELECT p.village_id, p.risk_level, p.timestamp
            FROM predictions p
            INNER JOIN (
                SELECT village_id, MAX(timestamp) AS max_ts
                FROM predictions
                GROUP BY village_id
            ) latest
            ON p.village_id = latest.village_id AND p.timestamp = latest.max_ts
            """
        ).fetchall()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()

    high = sum(1 for r in rows if r["risk_level"] == "High")
    medium = sum(1 for r in rows if r["risk_level"] == "Medium")
    low = sum(1 for r in rows if r["risk_level"] == "Low")
    last_updated = max((r["timestamp"] for r in rows), default=None)

    return PredictionSummary(
        total_villages=len(rows),
        high_risk_count=high,
        medium_risk_count=medium,
        low_risk_count=low,
        last_updated=last_updated,
    )


@app.get("/api/predictions/history", response_model=List[PredictionOut], tags=["predictions"])
def predictions_history(limit: int = 50, current_user: UserOut = Depends(get_current_user)):
    """Return the most recent N prediction log entries (default 50)."""
    if limit <= 0 or limit > 1000:
        raise HTTPException(status_code=400, detail="'limit' must be between 1 and 1000.")
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT * FROM predictions ORDER BY timestamp DESC LIMIT ?", (limit,)
        ).fetchall()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()
    return [PredictionOut(**dict(r)) for r in rows]


@app.get("/api/explain/{village_id}", response_model=ExplainOut, tags=["predictions"])
def explain_village(village_id: str, current_user: UserOut = Depends(get_current_user)):
    """
    Explain the most recent prediction for a village. Pulls the latest
    stored reading for that village_id and runs it back through
    explain.explain_prediction().
    """
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM predictions WHERE village_id = ? ORDER BY timestamp DESC LIMIT 1",
            (village_id,),
        ).fetchone()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail=f"No predictions found for village_id={village_id}.")

    environmental_data = {
        "rainfall_mm": row["rainfall_mm"],
        "soil_moisture": row["soil_moisture"],
        "slope_angle": row["slope_angle"],
    }
    try:
        result = explain_module.explain_prediction(village_id, environmental_data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ExplainOut(**result)


@app.get("/api/analytics/model-performance", response_model=ModelPerformanceOut, tags=["analytics"])
def model_performance(current_user: UserOut = Depends(get_current_user)):
    """Return the most recently logged model evaluation metrics."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT * FROM model_metrics ORDER BY evaluated_at DESC LIMIT 1"
        ).fetchone()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="No model metrics found yet — run train_model.train_and_evaluate_model() first.",
        )
    return ModelPerformanceOut(
        accuracy=row["accuracy"],
        precision=row["precision"],
        recall=row["recall"],
        f1_score=row["f1_score"],
        auc_roc=row["auc_roc"],
        evaluated_at=row["evaluated_at"],
    )


# ------------------------------------------------------------------
# Environment & alert management routes
# ------------------------------------------------------------------
@app.get("/api/environment/current", tags=["environment"])
def environment_current(current_user: UserOut = Depends(get_current_user)):
    """Return a simulated live environmental reading (see data_ingest.py)."""
    return data_ingest.fetch_current_environment()


@app.post("/api/alerts/{alert_id}/approve", response_model=AlertOut, tags=["alerts"])
def approve_alert(alert_id: int, current_user: UserOut = Depends(get_current_authority)):
    """
    Approve a pending alert (authority only): mark it approved, dispatch
    the citizen notification, and write an audit log entry.
    """
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute(
            "UPDATE alerts SET status = 'approved', decided_by_user_id = ?, decided_at = ? WHERE id = ?",
            (current_user.id, now, alert_id),
        )

        dispatched = notification_service.dispatch_emergency_alert(
            village_id=str(row["village_id"]), message=row["message"], alert_id=alert_id
        )

        log_audit(
            conn,
            user_id=current_user.id,
            action="approve_alert",
            resource="alerts",
            details=f"Approved alert {alert_id} for village {row['village_id']}. "
                    f"Notification dispatched: {dispatched}.",
        )
        conn.commit()

        updated = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
    except sqlite3.Error as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()

    return AlertOut(**dict(updated))


@app.post("/api/alerts/{alert_id}/reject", response_model=AlertOut, tags=["alerts"])
def reject_alert(alert_id: int, current_user: UserOut = Depends(get_current_authority)):
    """Reject a pending alert (authority only) and write an audit log entry."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found.")

        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute(
            "UPDATE alerts SET status = 'rejected', decided_by_user_id = ?, decided_at = ? WHERE id = ?",
            (current_user.id, now, alert_id),
        )

        log_audit(
            conn,
            user_id=current_user.id,
            action="reject_alert",
            resource="alerts",
            details=f"Rejected alert {alert_id} for village {row['village_id']}.",
        )
        conn.commit()

        updated = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
    except sqlite3.Error as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()

    return AlertOut(**dict(updated))


# ------------------------------------------------------------------
# Citizens & shelters routes
# ------------------------------------------------------------------
@app.get("/api/citizens", response_model=List[CitizenOut], tags=["citizens"])
def list_citizens(current_user: UserOut = Depends(get_current_user)):
    """List all registered citizens and their latest reported status."""
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM citizens ORDER BY last_updated DESC").fetchall()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()
    return [CitizenOut(**dict(r)) for r in rows]


@app.post("/api/citizens/status", response_model=CitizenOut, tags=["citizens"])
def update_citizen_status(payload: CitizenStatusUpdate, current_user: UserOut = Depends(get_current_user)):
    """A citizen reports their own status: "I'm Safe" or "Need Help"."""
    if payload.status not in ("I'm Safe", "Need Help"):
        raise HTTPException(status_code=400, detail="status must be \"I'm Safe\" or \"Need Help\".")

    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM citizens WHERE user_id = ?", (payload.user_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"No citizen record found for user_id={payload.user_id}.")

        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute(
            "UPDATE citizens SET status = ?, last_updated = ? WHERE user_id = ?",
            (payload.status, now, payload.user_id),
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM citizens WHERE user_id = ?", (payload.user_id,)).fetchone()
    except sqlite3.Error as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()

    return CitizenOut(**dict(updated))


@app.get("/api/shelters", response_model=List[ShelterOut], tags=["shelters"])
def list_shelters():
    """List all shelters with live capacity/occupancy. Publicly accessible."""
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM shelters ORDER BY name").fetchall()
    except sqlite3.Error as exc:
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()
    return [ShelterOut(**dict(r)) for r in rows]


@app.patch("/api/shelters/{shelter_id}/occupancy", response_model=ShelterOut, tags=["shelters"])
def update_shelter_occupancy(
    shelter_id: int,
    payload: ShelterOccupancyUpdate,
    current_user: UserOut = Depends(get_current_authority),
):
    """Update a shelter's current occupancy (authority only)."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM shelters WHERE id = ?", (shelter_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Shelter {shelter_id} not found.")

        if payload.current_occupancy > row["capacity"]:
            raise HTTPException(
                status_code=400,
                detail=f"current_occupancy ({payload.current_occupancy}) exceeds capacity ({row['capacity']}).",
            )

        conn.execute(
            "UPDATE shelters SET current_occupancy = ? WHERE id = ?",
            (payload.current_occupancy, shelter_id),
        )
        log_audit(
            conn,
            user_id=current_user.id,
            action="update_shelter_occupancy",
            resource="shelters",
            details=f"Shelter {shelter_id} occupancy set to {payload.current_occupancy}.",
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM shelters WHERE id = ?", (shelter_id,)).fetchone()
    except HTTPException:
        conn.rollback()
        raise
    except sqlite3.Error as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {exc}")
    finally:
        conn.close()

    return ShelterOut(**dict(updated))


# ------------------------------------------------------------------
# Health check
# ------------------------------------------------------------------
@app.get("/api/health", tags=["health"])
def health_check():
    """Simple liveness check — does not require authentication."""
    return {"status": "ok", "service": "LandSense API"}
