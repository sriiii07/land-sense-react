// src/routes/emergency.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  predictRisk,
  RISK_STYLES,
  shareLocation,
  getUserLocation,
  type PredictionResponse,
} from "@/lib/public-api";

export const Route = createFileRoute("/emergency")({
  component: EmergencyPage,
});

type Step = "form" | "loading" | "result";

function EmergencyPage() {
  const { t } = useI18n();

  const [step, setStep] = useState<Step>("form");
  const [rainfall, setRainfall] = useState("");
  const [soilMoisture, setSoilMoisture] = useState("");
  const [slopeAngle, setSlopeAngle] = useState("");
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState("");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const rain = parseFloat(rainfall);
    const soil = parseFloat(soilMoisture);
    const slope = parseFloat(slopeAngle);

    if (isNaN(rain) || isNaN(soil) || isNaN(slope)) {
      setError("Please fill all fields with valid numbers.");
      return;
    }

    setStep("loading");

    try {
      // Try to get location in background (non-blocking)
      getUserLocation()
        .then((loc) => {
          setUserLat(loc.latitude);
          setUserLng(loc.longitude);
        })
        .catch(() => {});

      const data = await predictRisk({
        rainfall_mm: rain,
        soil_moisture: soil,
        slope_angle: slope,
      });
      setResult(data);
      setStep("result");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setStep("form");
    }
  }

  function reset() {
    setStep("form");
    setResult(null);
    setError("");
  }

  async function handleShare() {
    if (!userLat || !userLng) return;
    setSharing(true);
    try {
      await shareLocation(userLat, userLng);
    } catch {}
    setSharing(false);
  }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="text-6xl animate-bounce">🛰️</div>
          <h2 className="text-2xl font-bold">{t("checking")}</h2>
          <p className="text-muted-foreground">AI is analyzing your area...</p>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────
  if (step === "result" && result) {
    const style = RISK_STYLES[result.risk_level];
    const isHigh = result.risk_level === "HIGH";
    const isMedium = result.risk_level === "MEDIUM";

    return (
      <div className={`min-h-screen ${isHigh ? "bg-red-600" : isMedium ? "bg-orange-500" : "bg-green-600"}`}>
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <button
            onClick={reset}
            className="text-white/80 hover:text-white text-sm font-medium"
          >
            ← {t("try_again")}
          </button>
          <span className="text-white font-bold text-lg">SAFEGROUND</span>
          <LanguageSwitcher className="[&_select]:bg-white/10 [&_select]:text-white [&_select]:border-white/30" />
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-6 pb-12">

          {/* BIG RISK BANNER */}
          <div className="text-center text-white py-8 space-y-3">
            <div className={`text-7xl ${style.pulse ? "animate-pulse" : ""}`}>
              {style.icon}
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              {t(`${result.risk_level.toLowerCase()}_risk` as "high_risk" | "medium_risk" | "low_risk")}
            </h1>
            <div className="text-2xl font-bold opacity-90">
              {Math.round(result.probability * 100)}% {t("probability")}
            </div>
          </div>

          {/* ACTION BUTTONS */}
          {isHigh && (
            <div className="space-y-3">
              <div className="bg-white/10 border-2 border-white rounded-2xl p-5 text-white text-center animate-pulse">
                <p className="text-2xl font-black">{t("evacuate_immediately")}</p>
              </div>

              <Link
                to="/find-shelter"
                className="flex items-center justify-center gap-3 w-full bg-white text-red-700 rounded-2xl p-5 text-xl font-black shadow-lg hover:bg-red-50 transition-colors"
              >
                🏠 {t("find_nearest_shelter")}
              </Link>

              <div className="grid grid-cols-3 gap-3">
                <a
                  href="tel:100"
                  className="bg-white/20 border border-white/40 rounded-xl p-3 text-white text-center text-sm font-bold hover:bg-white/30"
                >
                  📞 Police 100
                </a>
                <a
                  href="tel:108"
                  className="bg-white/20 border border-white/40 rounded-xl p-3 text-white text-center text-sm font-bold hover:bg-white/30"
                >
                  🚑 Ambulance 108
                </a>
                <button
                  onClick={handleShare}
                  disabled={!userLat || sharing}
                  className="bg-white/20 border border-white/40 rounded-xl p-3 text-white text-center text-sm font-bold hover:bg-white/30 disabled:opacity-50"
                >
                  📍 {sharing ? "..." : t("share_location")}
                </button>
              </div>
            </div>
          )}

          {isMedium && (
            <div className="space-y-3">
              <div className="bg-white/10 border-2 border-white rounded-2xl p-4 text-white text-center">
                <p className="text-xl font-bold">{t("warning_be_ready")}</p>
              </div>
              <Link
                to="/find-shelter"
                className="flex items-center justify-center gap-2 w-full bg-white text-orange-700 rounded-2xl p-4 text-lg font-bold shadow hover:bg-orange-50"
              >
                🏠 {t("find_nearest_shelter")}
              </Link>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:100"
                  className="bg-white/20 border border-white/40 rounded-xl p-3 text-white text-center font-bold hover:bg-white/30"
                >
                  📞 Police 100
                </a>
                <a
                  href="tel:108"
                  className="bg-white/20 border border-white/40 rounded-xl p-3 text-white text-center font-bold hover:bg-white/30"
                >
                  🚑 Ambulance 108
                </a>
              </div>
            </div>
          )}

          {!isHigh && !isMedium && (
            <div className="space-y-3">
              <div className="bg-white/10 border border-white/30 rounded-2xl p-4 text-white text-center">
                <p className="text-xl font-bold">{t("your_location_safe")}</p>
              </div>
              <Link
                to="/"
                className="flex items-center justify-center gap-2 w-full bg-white text-green-700 rounded-2xl p-4 text-lg font-bold shadow hover:bg-green-50"
              >
                ← {t("back_home")}
              </Link>
            </div>
          )}

          {/* SAFETY INSTRUCTIONS */}
          {(isHigh || isMedium) && (
            <div className="bg-black/20 rounded-2xl p-5 text-white space-y-3">
              <h3 className="font-bold text-lg">⚡ {t("stay_calm")}</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span>▶</span>
                  <span>{t("move_to_higher_ground")}</span>
                </li>
                <li className="flex gap-2">
                  <span>▶</span>
                  <span>{t("do_not_use_roads")}</span>
                </li>
                <li className="flex gap-2">
                  <span>▶</span>
                  <span>{t("call_100")}</span>
                </li>
              </ul>
            </div>
          )}

          {/* AI FACTORS */}
          <div className="bg-black/15 rounded-2xl p-5 text-white space-y-3">
            <h3 className="font-bold">{t("prediction_reason")}</h3>
            <div className="space-y-2 text-sm">
              <FactorBar
                label={`🌧️ Rainfall`}
                value={result.contributing_factors.rainfall_contribution}
              />
              <FactorBar
                label={`💧 Soil Moisture`}
                value={result.contributing_factors.soil_moisture_contribution}
              />
              <FactorBar
                label={`⛰️ Slope`}
                value={result.contributing_factors.slope_contribution}
              />
            </div>
            <p className="text-xs opacity-75">
              {t("confidence")}: {Math.round(result.confidence * 100)}% &nbsp;|&nbsp;
              {t("powered_by_ai")}
            </p>
          </div>

          {/* EMERGENCY CONTACTS */}
          <div className="bg-black/15 rounded-2xl p-4 text-white text-sm space-y-1">
            <p className="font-bold">{t("emergency_contacts")}</p>
            <p>{t("ndrf_number")}</p>
            <p>{t("police_number")}</p>
            <p>{t("ambulance_number")}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-white/80 hover:text-white text-sm font-medium">
            ← {t("back_home")}
          </Link>
          <span className="font-black text-lg">⚠️ {t("emergency_check")}</span>
          <LanguageSwitcher className="[&_select]:bg-red-500 [&_select]:text-white [&_select]:border-red-400" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-12">
        <div className="text-center pt-4 space-y-2">
          <h1 className="text-3xl font-black">{t("check_risk_now")}</h1>
          <p className="text-muted-foreground text-sm">{t("free_service")} · {t("powered_by_ai")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Rainfall */}
          <div className="bg-card border rounded-2xl p-5 space-y-3">
            <label className="block">
              <span className="text-lg font-bold flex items-center gap-2">
                🌧️ {t("rainfall_mm")}
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                How much rain has fallen in your area today?
              </p>
            </label>
            <div className="flex gap-2 flex-wrap">
              {["0", "25", "50", "100", "150", "200"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRainfall(v)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    rainfall === v
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-muted border-border hover:bg-muted/80"
                  }`}
                >
                  {v} mm
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              max="500"
              step="1"
              value={rainfall}
              onChange={(e) => setRainfall(e.target.value)}
              placeholder="Or type a number..."
              className="w-full border rounded-xl px-4 py-3 text-lg font-bold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Soil Moisture */}
          <div className="bg-card border rounded-2xl p-5 space-y-3">
            <label className="block">
              <span className="text-lg font-bold flex items-center gap-2">
                💧 {t("soil_moisture")}
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                How wet/saturated does the ground feel? (0 = dry, 100 = waterlogged)
              </p>
            </label>
            <div className="flex gap-2 flex-wrap">
              {["10", "30", "50", "70", "85", "95"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSoilMoisture(v)}
                  className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                    soilMoisture === v
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-muted border-border hover:bg-muted/80"
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={soilMoisture}
              onChange={(e) => setSoilMoisture(e.target.value)}
              placeholder="Or type a number..."
              className="w-full border rounded-xl px-4 py-3 text-lg font-bold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Slope Angle */}
          <div className="bg-card border rounded-2xl p-5 space-y-3">
            <label className="block">
              <span className="text-lg font-bold flex items-center gap-2">
                ⛰️ {t("slope_angle")}
              </span>
              <p className="text-sm text-muted-foreground mt-1">
                How steep is the hillside near you?
              </p>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Flat (5°)", value: "5" },
                { label: "Gentle (15°)", value: "15" },
                { label: "Moderate (25°)", value: "25" },
                { label: "Steep (35°)", value: "35" },
                { label: "Very Steep (45°)", value: "45" },
                { label: "Cliff (60°)", value: "60" },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSlopeAngle(value)}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    slopeAngle === value
                      ? "bg-orange-600 text-white border-orange-600"
                      : "bg-muted border-border hover:bg-muted/80"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="0"
              max="90"
              step="1"
              value={slopeAngle}
              onChange={(e) => setSlopeAngle(e.target.value)}
              placeholder="Or type degrees..."
              className="w-full border rounded-xl px-4 py-3 text-lg font-bold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive rounded-xl p-4 text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white text-xl font-black py-5 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-3"
          >
            ⚡ {t("submit_check")}
          </button>
        </form>

        {/* Emergency contacts at bottom */}
        <div className="bg-muted rounded-2xl p-4 text-sm space-y-1 text-muted-foreground">
          <p className="font-bold text-foreground">{t("emergency_contacts")}</p>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <a href="tel:100" className="text-center bg-background rounded-xl p-2 font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              📞 100
            </a>
            <a href="tel:108" className="text-center bg-background rounded-xl p-2 font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              🚑 108
            </a>
            <a href="tel:1078" className="text-center bg-background rounded-xl p-2 font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
              🌊 1078
            </a>
          </div>
          <p className="text-xs mt-2">NDRF: 011-24363260 &nbsp;|&nbsp; Disaster helpline: 1078</p>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: Factor contribution bar ────────────────────────────────────
function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
