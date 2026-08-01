/**
 * Schematic district risk map.
 *
 * Renders village risk positions on a plain terrain grid. In production this
 * component is replaced by a Leaflet/MapLibre map fed by PostGIS village
 * geometry; the props and colour coding stay identical.
 */
import { useState } from "react";
import { riskStyles, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";
import type { VillagePrediction } from "@/data/mock-data";

const legend: RiskLevel[] = ["Low", "Moderate", "High", "Critical"];

export function RiskMap({ villages }: { villages: VillagePrediction[] }) {
  const [selected, setSelected] = useState<VillagePrediction | null>(null);

  return (
    <div className="space-y-3">
      <div className="relative h-[420px] w-full overflow-hidden rounded border border-border bg-secondary">
        {/* Terrain grid reference lines */}
        <svg aria-hidden className="absolute inset-0 size-full text-border" role="presentation">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        <ul className="absolute inset-0">
          {villages.map((village) => (
            <li
              key={village.villageId}
              className="absolute"
              style={{ left: `${village.x}%`, top: `${village.y}%` }}
            >
              <button
                type="button"
                onClick={() => setSelected(village)}
                aria-label={`${village.name}, risk ${village.riskLevel}`}
                className={cn(
                  "-translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card",
                  "size-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  riskStyles[village.riskLevel].dot,
                  selected?.villageId === village.villageId && "ring-2 ring-ring",
                )}
              />
            </li>
          ))}
        </ul>

        {selected && (
          <div className="absolute right-3 bottom-3 w-60 rounded border border-border bg-card p-3 text-xs">
            <p className="text-sm font-semibold text-foreground">{selected.name}</p>
            <p className="text-muted-foreground">{selected.district} district</p>
            <dl className="mt-2 space-y-1">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Risk score</dt>
                <dd className={cn("font-medium", riskStyles[selected.riskLevel].text)}>
                  {selected.riskScore.toFixed(2)} · {selected.riskLevel}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Population</dt>
                <dd className="tabular-nums">{selected.population.toLocaleString("en-IN")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rain 24h</dt>
                <dd className="tabular-nums">{selected.precip24h} mm</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Slope</dt>
                <dd className="tabular-nums">{selected.slopeDeg}°</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Risk level</span>
        {legend.map((level) => (
          <span key={level} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={cn("size-2.5 rounded-full", riskStyles[level].dot)} />
            {level}
          </span>
        ))}
        <span className="ml-auto">Select a marker for village detail</span>
      </div>
    </div>
  );
}
