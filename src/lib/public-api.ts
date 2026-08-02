// src/lib/public-api.ts
// Public API client - NO authentication required
// Used by emergency.tsx and find-shelter.tsx

export interface PredictionRequest {
  rainfall_mm: number;
  soil_moisture: number;
  slope_angle: number;
  village_id?: number;
}

export interface PredictionResponse {
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  probability: number;
  confidence: number;
  contributing_factors: {
    rainfall_contribution: number;
    soil_moisture_contribution: number;
    slope_contribution: number;
  };
  recommendation: string;
  timestamp: string;
}

export interface ShelterRequest {
  latitude: number;
  longitude: number;
  radius_km?: number;
}

export interface Shelter {
  id: number;
  name: string;
  address: string;
  state: string;
  latitude: number;
  longitude: number;
  capacity: number;
  contact_number: string;
  distance_km: number;
}

export interface ShelterResponse {
  shelters: Shelter[];
  count: number;
  search_location: { latitude: number; longitude: number };
}

// ─── API Functions ────────────────────────────────────────────────────────────

const BASE = "/api";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      msg = err.detail ?? err.message ?? msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

/**
 * Public landslide risk prediction — no login required.
 */
export async function predictRisk(
  data: PredictionRequest
): Promise<PredictionResponse> {
  return post<PredictionResponse>("/public/predict", data);
}

/**
 * Find nearest shelters by GPS coordinates — no login required.
 */
export async function findNearestShelters(
  data: ShelterRequest
): Promise<ShelterResponse> {
  return post<ShelterResponse>("/public/nearest-shelters", data);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Get user GPS location via browser Geolocation API.
 * Returns a promise that resolves to { latitude, longitude }.
 */
export function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => reject(new Error(err.message)),
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}

/**
 * Opens Google Maps directions from user location to shelter.
 */
export function openDirections(
  shelter: Shelter,
  userLat?: number,
  userLng?: number
): void {
  const dest = `${shelter.latitude},${shelter.longitude}`;
  let url: string;
  if (userLat !== undefined && userLng !== undefined) {
    url = `https://www.google.com/maps/dir/${userLat},${userLng}/${dest}`;
  } else {
    url = `https://www.google.com/maps/search/?api=1&query=${dest}`;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Share current location via Web Share API or clipboard fallback.
 */
export async function shareLocation(
  latitude: number,
  longitude: number,
  appName = "SAFEGROUND"
): Promise<void> {
  const text = `I need help! My location: https://maps.google.com/?q=${latitude},${longitude} — Sent via ${appName}`;
  if (navigator.share) {
    await navigator.share({ title: "My Emergency Location", text });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

/**
 * Risk level styling helpers used across pages.
 */
export const RISK_STYLES = {
  HIGH: {
    bg: "bg-red-600",
    text: "text-white",
    border: "border-red-700",
    badge: "bg-red-100 text-red-800 border-red-300",
    pageBg: "bg-red-50",
    icon: "🔴",
    pulse: true,
  },
  MEDIUM: {
    bg: "bg-orange-500",
    text: "text-white",
    border: "border-orange-600",
    badge: "bg-orange-100 text-orange-800 border-orange-300",
    pageBg: "bg-orange-50",
    icon: "🟡",
    pulse: false,
  },
  LOW: {
    bg: "bg-green-600",
    text: "text-white",
    border: "border-green-700",
    badge: "bg-green-100 text-green-800 border-green-300",
    pageBg: "bg-green-50",
    icon: "🟢",
    pulse: false,
  },
} as const;
