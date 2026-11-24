"use client";

import React, { useId } from "react";
import type {
  TyreViewMode,
  TyreWheelThermalData,
  WheelPosition,
} from "@/types/tyre-thermal";
import { F1ChassisBlueprint } from "./F1ChassisBlueprint";

export function getThermalColor(tempC: number): string {
  if (tempC < 85) return "#38BDF8"; // Cold Sky Blue
  if (tempC < 95) return "#2DD4BF"; // Teal Warm-up
  if (tempC <= 112) return "#10B981"; // Optimal Emerald Green
  if (tempC <= 125) return "#F59E0B"; // Warm Amber
  return "#EF4444"; // Overheat / Blistering Crimson Red
}

export interface IsometricTyreCanvasProps {
  wheels: Record<WheelPosition, TyreWheelThermalData>;
  selectedWheel: WheelPosition;
  onSelectWheel: (pos: WheelPosition) => void;
  viewMode: TyreViewMode;
}

interface TyreLayoutConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  isLeft: boolean; // Left tyres: inner shoulder is on right; Right tyres: inner shoulder is on left
}

const WHEEL_LAYOUTS: Record<WheelPosition, TyreLayoutConfig> = {
  FL: { x: 130, y: 75, width: 84, height: 110, label: "Front Left", isLeft: true },
  FR: { x: 470, y: 75, width: 84, height: 110, label: "Front Right", isLeft: false },
  RL: { x: 110, y: 250, width: 94, height: 120, label: "Rear Left", isLeft: true },
  RR: { x: 490, y: 250, width: 94, height: 120, label: "Rear Right", isLeft: false },
};

