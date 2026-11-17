"use client";

import { Radio } from "lucide-react";

export type MissionIntent = "telemetry" | "strategy" | "live";

export function IntentTabBar({
  intent,
  setIntent,
}: {
  intent: MissionIntent;
  setIntent: (v: MissionIntent) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-5 py-1.5">
      <div className="flex items-center gap-3">
        <span className="label text-foreground-faint">Mode</span>
        <div
          role="tablist"
          aria-label="Analysis intent"
          className="flex overflow-hidden rounded-sm border border-border"
        >
          {(["telemetry", "strategy", "live"] as const).map((id) => {
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
                    : id === "strategy"
                    ? "Pit window recommendation with undercut math and gap to rival"
                    : "OpenF1 live session timing ladder and real-time telemetry stream"
                }
                className="readout flex min-h-[44px] items-center gap-1.5 px-3 py-1 text-[0.55rem] font-bold uppercase tracking-[var(--track-wide)] transition-colors cursor-pointer"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "var(--background)" : "var(--foreground-dim)",
                }}
              >
                {id === "live" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? "bg-background animate-pulse" : "bg-emerald-400 animate-pulse"
                    }`}
                  />
                )}
                {id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile HUD Instrument Trigger */}
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("apex:open-hud"));
          }
        }}
        className="md:hidden flex min-h-[44px] items-center gap-1.5 px-3 py-1 rounded border border-border bg-surface-elevated text-[0.62rem] font-mono font-bold text-foreground hover:border-accent active:scale-95 transition-all cursor-pointer"
        aria-label="Open Strategy HUD"
        title="Open Strategy HUD"
      >
        <Radio className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} aria-hidden />
        <span className="text-accent uppercase">Strategy HUD</span>
      </button>
    </div>
  );
}
