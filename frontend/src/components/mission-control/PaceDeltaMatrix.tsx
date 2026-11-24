"use client";

import React from "react";
import {
  Timer,
  RotateCcw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { usePaceDelta } from "@/hooks/usePaceDelta";
import type { SectorStatus } from "@/types/pace-delta";

export interface PaceDeltaMatrixProps {
  year?: number;
  event?: string;
  session?: string;
  initialReferenceDriver?: string;
  lap?: number | null;
}

export function PaceDeltaMatrix({
  year = 2024,
  event = "Italian Grand Prix",
  session = "Race",
  initialReferenceDriver = "LEC",
  lap,
}: PaceDeltaMatrixProps) {
  const {
    data,
    status,
    error,
    referenceDriver,
    setReferenceDriver,
    reload,
  } = usePaceDelta({
    year,
    event,
    session_type: session,
    reference_driver: initialReferenceDriver,
    lap_number: lap ?? undefined,
  });

  // 1. Loading Skeleton State
  if (status === "loading" && !data) {
    return (
      <div
        className="w-full flex flex-col gap-3 p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 backdrop-blur-md animate-pulse"
        role="status"
        aria-label="Loading pace delta matrix"
      >
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="h-6 w-64 bg-neutral-800 rounded" />
          <div className="h-9 w-48 bg-neutral-800 rounded" />
        </div>
        <div className="h-64 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
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
              Pace Delta Engine Failure
            </h4>
            <p className="text-xs font-mono text-neutral-400 mt-1">
              {error || "Unable to compute micro-sector pace splits for the selected stint."}
            </p>
            <button
              onClick={() => reload()}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded bg-red-950 border border-red-800 text-xs font-mono text-red-200 hover:bg-red-900/80 min-h-[46px] min-w-[46px] transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span>Retry Telemetry Calculation</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State
  if (!data || data.drivers.length === 0) {
    return (
      <div className="w-full p-6 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center">
        <Info className="w-6 h-6 text-neutral-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-xs font-mono text-neutral-400">
          No pace telemetry records available for {event}.
        </p>
      </div>
    );
  }

  // Helper for sector status styling
  const renderSectorBadge = (time: number, delta: number, stat: SectorStatus) => {
    let colorClass = "text-neutral-400 bg-neutral-900/80 border-neutral-800";
    if (stat === "session_fastest") {
      colorClass = "text-purple-300 bg-purple-950/80 border-purple-700/80 font-bold";
    } else if (stat === "personal_best" || delta < -0.01) {
      colorClass = "text-emerald-300 bg-emerald-950/80 border-emerald-700/80";
    } else if (stat === "reference") {
      colorClass = "text-sky-300 bg-sky-950/80 border-sky-700/80";
    } else if (delta > 0.05) {
      colorClass = "text-amber-300 bg-amber-950/60 border-amber-900/60";
    }

    const deltaSign = delta > 0 ? `+${delta.toFixed(3)}` : delta.toFixed(3);

    return (
      <div className={`flex flex-col items-center justify-center py-1 px-2 rounded border text-xs font-mono ${colorClass}`}>
        <span>{time.toFixed(3)}s</span>
        <span className="text-[10px] opacity-80">
          {stat === "reference" ? "REF" : deltaSign}
        </span>
      </div>
    );
  };

  return (
    <div
      data-testid="pace-delta-matrix"
      className="w-full flex flex-col gap-4 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Header & Benchmark Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
            <h2 className="text-sm font-mono font-bold tracking-wide text-neutral-100 uppercase">
              Multi-Driver Pace Delta Matrix &amp; Sector Splits
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            Lap {data.lap_number} • Benchmark: {data.reference_driver} • FastF1 Telemetry
          </p>
        </div>

        {/* Benchmark Selector Pills (Kiosk ergonomics >= 44px) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
          <span className="text-[11px] font-mono text-neutral-400 px-2 py-1">REF:</span>
          {["LEC", "VER", "PIA", "NOR", "HAM"].map((code) => {
            const isActive = referenceDriver.toUpperCase() === code;
            return (
              <button
                key={code}
                onClick={() => setReferenceDriver(code)}
                className={`px-3 py-1.5 rounded text-xs font-mono min-h-[46px] min-w-[46px] inline-flex items-center justify-center transition-colors ${
                  isActive
                    ? "bg-sky-950 text-sky-200 border border-sky-600 font-semibold"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                }`}
                aria-pressed={isActive}
                aria-label={`Set reference baseline to ${code}`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session Bests Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="flex items-center justify-between p-2 rounded bg-neutral-900/60 border border-neutral-800">
          <span className="text-neutral-400">BEST S1:</span>
          <span className="text-purple-300 font-bold">{data.session_best_s1.toFixed(3)}s</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded bg-neutral-900/60 border border-neutral-800">
          <span className="text-neutral-400">BEST S2:</span>
          <span className="text-purple-300 font-bold">{data.session_best_s2.toFixed(3)}s</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded bg-neutral-900/60 border border-neutral-800">
          <span className="text-neutral-400">BEST S3:</span>
          <span className="text-purple-300 font-bold">{data.session_best_s3.toFixed(3)}s</span>
        </div>
        <div className="flex items-center justify-between p-2 rounded bg-neutral-900/60 border border-neutral-800">
          <span className="text-neutral-400">BEST LAP:</span>
          <span className="text-purple-300 font-bold">{data.session_best_lap.toFixed(3)}s</span>
        </div>
      </div>

      {/* Responsive Matrix Table with Horizontal Scroll Container */}
      <div className="w-full overflow-x-auto mc-scroll">
        <table className="w-full border-collapse text-left text-xs font-mono whitespace-nowrap min-w-[700px]">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/40">
              <th className="py-2.5 px-3">POS</th>
              <th className="py-2.5 px-3">DRIVER</th>
              <th className="py-2.5 px-3">TYRE</th>
              <th className="py-2.5 px-3 text-center">SECTOR 1</th>
              <th className="py-2.5 px-3 text-center">SECTOR 2</th>
              <th className="py-2.5 px-3 text-center">SECTOR 3</th>
              <th className="py-2.5 px-3 text-right">LAP TIME</th>
              <th className="py-2.5 px-3 text-right">DELTA</th>
              <th className="py-2.5 px-3 text-right">SPEED TRAP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {data.drivers.map((d) => {
              const isReference = d.driver_code.toUpperCase() === referenceDriver.toUpperCase();
              const lapDeltaSign = d.lap_delta_s > 0 ? `+${d.lap_delta_s.toFixed(3)}` : d.lap_delta_s.toFixed(3);

              return (
                <tr
                  key={d.driver_code}
                  className={`hover:bg-neutral-900/40 transition-colors ${
                    isReference ? "bg-sky-950/20" : ""
                  }`}
                >
                  <td className="py-3 px-3 font-bold text-neutral-300">P{d.position}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-4 rounded-full"
                        style={{ backgroundColor: d.team_color }}
                      />
                      <span className="font-bold text-neutral-100">{d.driver_code}</span>
                      <span className="text-neutral-400 hidden sm:inline text-[11px]">{d.driver_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-neutral-300">{d.compound}</span>
                    <span className="text-[10px] text-neutral-400 ml-1">({d.tyre_age_laps}L)</span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {renderSectorBadge(d.s1.time_s, d.s1.delta_s, d.s1.status)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {renderSectorBadge(d.s2.time_s, d.s2.delta_s, d.s2.status)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {renderSectorBadge(d.s3.time_s, d.s3.delta_s, d.s3.status)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-neutral-100">
                    {d.lap_time_s.toFixed(3)}s
                  </td>
                  <td className="py-3 px-3 text-right">
                    {isReference ? (
                      <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700/60 text-sky-300 font-bold">
                        REF
                      </span>
                    ) : (
                      <span
                        className={`font-semibold ${
                          d.lap_delta_s < 0 ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {lapDeltaSign}s
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right text-neutral-300 font-mono">
                    {d.speed_trap_kmh.toFixed(1)} km/h
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
