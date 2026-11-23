"use client";

import React from "react";
import {
  Layers,
  Activity,
  AlertTriangle,
  RotateCcw,
  Flame,
  Info,
} from "lucide-react";
import { useTyreThermal } from "@/hooks/useTyreThermal";
import type { WheelPosition } from "@/types/tyre-thermal";
import { IsometricTyreCanvas } from "./IsometricTyreCanvas";
import { TyreCrossSectionCard } from "./TyreCrossSectionCard";

export interface TyreThermalHeatmapProps {
  year: number;
  event: string;
  session: string;
  driver: string;
  lap?: number | null;
}

export function TyreThermalHeatmap({
  year,
  event,
  session,
  driver,
  lap,
}: TyreThermalHeatmapProps) {
  const {
    data,
    selectedWheel,
    viewMode,
    status,
    error,
    setSelectedWheel,
    setViewMode,
    reload,
  } = useTyreThermal({
    year,
    event,
    session_type: session,
    driver,
    lap_number: lap ?? undefined,
  });

  // 1. Loading Skeleton State
  if (status === "loading" && !data) {
    return (
      <div
        className="w-full flex flex-col gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 backdrop-blur-md animate-pulse"
        role="status"
        aria-label="Loading tyre thermal matrix"
      >
        <div className="flex items-center justify-between">
          <div className="h-6 w-52 bg-neutral-800 rounded" />
          <div className="h-9 w-40 bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 h-72 sm:h-80 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
          <div className="lg:col-span-5 h-72 sm:h-80 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
        </div>
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
              Tyre Thermal Engine Error
            </h4>
            <p className="text-xs font-mono text-neutral-400 mt-1">
              {error || "Failed to retrieve thermodynamic profile for current stint."}
            </p>
            <button
              onClick={() => reload()}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded bg-red-950 border border-red-800 text-xs font-mono text-red-200 hover:bg-red-900/80 min-h-[44px] min-w-[44px] transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span>Retry Thermal Simulation</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty / Idle State
  if (!data || Object.keys(data.wheels).length === 0) {
    return (
      <div className="w-full p-6 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center">
        <Info className="w-6 h-6 text-neutral-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-xs font-mono text-neutral-400">
          No thermodynamic telemetry available for {driver || "driver"} in {event || "this event"}.
        </p>
      </div>
    );
  }

  const selectedWheelData = data.wheels[selectedWheel] || data.wheels["FL"];
  const wheelsList: WheelPosition[] = ["FL", "FR", "RL", "RR"];

  return (
    <div
      data-testid="tyre-thermal-heatmap"
      className="w-full flex flex-col gap-4 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" strokeWidth={1.75} />
            <h2 className="text-sm font-mono font-bold tracking-wide text-neutral-100 uppercase">
              Tyre Thermal Surface Degradation &amp; Carcass 3D Heatmap
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            Lap {data.lap_number} • Stint Lap {data.stint_laps} • Camber &amp; Hysteresis Matrix
          </p>
        </div>

        {/* View Mode Toggle Controls (Kiosk ergonomics: >= 44px) */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setViewMode("surface")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono min-h-[46px] min-w-[46px] transition-colors ${
              viewMode === "surface"
                ? "bg-sky-950 text-sky-200 border border-sky-600 font-semibold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            aria-pressed={viewMode === "surface"}
          >
            <Activity className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
            <span>Surface</span>
          </button>
          <button
            onClick={() => setViewMode("cutaway")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono min-h-[46px] min-w-[46px] transition-colors ${
              viewMode === "cutaway"
                ? "bg-purple-950 text-purple-200 border border-purple-600 font-semibold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
            aria-pressed={viewMode === "cutaway"}
          >
            <Layers className="w-4 h-4 text-purple-400" strokeWidth={1.75} />
            <span>Carcass Cutaway</span>
          </button>
        </div>
      </div>

      {/* Wheel Fast-Selector Bar (Mobile/Tablet accessibility >= 44px) */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <span className="text-xs font-mono text-neutral-500 uppercase shrink-0">Wheel:</span>
        <div className="flex items-center gap-2">
          {wheelsList.map((pos) => {
            const isSel = selectedWheel === pos;
            const wData = data.wheels[pos];
            return (
              <button
                key={pos}
                onClick={() => setSelectedWheel(pos)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono min-h-[46px] min-w-[46px] border transition-all ${
                  isSel
                    ? "bg-neutral-800 text-cyan-300 border-cyan-500 font-bold shadow-md shadow-cyan-950/40"
                    : "bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:bg-neutral-850 hover:text-neutral-200"
                }`}
                aria-pressed={isSel}
                aria-label={`Select tyre ${pos}`}
              >
                <span>{pos}</span>
                {wData && (
                  <span className="text-[11px] text-neutral-400">
                    ({wData.bulk_temp_c}°C)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Responsive Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: 3D Isometric SVG Chassis Canvas */}
        <div className="lg:col-span-7 w-full overflow-hidden">
          <IsometricTyreCanvas
            wheels={data.wheels}
            selectedWheel={selectedWheel}
            onSelectWheel={setSelectedWheel}
            viewMode={viewMode}
          />
        </div>

        {/* Right: Selected Tyre Cross-Section Profile & Diagnostics */}
        <div className="lg:col-span-5 w-full overflow-hidden">
          <TyreCrossSectionCard wheelData={selectedWheelData} />
        </div>
      </div>
    </div>
  );
}
