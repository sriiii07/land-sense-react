// src/lib/api.ts
// Authenticated API client for authority dashboard features

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_authority: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Village {
  id: number;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  population: number;
  risk_level?: string;
}

export interface Prediction {
  id: number;
  village_id: number;
  village_name: string;
  risk_level: string;
  landslide_probability: number;
  rainfall_mm: number;
  soil_moisture: number;
  slope_angle: number;
  timestamp: string;
}

export interface PredictionSummary {
  total_villages: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  last_updated: string | null;
}

export interface Alert {
  id: number;
  village_id: number;
  message: string;
  status: string;
  created_at: string;
  decided_by_user_id: number | null;
  decided_at: string | null;
}

export interface Citizen {
  id: number;
  user_id: number;
  name: string;
  village_id: number;
  status: string;
  location_lat: number;
  location_lng: number;
  last_updated: string;
}

export interface Shelter {
  id: number;
  name: string;
  village_id: number;
  capacity: number;
  current_occupancy: number;
  contact_number: string;
  lat: number;
  lng: number;
  address: string;
  state: string;
}

// ─── Token helpers ───────────────────────────────────────────────────────────
const TOKEN_KEY = "safeground_auth_token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

export function saveAuthToken(token: string): void {
  setToken(token);
}

// ─── Fetch wrapper ───────────────────────────────────────────────────────────
const BASE = "/api";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail ?? err.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(email: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams();
  form.append("username", email.trim().toLowerCase());
  form.append("password", password);

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });

  if (!res.ok) {
    let msg = `Login failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.detail ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<LoginResponse>;
}

export async function registerUser(payload: {
  full_name: string;
  email: string;
  password: string;
  village_id: number;
  location_lat: number;
  location_lng: number;
}): Promise<LoginResponse> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      email: payload.email.trim().toLowerCase(),
    }),
  });

  if (!res.ok) {
    let msg = `Registration failed (${res.status})`;
    try {
      const err = await res.json();
      msg = err.detail ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<LoginResponse>;
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function getCurrentUser(): Promise<User> {
  return request<User>("/auth/me");
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export async function getPredictionSummary(): Promise<PredictionSummary> {
  return request<PredictionSummary>("/predictions/summary");
}

export async function getPredictions(): Promise<Prediction[]> {
  return request<Prediction[]>("/predictions");
}

export async function getVillages(): Promise<Village[]> {
  return request<Village[]>("/villages");
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export async function getAlerts(): Promise<Alert[]> {
  return request<Alert[]>("/alerts");
}

export async function decideAlert(alertId: number, decision: "approved" | "rejected"): Promise<Alert> {
  return request<Alert>(`/alerts/${alertId}/decision`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}

// ─── Citizens ────────────────────────────────────────────────────────────────
export async function getCitizens(): Promise<Citizen[]> {
  return request<Citizen[]>("/citizens");
}

// ─── Shelters ────────────────────────────────────────────────────────────────
export async function getShelters(): Promise<Shelter[]> {
  return request<Shelter[]>("/shelters");
}

export async function updateShelterOccupancy(
  shelterId: number,
  current_occupancy: number
): Promise<Shelter> {
  return request<Shelter>(`/shelters/${shelterId}/occupancy`, {
    method: "PATCH",
    body: JSON.stringify({ current_occupancy }),
  });
}


// ─── Backwards-compat aliases (for existing auth.tsx code) ───────────────────
export const clearAuthToken = clearToken;
export const setAuthToken = setToken;
export const getAuthToken = getToken;
export const saveAuthTokenCompat = saveAuthToken;


// ─── Additional exports for existing pages ───────────────────────────────────
export async function getModelPerformance(): Promise<{
  accuracy: number; precision: number; recall: number; f1_score: number; auc_roc: number; evaluated_at: string;
}> {
  return request("/analytics/model-performance");
}

export async function getExplanation(villageId: number): Promise<{
  village_id: string; explanation: string; factors: Record<string, number>;
}> {
  return request(`/predictions/${villageId}/explain`);
}

export async function updateCitizenStatus(userId: number, status: string): Promise<Citizen> {
  return request(`/citizens/status`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, status }),
  });
}

export async function findNearestSheltersAuth(lat: number, lng: number, limit = 5) {
  return request<(Shelter & { distance_km: number })[]>("/shelters/nearest", {
    method: "POST",
    body: JSON.stringify({ lat, lng, limit }),
  });
}
