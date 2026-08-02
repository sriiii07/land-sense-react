// src/routes/index.tsx  — Public landing page
import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ── TOP NAV ─────────────────────────────────────────────── */}
      <nav className="border-b border-border px-4 py-3 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛰️</span>
            <span className="font-black text-xl tracking-tight">{t("app_name")}</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              {t("authority_login")}
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 space-y-8 max-w-3xl mx-auto w-full text-center">

        <div className="space-y-4">
          <div className="text-7xl">🛰️</div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight leading-tight">
            {t("app_name")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            {t("app_tagline")}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full border border-green-200">
              ✅ {t("free_service")}
            </span>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">
              🤖 {t("powered_by_ai")}
            </span>
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
              ⚡ 24hr Advance Warning
            </span>
          </div>
        </div>

        {/* ── EMERGENCY CTA BUTTONS ──────────────────────────────── */}
        <div className="w-full max-w-md space-y-4">
          <Link
            to="/emergency"
            className="flex items-center justify-center gap-3 w-full bg-red-600 hover:bg-red-700 text-white text-2xl font-black py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
          >
            ⚠️ {t("emergency_check")}
          </Link>

          <Link
            to="/find-shelter"
            className="flex items-center justify-center gap-3 w-full bg-blue-700 hover:bg-blue-800 text-white text-2xl font-black py-6 rounded-2xl shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
          >
            🏠 {t("find_shelter")}
          </Link>
        </div>

        {/* Language switcher pills for mobile */}
        <div className="sm:hidden">
          <LanguageSwitcher variant="pills" />
        </div>

        {/* ── EMERGENCY CONTACT STRIP ───────────────────────────── */}
        <div className="w-full max-w-md bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
          <p className="font-bold text-red-800 text-sm">{t("emergency_contacts")}</p>
          <div className="grid grid-cols-4 gap-2">
            <a href="tel:100"
              className="bg-red-600 text-white rounded-xl p-3 text-center font-black text-sm hover:bg-red-700 transition-colors">
              📞<br />100
            </a>
            <a href="tel:108"
              className="bg-red-600 text-white rounded-xl p-3 text-center font-black text-sm hover:bg-red-700 transition-colors">
              🚑<br />108
            </a>
            <a href="tel:1078"
              className="bg-red-600 text-white rounded-xl p-3 text-center font-black text-sm hover:bg-red-700 transition-colors">
              🌊<br />1078
            </a>
            <a href="tel:01124363260"
              className="bg-red-700 text-white rounded-xl p-3 text-center font-black text-xs hover:bg-red-800 transition-colors">
              NDRF
            </a>
          </div>
        </div>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <div className="w-full max-w-2xl">
          <h2 className="text-lg font-bold text-muted-foreground mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "📊", title: "1. Enter Conditions", desc: "Tell us about rainfall, soil, and slope in your area" },
              { icon: "🤖", title: "2. AI Analyzes", desc: "Our model checks 50+ risk factors in under 2 seconds" },
              { icon: "🚨", title: "3. Instant Alert", desc: "Get clear RED/YELLOW/GREEN warning with next steps" },
            ].map((item) => (
              <div key={item.title} className="bg-card border rounded-2xl p-4 text-center space-y-2">
                <div className="text-4xl">{item.icon}</div>
                <p className="font-bold text-sm">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Authority login link */}
        <div className="pb-4">
          <Link
            to="/login"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            {t("authority_login")} →
          </Link>
        </div>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="border-t border-border py-4 px-4 text-center text-xs text-muted-foreground">
        SAFEGROUND · {t("free_service")} · Built for India 🇮🇳
      </footer>
    </div>
  );
}
