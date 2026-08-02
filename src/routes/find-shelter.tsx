// src/routes/find-shelter.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  findNearestShelters,
  getUserLocation,
  openDirections,
  type Shelter,
} from "@/lib/public-api";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/find-shelter")({
  component: FindShelterPage,
});

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13);
  }, [lat, lng, map]);
  return null;
}

function FindShelterPage() {
  const { t } = useI18n();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]);

  useEffect(() => {
    detectLocation();
  }, []);

  async function detectLocation() {
    setLocating(true);
    setError("");
    try {
      const loc = await getUserLocation();
      setLat(loc.latitude.toFixed(6));
      setLng(loc.longitude.toFixed(6));
      setMapCenter([loc.latitude, loc.longitude]);
    } catch {
      setError(t("location_error"));
    } finally {
      setLocating(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      setError("Please enter valid coordinates.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await findNearestShelters({ latitude, longitude, radius_km: 100 });
      setShelters(res.shelters);
      setMapCenter([latitude, longitude]);
      setSearched(true);
      if (res.shelters.length === 0) {
        setError(t("no_shelters_found"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("error_occurred");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const validCoords = !isNaN(userLat) && !isNaN(userLng);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="bg-blue-700 text-white p-4 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <Link to="/" className="text-white/80 hover:text-white text-sm font-medium shrink-0">
            <- {t("back_home")}
          </Link>
          <span className="font-black text-lg text-center">🏠 {t("find_shelter")}</span>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        <div className="w-full lg:w-96 shrink-0 overflow-y-auto p-4 space-y-4 border-r border-border">
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{t("your_location")}</h2>
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
              >
                {locating ? "📡 Detecting..." : "📡 Auto-detect"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground font-medium">{t("latitude")}</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="e.g. 10.8505"
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium">{t("longitude")}</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="e.g. 76.2711"
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                />
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm font-medium bg-destructive/10 rounded-xl p-3">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !lat || !lng}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? "Loading..." : "🔍 " + t("shelters_nearby")}
            </button>
          </form>

          {searched && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("shelters_nearby")}</h3>
                <span className="text-sm text-muted-foreground">{shelters.length} found</span>
              </div>
              {shelters.length === 0 && !error && (
                <p className="text-muted-foreground text-sm text-center py-8">{t("no_shelters_found")}</p>
              )}
              {shelters.map((s) => (
                <div key={s.id} className="bg-card border rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base">{s.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.address}, {s.state}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full shrink-0">
                      {s.distance_km.toFixed(1)} km
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>👥 {s.capacity.toLocaleString()} capacity</div>
                    <div>
                      📞 <a href={"tel:" + s.contact_number} className="text-blue-600 hover:underline">{s.contact_number}</a>
                    </div>
                  </div>
                  <button
                    onClick={() => openDirections(s, validCoords ? userLat : undefined, validCoords ? userLng : undefined)}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    🗺️ {t("get_directions")}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-2">
            <p className="font-bold text-red-800 text-sm">{t("emergency_contacts")}</p>
            <div className="grid grid-cols-3 gap-2">
              <a href="tel:100" className="bg-red-600 text-white rounded-xl p-2 text-center text-xs font-bold hover:bg-red-700">📞 100</a>
              <a href="tel:108" className="bg-red-600 text-white rounded-xl p-2 text-center text-xs font-bold hover:bg-red-700">🚑 108</a>
              <a href="tel:1078" className="bg-red-600 text-white rounded-xl p-2 text-center text-xs font-bold hover:bg-red-700">🌊 1078</a>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-64 lg:min-h-0">
          <MapContainer
            center={mapCenter}
            zoom={10}
            style={{ height: "100%", width: "100%", minHeight: "400px" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapRecenter lat={mapCenter[0]} lng={mapCenter[1]} />
            {validCoords && (
              <Marker position={[userLat, userLng]} icon={userIcon}>
                <Popup>
                  <strong>📍 Your Location</strong><br />
                  {userLat.toFixed(4)}, {userLng.toFixed(4)}
                </Popup>
              </Marker>
            )}
            {shelters.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]}>
                <Popup>
                  <div style={{ minWidth: "160px" }}>
                    <strong>{s.name}</strong><br />
                    {s.address}<br />
                    👥 {s.capacity.toLocaleString()}<br />
                    📏 {s.distance_km.toFixed(1)} km<br />
                    📞 {s.contact_number}<br />
                    <button
                      onClick={() => openDirections(s, validCoords ? userLat : undefined, validCoords ? userLng : undefined)}
                      style={{ marginTop: "6px", width: "100%", background: "#1d4ed8", color: "white", border: "none", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      🗺️ Directions
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
