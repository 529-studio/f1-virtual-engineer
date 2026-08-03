"use client";

/**
 * TrackMapCanvas — Interactive 2D circuit map with telemetry heatmap.
 *
 * Renders an SVG circuit trace derived from FastF1 X/Y position data.
 * Supports three heatmap modes (speed, gear, brake), optional compare-driver
 * overlay, corner number annotations, hover tooltip, and a DRS zone indicator.
 *
 * All layout constants are defined at the top — no bare numeric literals in
 * render code.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { CornerInfo, TrackMapPoint, TrackMapResponse } from "@/services/api";

// ─── Layout & Style constants ──────────────────────────────────────────────
const VIEWBOX_SIZE = 1000;          // SVG viewBox dimension (must match backend)
const TRACK_STROKE_WIDTH = 6;       // base track line width (viewBox units)
const COMPARE_STROKE_WIDTH = 4;     // compare driver line width
const CORNER_RADIUS = 14;           // corner annotation circle radius
const CORNER_FONT_SIZE = 10;        // corner number text size
const HOVER_SNAP_PX = 18;          // px radius for hover snap
const TOOLTIP_OFFSET_X = 14;       // tooltip offset from cursor (px)
const TOOLTIP_OFFSET_Y = -10;

// Speed colour stops — red (slow) → yellow → green (fast)
const SPEED_STOPS = [
  { frac: 0.0, r: 225, g: 6,   b: 0   },   // F1 red — braking
  { frac: 0.4, r: 255, g: 180, b: 0   },   // amber — mid-speed
  { frac: 1.0, r: 34,  g: 197, b: 94  },   // green — flat-out
] as const;

// Gear colour map (1–8)
const GEAR_COLOURS: Record<number, string> = {
  1: "#E10600",
  2: "#ff4d00",
  3: "#ff8800",
  4: "#ffcc00",
  5: "#b3ff00",
  6: "#00e676",
  7: "#00b0ff",
  8: "#7c4dff",
  0: "#666666",  // neutral
};

// Heatmap mode options shown in the toggle pill
const HEATMAP_MODES = [
  { key: "speed",  label: "Speed" },
  { key: "gear",   label: "Gear"  },
  { key: "brake",  label: "Brake" },
] as const;

type HeatmapMode = (typeof HEATMAP_MODES)[number]["key"];

// ─── Colour helpers ────────────────────────────────────────────────────────

function speedToColour(speed: number, minSpeed: number, maxSpeed: number): string {
  const frac = maxSpeed === minSpeed ? 0.5 : (speed - minSpeed) / (maxSpeed - minSpeed);
  // Interpolate through SPEED_STOPS
  for (let i = 1; i < SPEED_STOPS.length; i++) {
    const lo = SPEED_STOPS[i - 1];
    const hi = SPEED_STOPS[i];
    if (frac <= hi.frac) {
      const t = (frac - lo.frac) / (hi.frac - lo.frac);
      const r = Math.round(lo.r + (hi.r - lo.r) * t);
      const g = Math.round(lo.g + (hi.g - lo.g) * t);
      const b = Math.round(lo.b + (hi.b - lo.b) * t);
      return `rgb(${r},${g},${b})`;
    }
  }
  const last = SPEED_STOPS[SPEED_STOPS.length - 1];
  return `rgb(${last.r},${last.g},${last.b})`;
}

function pointColour(pt: TrackMapPoint, mode: HeatmapMode, minSpeed: number, maxSpeed: number): string {
  switch (mode) {
    case "speed": return speedToColour(pt.speed, minSpeed, maxSpeed);
    case "gear":  return GEAR_COLOURS[pt.gear] ?? GEAR_COLOURS[0];
    case "brake": return pt.brake ? "#E10600" : "rgba(34,197,94,0.7)";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────

function CornerMarker({ corner, opacity = 1 }: { corner: CornerInfo; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <circle
        cx={corner.x}
        cy={corner.y}
        r={CORNER_RADIUS}
        fill="rgba(0,0,0,0.7)"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
      />
      <text
        x={corner.x}
        y={corner.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={CORNER_FONT_SIZE}
        fontFamily="var(--font-mono, monospace)"
        fill="rgba(255,255,255,0.8)"
        pointerEvents="none"
      >
        {corner.number}
        {corner.letter}
      </text>
    </g>
  );
}

function HoverTooltip({ pt, x, y }: { pt: TrackMapPoint; x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-20 rounded border border-border bg-surface px-3 py-2 shadow-lg"
      style={{ left: x + TOOLTIP_OFFSET_X, top: y + TOOLTIP_OFFSET_Y, transform: "translateY(-100%)" }}
    >
      <p className="readout mb-1 text-[0.6rem] uppercase tracking-widest text-foreground-faint">
        {pt.distance.toFixed(0)} m
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="label text-foreground-dim">Speed</span>
        <span className="readout text-foreground">{pt.speed.toFixed(0)} km/h</span>
        <span className="label text-foreground-dim">Gear</span>
        <span className="readout text-foreground">{pt.gear}</span>
        <span className="label text-foreground-dim">Throttle</span>
        <span className="readout text-foreground">{pt.throttle.toFixed(0)}%</span>
        <span className="label text-foreground-dim">Brake</span>
        <span className="readout" style={{ color: pt.brake ? "#E10600" : "rgba(34,197,94,0.9)" }}>
          {pt.brake ? "ON" : "OFF"}
        </span>
        {pt.drs >= 10 && (
          <>
            <span className="label text-foreground-dim">DRS</span>
            <span className="readout" style={{ color: "rgba(34,197,94,0.9)" }}>OPEN</span>
          </>
        )}
      </div>
    </div>
  );
}

function GearLegend() {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(GEAR_COLOURS)
        .filter(([k]) => k !== "0")
        .map(([gear, colour]) => (
          <span key={gear} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colour }} />
            <span className="readout text-[0.55rem] text-foreground-faint">G{gear}</span>
          </span>
        ))}
    </div>
  );
}

function SpeedLegend({ min, max }: { min: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="readout text-[0.55rem] text-foreground-faint">{min.toFixed(0)}</span>
      <div
        className="h-1.5 w-24 rounded-full"
        style={{
          background: `linear-gradient(90deg, rgb(225,6,0), rgb(255,180,0), rgb(34,197,94))`,
        }}
      />
      <span className="readout text-[0.55rem] text-foreground-faint">{max.toFixed(0)} km/h</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

interface TrackMapCanvasProps {
  data: TrackMapResponse;
  /** Height class for the SVG wrapper — defaults to "h-full" */
  heightClass?: string;
}

