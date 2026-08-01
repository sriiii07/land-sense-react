/** Settings: officer profile, notification channels and system thresholds. */
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { officerProfile } from "@/data/mock-data";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BHOOSAKTHI" },
      {
        name: "description",
        content:
          "Officer profile, alert notification channels and system thresholds for the BHOOSAKTHI landslide warning console.",
      },
      { property: "og:title", content: "Settings — BHOOSAKTHI" },
      {
        property: "og:description",
        content: "Officer profile, notification channels and system thresholds.",
      },
    ],
  }),
  component: SettingsPage,
});

const notificationChannels = [
  { id: "push", label: "Citizen app push notifications", detail: "Delivered to all residents in alerted villages" },
  { id: "sms", label: "SMS fallback", detail: "Used when the app has not been opened in 24 hours" },
  { id: "email", label: "Email digest to officers", detail: "Daily summary at 07:00 IST" },
  { id: "radio", label: "Radio / control-room relay", detail: "Manual relay checklist for network outages" },
];

function SettingsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    push: true,
    sms: true,
    email: true,
    radio: false,
  });

  return (
    <ConsoleLayout>
      <PageHeader title="Settings" description="Profile, notification channels and system configuration." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Officer profile">
          <dl className="space-y-3 text-sm">
            {[
              ["Name", officerProfile.name],
              ["Designation", officerProfile.designation],
              ["Employee ID", officerProfile.employeeId],
              ["District", officerProfile.district],
              ["Official email", officerProfile.email],
              ["Control room", officerProfile.phone],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Profile fields are managed by the State Disaster Management Authority. Contact the
            state administrator to request a change.
          </p>
        </Panel>

        <Panel title="Notifications" description="Channels used when an alert is approved">
          <ul className="space-y-3">
            {notificationChannels.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-4">
                <div>
                  <label htmlFor={c.id} className="text-sm font-medium text-foreground">
                    {c.label}
                  </label>
                  <p className="text-xs text-muted-foreground">{c.detail}</p>
                </div>
                <input
                  id={c.id}
                  type="checkbox"
                  checked={enabled[c.id] ?? false}
                  onChange={(e) => setEnabled((p) => ({ ...p, [c.id]: e.target.checked }))}
                  className="mt-1 size-4 shrink-0 rounded border-input"
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="System settings" description="Applies district-wide; changes are audit-logged">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Alert threshold (risk score)", value: "0.60" },
            { label: "Model run frequency", value: "Hourly" },
            { label: "Prediction window", value: "24 hours" },
            { label: "Location retention", value: "7 days" },
          ].map((s) => (
            <div key={s.label} className="space-y-1.5">
              <label htmlFor={s.label} className="block text-xs font-medium text-foreground">
                {s.label}
              </label>
              <input
                id={s.label}
                defaultValue={s.value}
                className="w-full rounded border border-input bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save configuration
        </button>
      </Panel>
    </ConsoleLayout>
  );
}
