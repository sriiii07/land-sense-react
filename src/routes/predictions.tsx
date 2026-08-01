/** Predictions: current risk, history, trend and model explanation. */
import { createFileRoute } from "@tanstack/react-router";
import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { RiskBadge } from "@/components/common/RiskBadge";
import { riskStyles } from "@/lib/risk";
import {
  historicalPredictions,
  predictionSummary,
  riskExplanation,
  riskHistory,
  villagePredictions,
} from "@/data/mock-data";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Predictions — BHOOSAKTHI" },
      {
        name: "description",
        content:
          "Current landslide risk, 14-day risk trend, historical prediction accuracy and feature-level explanation of the model output.",
      },
      { property: "og:title", content: "Predictions — BHOOSAKTHI" },
      {
        property: "og:description",
        content: "Current risk, historical predictions, trend graph and risk explanation.",
      },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const top = villagePredictions[0];

  return (
    <ConsoleLayout>
      <PageHeader
        title="Predictions"
        description="Model output for the next 24 hours, with history and explanation."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Current risk" className="lg:col-span-1">
          <p className={`text-4xl font-semibold ${riskStyles[predictionSummary.headlineRisk].text}`}>
            {predictionSummary.headlineScore.toFixed(2)}
          </p>
          <div className="mt-2">
            <RiskBadge level={predictionSummary.headlineRisk} />
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Highest-risk village</dt>
              <dd className="font-medium">{top?.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Confidence</dt>
              <dd className="tabular-nums">{Math.round(predictionSummary.confidence * 100)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Model</dt>
              <dd>{predictionSummary.modelVersion}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Alert threshold</dt>
              <dd className="tabular-nums">0.60</dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="Risk trend"
          description="Peak district risk score and 24-hour rainfall, last 14 days"
          className="lg:col-span-2"
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskHistory} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 4,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="risk"
                  name="Risk score"
                  stroke="var(--risk-critical)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel
        title="Risk explanation"
        description="SHAP feature attribution for the highest-risk village"
      >
        <ul className="space-y-3">
          {riskExplanation.map((f) => (
            <li key={f.feature}>
              <div className="flex justify-between text-sm">
                <span className="text-foreground">{f.feature}</span>
                <span className="tabular-nums text-muted-foreground">
                  +{f.contribution.toFixed(2)}
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded bg-secondary">
                <div
                  className="h-2 rounded bg-primary"
                  style={{ width: `${(f.contribution / 0.34) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Sustained rainfall over the past 72 hours on already saturated soil is the dominant driver
          of today's prediction. Steep slopes and proximity to the 2018 failure zone amplify the
          effect. Officers should read this attribution before authorising the alert.
        </p>
      </Panel>

      <Panel
        title="Historical predictions"
        description="Past model outputs compared with reported outcomes"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Historical predictions and outcomes</caption>
            <thead className="bg-secondary text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Date</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Village</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Risk score</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Level</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Alert issued</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {historicalPredictions.map((h) => (
                <tr key={`${h.date}-${h.village}`} className="hover:bg-secondary/60">
                  <td className="px-4 py-2.5 text-muted-foreground">{h.date}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{h.village}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{h.riskScore.toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <RiskBadge level={h.riskLevel} />
                  </td>
                  <td className="px-4 py-2.5">{h.alertIssued ? "Yes" : "No"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{h.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </ConsoleLayout>
  );
}