export function IsometricTyreCanvas({
  wheels,
  selectedWheel,
  onSelectWheel,
  viewMode,
}: IsometricTyreCanvasProps) {
  const maskId = useId();

  return (
    <div className="w-full relative flex flex-col items-center bg-neutral-950/80 rounded-xl border border-neutral-800/80 p-3 sm:p-4 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Top Header & Status */}
      <div className="w-full flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-mono font-medium tracking-wider text-neutral-400 uppercase">
            3D Chassis Thermal Matrix
          </span>
        </div>
        <div className="text-xs font-mono text-neutral-400 flex items-center gap-2">
          <span className="text-neutral-500">Mode:</span>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
              viewMode === "cutaway"
                ? "bg-purple-950/80 text-purple-300 border border-purple-700/60"
                : "bg-sky-950/80 text-sky-300 border border-sky-700/60"
            }`}
          >
            {viewMode === "cutaway" ? "CARCASS CUTAWAY" : "SURFACE TREAD"}
          </span>
        </div>
      </div>

      {/* SVG Isometric Canvas */}
      <div className="w-full max-w-[620px] aspect-[600/410] relative">
        <svg
          viewBox="0 0 600 410"
          className="w-full h-full select-none"
          role="img"
          aria-label="3D Isometric Tyre Thermal Degradation Canvas"
        >
          <defs>
            {/* Ambient drop shadow */}
            <filter id={`shadow-${maskId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#000000" floodOpacity="0.7" />
            </filter>

            {/* Glowing active outline filter */}
            <filter id={`glow-${maskId}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Carcass Core Radial Gradient */}
            <radialGradient id={`core-grad-${maskId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
            </radialGradient>
          </defs>

          {/* Next-Gen 2026 F1 Chassis CAD Engineering Blueprint */}
          <F1ChassisBlueprint
            showStreamlines={true}
            showLabels={true}
            opacity={0.92}
          />

          {/* 4 Wheels Rendering */}
          {(Object.keys(WHEEL_LAYOUTS) as WheelPosition[]).map((pos) => {
            const layout = WHEEL_LAYOUTS[pos];
            const data = wheels[pos];
            if (!data) return null;

            const isSelected = selectedWheel === pos;
            const wX = layout.x - layout.width / 2;
            const wY = layout.y - layout.height / 2;
            const bandWidth = layout.width / 3;

            // Zone temperature mapping:
            // For left-side wheels (FL, RL): Inner shoulder is on RIGHT side (towards chassis center)
            // For right-side wheels (FR, RR): Inner shoulder is on LEFT side (towards chassis center)
            const leftZoneTemp = layout.isLeft ? data.surface_temp.outer_c : data.surface_temp.inner_c;
            const centerZoneTemp = data.surface_temp.center_c;
            const rightZoneTemp = layout.isLeft ? data.surface_temp.inner_c : data.surface_temp.outer_c;

            const leftColor = getThermalColor(leftZoneTemp);
            const centerColor = getThermalColor(centerZoneTemp);
            const rightColor = getThermalColor(rightZoneTemp);
            const carcassColor = getThermalColor(data.carcass_temp_c);

            return (
              <g
                key={pos}
                id={`wheel-group-${pos}`}
                className="cursor-pointer transition-all duration-200 outline-none focus:outline-none"
                onClick={() => onSelectWheel(pos)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectWheel(pos);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`Select ${layout.label} (${pos}) tyre telemetry`}
              >
                {/* Active Selection Glow Ring */}
                {isSelected && (
                  <rect
                    x={wX - 8}
                    y={wY - 8}
                    width={layout.width + 16}
                    height={layout.height + 16}
                    rx="14"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                    className="animate-pulse"
                    filter={`url(#glow-${maskId})`}
                  />
                )}

                {/* Wheel Base Drop Shadow */}
                <rect
                  x={wX + 3}
                  y={wY + 6}
                  width={layout.width}
                  height={layout.height}
                  rx="10"
                  fill="#000000"
                  opacity="0.6"
                />

                {/* Normal Surface 3 Lateral Bands */}
                <g opacity={viewMode === "cutaway" ? 0.35 : 1.0}>
                  {/* Left Band (Outer on Left Tyres; Inner on Right Tyres) */}
                  <path
                    d={`M ${wX + 8} ${wY} L ${wX + bandWidth} ${wY} L ${wX + bandWidth} ${wY + layout.height} L ${wX + 8} ${wY + layout.height} A 8 8 0 0 1 ${wX} ${wY + layout.height - 8} L ${wX} ${wY + 8} A 8 8 0 0 1 ${wX + 8} ${wY} Z`}
                    fill={leftColor}
                    stroke="#1E293B"
                    strokeWidth="1"
                  />

                  {/* Center Band */}
                  <rect
                    x={wX + bandWidth}
                    y={wY}
                    width={bandWidth}
                    height={layout.height}
                    fill={centerColor}
                    stroke="#1E293B"
                    strokeWidth="1"
                  />

                  {/* Right Band (Inner on Left Tyres; Outer on Right Tyres) */}
                  <path
                    d={`M ${wX + bandWidth * 2} ${wY} L ${wX + layout.width - 8} ${wY} A 8 8 0 0 1 ${wX + layout.width} ${wY + 8} L ${wX + layout.width} ${wY + layout.height - 8} A 8 8 0 0 1 ${wX + layout.width - 8} ${wY + layout.height} L ${wX + bandWidth * 2} ${wY + layout.height} Z`}
                    fill={rightColor}
                    stroke="#1E293B"
                    strokeWidth="1"
                  />

                  {/* Tread Grooves / Micro-ribs for automotive aesthetic */}
                  <line
                    x1={wX + bandWidth}
                    y1={wY + 2}
                    x2={wX + bandWidth}
                    y2={wY + layout.height - 2}
                    stroke="#0F172A"
                    strokeWidth="1.2"
                  />
                  <line
                    x1={wX + bandWidth * 2}
                    y1={wY + 2}
                    x2={wX + bandWidth * 2}
                    y2={wY + layout.height - 2}
                    stroke="#0F172A"
                    strokeWidth="1.2"
                  />
                </g>

                {/* Carcass Cutaway Mode Overlay */}
                {viewMode === "cutaway" && (
                  <g className="transition-opacity duration-300">
                    {/* Semi-transparent protective casing */}
                    <rect
                      x={wX}
                      y={wY}
                      width={layout.width}
                      height={layout.height}
                      rx="10"
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />

                    {/* Carcass Core Deep Hotspot */}
                    <ellipse
                      cx={layout.x}
                      cy={layout.y}
                      rx={layout.width * 0.34}
                      ry={layout.height * 0.32}
                      fill={carcassColor}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      filter={`url(#glow-${maskId})`}
                    />

                    {/* Inner core temperature readout */}
                    <text
                      x={layout.x}
                      y={layout.y + 4}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="12"
                      fontWeight="bold"
                      fontFamily="monospace"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                    >
                      {data.carcass_temp_c}°C
                    </text>
                    <text
                      x={layout.x}
                      y={layout.y + 18}
                      textAnchor="middle"
                      fill="#E2E8F0"
                      fontSize="9"
                      fontWeight="medium"
                      fontFamily="monospace"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                    >
                      CORE
                    </text>
                  </g>
                )}

                {/* Wheel Position & Metric Tag */}
                <g transform={`translate(${wX + layout.width / 2}, ${wY - 14})`}>
                  <rect
                    x="-32"
                    y="-10"
                    width="64"
                    height="20"
                    rx="4"
                    fill={isSelected ? "#0284C7" : "#1E293B"}
                    stroke={isSelected ? "#38BDF8" : "#334155"}
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {pos} • {data.bulk_temp_c}°
                  </text>
                </g>

                {/* Sub-label for Inner/Outer indication */}
                <g transform={`translate(${wX + layout.width / 2}, ${wY + layout.height + 15})`}>
                  <text
                    x={layout.isLeft ? 20 : -20}
                    y="0"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    INNER
                  </text>
                  <text
                    x={layout.isLeft ? -20 : 20}
                    y="0"
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    OUTER
                  </text>
                </g>

                {/* Kiosk-compliant hit target: >= 44px x 44px invisible overlay */}
                <rect
                  x={wX - 10}
                  y={wY - 10}
                  width={layout.width + 20}
                  height={layout.height + 20}
                  fill="transparent"
                  className="cursor-pointer"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Palette Legend */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-neutral-800 text-[11px] font-mono text-neutral-400">
        <span className="text-neutral-500 uppercase tracking-wider">Operating Temp Window:</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]" />
            <span>&lt;85°C Cold</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
            <span>95-112°C Opt</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" />
            <span>112-125°C Warm</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444]" />
            <span>&gt;125°C Hot</span>
          </div>
        </div>
      </div>
    </div>
  );
}
