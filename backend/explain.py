"""
explain.py — Per-prediction explainability (SHAP).

TO IMPLEMENT HERE:
  * explainer = shap.TreeExplainer(model); shap_values = explainer.shap_values(X)
  * For a requested village_id, return the top N features and their signed
    contributions to that day's risk score.
  * Serve as GET /api/explain/{village_id}; the Predictions page renders it as a
    horizontal bar chart so officers can see WHY the model raised the risk.
"""
