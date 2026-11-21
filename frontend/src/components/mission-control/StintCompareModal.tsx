"use client";

import { useEffect, useState, useId, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  Layers,
  RefreshCw,
  Timer,
  X,
} from "lucide-react";
import type { StintCompareResponse } from "@/types/telemetry-advanced";
import { formatLapTime } from "./TelemetryChart";

interface StintCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  event: string;
  session: string;
  driver: string;
  currentLap?: number | string;
  totalLaps?: number;
  onFetchStint: (params: {
    year: number;
    event: string;
    session_type: string;
    driver: string;
    lap1: number;
    lap2: number;
  }) => Promise<StintCompareResponse | null>;
  isLoading: boolean;
  error: string | null;
  data: StintCompareResponse | null;
}

export function StintCompareModal({
  isOpen,
  onClose,
  year,
  event,
  session,
  driver,
  currentLap,
  totalLaps = 53,
  onFetchStint,
  isLoading,
  error,
  data,
}: StintCompareModalProps) {
  const lap1SelectId = useId();
  const lap2SelectId = useId();

  const defaultLap2 = useMemo(() => {
    const cur = Number(currentLap);
    return !isNaN(cur) && cur > 1 ? cur : Math.min(35, totalLaps > 35 ? 35 : totalLaps);
  }, [currentLap, totalLaps]);

  const defaultLap1 = useMemo(() => {
    return Math.max(1, Math.round(defaultLap2 / 3));
  }, [defaultLap2]);

  const [customLap1, setCustomLap1] = useState<number | null>(null);
  const [customLap2, setCustomLap2] = useState<number | null>(null);

  const lap1 = customLap1 ?? defaultLap1;
  const lap2 = customLap2 ?? defaultLap2;

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleRunCompare = () => {
    onFetchStint({
      year,
      event,
      session_type: session,
      driver,
      lap1,
      lap2,
    });
  };

  if (!isOpen) return null;

  // Chart dimensions
  const SVG_W = 600;
  const SVG_H = 160;
  const PAD = 25;
  const plotW = SVG_W - PAD * 2;
  const plotH = SVG_H - PAD * 2;

  // Render Speed Overlay Paths
  const renderSpeedPaths = () => {
    if (!data || !data.distance || data.distance.length < 2) return null;
    const maxDist = data.distance[data.distance.length - 1] || 1;
    const maxSpeed = 360;

    const getX = (d: number) => PAD + (d / maxDist) * plotW;
    const getY = (s: number) => PAD + plotH - (s / maxSpeed) * plotH;

    let path1 = "";
    let path2 = "";

    data.distance.forEach((dist, i) => {
      const x = getX(dist);
      const y1 = getY(data.lap1_speed[i] ?? 0);
      const y2 = getY(data.lap2_speed[i] ?? 0);

      if (i === 0) {
        path1 += `M ${x.toFixed(1)} ${y1.toFixed(1)}`;
        path2 += `M ${x.toFixed(1)} ${y2.toFixed(1)}`;
      } else {
        path1 += ` L ${x.toFixed(1)} ${y1.toFixed(1)}`;
        path2 += ` L ${x.toFixed(1)} ${y2.toFixed(1)}`;
      }
    });

    return (
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-36 select-none overflow-visible"
      >
        {/* Horizontal grid lines */}
        {[100, 200, 300].map((spd) => (
          <g key={spd}>
            <line
              x1={PAD}
              y1={getY(spd)}
              x2={SVG_W - PAD}
              y2={getY(spd)}
              stroke="var(--border)"
              strokeDasharray="2 2"
              strokeWidth="0.75"
            />
            <text
              x={PAD - 4}
              y={getY(spd) + 3}
              textAnchor="end"
              fontSize="8"
              fontFamily="monospace"
              fill="var(--foreground-faint)"
            >
              {spd}
            </text>
          </g>
        ))}

        {/* Lap 1 Speed (Cyan) */}
        <path
          d={path1}
          fill="none"
          stroke="#06b6d4"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />

        {/* Lap 2 Speed (Amber) */}
        <path
          d={path2}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  // Render Cumulative Delta Time Curve
  const renderDeltaCurve = () => {
    if (!data || !data.cumulative_time_delta_s || data.cumulative_time_delta_s.length < 2)
      return null;
    const maxDist = data.distance[data.distance.length - 1] || 1;
    const deltas = data.cumulative_time_delta_s;

    const maxAbsDelta = Math.max(
      ...deltas.map((d) => Math.abs(d)),
      1.0
    );

    const getX = (d: number) => PAD + (d / maxDist) * plotW;
    const midY = PAD + plotH / 2;
    const getY = (dt: number) => midY - (dt / maxAbsDelta) * (plotH / 2);

    let path = "";
    deltas.forEach((dt, i) => {
      const x = getX(data.distance[i] ?? 0);
      const y = getY(dt);
      if (i === 0) path += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      else path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    return (
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full h-32 select-none overflow-visible"
      >
        {/* Zero Delta Line */}
        <line
          x1={PAD}
          y1={midY}
          x2={SVG_W - PAD}
          y2={midY}
          stroke="var(--border)"
          strokeWidth="1"
        />
        <text
          x={PAD - 4}
          y={midY + 3}
          textAnchor="end"
          fontSize="8"
          fontFamily="monospace"
          fill="var(--foreground-faint)"
        >
          0.0s
        </text>

        {/* Dynamic Delta Path */}
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stint-compare-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface-elevated px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-accent" strokeWidth={1.75} />
            <div>
              <h3
                id="stint-compare-title"
                className="readout text-sm font-bold uppercase tracking-wider text-foreground"
              >
                Multi-Lap Stint Comparison
              </h3>
              <p className="text-[0.65rem] font-mono text-foreground-faint">
                {driver} · {event} {year} [{session}]
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded border border-border/80 text-foreground-faint hover:border-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close Stint Comparison"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lap Selectors Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-surface/80 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor={lap1SelectId} className="text-xs font-mono font-bold text-cyan-400">
                Lap A:
              </label>
              <select
                id={lap1SelectId}
                value={lap1}
                onChange={(e) => setCustomLap1(Number(e.target.value))}
                className="h-11 rounded border border-border bg-surface-elevated px-3 py-1 font-mono text-xs text-foreground focus:border-accent focus:outline-none"
              >
                {Array.from({ length: totalLaps }, (_, i) => i + 1).map((lp) => (
                  <option key={lp} value={lp}>
                    Lap {lp}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor={lap2SelectId} className="text-xs font-mono font-bold text-amber-400">
                Lap B:
              </label>
              <select
                id={lap2SelectId}
                value={lap2}
                onChange={(e) => setCustomLap2(Number(e.target.value))}
                className="h-11 rounded border border-border bg-surface-elevated px-3 py-1 font-mono text-xs text-foreground focus:border-accent focus:outline-none"
              >
                {Array.from({ length: totalLaps }, (_, i) => i + 1).map((lp) => (
                  <option key={lp} value={lp}>
                    Lap {lp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunCompare}
            disabled={isLoading || lap1 === lap2}
            className="flex min-h-[44px] items-center gap-2 rounded bg-accent px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-background hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 transition-all cursor-pointer"
          >
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            Compare Delta
          </button>
        </div>

        {/* Modal Body / Visualization */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* SKELETON */}
          {isLoading && (
            <div className="space-y-4 py-8" aria-busy="true">
              <div className="h-16 w-full rounded bg-surface-elevated animate-pulse" />
              <div className="h-36 w-full rounded bg-surface-elevated animate-pulse" />
              <div className="h-32 w-full rounded bg-surface-elevated animate-pulse" />
            </div>
          )}

          {/* ERROR */}
          {!isLoading && error && (
            <div className="rounded border border-rose-500/30 bg-rose-500/10 p-4 text-center">
              <AlertCircle className="mx-auto h-6 w-6 text-rose-400 mb-2" />
              <p className="text-xs font-mono text-rose-400 font-semibold">{error}</p>
              <button
                type="button"
                onClick={handleRunCompare}
                className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded border border-rose-400/40 px-3 py-1.5 text-xs font-mono text-rose-300 hover:bg-rose-500/20"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Stint Comparison
              </button>
            </div>
          )}

          {/* EMPTY */}
          {!isLoading && !error && !data && (
            <div className="py-12 text-center text-foreground-faint">
              <Timer className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs font-mono">
                Select two distinct laps and click &ldquo;Compare Delta&rdquo; to analyze tire degradation and time loss across stints.
              </p>
            </div>
          )}

          {/* SUCCESS CONTENT */}
          {!isLoading && !error && data && (
            <div className="space-y-4">
              {/* Lap Time Summary Card */}
              <div className="grid grid-cols-3 gap-3 rounded border border-border/80 bg-surface-elevated p-3 text-center font-mono">
                <div className="border-r border-border/60 pr-2">
                  <span className="text-[0.62rem] text-cyan-400 font-bold uppercase">
                    Lap {data.lap1}
                  </span>
                  <div className="text-sm font-bold text-foreground">
                    {data.lap1_time_s ? formatLapTime(data.lap1_time_s) : "—"}
                  </div>
                </div>
                <div className="border-r border-border/60 px-2">
                  <span className="text-[0.62rem] text-amber-400 font-bold uppercase">
                    Lap {data.lap2}
                  </span>
                  <div className="text-sm font-bold text-foreground">
                    {data.lap2_time_s ? formatLapTime(data.lap2_time_s) : "—"}
                  </div>
                </div>
                <div className="pl-2">
                  <span className="text-[0.62rem] text-foreground-faint font-bold uppercase">
                    Net Delta
                  </span>
                  <div
                    className={`text-sm font-bold ${
                      (data.net_time_delta_s ?? 0) > 0
                        ? "text-rose-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {data.net_time_delta_s != null
                      ? `${data.net_time_delta_s > 0 ? "+" : ""}${data.net_time_delta_s.toFixed(3)}s`
                      : "—"}
                  </div>
                </div>
              </div>

              {/* Speed Comparison Overlay */}
              <div className="rounded border border-border/80 bg-surface p-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                  <span className="readout text-xs font-bold uppercase text-foreground">
                    Speed Overlay (km/h)
                  </span>
                  <div className="flex items-center gap-3 text-[0.65rem] font-mono">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      Lap {data.lap1}
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Lap {data.lap2}
                    </span>
                  </div>
                </div>
                <div className="pt-2">{renderSpeedPaths()}</div>
              </div>

              {/* Cumulative Time Delta Curve */}
              <div className="rounded border border-border/80 bg-surface p-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                  <span className="readout text-xs font-bold uppercase text-foreground">
                    Continuous Cumulative Delta (Δt seconds)
                  </span>
                  <span className="text-[0.65rem] font-mono text-accent">
                    {data.distance.length} Sample Points
                  </span>
                </div>
                <div className="pt-2">{renderDeltaCurve()}</div>
                <p className="mt-1 text-[0.6rem] font-mono text-foreground-faint text-right">
                  Positive values denote Lap {data.lap2} losing time relative to Lap {data.lap1}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
