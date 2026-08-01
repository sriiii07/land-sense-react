/** Small coloured pill communicating a risk band. Colour is the only signal we colour-code. */
import { cn } from "@/lib/utils";
import { riskStyles, type RiskLevel } from "@/lib/risk";

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium",
        riskStyles[level].badge,
        className,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", riskStyles[level].dot)} />
      {level}
    </span>
  );
}
