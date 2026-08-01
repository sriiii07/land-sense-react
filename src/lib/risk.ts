/**
 * Risk vocabulary shared by every screen.
 * The model outputs a probability (0-1); it is mapped to four official bands.
 */

export type RiskLevel = "Low" | "Moderate" | "High" | "Critical";

/** Maps a model probability to the official risk band. */
export function toRiskLevel(score: number): RiskLevel {
  if (score >= 0.85) return "Critical";
  if (score >= 0.6) return "High";
  if (score >= 0.35) return "Moderate";
  return "Low";
}

/** Tailwind classes per risk band. Colour is only ever used to encode risk. */
export const riskStyles: Record<RiskLevel, { badge: string; dot: string; text: string }> = {
  Low: {
    badge: "bg-risk-low-bg text-risk-low border-risk-low/30",
    dot: "bg-risk-low",
    text: "text-risk-low",
  },
  Moderate: {
    badge: "bg-risk-moderate-bg text-risk-moderate border-risk-moderate/30",
    dot: "bg-risk-moderate",
    text: "text-risk-moderate",
  },
  High: {
    badge: "bg-risk-high-bg text-risk-high border-risk-high/30",
    dot: "bg-risk-high",
    text: "text-risk-high",
  },
  Critical: {
    badge: "bg-risk-critical-bg text-risk-critical border-risk-critical/30",
    dot: "bg-risk-critical",
    text: "text-risk-critical",
  },
};

/** Hex-free chart colour lookup driven by design tokens. */
export const riskChartVar: Record<RiskLevel, string> = {
  Low: "var(--risk-low)",
  Moderate: "var(--risk-moderate)",
  High: "var(--risk-high)",
  Critical: "var(--risk-critical)",
};
