"use client";

import { useMemo } from "react";
import { AlertTriangle, Crosshair, Gauge, Zap } from "lucide-react";
import type { OvertakeProbability } from "@/types/live-advanced";

interface OvertakeProbabilityGaugeProps {
  data: OvertakeProbability | null;
  isLoading?: boolean;
  error?: string | null;
}

export function OvertakeProbabilityGauge({
  data,
  isLoading = false,
  error = null,
}: OvertakeProbabilityGaugeProps) {
  // SVG Arc calculation for 180 degree semi-circle
  // Radius = 60, Center = (80, 75)
  const arcRadius = 55;
  const arcLength = Math.PI * arcRadius; // ~172.78

  const strokeDashoffset = useMemo(() => {
    if (!data) return arcLength;
    const progress = Math.min(Math.max(data.probability / 100, 0), 1);
    return arcLength * (1 - progress);
  }, [data, arcLength]);

  const probabilityColor = useMemo(() => {
    if (!data) return "#64748b";
    if (data.probability >= 70) return "#22c55e"; // Green
    if (data.probability >= 40) return "#eab308"; // Amber
    return "#ef4444"; // Red
  }, [data]);

  // 1. SKELETON STATE
  if (isLoading) {
    return (
      <div className="flex flex-col rounded border border-border bg-surface p-4 animate-pulse min-h-[160px]">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
          <div className="h-4 w-36 rounded bg-surface-elevated" />
          <div className="h-4 w-16 rounded bg-surface-elevated" />
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="h-20 w-36 rounded-t-full border-4 border-surface-elevated border-b-0" />
        </div>
        <div className="h-3 w-48 rounded bg-surface-elevated mx-auto mt-2" />
      </div>
    );
  }

  // 2. ERROR STATE
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-red-500/30 bg-surface p-4 text-center min-h-[160px]">
        <AlertTriangle className="h-6 w-6 text-red-400 mb-2" strokeWidth={1.75} />
        <h4 className="readout text-xs font-bold uppercase tracking-wider text-foreground mb-1">
          Overtake Forecast Error
        </h4>
        <p className="text-[0.68rem] text-foreground-dim max-w-xs">{error}</p>
      </div>
    );
  }

  // 3. EMPTY STATE
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center rounded border border-border bg-surface p-4 text-center min-h-[160px]">
        <Crosshair className="h-6 w-6 text-foreground-dim mb-2" strokeWidth={1.5} />
        <h4 className="readout text-xs font-bold uppercase tracking-wider text-foreground mb-1">
          No Active Battle in Window
        </h4>
        <p className="text-[0.68rem] text-foreground-dim max-w-xs">
          Overtake probability computes when cars close within 2.0s of each other.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col rounded border border-border bg-surface p-3.5"
      role="region"
      aria-label="Overtake Probability Forecast"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/80 pb-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Gauge className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="readout text-xs font-bold uppercase tracking-wider text-foreground">
            Overtake Forecast
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.drsEligible && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[0.6rem] font-mono font-bold text-emerald-400 uppercase">
              <Zap className="h-2.5 w-2.5" />
              DRS Active
            </span>
          )}
          <span
            className={`rounded px-1.5 py-0.5 text-[0.6rem] font-mono font-bold uppercase ${
              data.confidence === "HIGH"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                : data.confidence === "MEDIUM"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-zinc-700/40 text-foreground-dim border border-zinc-700"
            }`}
          >
            {data.confidence} CONFIDENCE
          </span>
        </div>
      </div>

      {/* Main Content: Gauge and Battle Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
        {/* Semi-Circle SVG Radial Gauge */}
        <div className="flex flex-col items-center justify-center relative">
          <svg viewBox="0 0 160 90" className="w-36 h-20 overflow-visible">
            {/* Background Track Arc */}
            <path
              d="M 25 80 A 55 55 0 0 1 135 80"
              fill="none"
              stroke="var(--color-surface-elevated, #27272a)"
              strokeWidth={10}
              strokeLinecap="round"
            />
            {/* Value Progress Arc */}
            <path
              d="M 25 80 A 55 55 0 0 1 135 80"
              fill="none"
              stroke={probabilityColor}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500 ease-out"
            />
          </svg>

          {/* Centered Percentage Readout */}
          <div className="absolute top-8 flex flex-col items-center">
            <span
              className="font-mono text-2xl font-black tracking-tight"
              style={{ color: probabilityColor }}
            >
              {data.probability}%
            </span>
            <span className="text-[0.55rem] font-mono uppercase tracking-widest text-foreground-faint -mt-0.5">
              Success Chance
            </span>
          </div>
        </div>

        {/* Battle Dynamics Details */}
        <div className="flex flex-col gap-1.5 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border/40 pb-1">
            <span className="text-foreground-dim text-[0.68rem] uppercase">Battle</span>
            <span className="font-bold text-foreground">
              <span className="text-accent">{data.attackerCode}</span> chasing{" "}
              <span className="text-foreground-dim">{data.defenderCode}</span>
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border/40 pb-1">
            <span className="text-foreground-dim text-[0.68rem] uppercase">Interval Gap</span>
            <span className="font-bold text-foreground">+{data.gapSeconds.toFixed(3)}s</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-foreground-dim text-[0.68rem] uppercase">Tyre Delta</span>
            <span className="font-semibold text-foreground">
              {data.tyreAgeDeltaLaps > 0
                ? `+${data.tyreAgeDeltaLaps}L fresher`
                : data.tyreAgeDeltaLaps < 0
                ? `${data.tyreAgeDeltaLaps}L older`
                : "Equal age"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
