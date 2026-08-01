/** Public landing page introducing the platform to authorities and citizens. */
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  MountainSnow,
  Satellite,
  BrainCircuit,
  Siren,
  ArrowRight,
  Smartphone,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BHOOSAKTHI — AI Landslide Early Warning & Response" },
      {
        name: "description",
        content:
          "24-hour advance landslide prediction and emergency response platform for district disaster management authorities.",
      },
      { property: "og:title", content: "BHOOSAKTHI — AI Landslide Early Warning & Response" },
      {
        property: "og:description",
        content:
          "Village-level landslide risk scoring, officer-approved alerts, citizen safety tracking and shelter coordination.",
      },
    ],
  }),
  component: LandingPage,
});

const features = [
  {
    icon: Satellite,
    title: "Multi-source data ingestion",
    body: "Rainfall (NASA GPM IMERG), soil moisture (SMAP), terrain (SRTM DEM), land cover and IMD forecasts are fused into a daily feature table for every village.",
  },
  {
    icon: BrainCircuit,
    title: "Village-level risk prediction",
    body: "A gradient-boosted model trained on the Kerala 2018 landslide inventory scores each village 24 hours in advance, with SHAP-based explanation of every prediction.",
  },
  {
    icon: Siren,
    title: "Officer-approved response",
    body: "No alert reaches the public without human authorisation. Approved alerts push evacuation routes, shelter capacity and live citizen safety status.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Government identification bar */}
      <div className="border-b border-border bg-primary px-4 py-1.5 text-center text-xs text-primary-foreground">
        Prototype system · Kerala State Disaster Management Authority · For demonstration purposes
      </div>

      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <MountainSnow aria-hidden className="size-6 text-primary" />
            <div>
              <p className="text-sm font-semibold text-foreground">BHOOSAKTHI</p>
              <p className="text-xs text-muted-foreground">
                Landslide Early Warning &amp; Response Platform
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Authority login
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-border bg-secondary">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              National Disaster Response Initiative
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl leading-tight font-semibold text-foreground md:text-4xl">
              24-hour advance landslide warning for every village at risk
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              BHOOSAKTHI ingests rainfall, soil moisture and terrain data, scores landslide
              probability for each village, and gives district officers a single console to
              authorise alerts, track citizen safety and coordinate shelters.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Authority login
                <ArrowRight aria-hidden className="size-4" />
              </Link>
              <a
                href="#citizen-app"
                className="inline-flex items-center gap-2 rounded border border-input bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                <Smartphone aria-hidden className="size-4" />
                Citizen app
              </a>
            </div>

            <dl className="mt-10 grid gap-px overflow-hidden rounded border border-border bg-border sm:grid-cols-3">
              {[
                { k: "Advance warning", v: "24 hours" },
                { k: "Prediction granularity", v: "Village / ward" },
                { k: "Recall on held-out seasons", v: "0.89" },
              ].map((s) => (
                <div key={s.k} className="bg-card px-4 py-3">
                  <dt className="text-xs text-muted-foreground">{s.k}</dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Project description */}
        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-lg font-semibold text-foreground">About the platform</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Landslides in the Western Ghats develop over hours of antecedent rainfall on saturated,
            steep terrain — conditions that are measurable before failure occurs. BHOOSAKTHI
            continuously collects those measurements, fuses them into a per-village feature table,
            and applies a trained machine learning model to estimate the probability of a landslide
            in the next 24 hours. Predictions above the alert threshold are escalated to the
            district officer, who approves or rejects each alert. Approved alerts reach residents
            through the citizen mobile application with the nearest shelter and evacuation route,
            while officers see live safety check-ins to prioritise rescue teams.
          </p>
        </section>

        {/* Three features */}
        <section className="border-y border-border bg-secondary">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <h2 className="text-lg font-semibold text-foreground">Core capabilities</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {features.map(({ icon: Icon, title, body }) => (
                <article key={title} className="rounded border border-border bg-card p-5">
                  <Icon aria-hidden className="size-5 text-primary" />
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Access paths */}
        <section id="citizen-app" className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded border border-border p-6">
              <h2 className="text-sm font-semibold text-foreground">For disaster authorities</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Access the district console to review today's risk map, authorise alerts, monitor
                citizen check-ins and manage shelter occupancy. Access is restricted to registered
                officers and every action is written to an audit log.
              </p>
              <Link
                to="/login"
                className="mt-5 inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Sign in to console
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </article>

            <article className="rounded border border-border p-6">
              <h2 className="text-sm font-semibold text-foreground">For citizens</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The mobile application delivers approved alerts, cached offline shelter maps,
                turn-by-turn evacuation routes, and one-tap "I'm Safe" and "Need Help" reporting.
                Location is shared only during an active alert and only with consent.
              </p>
              <p className="mt-5 inline-flex items-center gap-2 rounded border border-input px-4 py-2 text-sm text-muted-foreground">
                <Smartphone aria-hidden className="size-4" />
                Android release · distributed by the district authority
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
          <p>© 2026 BHOOSAKTHI · Landslide Early Warning &amp; Response Platform</p>
          <p>
            Data: NASA GPM IMERG · NASA SMAP · SRTM DEM · IMD Forecast API · Census of India
          </p>
        </div>
      </footer>
    </div>
  );
}
