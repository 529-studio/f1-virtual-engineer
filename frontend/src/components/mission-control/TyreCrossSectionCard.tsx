"use client";

import React from "react";
import {
  Gauge,
  Layers,
  Flame,
  Activity,
  Compass,
} from "lucide-react";
import type { TyreWheelThermalData } from "@/types/tyre-thermal";
import { TyrePathologyBadges } from "./TyrePathologyBadges";
import { getThermalColor } from "./IsometricTyreCanvas";

export interface TyreCrossSectionCardProps {
  wheelData: TyreWheelThermalData;
}

export function TyreCrossSectionCard({
  wheelData,
}: TyreCrossSectionCardProps) {
  const {
    position,
    compound,
    surface_temp,
    carcass_temp_c,
    bulk_temp_c,
    pressure_psi,
    pressure_status,
    camber_deg,
    camber_bias_c,
  } = wheelData;

  const { inner_c, center_c, outer_c } = surface_temp;
  const surfAvg = Number(((inner_c + center_c + outer_c) / 3).toFixed(1));

  // Graph coordinate mapping (Y axis: 70°C to 135°C, viewBox 340 x 140)
  const minTemp = 70;
  const maxTemp = 135;
  const tempToY = (temp: number) => {
    const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
    const ratio = (clamped - minTemp) / (maxTemp - minTemp);
    return 130 - ratio * 105; // 25 (top) to 130 (bottom)
  };

  const yOptLow = tempToY(95);
  const yOptHigh = tempToY(112);
  const yInner = tempToY(inner_c);
  const yCenter = tempToY(center_c);
  const yOuter = tempToY(outer_c);
  const yCarcass = tempToY(carcass_temp_c);

  // 3 lateral points on X: Inner (55), Center (170), Outer (285)
  const curvePath = `M 55 ${yInner} Q 112 ${(yInner + yCenter) / 2} 170 ${yCenter} Q 228 ${(yCenter + yOuter) / 2} 285 ${yOuter}`;

  // Compound styling
  const compoundColor =
    compound === "SOFT"
      ? "#EF4444"
      : compound === "MEDIUM"
      ? "#EAB308"
      : compound === "HARD"
      ? "#F8FAFC"
      : "#10B981";

  const wheelFullNames: Record<string, string> = {
    FL: "FRONT LEFT",
    FR: "FRONT RIGHT",
    RL: "REAR LEFT",
    RR: "REAR RIGHT",
  };

  return (
    <div className="w-full flex flex-col bg-neutral-950/80 rounded-xl border border-neutral-800/80 p-3 sm:p-4 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: compoundColor }}
          />
          <div>
            <h3 className="text-sm font-mono font-bold text-neutral-100 flex items-center gap-2">
              <span>{wheelFullNames[position] || position}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                {position}
              </span>
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              Pirelli {compound} • Bulk {bulk_temp_c}°C
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono text-neutral-400 block">Core Carcass</span>
          <span
            className="text-base font-mono font-bold"
            style={{ color: getThermalColor(carcass_temp_c) }}
          >
            {carcass_temp_c}°C
          </span>
        </div>
      </div>

      {/* Quick Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3">
        {/* Surface Average */}
        <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 flex flex-col">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-mono">
            <Activity className="w-3.5 h-3.5 text-sky-400" strokeWidth={1.5} />
            <span>Surface Avg</span>
          </div>
          <span className="text-sm font-mono font-bold text-neutral-200 mt-1">
            {surfAvg}°C
          </span>
        </div>

        {/* Camber & Bias */}
        <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 flex flex-col">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-mono">
            <Compass className="w-3.5 h-3.5 text-purple-400" strokeWidth={1.5} />
            <span>Camber Bias</span>
          </div>
          <span className="text-sm font-mono font-bold text-neutral-200 mt-1">
            {camber_deg}° <span className="text-xs text-orange-400">(+{camber_bias_c}°C)</span>
          </span>
        </div>

        {/* Tyre Pressure */}
        <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 flex flex-col">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-mono">
            <Gauge className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
            <span>Pressure</span>
          </div>
          <span className="text-sm font-mono font-bold text-neutral-200 mt-1">
            {pressure_psi} <span className="text-xs text-neutral-400">PSI</span>
          </span>
          <span className="text-[10px] font-mono uppercase text-neutral-400">
            {pressure_status.replace("_", " ")}
          </span>
        </div>

        {/* Core vs Surface Delta */}
        <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800 flex flex-col">
          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] font-mono">
            <Layers className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
            <span>Core Delta</span>
          </div>
          <span
            className={`text-sm font-mono font-bold mt-1 ${
              carcass_temp_c - surfAvg >= 12
                ? "text-red-400 animate-pulse"
                : "text-neutral-200"
            }`}
          >
            +{Number((carcass_temp_c - surfAvg).toFixed(1))}°C
          </span>
        </div>
      </div>

      {/* SVG Lateral Cross-Section Thermal Curve */}
      <div className="w-full bg-neutral-900/40 rounded-lg border border-neutral-800/80 p-2.5 my-1">
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
          <span className="flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" strokeWidth={1.5} />
            Lateral Surface Profile &amp; Core Gradient
          </span>
          <span className="text-emerald-400/90 text-[10px]">Pirelli Window: 95 - 112°C</span>
        </div>

        <div className="w-full aspect-[340/140] relative">
          <svg
            viewBox="0 0 340 140"
            className="w-full h-full select-none"
            role="img"
            aria-label="Lateral Tyre Surface Cross Section Profile"
          >
            {/* Grid Lines */}
            <line x1="40" y1="25" x2="300" y2="25" stroke="#262626" strokeWidth="0.8" />
            <line x1="40" y1="60" x2="300" y2="60" stroke="#262626" strokeWidth="0.8" />
            <line x1="40" y1="95" x2="300" y2="95" stroke="#262626" strokeWidth="0.8" />
            <line x1="40" y1="130" x2="300" y2="130" stroke="#262626" strokeWidth="0.8" />

            {/* Optimal Operating Window Corridor */}
            <rect
              x="40"
              y={yOptHigh}
              width="260"
              height={Math.max(2, yOptLow - yOptHigh)}
              fill="#10B981"
              fillOpacity="0.12"
              stroke="#10B981"
              strokeWidth="0.8"
              strokeDasharray="2 2"
            />
            <text
              x="298"
              y={yOptHigh + 10}
              textAnchor="end"
              fill="#10B981"
              fontSize="8"
              fontFamily="monospace"
              opacity="0.8"
            >
              OPT MAX 112°C
            </text>
            <text
              x="298"
              y={yOptLow - 3}
              textAnchor="end"
              fill="#10B981"
              fontSize="8"
              fontFamily="monospace"
              opacity="0.8"
            >
              OPT MIN 95°C
            </text>

            {/* Carcass Core Reference Line */}
            <line
              x1="40"
              y1={yCarcass}
              x2="300"
              y2={yCarcass}
              stroke="#A855F7"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text
              x="42"
              y={yCarcass - 3}
              fill="#C084FC"
              fontSize="8"
              fontWeight="bold"
              fontFamily="monospace"
            >
              CARCASS CORE: {carcass_temp_c}°C
            </text>

            {/* Surface Temperature Spline */}
            <path
              d={curvePath}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Data Points: Inner, Center, Outer */}
            {/* Inner */}
            <g transform={`translate(55, ${yInner})`}>
              <circle
                r="5"
                fill={getThermalColor(inner_c)}
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="-8"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {inner_c}°
              </text>
            </g>

            {/* Center */}
            <g transform={`translate(170, ${yCenter})`}>
              <circle
                r="5"
                fill={getThermalColor(center_c)}
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="-8"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {center_c}°
              </text>
            </g>

            {/* Outer */}
            <g transform={`translate(285, ${yOuter})`}>
              <circle
                r="5"
                fill={getThermalColor(outer_c)}
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              <text
                x="0"
                y="-8"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="9"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {outer_c}°
              </text>
            </g>

            {/* X Axis Labels */}
            <text x="55" y="138" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
              INNER
            </text>
            <text x="170" y="138" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
              CENTER
            </text>
            <text x="285" y="138" textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="monospace">
              OUTER
            </text>
          </svg>
        </div>
      </div>

      {/* Pathology Alerts & Badges */}
      <div className="mt-2 pt-2 border-t border-neutral-800">
        <TyrePathologyBadges wheelData={wheelData} />
      </div>
    </div>
  );
}
