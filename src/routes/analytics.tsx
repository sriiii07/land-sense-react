/** Analytics: rainfall trend, risk trend and model performance. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { modelComparison as mockModelComparison, modelPerformance as mockModelPerformance, rainfallTrend as mockRainfallTrend, riskHistory as mockRiskHistory } from "@/data/mock-data";
import { getModelPerformance } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — BHOOSAKTHI" },
      {
        name: "description",
        content:
          "Rainfall and risk trends with cross-validated model performance metrics for the landslide prediction engine.",
      },
      { property: "og:title", content: "Analytics — BHOOSAKTHI" },
      {
        property: "og:description",
        content: "Rainfall trend, risk trend and model performance metrics.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const chartTooltip = {
  contentStyle: { borderRadius: 4, border: "1px solid var(--border)", fontSize: 12 },
};

function AnalyticsPage() {
  useRequireAuth();
  const [modelPerformance, setModelPerformance] = useState(mockModelPerformance);
  const [rainfallTrend, setRainfallTrend] = useState(mockRainfallTrend);
  const [riskHistory, setRiskHistory] = useState(mockRiskHistory);

  useEffect(() => {
    let active = true;
    void getModelPerformance().then((metrics) => {
      if (!active) return;
      setModelPerformance([
        { metric: "Accuracy", value: metrics.accuracy.toFixed(2), note: "Latest backend evaluation" },
        { metric: "Precision", value: metrics.precision.toFixed(2), note: "Latest backend evaluation" },
        { metric: "Recall", value: metrics.recall.toFixed(2), note: "Latest backend evaluation" },
        { metric: "F1 score", value: metrics.f1_score.toFixed(2), note: "Latest backend evaluation" },
        { metric: "ROC-AUC", value: metrics.auc_roc.toFixed(2), note: "Latest backend evaluation" },
        { metric: "Evaluated at", value: metrics.evaluated_at, note: "Latest backend evaluation" },
      ]);
    }).catch(() => {
      setModelPerformance(mockModelPerformance);
      setRainfallTrend(mockRainfallTrend);
      setRiskHistory(mockRiskHistory);
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <ConsoleLayout>
      <PageHeader
        title="Analytics"
        description="Environmental trends and model quality over the current monsoon season."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Rainfall trend" description="24-hour rainfall totals, last 14 days (mm)">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rainfallTrend} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="rainfall" name="Rainfall (mm)" fill="var(--primary)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Risk trend" description="Peak district risk score, last 14 days">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskHistory} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip {...chartTooltip} />
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Model performance" description="Evaluated on held-out monsoon seasons" bodyClassName="p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">Model performance metrics</caption>
            <thead className="bg-secondary text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Metric</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Value</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modelPerformance.map((m) => (
                <tr key={m.metric}>
                  <td className="px-4 py-2.5 font-medium text-foreground">{m.metric}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{m.value}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Candidate model comparison" description="F1 and recall by algorithm">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockModelComparison} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="model" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="f1" name="F1" fill="var(--primary)" />
                <Bar dataKey="recall" name="Recall" fill="var(--risk-low)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </ConsoleLayout>
  );
}