export function TrackMapCanvas({ data, heightClass = "h-full" }: TrackMapCanvasProps) {
  const [mode, setMode] = useState<HeatmapMode>("speed");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { points, compare_points, corners, driver, compare_driver } = data;

  // Pre-compute speed range for colour normalisation
  const { minSpeed, maxSpeed } = useMemo(() => {
    const all = [...points, ...compare_points].map((p) => p.speed);
    return {
      minSpeed: all.length ? Math.min(...all) : 0,
      maxSpeed: all.length ? Math.max(...all) : 300,
    };
  }, [points, compare_points]);

  // Build the SVG polyline path string from an array of points
  const buildPolylinePoints = (pts: TrackMapPoint[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  // Hover: find nearest point in SVG coordinate space
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      // Map mouse position to viewBox coordinates
      const svgX = ((e.clientX - rect.left) / rect.width) * VIEWBOX_SIZE;
      const svgY = ((e.clientY - rect.top) / rect.height) * VIEWBOX_SIZE;

      let nearestIdx = 0;
      let nearestDist = Infinity;
      points.forEach((pt, idx) => {
        const d = Math.hypot(pt.x - svgX, pt.y - svgY);
        if (d < nearestDist) { nearestDist = d; nearestIdx = idx; }
      });

      // Convert snap threshold to viewBox units
      const pxToVb = VIEWBOX_SIZE / rect.width;
      if (nearestDist < HOVER_SNAP_PX * pxToVb) {
        setHoveredIdx(nearestIdx);
        // Tooltip position in container-relative px
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        setHoveredIdx(null);
        setTooltipPos(null);
      }
    },
    [points],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIdx(null);
    setTooltipPos(null);
  }, []);

  if (!points.length) {
    return (
      <div className="flex h-32 items-center justify-center text-center">
        <p className="readout text-[length:var(--text-readout)] text-foreground-faint">
          {data.fallback_reason ?? "Track map data unavailable"}
        </p>
      </div>
    );
  }

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-px rounded border border-border overflow-hidden">
          {HEATMAP_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-3 py-1 readout text-[0.6rem] uppercase tracking-widest transition-colors ${
                mode === m.key
                  ? "bg-accent text-white"
                  : "bg-surface text-foreground-dim hover:bg-surface-elevated"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center">
          {mode === "speed" && <SpeedLegend min={minSpeed} max={maxSpeed} />}
          {mode === "gear"  && <GearLegend />}
          {mode === "brake" && (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "#E10600" }} />
                <span className="readout text-[0.55rem] text-foreground-faint">Braking</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-4 rounded-sm" style={{ background: "rgba(34,197,94,0.7)" }} />
                <span className="readout text-[0.55rem] text-foreground-faint">Lifting/Throttle</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SVG canvas */}
      <div className={`relative w-full ${heightClass}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          className="h-full w-full"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          aria-label={`${data.event} ${data.session_type} circuit map — ${driver}${compare_driver ? ` vs ${compare_driver}` : ""}`}
        >
          {/* Faint grey baseline — full circuit outline */}
          <polyline
            points={buildPolylinePoints(points)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={TRACK_STROKE_WIDTH + 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Compare driver trace (drawn below primary) */}
          {compare_points.length > 0 && (
            <polyline
              points={buildPolylinePoints(compare_points)}
              fill="none"
              stroke="rgba(96,165,250,0.45)"
              strokeWidth={COMPARE_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 4"
            />
          )}

          {/* Primary driver: coloured segments */}
          {points.slice(0, -1).map((pt, i) => {
            const next = points[i + 1];
            const colour = pointColour(pt, mode, minSpeed, maxSpeed);
            const isHovered = i === hoveredIdx;
            return (
              <line
                key={i}
                x1={pt.x}
                y1={pt.y}
                x2={next.x}
                y2={next.y}
                stroke={colour}
                strokeWidth={isHovered ? TRACK_STROKE_WIDTH + 3 : TRACK_STROKE_WIDTH}
                strokeLinecap="round"
                opacity={isHovered ? 1 : 0.9}
              />
            );
          })}

          {/* DRS zones — translucent green highlight */}
          {points.slice(0, -1).map((pt, i) => {
            if (pt.drs < 10) return null;
            const next = points[i + 1];
            return (
              <line
                key={`drs-${i}`}
                x1={pt.x}
                y1={pt.y}
                x2={next.x}
                y2={next.y}
                stroke="rgba(34,197,94,0.3)"
                strokeWidth={TRACK_STROKE_WIDTH + 6}
                strokeLinecap="round"
                pointerEvents="none"
              />
            );
          })}

          {/* Hover indicator dot */}
          {hoveredPoint && (
            <circle
              cx={hoveredPoint.x}
              cy={hoveredPoint.y}
              r={10}
              fill="white"
              opacity={0.9}
              pointerEvents="none"
            />
          )}

          {/* Corner annotations */}
          {corners.map((c) => (
            <CornerMarker key={`${c.number}${c.letter}`} corner={c} />
          ))}

          {/* Start/finish marker */}
          {points.length > 0 && (
            <circle
              cx={points[0].x}
              cy={points[0].y}
              r={8}
              fill="white"
              stroke="#E10600"
              strokeWidth={2}
            />
          )}
        </svg>

        {/* Hover tooltip — absolute positioned in container */}
        {hoveredPoint && tooltipPos && (
          <HoverTooltip pt={hoveredPoint} x={tooltipPos.x} y={tooltipPos.y} />
        )}
      </div>

      {/* Driver legend */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6" style={{ background: "#E10600" }} />
          <span className="readout text-[0.6rem] uppercase tracking-widest text-foreground-dim">{driver}</span>
        </span>
        {compare_driver && compare_points.length > 0 && (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-6"
              style={{
                background: "rgba(96,165,250,0.7)",
                backgroundImage: "repeating-linear-gradient(90deg, rgba(96,165,250,0.7) 0 8px, transparent 8px 12px)",
              }}
            />
            <span className="readout text-[0.6rem] uppercase tracking-widest text-foreground-dim">{compare_driver}</span>
          </span>
        )}
        {data.track_length_m > 0 && (
          <span className="ml-auto readout text-[0.6rem] text-foreground-faint">
            {(data.track_length_m / 1000).toFixed(3)} km
          </span>
        )}
      </div>
    </div>
  );
}
