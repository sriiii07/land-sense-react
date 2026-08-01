# Backend (not implemented in this frontend deliverable)

The frontend in `src/` is fully functional against the mock data layer in
`src/data/mock-data.ts`. Every constant there mirrors a REST response of the
service described below. To go live, implement these services and swap the
mock imports for `fetch` calls — no component changes are required.

## Files in this folder

| File | Purpose |
| --- | --- |
| `data_ingest.py` | Scheduled download of rainfall, soil moisture, DEM, land cover, forecasts |
| `preprocess.py` | Cleaning, spatial joins, feature engineering into `locations_features` |
| `train_model.py` | Model training (RandomForest / XGBoost / LightGBM / CatBoost) and selection |
| `predict.py` | Batch inference, risk scoring and thresholding |
| `explain.py` | SHAP attribution served to the Predictions page |
| `api.py` | FastAPI application exposing all endpoints consumed by the frontend |
| `notification_service.py` | Push / SMS / radio-relay dispatch after officer approval |
| `schema.sql` | PostgreSQL + PostGIS schema (villages, shelters, predictions, alerts, citizens, users) |

## Endpoints the frontend expects

```
POST /api/auth/login                 -> { token, officer }
POST /api/auth/forgot-password       -> 202 Accepted
GET  /api/me                         -> officer profile
GET  /api/predictions/today          -> VillagePrediction[]
GET  /api/predictions/summary        -> headline risk, affected villages, population, confidence
GET  /api/predictions/history?days=  -> daily risk + rainfall series
GET  /api/explain/{village_id}       -> SHAP feature contributions
GET  /api/environment/current        -> current rainfall / soil moisture / slope readings
POST /api/alerts/{alert_id}/approve  -> dispatches notifications (authority role only)
POST /api/alerts/{alert_id}/reject   -> records rejection + reason in audit log
GET  /api/citizens?district=         -> citizen safety register
GET  /api/shelters                   -> shelter capacity and occupancy
GET  /api/analytics/model-performance-> evaluation metrics
```
