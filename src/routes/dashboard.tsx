/** Operational overview: one screen answering "what must we act on right now?". */
import { createFileRoute } from "@tanstack/react-router";
import { Users, MapPin, Gauge, Clock, Home, ShieldCheck } from "lucide-react";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { StatCard } from "@/components/common/StatCard";
import { RiskBadge } from "@/components/common/RiskBadge";
import { RiskMap } from "@/components/dashboard/RiskMap";
import { AlertApproval } from "@/components/dashboard/AlertApproval";
import { riskStyles } from "@/lib/risk";
import {
  citizens,
  environmentalConditions,
  highRiskVillages,
  predictionSummary,
  shelters,
  villagePredictions,
} from "@/data/mock-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Authority Dashboard — BHOOSAKTHI" },
      {
        name: "description",
        content:
          "Live district landslide risk map, today's prediction, population at risk, shelter and citizen status for disaster officers.",
      },
      { property: "og:title", content: "Authority Dashboard — BHOOSAKTHI" },
      {
        property: "og:description",
        content: "Live district landslide risk map and 24-hour prediction for disaster officers.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const shelterCapacity = shelters.reduce((s, x) => s + x.capacity, 0);
  const shelterOccupied = shelters.reduce((s, x) => s + x.occupied, 0);
  const needsHelp = citizens.filter((c) => c.status === "Needs Help").length;
  const safe = citizens.filter((c) => c.status === "Safe").length;
  const noResponse = citizens.filter((c) => c.status === "No Response").length;

  return (
    <ConsoleLayout>
      <PageHeader
        title="District risk overview"
        description={`Prediction window: next ${predictionSummary.forecastWindowHours} hours · ${predictionSummary.modelVersion}`}
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock aria-hidden className="size-3.5" />
            Last updated {predictionSummary.lastUpdated}
          </div>
        }
      />

      {/* Key figures */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's prediction"
          value={predictionSummary.headlineRisk}
          footnote={`Peak risk score ${predictionSummary.headlineScore.toFixed(2)}`}
          icon={Gauge}
          valueClassName={riskStyles[predictionSummary.headlineRisk].text}
        />
        <StatCard
          label="Affected villages"
          value={String(predictionSummary.affectedVillages)}
          footnote={`Of ${villagePredictions.length} monitored villages`}
          icon={MapPin}
        />
        <StatCard
          label="Population at risk"
          value={predictionSummary.populationAtRisk.toLocaleString("en-IN")}
          footnote="Residents in High or Critical villages"
          icon={Users}
        />
        <StatCard
          label="Prediction confidence"
          value={`${Math.round(predictionSummary.confidence * 100)}%`}
          footnote={`Next model run ${predictionSummary.nextRun}`}
          icon={ShieldCheck}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* Map */}
        <Panel
          title="District risk map"
          description="Village-level landslide probability for the next 24 hours"
          className="xl:col-span-2"
        >
          <RiskMap villages={villagePredictions} />
        </Panel>

        <div className="space-y-5">
          <AlertApproval />

          <Panel title="Environmental conditions" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {environmentalConditions.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground">{c.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.source}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-foreground">{c.value}</p>
                    <RiskBadge level={c.status} className="mt-0.5" />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* High risk table */}
      <Panel
        title="High risk villages"
        description="Villages above the alert threshold, ordered by risk score"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Villages at high or critical landslide risk</caption>
            <thead className="bg-secondary text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Village</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">District</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Population</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Rain 24h</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Soil moisture</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Slope</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Risk score</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {highRiskVillages.map((v) => (
                <tr key={v.villageId} className="hover:bg-secondary/60">
                  <td className="px-4 py-2.5 font-medium text-foreground">{v.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{v.district}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {v.population.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{v.precip24h} mm</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{v.soilMoisture}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{v.slopeDeg}°</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {v.riskScore.toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <RiskBadge level={v.riskLevel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Shelter + citizen status */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Shelter status" description="Aggregate occupancy across active shelters">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total capacity</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{shelterCapacity}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Occupied</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{shelterOccupied}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                {shelterCapacity - shelterOccupied}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {shelters.slice(0, 3).map((s) => {
              const pct = Math.round((s.occupied / s.capacity) * 100);
              return (
                <li key={s.id} className="text-xs">
                  <div className="flex justify-between">
                    <span className="truncate text-foreground">{s.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {s.occupied}/{s.capacity}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-secondary">
                    <div
                      className={pct >= 90 ? "h-1.5 rounded bg-risk-critical" : "h-1.5 rounded bg-primary"}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Home aria-hidden className="size-3.5" />
            {shelters.length} shelters active in the district
          </p>
        </Panel>

        <Panel title="Citizen status" description="Check-ins received from the citizen application">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Safe</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-risk-low">{safe}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Needs help</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-risk-critical">
                {needsHelp}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">No response</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-muted-foreground">
                {noResponse}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Households marked "Needs help" are dispatched first, followed by "No response"
            households in Critical villages. Live location is collected only while an alert is
            active and only with the resident's consent.
          </p>
        </Panel>
      </div>
    </ConsoleLayout>
  );
}
