"""
train_model.py — Train and select the landslide prediction model.

TO IMPLEMENT HERE:
  * Load `locations_features`; split X (features) and y (label).
  * Time-based + spatially blocked split so the model is tested on unseen seasons
    AND unseen areas; stratify because landslides are rare (heavy class imbalance).
  * Handle imbalance: scale_pos_weight / SMOTE / class weights.
  * Train candidates: RandomForest, XGBoost, LightGBM, CatBoost.
  * Tune hyperparameters (Optuna / GridSearchCV) with cross-validated F1 and RECALL;
    recall is the priority metric — a missed landslide is far costlier than a false alarm.
  * Persist the best model: joblib.dump(model, 'models/xgboost_model.pkl').
  * Write the evaluation table consumed by GET /api/analytics/model-performance.
"""
