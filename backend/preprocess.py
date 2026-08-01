"""
preprocess.py — Build the model input table `locations_features` (one row per village per day).

TO IMPLEMENT HERE:
  * Load raw rainfall/soil moisture rasters with xarray; load villages with geopandas.
  * Spatially join raster values to village centroids/polygons.
  * Feature engineering:
      - precip_24h, precip_48h, precip_72h   (antecedent rainfall sums)
      - rainfall intensity (max hourly in window)
      - soil_moisture (interpolated to village lat/lon)
      - slope_deg, elevation_m               (derived from the DEM)
      - land_cover_type                      (one-hot encoded)
      - pop_density = population / area_km2
      - prev_slide_dist_km                   (distance to nearest historical landslide)
      - forecast_precip_24h
  * Label rows for training: 1 if a landslide occurred in the next 24 h, else 0.
  * Standard-scale continuous features; persist the fitted scaler alongside the model.
  * Write the result to the `locations_features` table in PostgreSQL/PostGIS.
"""
