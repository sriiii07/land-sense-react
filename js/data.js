/**
 * data.js
 * Central mock data store for the Landslide Early-Warning platform.
 * In production this is replaced by calls to the FastAPI backend
 * (see /backend for the endpoints this data maps to).
 */

const APP_DATA = {

  lastUpdated: "2026-08-01 14:00 IST",

  // Table 1 / Section 1 — villages derived from the Kerala 2018 inventory + village boundaries
  villages: [
    { id: 1024, name: "Maramalakari", district: "Wayanad",   lat: 11.685, lon: 76.132, population: 1264, risk: 0.94, riskLevel: "critical",  notEvacuated: 42, precip24: 118, precip48: 190, precip72: 240, soilMoisture: 0.46, slope: 31, elevation: 820 },
    { id: 2048, name: "Elappully",     district: "Palakkad",  lat: 10.786, lon: 76.653, population: 3580, risk: 0.87, riskLevel: "high",      notEvacuated: 65, precip24: 96,  precip48: 150, precip72: 205, soilMoisture: 0.41, slope: 26, elevation: 540 },
    { id: 3012, name: "Kavalangad",    district: "Kottayam",  lat: 9.720,  lon: 76.750, population: 2100, risk: 0.83, riskLevel: "high",      notEvacuated: 30, precip24: 88,  precip48: 140, precip72: 188, soilMoisture: 0.39, slope: 24, elevation: 410 },
    { id: 4055, name: "Vellarimala",   district: "Kozhikode", lat: 11.450, lon: 76.070, population: 890,  risk: 0.71, riskLevel: "moderate",  notEvacuated: 12, precip24: 62,  precip48: 98,  precip72: 130, soilMoisture: 0.33, slope: 20, elevation: 700 },
    { id: 5090, name: "Kokkayar",      district: "Idukki",    lat: 9.700,  lon: 76.950, population: 1540, risk: 0.68, riskLevel: "moderate",  notEvacuated: 8,  precip24: 55,  precip48: 90,  precip72: 118, soilMoisture: 0.31, slope: 22, elevation: 950 },
    { id: 6110, name: "Peruvanthanam", district: "Idukki",    lat: 9.560,  lon: 76.930, population: 1120, risk: 0.42, riskLevel: "low",       notEvacuated: 0,  precip24: 24,  precip48: 40,  precip72: 58,  soilMoisture: 0.24, slope: 15, elevation: 600 },
    { id: 7020, name: "Meppadi",       district: "Wayanad",   lat: 11.590, lon: 76.140, population: 2760, risk: 0.38, riskLevel: "low",       notEvacuated: 0,  precip24: 19,  precip48: 35,  precip72: 50,  soilMoisture: 0.22, slope: 13, elevation: 780 },
  ],

  // Section 1 — shelters
  shelters: [
    { id: 1, name: "Govt. LP School, Meppadi",     district: "Wayanad",   lat: 11.593, lon: 76.145, capacity: 250, occupied: 180 },
    { id: 2, name: "Community Hall, Kalpetta",     district: "Wayanad",   lat: 11.608, lon: 76.083, capacity: 400, occupied: 260 },
    { id: 3, name: "Govt. HSS, Elappully",         district: "Palakkad",  lat: 10.790, lon: 76.660, capacity: 300, occupied: 300 },
    { id: 4, name: "Panchayat Hall, Kavalangad",   district: "Kottayam",  lat: 9.724,  lon: 76.756, capacity: 180, occupied: 95 },
    { id: 5, name: "Govt. UP School, Vellarimala", district: "Kozhikode", lat: 11.455, lon: 76.075, capacity: 150, occupied: 40 },
  ],

  // Section 8.2 / citizen monitoring — statuses: safe | help | none
  citizens: [
    { id: "C-1042", name: "K. Ramesh",     village: "Maramalakari", district: "Wayanad",   status: "help", lastPing: "2026-08-01 13:52" },
    { id: "C-1043", name: "S. Devika",     village: "Maramalakari", district: "Wayanad",   status: "help", lastPing: "2026-08-01 13:47" },
    { id: "C-1044", name: "A. Rajan",      village: "Maramalakari", district: "Wayanad",   status: "safe", lastPing: "2026-08-01 13:40" },
    { id: "C-2091", name: "M. Latha",      village: "Elappully",    district: "Palakkad",  status: "none", lastPing: "2026-08-01 09:12" },
    { id: "C-2092", name: "P. Suresh",     village: "Elappully",    district: "Palakkad",  status: "safe", lastPing: "2026-08-01 13:30" },
    { id: "C-3011", name: "T. Anitha",     village: "Kavalangad",   district: "Kottayam",  status: "safe", lastPing: "2026-08-01 13:20" },
    { id: "C-3012", name: "R. Biju",       village: "Kavalangad",   district: "Kottayam",  status: "none", lastPing: "2026-07-31 22:05" },
    { id: "C-4001", name: "N. Sarala",     village: "Vellarimala",  district: "Kozhikode", status: "safe", lastPing: "2026-08-01 12:58" },
  ],

  // Section 5.2, Table 4 — model performance (validation)
  modelPerformance: [
    { model: "Random Forest", precision: 0.75, recall: 0.80, f1: 0.77, auc: 0.88 },
    { model: "XGBoost",       precision: 0.80, recall: 0.85, f1: 0.82, auc: 0.91 },
    { model: "LightGBM",      precision: 0.78, recall: 0.83, f1: 0.80, auc: 0.90 },
    { model: "CatBoost",      precision: 0.77, recall: 0.81, f1: 0.79, auc: 0.89 },
  ],
  activeModel: "XGBoost",

  // Section 4 — SHAP-style top contributing features for the current critical alert
  riskExplanation: [
    { feature: "Rainfall (72h)", contribution: 0.31, note: "240mm — well above the monsoon threshold for this slope class" },
    { feature: "Soil Moisture",  contribution: 0.24, note: "46% volumetric — near saturation" },
    { feature: "Slope",          contribution: 0.18, note: "31° — steep terrain, historically failure-prone" },
    { feature: "Proximity to Past Landslide", contribution: 0.12, note: "1.8 km from a 2018 event site" },
    { feature: "Forecast Rain (24h)", contribution: 0.09, note: "IMD forecasts a further 35mm" },
  ],

  // Section 12 — rainfall trend, last 7 days (mm, daily total, district average)
  rainfallTrend: [
    { day: "Jul 26", mm: 22 },
    { day: "Jul 27", mm: 38 },
    { day: "Jul 28", mm: 45 },
    { day: "Jul 29", mm: 61 },
    { day: "Jul 30", mm: 88 },
    { day: "Jul 31", mm: 104 },
    { day: "Aug 01", mm: 118 },
  ],

  // Historical daily peak risk score, last 7 days, for the highest-risk village
  riskTrend: [
    { day: "Jul 26", risk: 0.22 },
    { day: "Jul 27", risk: 0.31 },
    { day: "Jul 28", risk: 0.40 },
    { day: "Jul 29", risk: 0.55 },
    { day: "Jul 30", risk: 0.74 },
    { day: "Jul 31", risk: 0.86 },
    { day: "Aug 01", risk: 0.94 },
  ],

  // Section 6 — historical predictions log
  predictionHistory: [
    { date: "2026-08-01", village: "Maramalakari", risk: 0.94, level: "critical", outcome: "Alert approved" },
    { date: "2026-07-31", village: "Maramalakari", risk: 0.86, level: "high",     outcome: "Alert approved" },
    { date: "2026-07-30", village: "Elappully",     risk: 0.74, level: "moderate",outcome: "Monitored" },
    { date: "2026-07-29", village: "Kavalangad",    risk: 0.55, level: "moderate",outcome: "Monitored" },
    { date: "2026-07-28", village: "Vellarimala",   risk: 0.40, level: "low",     outcome: "No action" },
  ],

  officer: {
    name: "Officer Anil Kumar",
    role: "District Disaster Management Officer",
    district: "Wayanad",
    email: "anil.kumar@ddma.kerala.gov.in",
  },

  thresholds: { moderate: 60, high: 80, critical: 90 },
};

function riskLevelFromScore(score) {
  if (score >= APP_DATA.thresholds.critical / 100) return "critical";
  if (score >= APP_DATA.thresholds.high / 100) return "high";
  if (score >= APP_DATA.thresholds.moderate / 100) return "moderate";
  return "low";
}

function riskLabel(level) {
  return { critical: "Critical", high: "High", moderate: "Moderate", low: "Low" }[level] || level;
}
