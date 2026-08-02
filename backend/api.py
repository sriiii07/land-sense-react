"""
backend/api.py
================
FastAPI server for the LandSense Landslide Prediction & Emergency
Alert System.
"""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from math import radians, sin, cos, sqrt, atan2

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

BASE_DIR = os.path.dirname(__file__)
DB_PATH = os.path.join(BASE_DIR, "database.db")
SCHEMA_PATH = os.path.join(BASE_DIR, "schema.sql")

SECRET_KEY = os.environ.get("LANDSENSE_SECRET_KEY", "landsense-dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

app = FastAPI(
    title="LandSense API",
    description="Backend API for the AI-Powered Landslide Prediction & Emergency Response Platform.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5501",
        "http://localhost:5501",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def ensure_database() -> None:
    if not os.path.exists(SCHEMA_PATH):
        raise RuntimeError(f"schema.sql not found at {SCHEMA_PATH}")
    should_create = False
    if not os.path.exists(DB_PATH):
        should_create = True
    else:
        conn = sqlite3.connect(DB_PATH)
        try:
            row = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").fetchone()
            if row is None:
                should_create = True
        finally:
            conn.close()
    if not should_create:
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
    ensure_database()


def log_audit(conn: sqlite3.Connection, user_id: int, action: str, resource: str, details: str) -> None:
    conn.execute(
        "INSERT INTO audit_logs (user_id, action, resource, details, timestamp) VALUES (?, ?, ?, ?, ?)",
        (user_id, action, resource, details, datetime.now(timezone.utc).isoformat(timespec="seconds")),
    )


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


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


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    village_id: int
    location_lat: float = Field(..., ge=-90, le=90)
    location_lng: float = Field(..., ge=-180, le=180)


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
    rainfall_mm: float = Field(..., ge=0, le=500)
    soil_moisture: float = Field(..., ge=0, le=100)
    slope_angle: float = Field(..., ge=0, le=90)


class PublicPredictionResult(BaseModel):
    risk_level: str
    probability: float
    explanation: str
    factors: dict
    recommendation: str


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
    status: str = Field(..., description="One of I am Safe or Need Help")


class ShelterOut(BaseModel):
    id: int
    name: str
    village_id: int
    capacity: int
    current_occupancy: int
    contact_number: str
    lat: float
    lng: float
    address: str
    state: str


class ShelterWithDistance(ShelterOut):
    distance_km: float


class ShelterOccupancyUpdate(BaseModel):
    current_occupancy: int = Field(..., ge=0)


class NearestSheltersRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    limit: int = Field(5, ge=1, le=20)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def get_password_hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


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
    ex = HTTPException(status_code=401, detail="Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    if token is None:
        raise ex
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise ex
    except JWTError:
        raise ex
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise ex
    return _row_to_user_out(row)


def get_current_authority(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if not current_user.is_authority:
        raise HTTPException(status_code=403, detail="Authority privileges required.")
    return current_user


@app.post("/api/auth/login", response_model=LoginResponse, tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = str(form_data.username).strip().lower()
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    finally:
        conn.close()
    if row is None or not verify_password(form_data.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.", headers={"WWW-Authenticate": "Bearer"})
    token = create_access_token(data={"user_id": row["id"], "email": row["email"], "is_authority": bool(row["is_authority"])})
    return LoginResponse(access_token=token, user=_row_to_user_out(row))


@app.post("/api/auth/register", response_model=LoginResponse, tags=["auth"])
def register(payload: RegisterRequest):
    email = str(payload.email).strip().lower()
    conn = get_db()
    try:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing is not None:
            raise HTTPException(status_code=400, detail="An account with that email already exists.")

        village = conn.execute("SELECT id FROM villages WHERE id = ?", (payload.village_id,)).fetchone()
        if village is None:
            raise HTTPException(status_code=404, detail="Selected village was not found.")

        password_hash = get_password_hash(payload.password)
        cursor = conn.execute(
            "INSERT INTO users (email, password_hash, full_name, role, is_authority) VALUES (?, ?, ?, ?, ?)",
            (email, password_hash, payload.full_name, "citizen", 0),
        )
        user_id = cursor.lastrowid
        conn.execute(
            "INSERT INTO citizens (user_id, name, village_id, status, location_lat, location_lng, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, payload.full_name, payload.village_id, "Unknown", payload.location_lat, payload.location_lng, datetime.now(timezone.utc).isoformat(timespec="seconds")),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    finally:
        conn.close()

    token = create_access_token(data={"user_id": row["id"], "email": row["email"], "is_authority": bool(row["is_authority"])})
    return LoginResponse(access_token=token, user=_row_to_user_out(row))


@app.post("/api/auth/forgot-password", response_model=MessageResponse, tags=["auth"])
def forgot_password(payload: ForgotPasswordRequest):
    print(f"[api] Password reset requested for {payload.email}")
    return MessageResponse(success=True, message="If that email is registered, a reset link has been sent.")


@app.get("/api/me", response_model=UserOut, tags=["auth"])
def read_me(current_user: UserOut = Depends(get_current_user)):
    return current_user


@app.get("/api/auth/me", response_model=UserOut, tags=["auth"])
def read_me_alias(current_user: UserOut = Depends(get_current_user)):
    return current_user


@app.post("/api/public/predict", response_model=PublicPredictionResult, tags=["public"])
def public_predict(payload: EnvironmentalInput):
    try:
        env_data = {"rainfall_mm": payload.rainfall_mm, "soil_moisture": payload.soil_moisture, "slope_angle": payload.slope_angle}
        prediction = predict_module.predict_risk(env_data)
        explanation = explain_module.explain_prediction("public", env_data)
        risk = prediction["risk_level"]
        if risk == "High":
            rec = "EVACUATE IMMEDIATELY. Move to the nearest shelter. Do not stay near slopes or river banks. Call emergency services."
        elif risk == "Medium":
            rec = "STAY ALERT. Prepare an emergency bag. Keep phones charged. Know your nearest shelter location. Avoid slope areas."
        else:
            rec = "Conditions are normal. Continue routine activities but stay informed about weather updates."
        return PublicPredictionResult(
            risk_level=risk,
            probability=prediction["probability"],
            explanation=explanation["explanation"],
            factors=explanation["factors"],
            recommendation=rec,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="ML model not trained yet. Run train_model.py")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@app.post("/api/public/nearest-shelters", response_model=List[ShelterWithDistance], tags=["public"])
def public_nearest_shelters(payload: NearestSheltersRequest):
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM shelters").fetchall()
    finally:
        conn.close()
    result = []
    for r in rows:
        d = haversine_km(payload.lat, payload.lng, r["lat"], r["lng"])
        result.append(ShelterWithDistance(
            id=r["id"], name=r["name"], village_id=r["village_id"],
            capacity=r["capacity"], current_occupancy=r["current_occupancy"],
            contact_number=r["contact_number"], lat=r["lat"], lng=r["lng"],
            address=r["address"] or "", state=r["state"] or "",
            distance_km=round(d, 2),
        ))
    result.sort(key=lambda s: s.distance_km)
    return result[:payload.limit]


@app.get("/api/predictions", response_model=List[PredictionOut], tags=["predictions"])
def predictions_list(current_user: UserOut = Depends(get_current_user)):
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM predictions ORDER BY timestamp DESC LIMIT 50").fetchall()
    finally:
        conn.close()
    return [PredictionOut(**dict(r)) for r in rows]


@app.get("/api/predictions/today", response_model=List[PredictionOut], tags=["predictions"])
def predictions_today(current_user: UserOut = Depends(get_current_user)):
    start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM predictions WHERE timestamp >= ? ORDER BY timestamp DESC", (start,)).fetchall()
    finally:
        conn.close()
    return [PredictionOut(**dict(r)) for r in rows]


@app.get("/api/predictions/summary", response_model=PredictionSummary, tags=["predictions"])
def predictions_summary(current_user: UserOut = Depends(get_current_user)):
    conn = get_db()
    try:
        rows = conn.execute("""
            SELECT p.village_id, p.risk_level, p.timestamp FROM predictions p
            INNER JOIN (SELECT village_id, MAX(timestamp) AS max_ts FROM predictions GROUP BY village_id) latest
            ON p.village_id = latest.village_id AND p.timestamp = latest.max_ts
        """).fetchall()
    finally:
        conn.close()
    high = sum(1 for r in rows if r["risk_level"] == "High")
    med = sum(1 for r in rows if r["risk_level"] == "Medium")
    low = sum(1 for r in rows if r["risk_level"] == "Low")
    return PredictionSummary(
        total_villages=len(rows), high_risk_count=high, medium_risk_count=med,
        low_risk_count=low, last_updated=max((r["timestamp"] for r in rows), default=None),
    )


@app.get("/api/predictions/history", response_model=List[PredictionOut], tags=["predictions"])
def predictions_history(limit: int = 50, current_user: UserOut = Depends(get_current_user)):
    if limit <= 0 or limit > 1000:
        raise HTTPException(status_code=400, detail="limit must be 1-1000")
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM predictions ORDER BY timestamp DESC LIMIT ?", (limit,)).fetchall()
    finally:
        conn.close()
    return [PredictionOut(**dict(r)) for r in rows]


@app.get("/api/predictions/{village_id}/explain", response_model=ExplainOut, tags=["predictions"])
def explain_village_alias(village_id: str, current_user: UserOut = Depends(get_current_user)):
    return explain_village(village_id, current_user)


@app.get("/api/explain/{village_id}", response_model=ExplainOut, tags=["predictions"])
def explain_village(village_id: str, current_user: UserOut = Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM predictions WHERE village_id = ? ORDER BY timestamp DESC LIMIT 1", (village_id,)).fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail=f"No predictions for village_id={village_id}")
    env = {"rainfall_mm": row["rainfall_mm"], "soil_moisture": row["soil_moisture"], "slope_angle": row["slope_angle"]}
    result = explain_module.explain_prediction(village_id, env)
    return ExplainOut(**result)


@app.get("/api/analytics/model-performance", response_model=ModelPerformanceOut, tags=["analytics"])
def model_performance(current_user: UserOut = Depends(get_current_user)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM model_metrics ORDER BY evaluated_at DESC LIMIT 1").fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="No metrics found. Run train_model.py")
    return ModelPerformanceOut(
        accuracy=row["accuracy"], precision=row["precision"], recall=row["recall"],
        f1_score=row["f1_score"], auc_roc=row["auc_roc"], evaluated_at=row["evaluated_at"],
    )


@app.get("/api/environment/current", tags=["environment"])
def environment_current(current_user: UserOut = Depends(get_current_user)):
    return data_ingest.fetch_current_environment()


@app.get("/api/alerts", response_model=List[AlertOut], tags=["alerts"])
def list_alerts(current_user: UserOut = Depends(get_current_user)):
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM alerts ORDER BY created_at DESC").fetchall()
    finally:
        conn.close()
    return [AlertOut(**dict(r)) for r in rows]


@app.post("/api/alerts/{alert_id}/decision", response_model=AlertOut, tags=["alerts"])
def decide_alert(alert_id: int, payload: dict, current_user: UserOut = Depends(get_current_authority)):
    decision = str(payload.get("decision", "")).strip().lower()
    if decision == "approved":
        return approve_alert(alert_id, current_user)
    if decision == "rejected":
        return reject_alert(alert_id, current_user)
    raise HTTPException(status_code=400, detail="decision must be 'approved' or 'rejected'")


@app.post("/api/alerts/{alert_id}/approve", response_model=AlertOut, tags=["alerts"])
def approve_alert(alert_id: int, current_user: UserOut = Depends(get_current_authority)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute("UPDATE alerts SET status='approved', decided_by_user_id=?, decided_at=? WHERE id=?", (current_user.id, now, alert_id))
        dispatched = notification_service.dispatch_emergency_alert(village_id=str(row["village_id"]), message=row["message"], alert_id=alert_id)
        log_audit(conn, current_user.id, "approve_alert", "alerts", f"Approved alert {alert_id}, dispatched={dispatched}")
        conn.commit()
        updated = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
    finally:
        conn.close()
    return AlertOut(**dict(updated))


@app.post("/api/alerts/{alert_id}/reject", response_model=AlertOut, tags=["alerts"])
def reject_alert(alert_id: int, current_user: UserOut = Depends(get_current_authority)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        conn.execute("UPDATE alerts SET status='rejected', decided_by_user_id=?, decided_at=? WHERE id=?", (current_user.id, now, alert_id))
        log_audit(conn, current_user.id, "reject_alert", "alerts", f"Rejected alert {alert_id}")
        conn.commit()
        updated = conn.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,)).fetchone()
    finally:
        conn.close()
    return AlertOut(**dict(updated))


@app.get("/api/villages", tags=["villages"])
def list_villages():
    conn = get_db()
    try:
        rows = conn.execute("SELECT id, name, district, state, lat, lng FROM villages ORDER BY name").fetchall()
    finally:
        conn.close()
    result = []
    for row in rows:
        latest = conn.execute("SELECT risk_level, landslide_probability FROM predictions WHERE village_id = ? ORDER BY timestamp DESC LIMIT 1", (row["id"],)).fetchone() if False else None
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "state": row["state"],
            "latitude": row["lat"],
            "longitude": row["lng"],
            "population": 0,
            "risk_level": None,
        }
        for row in rows
    ]


@app.get("/api/citizens", response_model=List[CitizenOut], tags=["citizens"])
def list_citizens(current_user: UserOut = Depends(get_current_user)):
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM citizens ORDER BY last_updated DESC").fetchall()
    finally:
        conn.close()
    return [CitizenOut(**dict(r)) for r in rows]

@app.post("/api/citizens/status", response_model=CitizenOut, tags=["citizens"])
def update_citizen_status(payload: CitizenStatusUpdate, current_user: UserOut = Depends(get_current_user)):
    if payload.status not in ("I'm Safe", "Need Help"):
        raise HTTPException(status_code=400, detail="Invalid status")
    conn = get_db()
    try:
        # Look up the citizen record
        row = conn.execute("SELECT * FROM citizens WHERE user_id = ?", (payload.user_id,)).fetchone()
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")

        if row is None:
            # Auto-create a citizen entry using the user's info
            user_row = conn.execute("SELECT * FROM users WHERE id = ?", (payload.user_id,)).fetchone()
            if user_row is None:
                raise HTTPException(status_code=404, detail=f"No user found for user_id={payload.user_id}")

            # Default village_id = 1024 (Maramalakari), default coordinates = Wayanad center
            conn.execute(
                "INSERT INTO citizens (user_id, name, village_id, status, location_lat, location_lng, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (payload.user_id, user_row["full_name"], 1024, payload.status, 11.685, 76.132, now)
            )
        else:
            conn.execute("UPDATE citizens SET status=?, last_updated=? WHERE user_id=?",
                         (payload.status, now, payload.user_id))

        conn.commit()
        updated = conn.execute("SELECT * FROM citizens WHERE user_id = ?", (payload.user_id,)).fetchone()
    finally:
        conn.close()
    return CitizenOut(**dict(updated))
@app.post("/api/shelters/nearest", response_model=List[ShelterWithDistance], tags=["shelters"])
def nearest_shelters(payload: NearestSheltersRequest):
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM shelters").fetchall()
    finally:
        conn.close()
    result = []
    for r in rows:
        d = haversine_km(payload.lat, payload.lng, r["lat"], r["lng"])
        result.append(ShelterWithDistance(
            id=r["id"], name=r["name"], village_id=r["village_id"],
            capacity=r["capacity"], current_occupancy=r["current_occupancy"],
            contact_number=r["contact_number"], lat=r["lat"], lng=r["lng"],
            address=r["address"] or "", state=r["state"] or "",
            distance_km=round(d, 2),
        ))
    result.sort(key=lambda s: s.distance_km)
    return result[:payload.limit]


@app.get("/api/shelters", response_model=List[ShelterOut], tags=["shelters"])
def list_shelters():
    conn = get_db()
    try:
        rows = conn.execute("SELECT * FROM shelters ORDER BY name").fetchall()
    finally:
        conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["address"] = d.get("address") or ""
        d["state"] = d.get("state") or ""
        result.append(ShelterOut(**d))
    return result


@app.patch("/api/shelters/{shelter_id}/occupancy", response_model=ShelterOut, tags=["shelters"])
def update_shelter_occupancy(shelter_id: int, payload: ShelterOccupancyUpdate, current_user: UserOut = Depends(get_current_authority)):
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM shelters WHERE id = ?", (shelter_id,)).fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail=f"Shelter {shelter_id} not found")
        if payload.current_occupancy > row["capacity"]:
            raise HTTPException(status_code=400, detail=f"Occupancy exceeds capacity ({row['capacity']})")
        conn.execute("UPDATE shelters SET current_occupancy=? WHERE id=?", (payload.current_occupancy, shelter_id))
        log_audit(conn, current_user.id, "update_shelter_occupancy", "shelters", f"Shelter {shelter_id} set to {payload.current_occupancy}")
        conn.commit()
        updated = conn.execute("SELECT * FROM shelters WHERE id = ?", (shelter_id,)).fetchone()
    finally:
        conn.close()
    d = dict(updated)
    d["address"] = d.get("address") or ""
    d["state"] = d.get("state") or ""
    return ShelterOut(**d)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "LandSense API"}



# ═══════════════════════════════════════════════════════
# EMERGENCY BROADCAST SYSTEM (Real-time Alert Push)
# ═══════════════════════════════════════════════════════

# In-memory storage for the latest broadcast (simple + fast for demo)
_latest_broadcast = {
    "id": 0,
    "active": False,
    "village_name": "",
    "message": "",
    "risk_level": "",
    "buses": 0,
    "shelters": 0,
    "volunteers": 0,
    "affected_population": 0,
    "created_at": "",
    "created_by": "",
}


class BroadcastAlertRequest(BaseModel):
    village_name: str
    message: str
    risk_level: str = "Critical"
    buses: int = 0
    shelters: int = 0
    volunteers: int = 0
    affected_population: int = 0


class BroadcastAlertResponse(BaseModel):
    success: bool
    broadcast_id: int
    message: str


@app.post("/api/broadcast-alert", response_model=BroadcastAlertResponse, tags=["emergency"])
def broadcast_alert(payload: BroadcastAlertRequest, current_user: UserOut = Depends(get_current_user)):
    """
    Authority triggers an emergency alert.
    All citizens polling /api/latest-alert will receive it within seconds.
    """
    global _latest_broadcast
    _latest_broadcast = {
        "id": _latest_broadcast["id"] + 1,
        "active": True,
        "village_name": payload.village_name,
        "message": payload.message,
        "risk_level": payload.risk_level,
        "buses": payload.buses,
        "shelters": payload.shelters,
        "volunteers": payload.volunteers,
        "affected_population": payload.affected_population,
        "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "created_by": current_user.full_name,
    }
    print(f"🚨 EMERGENCY BROADCAST #{_latest_broadcast['id']} by {current_user.full_name}: {payload.message}")
    return BroadcastAlertResponse(
        success=True,
        broadcast_id=_latest_broadcast["id"],
        message=f"Alert broadcast to all citizens in {payload.village_name}",
    )


@app.get("/api/latest-alert", tags=["emergency"])
def get_latest_alert():
    """
    Citizens poll this endpoint every 3 seconds.
    Returns the currently active broadcast (or inactive placeholder).
    """
    return _latest_broadcast


@app.post("/api/clear-alert", tags=["emergency"])
def clear_alert(current_user: UserOut = Depends(get_current_authority)):
    """Authority clears the active broadcast."""
    global _latest_broadcast
    _latest_broadcast["active"] = False
    return {"success": True, "message": "Alert cleared"}