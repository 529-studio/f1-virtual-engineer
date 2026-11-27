"use client";

import React from "react";
import {
  AlertTriangle,
  Gauge,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Wind,
  Zap,
} from "lucide-react";
import { useDrsEfficiency } from "@/hooks/useDrsEfficiency";
import type { WingTrim } from "@/types/drs";

export interface DrsOptimizerCardProps {
  year?: number;
  event?: string;
  session?: string;
  driver?: string;
  compareDriver?: string | null;
}

const TRIM_OPTIONS: { id: WingTrim; label: string; short: string }[] = [
  { id: "LOW_DRAG", label: "Low Drag", short: "LOW DRAG" },
  { id: "BALANCED", label: "Balanced", short: "BALANCED" },
  { id: "HIGH_DOWNFORCE", label: "High Downforce", short: "HIGH DF" },
];

export function DrsOptimizerCard({
  year = 2024,
  event = "Italian Grand Prix",
  session = "R",
  driver = "LEC",
  compareDriver = "PIA",
}: DrsOptimizerCardProps) {
  const {
    data,
    status,
    error,
    wingTrim,
    dragLevel,
    setWingTrim,
    setDragLevel,
    reload,
  } = useDrsEfficiency({
    year,
    event,
    session,
    driver,
    compareDriver,
  });

  // 1. Skeleton State
  if (status === "loading" && !data) {
    return (
      <div
        data-testid="drs-optimizer-skeleton"
        className="w-full flex flex-col gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 backdrop-blur-md animate-pulse"
        role="status"
        aria-label="Loading DRS efficiency optimizer"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="h-5 w-60 bg-neutral-800 rounded" />
          <div className="h-10 w-56 bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-neutral-900/60 rounded-lg border border-neutral-800" />
          ))}
        </div>
      </div>
    );
  }

  // 2. Error State (with >= 46px Retry CTA)
  if (status === "error" && !data) {
    return (
      <div
        data-testid="drs-optimizer-error"
        className="w-full p-5 rounded-xl border border-red-900/60 bg-red-950/20 backdrop-blur-md text-neutral-200"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-mono font-bold text-red-300">
              DRS Aero Efficiency Model Error
            </h4>
            <p className="text-xs font-mono text-neutral-400 mt-1 break-words leading-snug">
              {error || "Unable to compute DRS speed delta and drag trade-off profile."}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded bg-red-950 border border-red-800 text-xs font-mono text-red-200 hover:bg-red-900/80 min-h-[46px] min-w-[46px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span>Retry Aero Model</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const zones = data?.zones ?? [];

  // 3. Empty State
  if (!data || zones.length === 0) {
    return (
      <div
        data-testid="drs-optimizer-empty"
        className="w-full p-6 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center"
      >
        <Info className="w-6 h-6 text-neutral-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-xs font-mono text-neutral-400 break-words leading-snug">
          No DRS activation zone telemetry available for {driver || "driver"} at {event || "this circuit"}.
        </p>
      </div>
    );
  }

  const speedTrapDiff =
    data.speed_trap_compare_kmh != null
      ? data.speed_trap_primary_kmh - data.speed_trap_compare_kmh
      : null;

  return (
    <section
      data-testid="drs-optimizer-card"
      aria-label="DRS Zone Efficiency and Top Speed Trap Optimizer"
      className="w-full flex flex-col gap-4 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Header & Wing Trim Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-400 shrink-0" strokeWidth={1.75} />
            <h2 className="text-sm font-mono font-bold tracking-wide text-neutral-100 uppercase break-words leading-snug">
              DRS Zone Efficiency &amp; Top Speed Trap Optimizer
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-0.5 break-words leading-snug">
            {data.year} {data.event} · {data.driver}
            {data.compare_driver ? ` vs ${data.compare_driver}` : ""} · Target Trim:{" "}
            {data.recommended_trim.replace("_", " ")}
          </p>
        </div>

        {/* Wing Trim Buttons (Kiosk ergonomics >= 46px) */}
        <div
          role="group"
          aria-label="Rear Wing Trim Presets"
          className="flex flex-wrap items-center gap-1.5 self-start md:self-auto bg-neutral-900/90 p-1 rounded-lg border border-neutral-800"
        >
          {TRIM_OPTIONS.map((opt) => {
            const isActive = wingTrim === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWingTrim(opt.id)}
                disabled={status === "loading"}
                aria-pressed={isActive}
                className={`inline-flex items-center justify-center px-3 py-2 rounded text-xs font-mono min-h-[46px] min-w-[46px] transition-colors cursor-pointer ${
                  isActive
                    ? "bg-cyan-950 text-cyan-200 border border-cyan-500 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                }`}
              >
                {opt.short}
              </button>
            );
          })}
        </div>
      </div>

      {data.fallback && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-mono text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="break-words leading-snug">
            {data.fallback_reason || "Estimated aerodynamic drag model active."}
          </span>
        </div>
      )}

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">SPEED TRAP ({data.driver})</span>
          <span className="text-base font-bold text-neutral-100 mt-1">
            {data.speed_trap_primary_kmh.toFixed(1)} km/h
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 break-words leading-snug">
            {speedTrapDiff !== null
              ? `${speedTrapDiff >= 0 ? "+" : ""}${speedTrapDiff.toFixed(1)} km/h vs ${data.compare_driver}`
              : "Peak trap velocity"}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">AVG DRS GAIN</span>
          <span className="text-base font-bold text-emerald-300 mt-1">
            +{data.avg_drs_gain_kmh.toFixed(1)} km/h
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 break-words leading-snug">
            Flap open boost
          </span>
        </div>

        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">LAP TIME SAVED</span>
          <span className="text-base font-bold text-cyan-300 mt-1">
            -{data.total_lap_gain_s.toFixed(3)}s
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 break-words leading-snug">
            Across {zones.length} DRS zone{zones.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">AERO INDEX</span>
          <span className="text-base font-bold text-neutral-100 mt-1">
            {data.aero_efficiency_index.toFixed(1)} / 100
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5 break-words leading-snug">
            Rec: {data.recommended_trim.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Drag vs Downforce Trade-Off Slider (Kiosk >= 44px) */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <span className="inline-flex items-center gap-1.5 text-neutral-200 font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" strokeWidth={1.75} />
            Rear-Wing Drag vs Downforce Trim
          </span>
          <span className="text-cyan-300 font-bold">
            Load {dragLevel}% ({wingTrim.replace("_", " ")})
          </span>
        </div>

        <div className="flex min-h-[44px] items-center gap-3 px-1">
          <span className="text-[10px] font-mono text-neutral-400 shrink-0">0% Low Drag</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={dragLevel}
            onChange={(e) => setDragLevel(Number(e.target.value))}
            aria-label="Rear wing drag level slider"
            className="h-3 flex-1 cursor-pointer accent-cyan-400"
          />
          <span className="text-[10px] font-mono text-neutral-400 shrink-0">100% High DF</span>
        </div>

        <p className="text-[11px] font-mono text-neutral-400 break-words leading-snug">
          {data.recommendation_reason}
        </p>
      </div>

      {/* Per-Zone DRS Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {zones.map((zone) => {
          const openRatio = Math.min(100, Math.max(15, (zone.drs_open_speed_kmh / 365) * 100));
          const closedRatio = Math.min(100, Math.max(10, (zone.drs_closed_speed_kmh / 365) * 100));

          return (
            <div
              key={zone.zone_id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5 space-y-2.5 font-mono"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.75} />
                    <span className="text-xs font-bold text-neutral-100 break-words leading-snug">
                      {zone.zone_id}: {zone.zone_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Zone Span: {zone.distance_range_m}
                  </span>
                </div>
                <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-300 shrink-0">
                  +{zone.speed_delta_kmh.toFixed(1)} km/h
                </span>
              </div>

              {/* Dual Speed Bar Comparison */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between text-neutral-400">
                  <span>DRS Closed</span>
                  <span className="font-semibold text-neutral-200">
                    {zone.drs_closed_speed_kmh.toFixed(1)} km/h
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded bg-neutral-400 transition-all"
                    style={{ width: `${closedRatio}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-cyan-300 pt-1">
                  <span>DRS Open</span>
                  <span className="font-bold">
                    {zone.drs_open_speed_kmh.toFixed(1)} km/h
                  </span>
                </div>
                <div className="h-2 w-full rounded bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full rounded bg-cyan-400 transition-all"
                    style={{ width: `${openRatio}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/70 text-[10px] text-neutral-400">
                <span className="inline-flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-neutral-500" strokeWidth={1.5} />
                  Activation: {zone.activation_rate_pct.toFixed(0)}%
                </span>
                <span className="text-emerald-400 font-semibold">
                  Gain: -{zone.time_gain_s.toFixed(3)}s
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
