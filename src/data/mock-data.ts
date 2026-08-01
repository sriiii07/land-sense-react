/**
 * Mock data layer.
 *
 * Every export here mirrors a REST response documented in the project's
 * Executive Summary (FastAPI + PostGIS backend). When the backend is wired up,
 * replace these constants with fetches to the endpoints noted above each block.
 * Shapes intentionally match the API contracts so no UI change will be needed.
 */

import { toRiskLevel, type RiskLevel } from "@/lib/risk";

/* ------------------------------------------------------------------ */
/* GET /api/predictions/today                                          */
/* ------------------------------------------------------------------ */

export interface VillagePrediction {
  villageId: number;
  name: string;
  district: string;
  population: number;
  riskScore: number;
  riskLevel: RiskLevel;
  /** Normalised map position (0-100) used by the schematic risk map. */
  x: number;
  y: number;
  precip24h: number;
  soilMoisture: number;
  slopeDeg: number;
  elevationM: number;
}

const rawVillages: Omit<VillagePrediction, "riskLevel">[] = [
  { villageId: 1024, name: "Maramalakari", district: "Wayanad", population: 1264, riskScore: 0.94, x: 24, y: 30, precip24h: 142.7, soilMoisture: 0.46, slopeDeg: 31.4, elevationM: 860 },
  { villageId: 1088, name: "Meppadi", district: "Wayanad", population: 3420, riskScore: 0.91, x: 33, y: 41, precip24h: 138.2, soilMoisture: 0.44, slopeDeg: 28.9, elevationM: 1120 },
  { villageId: 1132, name: "Puthumala", district: "Wayanad", population: 890, riskScore: 0.88, x: 41, y: 26, precip24h: 129.4, soilMoisture: 0.43, slopeDeg: 33.1, elevationM: 940 },
  { villageId: 2048, name: "Elappully", district: "Palakkad", population: 5210, riskScore: 0.79, x: 57, y: 54, precip24h: 96.1, soilMoisture: 0.39, slopeDeg: 21.7, elevationM: 560 },
  { villageId: 2110, name: "Kavalappara", district: "Malappuram", population: 2180, riskScore: 0.74, x: 48, y: 63, precip24h: 91.5, soilMoisture: 0.38, slopeDeg: 24.2, elevationM: 610 },
  { villageId: 2204, name: "Pettimudi", district: "Idukki", population: 640, riskScore: 0.68, x: 66, y: 72, precip24h: 84.3, soilMoisture: 0.36, slopeDeg: 29.8, elevationM: 1480 },
  { villageId: 3011, name: "Koottickal", district: "Kottayam", population: 4130, riskScore: 0.52, x: 72, y: 44, precip24h: 61.8, soilMoisture: 0.31, slopeDeg: 18.4, elevationM: 380 },
  { villageId: 3077, name: "Kokkayar", district: "Idukki", population: 1975, riskScore: 0.44, x: 61, y: 34, precip24h: 55.2, soilMoisture: 0.29, slopeDeg: 19.9, elevationM: 720 },
  { villageId: 4001, name: "Nilambur", district: "Malappuram", population: 8340, riskScore: 0.28, x: 37, y: 76, precip24h: 32.6, soilMoisture: 0.24, slopeDeg: 11.2, elevationM: 210 },
  { villageId: 4062, name: "Vythiri", district: "Wayanad", population: 2650, riskScore: 0.21, x: 20, y: 58, precip24h: 27.4, soilMoisture: 0.22, slopeDeg: 14.6, elevationM: 780 },
  { villageId: 4118, name: "Chittur", district: "Palakkad", population: 6120, riskScore: 0.14, x: 80, y: 61, precip24h: 18.9, soilMoisture: 0.19, slopeDeg: 7.3, elevationM: 190 },
  { villageId: 4190, name: "Kalpetta", district: "Wayanad", population: 9870, riskScore: 0.11, x: 29, y: 17, precip24h: 15.2, soilMoisture: 0.18, slopeDeg: 9.1, elevationM: 760 },
];

export const villagePredictions: VillagePrediction[] = rawVillages
  .map((v) => ({ ...v, riskLevel: toRiskLevel(v.riskScore) }))
  .sort((a, b) => b.riskScore - a.riskScore);

export const highRiskVillages = villagePredictions.filter(
  (v) => v.riskLevel === "High" || v.riskLevel === "Critical",
);

/* ------------------------------------------------------------------ */
/* GET /api/predictions/summary                                        */
/* ------------------------------------------------------------------ */

export const predictionSummary = {
  headlineRisk: toRiskLevel(villagePredictions[0]?.riskScore ?? 0),
  headlineScore: villagePredictions[0]?.riskScore ?? 0,
  affectedVillages: highRiskVillages.length,
  populationAtRisk: highRiskVillages.reduce((sum, v) => sum + v.population, 0),

  confidence: 0.91,
  modelVersion: "XGBoost v2.4",
  lastUpdated: "01 Aug 2026, 10:30 IST",
  nextRun: "01 Aug 2026, 11:30 IST",
  forecastWindowHours: 24,
};

