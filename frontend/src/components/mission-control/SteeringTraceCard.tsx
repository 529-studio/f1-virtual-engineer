"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Gauge, RefreshCw } from "lucide-react";
import type { TelemetryChannel } from "@/services/api";

interface SteeringTraceCardProps {
  steering?: TelemetryChannel;
  speed?: TelemetryChannel;
  isLoading?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function SteeringTraceCard({
  steering,
  speed,
  isLoading = false,
  onRetry,
  className = "",
}: SteeringTraceCardProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const series = useMemo(() => steering?.series ?? [], [steering?.series]);
  const speedSeries = useMemo(() => speed?.series ?? [], [speed?.series]);

  // Oversteer / rapid countersteer detection
  const { oversteerEvents, pathD, maxAngle, minAngle } = useMemo(() => {
    if (!series || series.length < 2) {
      return { oversteerEvents: [], pathD: "", maxAngle: 0, minAngle: 0 };
    }

    const events: Array<{ index: number; delta: number; angle: number }> = [];
    let mx = 0;
    let mn = 0;

    for (let i = 0; i < series.length; i++) {
      const angle = series[i];
      if (angle > mx) mx = angle;
      if (angle < mn) mn = angle;

      if (i > 0) {
        const delta = Math.abs(angle - series[i - 1]);
        const spd = speedSeries[i] ?? 150;
        // High rapid countersteering at racing speed (>100 km/h) with sharp correction (>15 deg)
        if (delta > 15 && spd > 100) {
          events.push({ index: i, delta, angle });
        }
      }
    }

    // Build SVG path
    // Normalise angle to [-120, +120] degree range
    const width = 360;
    const height = 100;
    const padding = 15;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const angleBound = Math.max(Math.abs(mx), Math.abs(mn), 45);

    const getX = (idx: number) =>
      padding + (idx / (series.length - 1)) * plotW;
    const getY = (ang: number) =>
      padding + plotH / 2 - (ang / angleBound) * (plotH / 2);

    let d = "";
    series.forEach((val, i) => {
      const x = getX(i);
      const y = getY(val);
      if (i === 0) d += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      else d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    return {
      oversteerEvents: events,
      pathD: d,
      maxAngle: mx,
      minAngle: mn,
    };
  }, [series, speedSeries]);

  // 1. SKELETON STATE
  if (isLoading) {
    return (
      <div
        className={`flex flex-col rounded-sm border border-border bg-surface p-4 ${className}`}
        aria-busy="true"
        aria-label="Loading steering trace"
      >
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <div className="h-4 w-28 rounded bg-surface-elevated animate-pulse" />
          <div className="h-3 w-16 rounded bg-surface-elevated animate-pulse" />
        </div>
        <div className="flex h-24 items-center justify-center">
          <div className="h-10 w-full rounded border border-dashed border-border/40 animate-pulse" />
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (!series || series.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-sm border border-border bg-surface p-6 text-center ${className}`}
      >
        <Gauge className="h-8 w-8 text-foreground-faint mb-2" strokeWidth={1.5} />
        <h4 className="readout text-xs font-bold uppercase tracking-wider text-foreground">
          Steering Angle Trace
        </h4>
        <p className="mt-1 max-w-xs text-[0.7rem] text-foreground-faint">
          No steering telemetry available for this lap selection.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 flex min-h-[44px] items-center gap-1.5 rounded border border-border bg-surface-elevated px-4 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Trace
          </button>
        )}
      </div>
    );
  }

  const SVG_W = 360;
  const SVG_H = 100;
  const PADDING = 15;
  const plotW = SVG_W - PADDING * 2;
  const plotH = SVG_H - PADDING * 2;
  const angleBound = Math.max(Math.abs(maxAngle), Math.abs(minAngle), 45);
  const midY = PADDING + plotH / 2;

  const currentHoverAngle =
    hoverIndex !== null && series[hoverIndex] !== undefined
      ? series[hoverIndex]
      : null;

  return (
    <div
      className={`relative flex flex-col rounded-sm border border-border bg-surface p-3.5 shadow-sm ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="readout text-xs font-bold uppercase tracking-wider text-foreground">
            Steering Trace
          </span>
          <span className="text-[0.62rem] font-mono text-foreground-faint">
            (±{Math.round(angleBound)}°)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[0.65rem] font-mono">
          {oversteerEvents.length > 0 && (
            <span className="flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-amber-400 font-semibold border border-amber-500/20">
              <AlertTriangle className="h-3 w-3" />
              {oversteerEvents.length} corrections
            </span>
          )}
          <span className="text-foreground-faint">
            Max:{" "}
            <strong className="text-accent font-bold">
              {maxAngle > 0 ? `+${maxAngle.toFixed(0)}°` : `${maxAngle.toFixed(0)}°`} /{" "}
              {minAngle.toFixed(0)}°
            </strong>
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative pt-2">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="w-full h-24 select-none overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = e.clientX - rect.left;
            const frac = Math.max(0, Math.min(1, (relX - PADDING) / plotW));
            const idx = Math.min(series.length - 1, Math.round(frac * (series.length - 1)));
            setHoverIndex(idx);
          }}
        >
          {/* Dead-zone band ([-3 deg, +3 deg]) */}
          <rect
            x={PADDING}
            y={midY - 4}
            width={plotW}
            height={8}
            fill="var(--foreground-faint)"
            opacity="0.08"
          />

          {/* Zero Center Line */}
          <line
            x1={PADDING}
            y1={midY}
            x2={SVG_W - PADDING}
            y2={midY}
            stroke="var(--border)"
            strokeDasharray="2 2"
            strokeWidth="1"
          />
          <text
            x={PADDING - 3}
            y={midY + 3}
            textAnchor="end"
            fontSize="7"
            fontFamily="monospace"
            fill="var(--foreground-faint)"
          >
            0°
          </text>

          {/* Steering Angle Path */}
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.75"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Oversteer Snap Correction Markers */}
          {oversteerEvents.map((ev, i) => {
            const cx = PADDING + (ev.index / (series.length - 1)) * plotW;
            const cy = midY - (ev.angle / angleBound) * (plotH / 2);
            return (
              <g key={i}>
                <circle
                  cx={cx}
                  cy={cy}
                  r="3.5"
                  fill="#f59e0b"
                  opacity="0.9"
                  stroke="var(--background)"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Hover Cursor */}
          {hoverIndex !== null && (
            <g pointerEvents="none">
              <line
                x1={PADDING + (hoverIndex / (series.length - 1)) * plotW}
                y1={PADDING}
                x2={PADDING + (hoverIndex / (series.length - 1)) * plotW}
                y2={SVG_H - PADDING}
                stroke="var(--foreground-dim)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              {currentHoverAngle !== null && (
                <circle
                  cx={PADDING + (hoverIndex / (series.length - 1)) * plotW}
                  cy={midY - (currentHoverAngle / angleBound) * (plotH / 2)}
                  r="4"
                  fill="var(--accent)"
                  stroke="var(--background)"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoverIndex !== null && currentHoverAngle !== null && (
          <div className="pointer-events-none absolute top-1 right-2 rounded border border-border/80 bg-surface-elevated/95 px-2 py-1 text-[0.65rem] font-mono shadow backdrop-blur-sm">
            <span className="text-foreground-faint">Angle: </span>
            <strong
              className={
                currentHoverAngle > 0
                  ? "text-cyan-400 font-bold"
                  : currentHoverAngle < 0
                  ? "text-amber-400 font-bold"
                  : "text-foreground"
              }
            >
              {currentHoverAngle > 0 ? `+${currentHoverAngle.toFixed(1)}°` : `${currentHoverAngle.toFixed(1)}°`}
            </strong>
            {speedSeries[hoverIndex] && (
              <span className="text-foreground-faint pl-2">
                @ {Math.round(speedSeries[hoverIndex])} km/h
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
