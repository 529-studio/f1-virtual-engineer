"use client";

import type { RadioMessage } from "@/types/radio";
import {
  Sliders,
  Flame,
  Radio,
  User,
  ShieldAlert,
  Zap,
  Activity,
} from "lucide-react";

interface RadioTranscriptCardProps {
  message: RadioMessage | null;
  isPitWallFilter: boolean;
  onToggleFilter: () => void;
}

const CLASSIFICATION_META: Record<
  string,
  { label: string; color: string; border: string }
> = {
  strategy_request: {
    label: "STRATEGY CALL",
    color: "text-amber-400 bg-amber-500/10",
    border: "border-amber-500/30",
  },
  tyre_issue: {
    label: "TYRE DEG / WEAR",
    color: "text-orange-400 bg-orange-500/10",
    border: "border-orange-500/30",
  },
  brake_issue: {
    label: "BRAKE SYSTEM",
    color: "text-red-400 bg-red-500/10",
    border: "border-red-500/30",
  },
  engine_issue: {
    label: "POWER UNIT / PU",
    color: "text-rose-400 bg-rose-500/10",
    border: "border-rose-500/30",
  },
  traffic: {
    label: "TRAFFIC / HAZARD",
    color: "text-yellow-400 bg-yellow-500/10",
    border: "border-yellow-500/30",
  },
  weather: {
    label: "WEATHER REPORT",
    color: "text-cyan-400 bg-cyan-500/10",
    border: "border-cyan-500/30",
  },
  none: {
    label: "ROUTINE RADIO",
    color: "text-foreground-dim bg-white/5",
    border: "border-border",
  },
};

export function RadioTranscriptCard({
  message,
  isPitWallFilter,
  onToggleFilter,
}: RadioTranscriptCardProps) {
  if (!message) {
    return (
      <div className="flex h-44 w-full flex-col items-center justify-center rounded border border-border bg-surface/30 p-4 text-center">
        <Radio className="mb-2 h-6 w-6 text-foreground-faint" strokeWidth={1.5} />
        <p className="text-xs uppercase tracking-wider text-foreground-dim">
          No active radio transmission selected
        </p>
      </div>
    );
  }

  const meta =
    CLASSIFICATION_META[message.classification] || CLASSIFICATION_META.none;
  const teamColor = message.team_color || "#3671C6";

  // Urgency color scale
  const urgencyLevel = message.urgency || 2;
  const urgencyColor =
    urgencyLevel >= 4
      ? "text-red-400 border-red-500/40 bg-red-500/10"
      : urgencyLevel === 3
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";

  return (
    <div className="w-full rounded border border-border bg-surface/50 p-3.5 backdrop-blur-sm space-y-3">
      {/* Header bar: Driver Pill, Speaker, Classification & Pit-Wall Filter Button */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          {/* Driver Code Pill with Team Livery */}
          <div
            className="flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-mono font-bold tracking-wider"
            style={{
              borderColor: `${teamColor}60`,
              backgroundColor: `${teamColor}15`,
              color: "#FFFFFF",
            }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: teamColor }}
            />
            <span>{message.driver_code}</span>
            <span className="text-[10px] text-foreground-faint">
              #{message.driver_number}
            </span>
          </div>

          {/* Lap indicator */}
          {message.lap_number && (
            <span className="rounded border border-border bg-surface px-2 py-0.5 text-[11px] font-mono text-foreground-dim">
              LAP {message.lap_number}
            </span>
          )}

          {/* Speaker Role */}
          <div className="flex items-center gap-1 text-[11px] font-mono text-foreground-dim">
            {message.speaker === "race_engineer" ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-accent" strokeWidth={1.5} />
                <span>PIT WALL</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5 text-foreground-dim" strokeWidth={1.5} />
                <span>COCKPIT</span>
              </>
            )}
          </div>
        </div>

        {/* Tactical classification pill & Pit-wall Filter Toggle */}
        <div className="flex items-center gap-2">
          <span
            className={`rounded border px-2 py-0.5 text-[10px] font-mono font-medium tracking-wider ${meta.color} ${meta.border}`}
          >
            {meta.label}
          </span>

          {/* Pit-Wall Filter Button (Min 44px touch target) */}
          <button
            type="button"
            onClick={onToggleFilter}
            className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded border px-3 text-xs font-mono transition-colors ${
              isPitWallFilter
                ? "border-accent bg-accent/15 text-accent shadow-sm"
                : "border-border bg-surface/40 text-foreground-dim hover:text-foreground hover:border-border-accent"
            }`}
            aria-label="Toggle Pit-Wall Bandpass Filter"
            title="Toggle authentic 300Hz-3.4kHz Pit-Wall Intercom Audio Filter"
          >
            <Sliders className="h-4 w-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">PIT-WALL EQ</span>
          </button>
        </div>
      </div>

      {/* Transcript Text & Verbatim Trigger Quote */}
      <div className="space-y-2">
        <p className="text-sm font-sans leading-relaxed text-foreground antialiased selection:bg-accent/30">
          &ldquo;{message.transcript}&rdquo;
        </p>

        {message.trigger_phrase && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-foreground-dim">
            <Zap className="h-3 w-3 text-accent" strokeWidth={1.5} />
            <span>TRIGGER PHRASE:</span>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent font-medium">
              &ldquo;{message.trigger_phrase}&rdquo;
            </span>
          </div>
        )}
      </div>

      {/* Footer Metrics: Urgency Gauge & Team Name */}
      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] font-mono text-foreground-dim">
        <div className="flex items-center gap-2">
          <span className="text-[10px] tracking-wider text-foreground-faint uppercase">
            Tactical Urgency:
          </span>
          <div
            className={`flex items-center gap-1 rounded border px-2 py-0.5 font-bold ${urgencyColor}`}
          >
            <Flame className="h-3 w-3" strokeWidth={1.5} />
            <span>LEVEL {urgencyLevel} / 5</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-foreground-faint">
          <Activity className="h-3 w-3 text-foreground-dim" strokeWidth={1.5} />
          <span>{message.team_name}</span>
        </div>
      </div>
    </div>
  );
}
