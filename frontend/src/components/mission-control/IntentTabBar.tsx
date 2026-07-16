"use client";

export function IntentTabBar({
  intent,
  setIntent,
}: {
  intent: "telemetry" | "strategy";
  setIntent: (v: "telemetry" | "strategy") => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-5 py-1.5">
      <span className="label text-foreground-faint">Mode</span>
      <div
        role="tablist"
        aria-label="Analysis intent"
        className="flex overflow-hidden rounded-sm border border-border"
      >
        {(["telemetry", "strategy"] as const).map((id) => {
          const active = intent === id;
          return (
            <button
              key={id}
              role="tab"
              aria-selected={active}
              onClick={() => setIntent(id)}
              title={
                id === "telemetry"
                  ? "Raw sensor data: speed, throttle, brake, gear, RPM sampled across the lap"
                  : "Pit window recommendation with undercut math and gap to rival"
              }
              className="readout px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[var(--track-wide)] transition-colors"
              style={{
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--background)" : "var(--foreground-dim)",
              }}
            >
              {id}
            </button>
          );
        })}
      </div>
    </div>
  );
}
