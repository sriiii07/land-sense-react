/** Citizen monitoring: who is safe, who needs help, who has not responded. */
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { citizens as mockCitizens, type CitizenStatus } from "@/data/mock-data";
import { getCitizens } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/citizens")({
  head: () => ({
    meta: [
      { title: "Citizen Monitoring — BHOOSAKTHI" },
      {
        name: "description",
        content:
          "Live safety check-ins from residents in alerted villages: safe, needs help and no response, with last known location.",
      },
      { property: "og:title", content: "Citizen Monitoring — BHOOSAKTHI" },
      {
        property: "og:description",
        content: "Live resident safety check-ins for rescue prioritisation.",
      },
    ],
  }),
  component: CitizenMonitoringPage,
});

const filters = ["All", "Needs Help", "No Response", "Safe"] as const;

function CitizenMonitoringPage() {
  useRequireAuth();
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [citizens, setCitizens] = useState(mockCitizens);

  useEffect(() => {
    let active = true;
    void getCitizens().then((rows) => {
      if (!active) return;
      setCitizens(rows.map((row) => ({
        id: `CTZ-${row.id}`,
        name: row.name,
        phone: "",
        village: `Village ${row.village_id}`,
        location: `${row.location_lat}, ${row.location_lng}`,
        status: row.status === "Need Help" ? "Needs Help" : row.status === "I'm Safe" ? "Safe" : "No Response",
        lastSeen: row.last_updated,
        members: 1,
      })));
    }).catch(() => {
      setCitizens(mockCitizens);
    });

    return () => {
      active = false;
    };
  }, []);

  const count = (status: CitizenStatus) => citizens.filter((c) => c.status === status).length;
  const rows = filter === "All" ? citizens : citizens.filter((c) => c.status === filter);

  return (
    <ConsoleLayout>
      <PageHeader
        title="Citizen monitoring"
        description="Safety status reported through the citizen application during the active alert."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Households tracked" value={String(citizens.length)} />
        <StatCard
          label="Needs help"
          value={String(count("Needs Help"))}
          footnote="Dispatch priority 1"
          valueClassName="text-risk-critical"
        />
        <StatCard
          label="No response"
          value={String(count("No Response"))}
          footnote="Dispatch priority 2"
        />
        <StatCard label="Safe" value={String(count("Safe"))} valueClassName="text-risk-low" />
      </div>

      <Panel
        title="Citizen register"
        description="Contact numbers are masked; full details require rescue-role access."
        bodyClassName="p-0"
        action={
          <div className="flex gap-1" role="group" aria-label="Filter by status">
            {filters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "rounded border px-2.5 py-1 text-xs transition-colors",
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:bg-secondary",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Citizen safety register</caption>
            <thead className="bg-secondary text-xs text-muted-foreground uppercase">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">ID</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Name</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Contact</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Village</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Last location</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Members</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Status</th>
                <th scope="col" className="px-4 py-2.5 text-left font-medium">Last check-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-secondary/60">
                  <td className="px-4 py-2.5 text-muted-foreground">{c.id}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{c.name}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-2.5">{c.village}</td>
                  <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{c.location}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.members}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.lastSeen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </ConsoleLayout>
  );
}
