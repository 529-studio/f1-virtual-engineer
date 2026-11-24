"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  Activity,
  TrendingDown,
  TrendingUp,
  GitCompare,
} from "lucide-react";

export interface GhostLapOverlayProps {
  year?: number;
  event?: string;
  session?: string;
  initialDriver1?: string;
  initialDriver2?: string;
  lap?: number | null;
}

interface TelemetryPoint {
  distance_m: number;
  speed_d1: number;
  speed_d2: number;
  throttle_d1: number;
  throttle_d2: number;
  brake_d1: number;
  brake_d2: number;
  delta_s: number;
  corner?: string;
}

const DRIVER_COLORS: Record<string, string> = {
  LEC: "#E80020",
  VER: "#3671C6",
  PIA: "#FF8000",
  NOR: "#FF8000",
  HAM: "#27F4D2",
  RUS: "#27F4D2",
  SAI: "#E80020",
};

// Generates high-fidelity Monza 5793m telemetry fixture between 2 drivers
function generateGhostLapFixture(d1: string, d2: string): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const trackLength = 5793;
  const numSamples = 60;

  // Major corners at Monza
  const corners: Record<number, string> = {
    8: "T1 Rettifilo",
    12: "T2 Rettifilo",
    20: "T3 Curva Grande",
    28: "T4 Roggia",
    32: "T5 Roggia",
    38: "T6 Lesmo 1",
    43: "T7 Lesmo 2",
    48: "T8 Ascari",
    51: "T10 Ascari",
    57: "T11 Parabolica",
  };

  let cumulativeDelta = 0.0;
  const d1Seed = (d1.charCodeAt(0) % 3) * 0.5;
  const d2Seed = (d2.charCodeAt(0) % 3) * 0.5;

  for (let i = 0; i <= numSamples; i++) {
    const dist = Math.round((i / numSamples) * trackLength);
    const cornerName = corners[i];

    // Speed curve simulation: heavy braking at chicanes, high speed on straights
    let baseSpeed = 330;
    let throttle1 = 100;
    let throttle2 = 100;
    let brake1 = 0;
    let brake2 = 0;

    if (i >= 7 && i <= 12) {
      // T1-T2 Chicane
      baseSpeed = 75 + (i - 7) * 8;
      throttle1 = i > 10 ? 60 : 0;
      throttle2 = i > 10 ? 55 : 0;
      brake1 = i < 10 ? 100 : 0;
      brake2 = i < 10 ? 95 : 0;
    } else if (i >= 26 && i <= 32) {
      // T4-T5 Roggia
      baseSpeed = 110 + (i - 26) * 12;
      throttle1 = i > 30 ? 70 : 0;
      throttle2 = i > 30 ? 75 : 0;
      brake1 = i < 30 ? 90 : 0;
      brake2 = i < 30 ? 85 : 0;
    } else if (i >= 47 && i <= 52) {
      // Ascari Chicane
      baseSpeed = 160 + (i - 47) * 15;
      throttle1 = 50 + (i - 47) * 10;
      throttle2 = 45 + (i - 47) * 10;
      brake1 = i === 47 ? 70 : 0;
      brake2 = i === 47 ? 80 : 0;
    } else if (i >= 56 && i <= 58) {
      // Parabolica Entry
      baseSpeed = 185;
      throttle1 = 45;
      throttle2 = 50;
      brake1 = i === 56 ? 60 : 0;
      brake2 = i === 56 ? 55 : 0;
    } else {
      // Straights acceleration
      baseSpeed = Math.min(352, 220 + ((i % 15) / 15) * 130);
    }

    const d1Offset = d1Seed + Math.sin(i * 0.4) * 4.5;
    const d2Offset = d2Seed + Math.cos(i * 0.4) * 3.8;

    const speed1 = Math.round(baseSpeed + d1Offset);
    const speed2 = Math.round(baseSpeed + d2Offset);

    // Delta progression
    const stepDelta = (speed2 - speed1) * 0.0012;
    cumulativeDelta = Math.round((cumulativeDelta + stepDelta) * 1000) / 1000;

    points.push({
      distance_m: dist,
      speed_d1: speed1,
      speed_d2: speed2,
      throttle_d1: throttle1,
      throttle_d2: throttle2,
      brake_d1: brake1,
      brake_d2: brake2,
      delta_s: cumulativeDelta,
      corner: cornerName,
    });
  }

  return points;
}

