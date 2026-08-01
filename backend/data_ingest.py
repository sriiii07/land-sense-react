"""
data_ingest.py — Scheduled ingestion of all external data sources.

TO IMPLEMENT HERE:
  * NASA GPM IMERG rainfall (HTTPS, Earthdata credentials) -> data/raw/rainfall_<date>.nc
  * NASA SMAP L3/L4 surface soil moisture                  -> data/raw/soilmoisture_<date>.h5
  * IMD Forecast API (JWT token) next 24-48h precipitation -> data/raw/forecast_<date>.json
  * SRTM 30 m DEM (one-off)                                -> data/raw/dem_srtm.tif
  * ESA CCI land cover (one-off)                           -> data/raw/landcover_esa.tif
  * SoilGrids soil texture / field capacity (one-off)      -> data/raw/soilgrids.nc
  * Village boundaries + Census population (one-off)       -> data/raw/villages_kerala.shp
  * Shelter master list from state DM authority            -> data/raw/shelters_kerala.csv
  * Kerala 2018 landslide inventory (training labels)      -> data/raw/landslides_kerala2018.csv

Notes:
  * Reproject everything to WGS84 (EPSG:4326).
  * Idempotent: skip a download when the file already exists for that date.
  * Run on a schedule (cron / Airflow / EventBridge) and publish a message to the
    queue so preprocess.py is triggered after a successful fetch.
  * Log every fetch with source, date range, byte count and checksum.
"""
