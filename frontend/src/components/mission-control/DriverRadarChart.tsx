"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Gauge,
  Info,
  Radar,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { useDriverPerformance } from "@/hooks/useDriverPerformance";
import type { DriverRadarAxis, NormalizationMode } from "@/types/performance";

export interface DriverRadarChartProps {
  year?: number;
  event?: string;
  session?: string;
  driver?: string;
  compareDriver?: string | null;
}

const SVG_W = 460;
const SVG_H = 340;
const CX = 230;
const CY = 170;
const MAX_R = 88;
const LABEL_R = 124;

function polarPoint(index: number, total: number, radius: number): { x: number; y: number } {
  // Start at top (-PI/2) and step clockwise
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;
  return {
    x: CX + radius * Math.cos(angle),
    y: CY + radius * Math.sin(angle),
  };
}

function buildPolygonPoints(axes: DriverRadarAxis[]): string {
  return axes
    .map((axis, idx) => {
      const r = (Math.max(0, Math.min(100, axis.score)) / 100) * MAX_R;
      const pt = polarPoint(idx, axes.length, r);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(" ");
}

export function DriverRadarChart({
  year = 2024,
  event = "Italian Grand Prix",
  session = "R",
  driver = "LEC",
  compareDriver = "PIA",
}: DriverRadarChartProps) {
  const { data, status, error, mode, setMode, reload } = useDriverPerformance({
    year,
    event,
    session,
    driver,
    compareDriver,
  });

  const [selectedAxisKey, setSelectedAxisKey] = useState<string>("braking");

  // 1. Skeleton Loading State
  if (status === "loading" && !data) {
    return (
      <div
        data-testid="driver-radar-skeleton"
        className="w-full flex flex-col gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 backdrop-blur-md animate-pulse"
        role="status"
        aria-label="Loading driver performance radar"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="h-5 w-56 bg-neutral-800 rounded" />
          <div className="h-10 w-52 bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 h-72 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
          <div className="lg:col-span-6 h-72 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
        </div>
      </div>
    );
  }

  // 2. Error State (with >= 46px Retry CTA)
  if (status === "error" && !data) {
    return (
      <div
        data-testid="driver-radar-error"
        className="w-full p-5 rounded-xl border border-red-900/60 bg-red-950/20 backdrop-blur-md text-neutral-200"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-mono font-bold text-red-300">
              Driver Performance Radar Error
            </h4>
            <p className="text-xs font-mono text-neutral-400 mt-1 break-words leading-snug">
              {error || "Unable to compute 6-axis telemetry radar profile."}
            </p>
            <button
              type="button"
              onClick={reload}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded bg-red-950 border border-red-800 text-xs font-mono text-red-200 hover:bg-red-900/80 min-h-[46px] min-w-[46px] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span>Retry Performance Radar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State
  if (!data || !data.primary || (data.primary.axes || []).length === 0) {
    return (
      <div
        data-testid="driver-radar-empty"
        className="w-full p-6 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center"
      >
        <Info className="w-6 h-6 text-neutral-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-xs font-mono text-neutral-400 break-words leading-snug">
          No telemetry radar metrics available for {driver || "driver"} in {event || "this session"}.
        </p>
      </div>
    );
  }

  const primary = data.primary;
  const compare = data.compare ?? null;
  const primaryAxes = primary.axes || [];
  const compareAxes = compare?.axes || [];

  const activeAxis =
    primaryAxes.find((a) => a.key === selectedAxisKey) ?? primaryAxes[0];
  const compareAxis = compareAxes.find((a) => a.key === activeAxis.key) ?? null;

  const primaryColor = primary.team_color || "#E80020";
  const compareColor = compare?.team_color || "#38BDF8";

  const modes: { id: NormalizationMode; label: string }[] = [
    { id: "session_relative", label: "Session-Relative" },
    { id: "historic_benchmark", label: "Historic Benchmark" },
  ];

  return (
    <section
      data-testid="driver-radar-chart"
      aria-label="Driver Telemetry 6-Axis Performance Radar"
      className="w-full flex flex-col gap-4 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Header & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-accent shrink-0" strokeWidth={1.75} />
            <h2 className="text-sm font-mono font-bold tracking-wide text-neutral-100 uppercase break-words leading-snug">
              Driver Telemetry 6-Axis Performance Radar
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-0.5 break-words leading-snug">
            {data.year} {data.event} · {data.session} ·{" "}
            {mode === "session_relative" ? "Normalized vs Session Field" : "Normalized vs F1 Era Benchmark"}
          </p>
        </div>

        {/* Normalization Mode Toggle (Kiosk ergonomics >= 46px) */}
        <div
          role="group"
          aria-label="Normalization Mode"
          className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-900/90 p-1 rounded-lg border border-neutral-800"
        >
          {modes.map((m) => {
            const isActive = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                disabled={status === "loading"}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono min-h-[46px] min-w-[46px] transition-colors cursor-pointer ${
                  isActive
                    ? "bg-accent/20 text-accent border border-accent font-semibold"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fallback Banner if FastF1 telemetry unavailable */}
      {data.fallback && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-mono text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span className="break-words leading-snug">
            {data.fallback_reason || "Estimated baseline telemetry profile active."}
          </span>
        </div>
      )}

      {/* Main Content: SVG Spider Graph + Axis Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left: Hexagonal SVG Spider Chart */}
        <div className="lg:col-span-6 w-full flex flex-col items-center bg-neutral-900/30 rounded-xl border border-neutral-800/80 p-2 sm:p-3">
          {/* Driver Legend Pills */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 mb-1 border-b border-neutral-800/60 text-xs font-mono">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 font-bold text-neutral-100">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                {primary.driver_code} ({primary.overall_score.toFixed(1)})
              </span>
              {compare && (
                <span className="inline-flex items-center gap-1.5 font-bold text-neutral-300">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: compareColor }} />
                  {compare.driver_code} ({compare.overall_score.toFixed(1)})
                </span>
              )}
            </div>
            <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
              Scale 0–100
            </span>
          </div>

          <div className="w-full max-w-[460px] aspect-[460/340]">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="w-full h-full select-none"
              role="img"
              aria-label={`6-Axis Telemetry Radar for ${primary.driver_code}${compare ? ` vs ${compare.driver_code}` : ""}`}
            >
              {/* Concentric Hexagonal Webs (20, 40, 60, 80, 100%) */}
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac) => {
                const ringPts = primaryAxes
                  .map((_, i) => {
                    const p = polarPoint(i, primaryAxes.length, MAX_R * frac);
                    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                  })
                  .join(" ");
                return (
                  <polygon
                    key={frac}
                    points={ringPts}
                    fill="none"
                    stroke={frac === 1.0 ? "#404040" : "#262626"}
                    strokeWidth={frac === 1.0 ? "1.2" : "0.8"}
                    strokeDasharray={frac < 1.0 ? "2 2" : undefined}
                  />
                );
              })}

              {/* Radial Spokes & Vertex Labels */}
              {primaryAxes.map((axis, i) => {
                const outer = polarPoint(i, primaryAxes.length, MAX_R);
                const labelPt = polarPoint(i, primaryAxes.length, LABEL_R);
                const isSelected = axis.key === activeAxis.key;
                const textAnchor =
                  Math.abs(labelPt.x - CX) < 12
                    ? "middle"
                    : labelPt.x > CX
                    ? "start"
                    : "end";

                return (
                  <g key={axis.key}>
                    <line
                      x1={CX}
                      y1={CY}
                      x2={outer.x}
                      y2={outer.y}
                      stroke={isSelected ? "#38BDF8" : "#262626"}
                      strokeWidth={isSelected ? "1.4" : "0.8"}
                    />
                    <text
                      x={labelPt.x}
                      y={labelPt.y}
                      textAnchor={textAnchor}
                      dominantBaseline="middle"
                      fill={isSelected ? "#38BDF8" : "#A3A3A3"}
                      fontSize="11"
                      fontWeight={isSelected ? "bold" : "normal"}
                      fontFamily="monospace"
                    >
                      {axis.label}
                    </text>
                  </g>
                );
              })}

              {/* Compare Driver Polygon */}
              {compare && compareAxes.length === 6 && (
                <polygon
                  points={buildPolygonPoints(compareAxes)}
                  fill={compareColor}
                  fillOpacity="0.18"
                  stroke={compareColor}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                />
              )}

              {/* Primary Driver Polygon */}
              <polygon
                points={buildPolygonPoints(primaryAxes)}
                fill={primaryColor}
                fillOpacity="0.26"
                stroke={primaryColor}
                strokeWidth="2.4"
              />

              {/* Interactive Vertex Score Nodes */}
              {primaryAxes.map((axis, i) => {
                const r = (axis.score / 100) * MAX_R;
                const pt = polarPoint(i, primaryAxes.length, r);
                const isSelected = axis.key === activeAxis.key;
                return (
                  <circle
                    key={`pt-${axis.key}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 5.5 : 4}
                    fill={primaryColor}
                    stroke="#FFFFFF"
                    strokeWidth={isSelected ? 2 : 1.2}
                    className="cursor-pointer"
                    onClick={() => setSelectedAxisKey(axis.key)}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Axis Breakdown Grid & Active Inspector */}
        <div className="lg:col-span-6 w-full flex flex-col gap-3">
          {/* Active Axis Telemetry Detail Card */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-400 shrink-0" strokeWidth={1.75} />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-100">
                  {activeAxis.label}
                </span>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                Ref: {activeAxis.benchmark_value}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono pt-1">
              <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-2.5">
                <div className="text-neutral-400 text-[10px] uppercase">{primary.driver_code} Score</div>
                <div className="text-lg font-bold text-neutral-100 mt-0.5">
                  {activeAxis.score.toFixed(1)} <span className="text-xs text-neutral-500">/ 100</span>
                </div>
                <div className="text-[11px] text-neutral-400 break-words leading-snug">
                  Telemetry: {activeAxis.raw_value}
                </div>
              </div>

              {compare && compareAxis ? (
                <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-2.5">
                  <div className="text-neutral-400 text-[10px] uppercase">{compare.driver_code} Score</div>
                  <div className="text-lg font-bold text-neutral-100 mt-0.5">
                    {compareAxis.score.toFixed(1)} <span className="text-xs text-neutral-500">/ 100</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 break-words leading-snug">
                    Telemetry: {compareAxis.raw_value}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-neutral-800 bg-neutral-950/40 p-2.5 flex items-center">
                  <span className="text-[11px] text-neutral-500 break-words leading-snug">
                    Select a compare driver above to overlay head-to-head telemetry delta.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 6-Axis Interactive Selector Grid (No line-clamp, >= 46px targets) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {primaryAxes.map((axis) => {
              const comp = compareAxes.find((c) => c.key === axis.key);
              const isSelected = axis.key === activeAxis.key;
              const delta = comp ? axis.score - comp.score : null;

              return (
                <button
                  key={axis.key}
                  type="button"
                  onClick={() => setSelectedAxisKey(axis.key)}
                  aria-pressed={isSelected}
                  className={`flex flex-col justify-between rounded-lg border p-2.5 text-left font-mono min-h-[46px] min-w-[46px] transition-colors cursor-pointer ${
                    isSelected
                      ? "border-sky-500 bg-sky-950/30"
                      : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-neutral-200 break-words leading-snug">
                      {axis.label}
                    </span>
                    <span className="text-xs font-bold text-neutral-100 shrink-0">
                      {axis.score.toFixed(0)}
                    </span>
                  </div>
                  <div className="mt-1 flex w-full items-center justify-between text-[10px] text-neutral-400">
                    <span className="break-words leading-snug">{axis.raw_value}</span>
                    {delta !== null && (
                      <span
                        className={`font-bold shrink-0 ${
                          delta >= 0 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