export function GhostLapOverlay({
  year = 2024,
  event = "Italian Grand Prix",
  session = "Race",
  initialDriver1 = "LEC",
  initialDriver2 = "PIA",
  lap = 15,
}: GhostLapOverlayProps) {
  const [driver1, setDriver1] = useState(initialDriver1);
  const [driver2, setDriver2] = useState(initialDriver2);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const telemetry = useMemo(
    () => generateGhostLapFixture(driver1, driver2),
    [driver1, driver2]
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (x - 45) / (rect.width - 65)));
    const idx = Math.round(ratio * (telemetry.length - 1));
    setHoverIndex(idx);
  }, [telemetry.length]);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const d1Color = DRIVER_COLORS[driver1] || "#E80020";
  const d2Color = DRIVER_COLORS[driver2] || "#FF8000";

  // SVG Chart Metrics
  const chartWidth = 600;
  const chartHeight = 210;
  const padLeft = 45;
  const padRight = 20;
  const trackW = chartWidth - padLeft - padRight;

  const speedY = (spd: number) => 15 + (1 - (spd - 50) / 310) * 110;
  const deltaY = (dlt: number) => 165 - (dlt / 1.5) * 35;

  const speed1Points = telemetry
    .map((pt, i) => `${(padLeft + (i / (telemetry.length - 1)) * trackW).toFixed(1)},${speedY(pt.speed_d1).toFixed(1)}`)
    .join(" ");

  const speed2Points = telemetry
    .map((pt, i) => `${(padLeft + (i / (telemetry.length - 1)) * trackW).toFixed(1)},${speedY(pt.speed_d2).toFixed(1)}`)
    .join(" ");

  const deltaPoints = telemetry
    .map((pt, i) => `${(padLeft + (i / (telemetry.length - 1)) * trackW).toFixed(1)},${deltaY(pt.delta_s).toFixed(1)}`)
    .join(" ");

  const activeSample = hoverIndex !== null ? telemetry[hoverIndex] : telemetry[Math.floor(telemetry.length / 2)];
  const activeX = hoverIndex !== null
    ? padLeft + (hoverIndex / (telemetry.length - 1)) * trackW
    : padLeft + 0.5 * trackW;

  return (
    <div
      ref={containerRef}
      data-testid="ghost-lap-overlay"
      className="w-full flex flex-col gap-4 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Header & Driver Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
            <h2 className="text-sm font-mono font-bold tracking-wide text-neutral-100 uppercase">
              Head-to-Head Ghost Lap Telemetry Trace Overlay
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            {year} {event} • {session} • Lap {lap} • Synchronized Speed &amp; Time Delta Curves
          </p>
        </div>

        {/* Driver Selection Controls (Kiosk ergonomics >= 44px) */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Driver 1 Selector */}
          <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
            <span className="text-[10px] font-mono text-neutral-400 px-1">D1:</span>
            {["LEC", "VER", "HAM"].map((code) => (
              <button
                key={code}
                onClick={() => setDriver1(code)}
                className={`px-2.5 py-1.5 rounded text-xs font-mono min-h-[46px] min-w-[46px] inline-flex items-center justify-center transition-colors ${
                  driver1 === code
                    ? "bg-sky-950 text-sky-200 border border-sky-600 font-bold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
                aria-pressed={driver1 === code}
                aria-label={`Select ${code} as Driver 1 reference`}
              >
                {code}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-neutral-500 font-bold">VS</span>

          {/* Driver 2 Selector */}
          <div className="flex items-center gap-1 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800">
            <span className="text-[10px] font-mono text-neutral-400 px-1">D2:</span>
            {["PIA", "NOR", "RUS"].map((code) => (
              <button
                key={code}
                onClick={() => setDriver2(code)}
                className={`px-2.5 py-1.5 rounded text-xs font-mono min-h-[46px] min-w-[46px] inline-flex items-center justify-center transition-colors ${
                  driver2 === code
                    ? "bg-amber-950 text-amber-200 border border-amber-600 font-bold"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
                aria-pressed={driver2 === code}
                aria-label={`Select ${code} as Driver 2 comparison`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Instantaneous Scrubber Readout Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
          <div>
            <span className="text-neutral-400 block text-[10px]">DISTANCE &amp; TURN</span>
            <span className="font-bold text-neutral-100">
              {activeSample.distance_m}m {activeSample.corner ? `(${activeSample.corner})` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d1Color }} />
          <div>
            <span className="text-neutral-400 block text-[10px]">{driver1} SPEED</span>
            <span className="font-bold text-neutral-100">{activeSample.speed_d1} km/h</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d2Color }} />
          <div>
            <span className="text-neutral-400 block text-[10px]">{driver2} SPEED</span>
            <span className="font-bold text-neutral-100">{activeSample.speed_d2} km/h</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeSample.delta_s <= 0 ? (
            <TrendingDown className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
          ) : (
            <TrendingUp className="w-4 h-4 text-red-400" strokeWidth={1.75} />
          )}
          <div>
            <span className="text-neutral-400 block text-[10px]">CUMULATIVE GAP</span>
            <span
              className={`font-bold ${
                activeSample.delta_s <= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {activeSample.delta_s > 0 ? `+${activeSample.delta_s.toFixed(3)}s` : `${activeSample.delta_s.toFixed(3)}s`} ({activeSample.delta_s <= 0 ? driver1 : driver2} ahead)
            </span>
          </div>
        </div>
      </div>

      {/* Dual Telemetry Trace SVG Canvas */}
      <div className="w-full relative bg-neutral-900/30 rounded-xl border border-neutral-800/80 p-2 sm:p-3">
        <div className="w-full aspect-[600/210] max-h-[280px]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full select-none cursor-crosshair"
            role="img"
            aria-label="Head-to-Head Ghost Lap Telemetry Trace Overlay Canvas"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Speed Gridlines */}
            {[100, 200, 300].map((spd) => (
              <g key={spd}>
                <line
                  x1={padLeft}
                  y1={speedY(spd)}
                  x2={chartWidth - padRight}
                  y2={speedY(spd)}
                  stroke="#262626"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                <text
                  x={padLeft - 6}
                  y={speedY(spd) + 3}
                  textAnchor="end"
                  fill="#737373"
                  fontSize="7.5"
                  fontFamily="monospace"
                >
                  {spd}
                </text>
              </g>
            ))}

            {/* Delta Neutral Zero Baseline */}
            <line
              x1={padLeft}
              y1={deltaY(0)}
              x2={chartWidth - padRight}
              y2={deltaY(0)}
              stroke="#404040"
              strokeWidth="1"
            />
            <text
              x={padLeft - 6}
              y={deltaY(0) + 3}
              textAnchor="end"
              fill="#0EA5E9"
              fontSize="7"
              fontFamily="monospace"
              fontWeight="bold"
            >
              0.0s
            </text>

            {/* Corner Datum Lines */}
            {telemetry.map((pt, i) => {
              if (!pt.corner) return null;
              const cx = padLeft + (i / (telemetry.length - 1)) * trackW;
              return (
                <g key={i}>
                  <line
                    x1={cx}
                    y1={15}
                    x2={cx}
                    y2={chartHeight - 20}
                    stroke="#334155"
                    strokeWidth="0.75"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <text
                    x={cx}
                    y={12}
                    textAnchor="middle"
                    fill="#38BDF8"
                    fontSize="6.5"
                    fontFamily="monospace"
                    opacity="0.8"
                  >
                    {pt.corner.split(" ")[0]}
                  </text>
                </g>
              );
            })}

            {/* Driver 2 (Comparison) Speed Polyline */}
            <polyline
              points={speed2Points}
              fill="none"
              stroke={d2Color}
              strokeWidth="1.8"
              strokeDasharray="4 2"
              opacity="0.85"
            />

            {/* Driver 1 (Reference) Speed Polyline */}
            <polyline
              points={speed1Points}
              fill="none"
              stroke={d1Color}
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Cumulative Delta Polyline */}
            <polyline
              points={deltaPoints}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.6"
            />

            {/* Interactive Vertical Cursor Line */}
            <line
              x1={activeX}
              y1={15}
              x2={activeX}
              y2={chartHeight - 20}
              stroke="#F59E0B"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <circle
              cx={activeX}
              cy={speedY(activeSample.speed_d1)}
              r="3.5"
              fill={d1Color}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
            <circle
              cx={activeX}
              cy={speedY(activeSample.speed_d2)}
              r="3.5"
              fill={d2Color}
              stroke="#FFFFFF"
              strokeWidth="1"
            />

            {/* Bottom Distance Axis Labels */}
            {[0, 1500, 3000, 4500, 5793].map((m) => (
              <text
                key={m}
                x={padLeft + (m / 5793) * trackW}
                y={chartHeight - 6}
                textAnchor="middle"
                fill="#737373"
                fontSize="7.5"
                fontFamily="monospace"
              >
                {m}m
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
