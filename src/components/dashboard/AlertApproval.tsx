/**
 * Human-in-the-loop alert control.
 *
 * The model never notifies citizens on its own: an officer must approve the
 * generated alert. POST /api/alerts/{id}/approve | /reject in production.
 */
import { useState } from "react";
import { Check, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "@/components/common/Panel";
import { predictionSummary } from "@/data/mock-data";

type Decision = "pending" | "approved" | "rejected";

export function AlertApproval() {
  const [decision, setDecision] = useState<Decision>("pending");

  const approve = () => {
    setDecision("approved");
    toast.success("Alert approved and dispatched to citizen app, SMS and radio.");
  };

  const reject = () => {
    setDecision("rejected");
    toast("Alert rejected. Reason logged in the audit trail.");
  };

  return (
    <Panel
      title="Alert authorisation"
      description="Model output requires officer approval before any citizen notification."
    >
      <div className="flex items-start gap-3 rounded border border-risk-critical/30 bg-risk-critical-bg p-3">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-risk-critical" />
        <p className="text-xs text-foreground">
          {predictionSummary.affectedVillages} villages crossed the alert threshold for the next{" "}
          {predictionSummary.forecastWindowHours} hours, exposing{" "}
          {predictionSummary.populationAtRisk.toLocaleString("en-IN")} residents.
        </p>
      </div>

      {decision === "pending" ? (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={approve}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Check aria-hidden className="size-4" />
            Approve alert
          </button>
          <button
            type="button"
            onClick={reject}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-input px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <X aria-hidden className="size-4" />
            Reject alert
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded border border-border bg-secondary px-3 py-2 text-xs text-foreground">
          {decision === "approved"
            ? "Alert approved · dispatched 01 Aug 2026, 10:34 IST"
            : "Alert rejected · no notification sent"}{" "}
          by K. Ramachandran (KSDMA-WYD-2291)
        </p>
      )}
    </Panel>
  );
}
