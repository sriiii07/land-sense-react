const DEFAULT_API_BASE = "/api";

function getApiBase(): string {
  return import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE;
}

function buildUrl(path: string): string {
  return `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("landsense.token");
}

export function saveAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("landsense.token", token);
  }
}

export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("landsense.token");
  }
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    email: string;
    full_name: string;
    role: string;
    is_authority: boolean;
  };
}

export interface ApiError extends Error {
  status?: number;
  detail?: string;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const payload = await response.json();
      detail = payload.detail || payload.message || detail;
    } catch {
      // ignore JSON parse failures
    }

    const error = new Error(detail) as ApiError;
    error.status = response.status;
    error.detail = detail;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const form = new URLSearchParams({
    username: email,
    password,
  });

  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function getCurrentUser() {
  return apiRequest<{ id: number; email: string; full_name: string; role: string; is_authority: boolean }>("/me");
}

export async function getHealth(): Promise<{ status: string; service: string }> {
  return apiRequest<{ status: string; service: string }>("/health");
}

export async function getPredictionsToday() {
  return apiRequest<Array<{
    id: number;
    village_id: number;
    village_name: string;
    risk_level: string;
    landslide_probability: number;
    rainfall_mm: number;
    soil_moisture: number;
    slope_angle: number;
    timestamp: string;
  }>>("/predictions/today");
}

export async function getPredictionSummary() {
  return apiRequest<{ total_villages: number; high_risk_count: number; medium_risk_count: number; low_risk_count: number; last_updated: string | null }>("/predictions/summary");
}

export async function getEnvironmentCurrent() {
  return apiRequest<Record<string, unknown>>("/environment/current");
}

export async function getCitizens() {
  return apiRequest<Array<{
    id: number;
    user_id: number;
    name: string;
    village_id: number;
    status: string;
    location_lat: number;
    location_lng: number;
    last_updated: string;
  }>>("/citizens");
}

export async function getShelters() {
  return apiRequest<Array<{
    id: number;
    name: string;
    village_id: number;
    capacity: number;
    current_occupancy: number;
    contact_number: string;
    lat: number;
    lng: number;
  }>>("/shelters");
}

export async function getModelPerformance() {
  return apiRequest<{
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
    auc_roc: number;
    evaluated_at: string;
  }>("/analytics/model-performance");
}
