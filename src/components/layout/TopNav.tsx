/** Minimal top bar: context on the left, system state and officer on the right. */
import { Link } from "@tanstack/react-router";
import { CircleDot, LogOut } from "lucide-react";
import { officerProfile, predictionSummary } from "@/data/mock-data";

export function TopNav() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4 lg:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          District Disaster Control Room — {officerProfile.district}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Model {predictionSummary.modelVersion} · Updated {predictionSummary.lastUpdated}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-1.5 text-xs text-risk-low md:inline-flex">
          <CircleDot aria-hidden className="size-3.5" />
          System operational
        </span>
        <div className="hidden text-right sm:block">
          <p className="text-xs font-medium text-foreground">{officerProfile.name}</p>
          <p className="text-xs text-muted-foreground">{officerProfile.employeeId}</p>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 rounded border border-input px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <LogOut aria-hidden className="size-3.5" />
          Sign out
        </Link>
      </div>
    </header>
  );
}
