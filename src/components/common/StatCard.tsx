/** Single key figure with a label, optional footnote and optional icon. */
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  footnote?: string;
  icon?: LucideIcon;
  valueClassName?: string | undefined;
}

export function StatCard({ label, value, footnote, icon: Icon, valueClassName }: StatCardProps) {
  return (
    <div className="rounded border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {Icon && <Icon aria-hidden className="size-3.5" />}
        {label}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", valueClassName)}>{value}</p>
      {footnote && <p className="mt-1 text-xs text-muted-foreground">{footnote}</p>}
    </div>
  );
}
