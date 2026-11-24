"use client";

import { useMemo } from "react";
import type { RadarCell } from "@/types/weather-radar";

interface WeatherRadarCanvasProps {
  cells: RadarCell[];
  windDirectionDeg: number;
  windSpeedKmh: number;
  trackImpact: boolean;
  timeOffsetMin: number;
}

// Convert dBZ to authentic Doppler radar reflectivity colors
function getDbzColor(dbz: number): string {
  if (dbz >= 48) return "#ef4444"; // Red / Torrential
  if (dbz >= 38) return "#f59e0b"; // Amber / Heavy
  if (dbz >= 28) return "#10b981"; // Emerald / Moderate
  if (dbz >= 18) return "#06b6d4"; // Cyan / Light
  return "#3b82f6"; // Blue / Trace
}

export function WeatherRadarCanvas({
  cells,
  windDirectionDeg,
  windSpeedKmh,
  trackImpact,
  timeOffsetMin,
}: WeatherRadarCanvasProps) {
  const center = 140;
  const kmToPx = 5.6; // 20km = 112px radius, leaving 28px border margin

  // Wind vector arrow endpoint
  const windRad = useMemo(() => (windDirectionDeg * Math.PI) / 180, [windDirectionDeg]);
  const windArrowX = center + 120 * Math.sin(windRad);
  const windArrowY = center - 120 * Math.cos(windRad);

  return (
    <div
      className="relative flex flex-col items-center justify-center p-2 rounded-xl bg-neutral-950/80 border border-neutral-800 shadow-2xl backdrop-blur-md select-none"
      data-testid="weather-radar-canvas"
    >
      <svg
        viewBox="0 0 280 280"
        className="w-full max-w-[280px] h-auto aspect-square overflow-visible"
        aria-label="Doppler Weather Radar Scan"
      >
        <defs>
          {/* Subtle radar cloud blur filter */}
          <filter id="radar-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Rotating radar sweep gradient */}
          <linearGradient id="sweep-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Radar Dome Background */}
        <circle cx={center} cy={center} r={128} fill="#05080f" stroke="#1e293b" strokeWidth="1.5" />

        {/* Concentric Range Rings (5km, 10km, 15km, 20km) */}
        {[5, 10, 15, 20].map((km) => (
          <g key={km}>
            <circle
              cx={center}
              cy={center}
              r={km * kmToPx}
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray={km === 20 ? "none" : "3 3"}
            />
            <text
              x={center + 3}
              y={center - km * kmToPx + 10}
              className="fill-neutral-500 font-mono text-[8px]"
            >
              {km}km
            </text>
          </g>
        ))}

        {/* Crosshair Axes (N-S, E-W) */}
        <line x1={center} y1={12} x2={center} y2={268} stroke="#1e293b" strokeWidth="1" />
        <line x1={12} y1={center} x2={268} y2={center} stroke="#1e293b" strokeWidth="1" />

        {/* Cardinal Directions */}
        <text x={center} y={22} textAnchor="middle" className="fill-neutral-400 font-mono text-[9px] font-bold">N</text>
        <text x={center} y={266} textAnchor="middle" className="fill-neutral-500 font-mono text-[9px]">S</text>
        <text x={266} y={center + 3} textAnchor="end" className="fill-neutral-500 font-mono text-[9px]">E</text>
        <text x={14} y={center + 3} textAnchor="start" className="fill-neutral-500 font-mono text-[9px]">W</text>

        {/* Rotating Radar Sweep Line */}
        <g className="origin-center animate-[spin_6s_linear_infinite]">
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - 128}
            stroke="#22d3ee"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <path
            d={`M ${center} ${center} L ${center - 45} ${center - 120} A 128 128 0 0 1 ${center} ${center - 128} Z`}
            fill="url(#sweep-grad)"
          />
        </g>

        {/* Precipitation Cloud Cells */}
        <g filter="url(#radar-blur)">
          {cells.map((cell, idx) => {
            const cx = center + cell.x * kmToPx;
            const cy = center - cell.y * kmToPx;
            const rPx = Math.max(12, cell.radius_km * kmToPx);
            const color = getDbzColor(cell.intensity_dbz);
            return (
              <g key={`cell-${idx}`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={rPx}
                  fill={color}
                  fillOpacity="0.45"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={rPx * 0.55}
                  fill={color}
                  fillOpacity="0.75"
                />
              </g>
            );
          })}
        </g>

        {/* Circuit Footprint at Center (0,0) */}
        <circle
          cx={center}
          cy={center}
          r={trackImpact ? 8 : 6}
          fill={trackImpact ? "#ef4444" : "#22d3ee"}
          fillOpacity={trackImpact ? "0.9" : "0.7"}
          stroke="#ffffff"
          strokeWidth="1.5"
          className={trackImpact ? "animate-ping" : ""}
        />
        <circle
          cx={center}
          cy={center}
          r={4}
          fill={trackImpact ? "#f87171" : "#ffffff"}
        />

        {/* Wind Vector Pointer on Perimeter */}
        <g>
          <line
            x1={center}
            y1={center}
            x2={windArrowX}
            y2={windArrowY}
            stroke="#94a3b8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle cx={windArrowX} cy={windArrowY} r={3} fill="#38bdf8" />
        </g>
      </svg>

      {/* Floating Radar Metadata Overlay */}
      <div className="absolute top-3 left-3 flex flex-col gap-0.5 pointer-events-none">
        <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">
          DOPPLER 25KM
        </span>
        <span className="text-[9px] font-mono text-neutral-400">
          T+{timeOffsetMin}m {timeOffsetMin === 0 ? "(LIVE)" : "PROJECTION"}
        </span>
      </div>

      <div className="absolute bottom-3 right-3 text-right pointer-events-none">
        <span className="text-[9px] font-mono text-neutral-400 block">
          WIND: {Math.round(windSpeedKmh)} km/h
        </span>
        <span className="text-[8px] font-mono text-neutral-500 block">
          DIR: {Math.round(windDirectionDeg)}°
        </span>
      </div>

      {/* Track Impact Alert */}
      {trackImpact && (
        <div
          data-testid="track-impact-banner"
          className="absolute bottom-3 left-3 bg-red-950/90 border border-red-500/60 px-2 py-0.5 rounded text-[9px] font-mono text-red-200 font-bold tracking-wider shadow-lg animate-pulse"
        >
          TRACK IMPACT DETECTED
        </div>
      )}
    </div>
  );
}
