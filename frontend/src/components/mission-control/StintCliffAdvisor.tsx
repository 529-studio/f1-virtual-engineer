"use client";

import React from "react";
import {
  TrendingDown,
  RotateCcw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useTyreDegradation } from "@/hooks/useTyreDegradation";

export interface StintCliffAdvisorProps {
  year?: number;
  event?: string;
  driver?: string;
  initialCompound?: string;
  currentStintLaps?: number;
}

export function StintCliffAdvisor({
  year = 2024,
  event = "Italian Grand Prix",
  driver = "LEC",
  initialCompound = "HARD",
  currentStintLaps = 18,
}: StintCliffAdvisorProps) {
  const {
    data,
    status,
    error,
    compound,
    setCompound,
    reload,
  } = useTyreDegradation({
    year,
    event,
    driver,
    compound: initialCompound,
    current_stint_laps: currentStintLaps,
  });

  // 1. Loading Skeleton
  if (status === "loading" && !data) {
    return (
      <div
        className="w-full flex flex-col gap-3 p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 backdrop-blur-md animate-pulse"
        role="status"
        aria-label="Loading tyre degradation advisor"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="h-6 w-60 bg-neutral-800 rounded" />
          <div className="h-9 w-44 bg-neutral-800 rounded" />
        </div>
        <div className="h-56 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
      </div>
    );
  }

  // 2. Error State
  if (status === "error" && !data) {
    return (
      <div
        className="w-full p-5 rounded-xl border border-red-900/60 bg-red-950/20 backdrop-blur-md text-neutral-200"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1">
            <h4 className="text-sm font-mono font-bold text-red-300">
              Tyre Degradation Simulation Error
            </h4>
            <p className="text-xs font-mono text-neutral-400 mt-1">
              {error || "Unable to compute polynomial degradation curve for active compound."}
            </p>
            <button
              onClick={() => reload()}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded bg-red-950 border border-red-800 text-xs font-mono text-red-200 hover:bg-red-900/80 min-h-[46px] min-w-[46px] transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span>Retry Stint Projection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State
  if (!data || data.trajectory.length === 0) {
    return (
      <div className="w-full p-6 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center">
        <Info className="w-6 h-6 text-neutral-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-xs font-mono text-neutral-400">
          No degradation curve models available for {driver} in {event}.
        </p>
      </div>
    );
  }

  // SVG Chart Scaling
  const chartWidth = 560;
  const chartHeight = 160;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 25;

  const maxLap = data.trajectory[data.trajectory.length - 1]?.lap || 40;
  const maxLoss = 3.0; // scale y-axis up to 3.0s loss

  const getX = (lap: number) => padLeft + ((lap - 1) / (maxLap - 1)) * (chartWidth - padLeft - padRight);
  const getY = (loss: number) => padBottom + (1 - Math.min(loss, maxLoss) / maxLoss) * (chartHeight - padTop - padBottom);

  // Generate SVG polyline path
  const curvePoints = data.trajectory
    .map((pt) => `${getX(pt.lap).toFixed(1)},${getY(pt.time_loss_s).toFixed(1)}`)
    .join(" ");

  const pitStartX = getX(data.pit_window_start_lap);
  const pitEndX = getX(data.pit_window_end_lap);
  const currentLapX = getX(data.current_stint_laps);
  const cliffX = getX(data.projected_cliff_lap);

  return (
    <div
      data-testid="stint-cliff-advisor"
      className="w-full flex flex-col gap-4 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Header & Compound Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
            <h2 className="text-sm font-mono font-bold tracking-wide text-neutral-100 uppercase">
              Pirelli Tyre Degradation &amp; Stint Cliff Advisor
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            Driver: {data.driver} • Stint Lap {data.current_stint_laps} • Non-Linear Degradation Curve
          </p>
        </div>

        {/* Compound Selector Buttons (Kiosk Ergonomics >= 44px) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
          {["SOFT", "MEDIUM", "HARD"].map((comp) => {
            const isActive = compound.toUpperCase() === comp;
            return (
              <button
                key={comp}
                onClick={() => setCompound(comp)}
                className={`px-3 py-1.5 rounded text-xs font-mono min-h-[46px] min-w-[46px] inline-flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-emerald-950 text-emerald-200 border border-emerald-600 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                }`}
                aria-pressed={isActive}
                aria-label={`Select ${comp} compound model`}
              >
                {comp}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">PACE LOSS</span>
          <span className="text-base font-bold text-neutral-100 mt-1">
            +{data.current_time_loss_s.toFixed(2)}s/lap
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5">vs fresh tyre</span>
        </div>

        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">PROJECTED CLIFF</span>
          <span className={`text-base font-bold mt-1 ${data.laps_until_cliff <= 3 ? "text-red-400" : "text-amber-300"}`}>
            Lap {data.projected_cliff_lap}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            ({data.laps_until_cliff} laps remaining)
          </span>
        </div>

        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">OPTIMAL PIT BOX</span>
          <span className="text-base font-bold text-sky-300 mt-1">
            L{data.pit_window_start_lap} – L{data.pit_window_end_lap}
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5">optimal corridor</span>
        </div>

        <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400">UNDERCUT GAIN</span>
          <span className="text-base font-bold text-emerald-300 mt-1">
            ~{data.undercut_gain_estimate_s.toFixed(1)}s
          </span>
          <span className="text-[10px] text-neutral-400 mt-0.5">
            {data.overcut_viable ? "overcut viable" : "undercut critical"}
          </span>
        </div>
      </div>

      {/* Degradation Trajectory SVG Chart */}
      <div className="w-full relative bg-neutral-900/30 rounded-xl border border-neutral-800/80 p-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-2">
          <span>Stint Pace Decay Curve (Delta Time)</span>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Pace Loss
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-sky-500/20 border border-sky-500/40 inline-block" /> Pit Window
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-red-400 border-dashed inline-block" /> Cliff Lap
            </span>
          </div>
        </div>

        <div className="w-full aspect-[560/170] max-h-[220px]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full select-none"
            role="img"
            aria-label="Pirelli Tyre Degradation Trajectory Curve Chart"
          >
            <defs>
              <linearGradient id="pitWindowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines */}
            {[0.0, 1.0, 2.0, 3.0].map((val) => (
              <g key={val}>
                <line
                  x1={padLeft}
                  y1={getY(val)}
                  x2={chartWidth - padRight}
                  y2={getY(val)}
                  stroke="#262626"
                  strokeWidth="0.8"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 6}
                  y={getY(val) + 3}
                  textAnchor="end"
                  fill="#737373"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  +{val.toFixed(1)}s
                </text>
              </g>
            ))}

            {/* Pit Window Corridor Highlight */}
            <rect
              x={pitStartX}
              y={padTop}
              width={Math.max(10, pitEndX - pitStartX)}
              height={chartHeight - padTop - padBottom}
              fill="url(#pitWindowGrad)"
              stroke="#0284C7"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />

            {/* Degradation Polyline Curve */}
            <polyline
              points={curvePoints}
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Current Stint Lap Marker */}
            <line
              x1={currentLapX}
              y1={padTop}
              x2={currentLapX}
              y2={chartHeight - padBottom}
              stroke="#38BDF8"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <circle
              cx={currentLapX}
              cy={getY(data.current_time_loss_s)}
              r="4"
              fill="#38BDF8"
              stroke="#0C4A6E"
              strokeWidth="1.5"
            />
            <text
              x={currentLapX}
              y={padTop - 4}
              textAnchor="middle"
              fill="#38BDF8"
              fontSize="7.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              NOW (L{data.current_stint_laps})
            </text>

            {/* Cliff Lap Vertical Marker */}
            <line
              x1={cliffX}
              y1={padTop}
              x2={cliffX}
              y2={chartHeight - padBottom}
              stroke="#EF4444"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <text
              x={cliffX}
              y={padTop - 4}
              textAnchor="middle"
              fill="#EF4444"
              fontSize="7.5"
              fontFamily="monospace"
              fontWeight="bold"
            >
              CLIFF (L{data.projected_cliff_lap})
            </text>

            {/* Bottom X-Axis Ticks */}
            {[1, 10, 20, 30, maxLap].map((lapNum) => (
              <text
                key={lapNum}
                x={getX(lapNum)}
                y={chartHeight - 8}
                textAnchor="middle"
                fill="#737373"
                fontSize="8"
                fontFamily="monospace"
              >
                L{lapNum}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
