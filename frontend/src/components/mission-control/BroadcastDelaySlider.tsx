"use client";

import { useId } from "react";
import { SlidersHorizontal, Timer } from "lucide-react";

interface BroadcastDelaySliderProps {
  delaySeconds: number;
  onDelayChange: (seconds: number) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const PRESETS = [0, 15, 30, 45, 60] as const;

export function BroadcastDelaySlider({
  delaySeconds,
  onDelayChange,
  disabled = false,
  isLoading = false,
}: BroadcastDelaySliderProps) {
  const sliderId = useId();

  if (isLoading) {
    return (
      <div className="flex h-11 min-h-[44px] items-center gap-3 rounded border border-border bg-surface px-4 py-2 animate-pulse">
        <div className="h-4 w-28 rounded bg-surface-elevated" />
        <div className="h-2 flex-1 rounded bg-surface-elevated" />
        <div className="h-4 w-16 rounded bg-surface-elevated" />
      </div>
    );
  }

  const isRealtime = delaySeconds === 0;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-surface px-3 sm:px-4 py-2"
      role="region"
      aria-label="Broadcast Delay Synchronization"
    >
      {/* Left: Label & Status Indicator */}
      <div className="flex items-center gap-2 shrink-0">
        <SlidersHorizontal className="h-4 w-4 text-accent" strokeWidth={1.75} />
        <label
          htmlFor={sliderId}
          className="readout text-[0.68rem] font-bold uppercase tracking-wider text-foreground"
        >
          Broadcast Sync
        </label>

        {/* Sync Status Badge */}
        {isRealtime ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[0.6rem] font-mono font-bold uppercase tracking-wider text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            REALTIME
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[0.6rem] font-mono font-bold uppercase tracking-wider text-cyan-400">
            <Timer className="h-3 w-3" strokeWidth={1.75} />
            SYNCED: -{delaySeconds}s
          </span>
        )}
      </div>

      {/* Middle: Slider Control */}
      <div className="flex items-center gap-2 flex-1 min-w-[160px] max-w-xs">
        <span className="text-[0.62rem] font-mono text-foreground-faint shrink-0">0s</span>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={60}
          step={1}
          value={delaySeconds}
          onChange={(e) => onDelayChange(Number(e.target.value))}
          disabled={disabled}
          aria-label="Broadcast Delay in seconds"
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-surface-elevated accent-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-[0.62rem] font-mono text-foreground-faint shrink-0">60s</span>
      </div>

      {/* Right: Quick Preset Buttons (min 44px touch target) */}
      <div className="flex items-center gap-1 shrink-0">
        {PRESETS.map((p) => {
          const isActive = delaySeconds === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onDelayChange(p)}
              disabled={disabled}
              className={`flex h-8 min-h-[36px] sm:min-h-[32px] items-center justify-center rounded px-2 font-mono text-[0.65rem] font-semibold transition-colors cursor-pointer ${
                isActive
                  ? "bg-accent text-background font-bold"
                  : "border border-border/80 bg-surface-elevated text-foreground-dim hover:border-accent hover:text-foreground"
              } disabled:cursor-not-allowed disabled:opacity-40`}
              title={p === 0 ? "Real-time 0s" : `Delay -${p}s`}
            >
              {p === 0 ? "Live" : `-${p}s`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