/* ------------------------------------------------------------------ */
/* GET /api/environment/current                                        */
/* ------------------------------------------------------------------ */

export const environmentalConditions = [
  { label: "Rainfall (24h)", value: "142.7 mm", source: "NASA GPM IMERG", status: "Critical" as RiskLevel },
  { label: "Rainfall (72h)", value: "318.4 mm", source: "NASA GPM IMERG", status: "Critical" as RiskLevel },
  { label: "Forecast rain (next 24h)", value: "88.0 mm", source: "IMD Forecast API", status: "High" as RiskLevel },
  { label: "Soil moisture", value: "0.46 m³/m³", source: "NASA SMAP L3", status: "High" as RiskLevel },
  { label: "Mean slope (hotspot)", value: "31.4°", source: "SRTM DEM 30 m", status: "High" as RiskLevel },
  { label: "Temperature", value: "24.1 °C", source: "IMD Station", status: "Low" as RiskLevel },
];

/* ------------------------------------------------------------------ */
/* GET /api/predictions/history?days=14                                */
/* ------------------------------------------------------------------ */

export const riskHistory = [
  { date: "19 Jul", risk: 0.18, rainfall: 22 },
  { date: "20 Jul", risk: 0.21, rainfall: 31 },
  { date: "21 Jul", risk: 0.27, rainfall: 44 },
  { date: "22 Jul", risk: 0.24, rainfall: 38 },
  { date: "23 Jul", risk: 0.33, rainfall: 57 },
  { date: "24 Jul", risk: 0.41, rainfall: 69 },
  { date: "25 Jul", risk: 0.38, rainfall: 61 },
  { date: "26 Jul", risk: 0.47, rainfall: 78 },
  { date: "27 Jul", risk: 0.55, rainfall: 92 },
  { date: "28 Jul", risk: 0.62, rainfall: 104 },
  { date: "29 Jul", risk: 0.71, rainfall: 118 },
  { date: "30 Jul", risk: 0.77, rainfall: 126 },
  { date: "31 Jul", risk: 0.86, rainfall: 137 },
  { date: "01 Aug", risk: 0.94, rainfall: 143 },
];

export interface HistoricalPrediction {
  date: string;
  village: string;
  riskScore: number;
  riskLevel: RiskLevel;
  alertIssued: boolean;
  outcome: "Landslide reported" | "No event" | "Pending";
}

export const historicalPredictions: HistoricalPrediction[] = [
  { date: "31 Jul 2026", village: "Maramalakari", riskScore: 0.86, riskLevel: "Critical", alertIssued: true, outcome: "Landslide reported" },
  { date: "31 Jul 2026", village: "Meppadi", riskScore: 0.72, riskLevel: "High", alertIssued: true, outcome: "No event" },
  { date: "30 Jul 2026", village: "Puthumala", riskScore: 0.64, riskLevel: "High", alertIssued: true, outcome: "Landslide reported" },
  { date: "30 Jul 2026", village: "Elappully", riskScore: 0.48, riskLevel: "Moderate", alertIssued: false, outcome: "No event" },
  { date: "29 Jul 2026", village: "Kavalappara", riskScore: 0.41, riskLevel: "Moderate", alertIssued: false, outcome: "No event" },
  { date: "28 Jul 2026", village: "Pettimudi", riskScore: 0.33, riskLevel: "Low", alertIssued: false, outcome: "No event" },
];

/* ------------------------------------------------------------------ */
/* GET /api/explain/{village_id} — SHAP feature attribution             */
/* ------------------------------------------------------------------ */

export const riskExplanation = [
  { feature: "Rainfall, last 24h (142.7 mm)", contribution: 0.34 },
  { feature: "Rainfall, last 72h (318.4 mm)", contribution: 0.24 },
  { feature: "Soil moisture (0.46)", contribution: 0.16 },
  { feature: "Slope (31.4°)", contribution: 0.11 },
  { feature: "Distance to past landslide (0.8 km)", contribution: 0.06 },
  { feature: "Land cover: degraded forest", contribution: 0.03 },
];

/* ------------------------------------------------------------------ */
/* GET /api/citizens?district=...                                      */
/* ------------------------------------------------------------------ */

export type CitizenStatus = "Safe" | "Needs Help" | "No Response";

export interface Citizen {
  id: string;
  name: string;
  phone: string;
  village: string;
  location: string;
  status: CitizenStatus;
  lastSeen: string;
  members: number;
}

