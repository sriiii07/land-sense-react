/** Shelter management: capacity, occupancy, remaining space and navigation. */
import { createFileRoute } from "@tanstack/react-router";
import { Navigation, Phone } from "lucide-react";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { StatCard } from "@/components/common/StatCard";
import { shelters } from "@/data/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shelters")({
  head: () => ({
    meta: [
      { title: "Shelter Management — BHOOSAKTHI" },
      {
        name: "description",
        content:
          "Relief shelter capacity, current occupancy, remaining space and evacuation routing for alerted villages.",
      },
      { property: "og:title", content: "Shelter Management — BHOOSAKTHI" },
      {
        property: "og:description",
        content: "Relief shelter capacity, occupancy and evacuation routing.",
      },
    ],
  }),
  component: ShelterManagementPage,
});

function ShelterManagementPage() {
  const capacity = shelters.reduce((s, x) => s + x.capacity, 0);
  const occupied = shelters.reduce((s, x) => s + x.occupied, 0);

  return (
    <ConsoleLayout>
      <PageHeader
        title="Shelter management"
        description="Live occupancy of relief shelters serving the alerted villages."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total capacity" value={capacity.toLocaleString("en-IN")} />
        <StatCard
          label="Currently occupied"
          value={occupied.toLocaleString("en-IN")}
          footnote={`${Math.round((occupied / capacity) * 100)}% utilised`}
        />
        <StatCard
          label="Remaining space"
          value={(capacity - occupied).toLocaleString("en-IN")}
          valueClassName={capacity - occupied < 200 ? "text-risk-high" : undefined}
        />
      </div>

      <Panel title="Shelter list" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Relief shelters and their occupancy</caption>
            <thead className="bg-secondary text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Shelter</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Serving village</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Capacity</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Occupied</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Remaining</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Utilisation</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Contact</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Navigation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shelters.map((s) => {
                const pct = Math.round((s.occupied / s.capacity) * 100);
                return (
                  <tr key={s.id} className="hover:bg-secondary/60">
                    <td className="px-4 py-2.5 font-medium text-foreground">{s.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.village}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.capacity}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{s.occupied}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      {s.capacity - s.occupied}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded bg-secondary">
                          <div
                            className={cn(
                              "h-1.5 rounded",
                              pct >= 90 ? "bg-risk-critical" : pct >= 70 ? "bg-risk-high" : "bg-primary",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs text-muted-foreground">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone aria-hidden className="size-3.5" />
                        {s.contact}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded border border-input px-2.5 py-1 text-xs font-medium transition-colors hover:bg-secondary"
                      >
                        <Navigation aria-hidden className="size-3.5" />
                        {s.distanceKm} km route
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </ConsoleLayout>
  );
}
