/** Citizen check-in status pill. Green = safe, red = needs help, gray = no response. */
import { cn } from "@/lib/utils";
import type { CitizenStatus } from "@/data/mock-data";

const statusStyles: Record<CitizenStatus, string> = {
  Safe: "bg-risk-low-bg text-risk-low border-risk-low/30",
  "Needs Help": "bg-risk-critical-bg text-risk-critical border-risk-critical/30",
  "No Response": "bg-secondary text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: CitizenStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium",
        statusStyles[status],
      )}
    >
      {status}
    </span>
  );
}