export const citizens: Citizen[] = [
  { id: "CTZ-4821", name: "Anand Kumar", phone: "+91 98•••• 4412", village: "Maramalakari", location: "11.6102, 76.0871", status: "Needs Help", lastSeen: "3 min ago", members: 4 },
  { id: "CTZ-4822", name: "Sreelakshmi P", phone: "+91 94•••• 7781", village: "Maramalakari", location: "11.6088, 76.0904", status: "Safe", lastSeen: "8 min ago", members: 3 },
  { id: "CTZ-4823", name: "Joseph Mathew", phone: "+91 90•••• 1120", village: "Meppadi", location: "11.5497, 76.1354", status: "No Response", lastSeen: "2 h 40 min ago", members: 5 },
  { id: "CTZ-4824", name: "Fathima Beevi", phone: "+91 99•••• 3390", village: "Meppadi", location: "11.5511, 76.1298", status: "Safe", lastSeen: "12 min ago", members: 2 },
  { id: "CTZ-4825", name: "Rajesh Nair", phone: "+91 87•••• 2265", village: "Puthumala", location: "11.5203, 76.1042", status: "Needs Help", lastSeen: "1 min ago", members: 6 },
  { id: "CTZ-4826", name: "Divya Menon", phone: "+91 96•••• 5514", village: "Puthumala", location: "11.5188, 76.1077", status: "Safe", lastSeen: "22 min ago", members: 3 },
  { id: "CTZ-4827", name: "Abdul Salam", phone: "+91 82•••• 9032", village: "Elappully", location: "10.7302, 76.6018", status: "No Response", lastSeen: "5 h 10 min ago", members: 4 },
  { id: "CTZ-4828", name: "Meera Krishnan", phone: "+91 70•••• 4478", village: "Kavalappara", location: "11.2841, 76.2510", status: "Safe", lastSeen: "31 min ago", members: 2 },
  { id: "CTZ-4829", name: "Thomas Varghese", phone: "+91 85•••• 6621", village: "Pettimudi", location: "10.1204, 77.0641", status: "Needs Help", lastSeen: "6 min ago", members: 7 },
  { id: "CTZ-4830", name: "Lakshmi Devi", phone: "+91 93•••• 8845", village: "Pettimudi", location: "10.1229, 77.0688", status: "Safe", lastSeen: "44 min ago", members: 1 },
];

/* ------------------------------------------------------------------ */
/* GET /api/shelters                                                   */
/* ------------------------------------------------------------------ */

export interface Shelter {
  id: string;
  name: string;
  village: string;
  capacity: number;
  occupied: number;
  distanceKm: number;
  contact: string;
}

export const shelters: Shelter[] = [
  { id: "SH-101", name: "Govt. Higher Secondary School, Meppadi", village: "Meppadi", capacity: 400, occupied: 372, distanceKm: 2.4, contact: "+91 4936 282 101" },
  { id: "SH-102", name: "Community Hall, Maramalakari", village: "Maramalakari", capacity: 180, occupied: 164, distanceKm: 1.1, contact: "+91 4936 282 102" },
  { id: "SH-103", name: "St. Joseph's Parish Hall, Puthumala", village: "Puthumala", capacity: 250, occupied: 118, distanceKm: 3.7, contact: "+91 4936 282 103" },
  { id: "SH-104", name: "Panchayat Office Complex, Elappully", village: "Elappully", capacity: 320, occupied: 95, distanceKm: 4.9, contact: "+91 491 253 104" },
  { id: "SH-105", name: "Govt. UP School, Kavalappara", village: "Kavalappara", capacity: 200, occupied: 46, distanceKm: 2.8, contact: "+91 483 271 105" },
  { id: "SH-106", name: "Estate Welfare Centre, Pettimudi", village: "Pettimudi", capacity: 150, occupied: 12, distanceKm: 6.2, contact: "+91 4865 264 106" },
];

/* ------------------------------------------------------------------ */
/* GET /api/analytics/model-performance                                */
/* ------------------------------------------------------------------ */

export const modelPerformance = [
  { metric: "Recall (landslide class)", value: "0.89", note: "Priority metric — missed events are unacceptable" },
  { metric: "Precision", value: "0.74", note: "False alarms filtered by officer approval" },
  { metric: "F1 score", value: "0.81", note: "Cross-validated, spatially blocked folds" },
  { metric: "ROC-AUC", value: "0.93", note: "Held-out 2019-2021 monsoon seasons" },
  { metric: "Lead time", value: "24 h", note: "Median advance warning before event" },
  { metric: "Training events", value: "4,728", note: "Kerala 2018 landslide inventory" },
];

export const rainfallTrend = riskHistory.map((d) => ({ date: d.date, rainfall: d.rainfall }));

export const modelComparison = [
  { model: "Random Forest", f1: 0.74, recall: 0.81 },
  { model: "XGBoost", f1: 0.81, recall: 0.89 },
  { model: "LightGBM", f1: 0.79, recall: 0.86 },
  { model: "CatBoost", f1: 0.78, recall: 0.84 },
];

/* ------------------------------------------------------------------ */
/* GET /api/me — signed-in officer                                     */
/* ------------------------------------------------------------------ */

export const officerProfile = {
  name: "K. Ramachandran",
  designation: "District Disaster Management Officer",
  employeeId: "KSDMA-WYD-2291",
  district: "Wayanad",
  email: "ddmo.wayanad@ksdma.gov.in",
  phone: "+91 4936 202 100",
};
