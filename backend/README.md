# LandSense Backend

FastAPI backend for the AI-Powered Landslide Prediction & Emergency
Response Platform.

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## First-time initialization

```bash
# 1. Train the model (creates model.joblib, database.db, and logs
#    metrics into model_metrics). Uses a synthetic dataset by default.
python3 train_model.py

# 2. (Optional) Run one simulated telemetry sync cycle to populate
#    the predictions table with a sample reading.
python3 data_ingest.py
```

## Run the API server

```bash
uvicorn api:app --reload --port 8000
```

Interactive API docs (Swagger UI): http://localhost:8000/docs

## File overview

| File | Purpose |
|---|---|
| `schema.sql` | SQLite table definitions (`users`, `predictions`, `alerts`, `citizens`, `shelters`, `audit_logs`, `model_metrics`) plus starter seed data. |
| `preprocess.py` | Sensor-data cleaning, feature engineering, and feature scaling. |
| `train_model.py` | Trains a `RandomForestClassifier` (synthetic data fallback) and logs metrics to `model_metrics`. |
| `predict.py` | Cached model loader + single-instance risk prediction. |
| `explain.py` | SHAP-based (or rule-based fallback) human-readable prediction explanations. |
| `data_ingest.py` | Simulated live telemetry fetch + write to `predictions`. |
| `notification_service.py` | Mock SMS/push alert dispatch (swap in Twilio/FCM for production). |
| `api.py` | FastAPI app wiring everything together — auth (JWT), predictions, alerts, citizens, shelters, analytics. |

## Default seeded login (from `schema.sql`)

The seeded `users` row uses a placeholder password hash — replace it
with a real bcrypt hash before running for the first time, e.g.:

```python
import bcrypt
print(bcrypt.hashpw(b"your-password", bcrypt.gensalt()).decode())
```

Then update the `password_hash` value for the seeded authority user in
`schema.sql` (or directly in `database.db`) before logging in via
`POST /api/auth/login`.

## Notes

- All endpoints were tested end-to-end (auth, RBAC on authority-only
  routes, validation errors, and the full ML pipeline) before delivery.
- `shap` is an optional dependency — `explain.py` automatically falls
  back to a rule-based explanation if it isn't installed.
- `bcrypt` is pinned below 4.1 in `requirements.txt` to avoid a known
  compatibility issue with `passlib`-adjacent tooling; `api.py` calls
  `bcrypt` directly rather than through `passlib`.
