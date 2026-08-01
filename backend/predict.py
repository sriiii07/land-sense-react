"""
predict.py — Batch inference and alert thresholding.

TO IMPLEMENT HERE:
  * Load models/xgboost_model.pkl and today's feature rows for every village.
  * risk_score = model.predict_proba(X)[:, 1]
  * Map to risk_label:
        >= 0.85 Critical | >= 0.60 High | >= 0.35 Moderate | else Low
  * UPSERT into `predictions` (village_id, date, risk_score, risk_label).
  * When risk_score >= ALERT_THRESHOLD (0.60), create a row in `alerts` with
    approved = FALSE. NOTHING is sent to citizens until an officer approves —
    the human-in-the-loop step is mandatory.
  * Compute the rescue priority score, e.g.
        priority = risk_score * population_still_in_danger
    and expose it so rescue teams are dispatched to the worst-affected villages first.
"""
