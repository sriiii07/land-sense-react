"""
api.py — FastAPI application: the only surface the frontend talks to.

TO IMPLEMENT HERE (endpoints, contracts listed in backend/README.md):
  * Auth:      POST /api/auth/login, POST /api/auth/forgot-password, GET /api/me
               JWT sessions; users table carries is_authority for RBAC.
  * Predictions: GET /api/predictions/today | /summary | /history
  * Explanation: GET /api/explain/{village_id}
  * Environment: GET /api/environment/current
  * Alerts:    POST /api/alerts/{id}/approve and /reject  (is_authority only)
               Approval calls notification_service.dispatch(); both write an audit log row.
  * Citizens:  GET /api/citizens, POST /api/citizens/status ("I'm Safe" / "Need Help")
  * Shelters:  GET /api/shelters, PATCH /api/shelters/{id}/occupancy
  * Analytics: GET /api/analytics/model-performance

Cross-cutting:
  * Pydantic models for every request/response.
  * HTTPS/TLS only; PII (name, phone, location) encrypted at rest.
  * Role-based access: only authority users may read the citizen register.
  * Audit-log every read of citizen data and every alert decision.
"""
