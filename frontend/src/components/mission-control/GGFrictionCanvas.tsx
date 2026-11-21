"use client";

import { useMemo, useState } from "react";
import { Activity, Compass, Crosshair, RefreshCw } from "lucide-react";
import type { TelemetryChannel } from "@/services/api";

interface GGFrictionCanvasProps {
  gLat?: TelemetryChannel;
  gLong?: TelemetryChannel;
  speed?: TelemetryChannel;
  gear?: TelemetryChannel;
  isLoading?: boolean;
  onRetry?: () => void;
  className?: string;
}

interface HoverPoint {
  index: number;
  gLat: number;
  gLong: number;
  speed: number;
  gear: number;
  screenX: number;
  screenY: number;
}

// Bounds for G-G diagram:
// X: -4.0g (left) to +4.0g (right)
// Y: -5.0g (braking) to +2.0g (acceleration)
const MIN_X = -4.0;
const MAX_X = 4.0;
const MIN_Y = -5.0; // braking is negative Y in G-G physics convention
const MAX_Y = 2.0;  // acceleration is positive Y

const SVG_WIDTH = 340;
const SVG_HEIGHT = 280;
const PADDING = 35;

const plotWidth = SVG_WIDTH - PADDING * 2;
const plotHeight = SVG_HEIGHT - PADDING * 2;

// Convert (gLat, gLong) to SVG pixel coords
const toSvgX = (glat: number) =>
  PADDING + ((glat - MIN_X) / (MAX_X - MIN_X)) * plotWidth;

const toSvgY = (glong: number) =>
  PADDING + ((MAX_Y - glong) / (MAX_Y - MIN_Y)) * plotHeight;

// Center axes positions
const originX = toSvgX(0);
const originY = toSvgY(0);

export function GGFrictionCanvas({
  gLat,
  gLong,
  speed,
  gear,
  isLoading = false,
  onRetry,
  className = "",
}: GGFrictionCanvasProps) {
  const [hoveredPoint, setHoveredPoint] = useState<HoverPoint | null>(null);

  // Parse points
  const points = useMemo(() => {
    const latSeries = gLat?.series || [];
    const longSeries = gLong?.series || [];
    const speedSeries = speed?.series || [];
    const gearSeries = gear?.series || [];

    const len = Math.min(latSeries.length, longSeries.length);
    if (len === 0) return [];

    const result: Array<{
      gLat: number;
      gLong: number;
      speed: number;
      gear: number;
      color: string;
      x: number;
      y: number;
    }> = [];

    for (let i = 0; i < len; i++) {
      const gl = latSeries[i] ?? 0;
      const go = longSeries[i] ?? 0;
      const spd = speedSeries[i] ?? 0;
      const gr = Math.round(gearSeries[i] ?? 0);

      // Color coding based on vehicle dynamics state:
      // Trail-braking: braking (negative gLong) + turning (|gLat| > 1.0)
      // Braking: gLong < -0.8
      // Acceleration: gLong > 0.4
      // Lateral: |gLat| > 1.2
      let color = "var(--foreground-dim, #94a3b8)"; // neutral/coast
      if (go < -0.8 && Math.abs(gl) > 1.0) {
        color = "#a855f7"; // Trail-braking purple
      } else if (go < -0.8) {
        color = "#ef4444"; // Hard braking red
      } else if (go > 0.3) {
        color = "#10b981"; // Full throttle green
      } else if (Math.abs(gl) > 1.2) {
        color = "#06b6d4"; // Lateral cornering cyan
      }

      result.push({
        gLat: gl,
        gLong: go,
        speed: spd,
        gear: gr,
        color,
        x: toSvgX(gl),
        y: toSvgY(go),
      });
    }

    return result;
  }, [gLat, gLong, speed, gear]);

  // Max stats
  const stats = useMemo(() => {
    if (points.length === 0) return null;
    let maxBraking = 0;
    let maxAccel = 0;
    let maxLatLeft = 0;
    let maxLatRight = 0;

    for (const p of points) {
      if (p.gLong < maxBraking) maxBraking = p.gLong;
      if (p.gLong > maxAccel) maxAccel = p.gLong;
      if (p.gLat < maxLatLeft) maxLatLeft = p.gLat;
      if (p.gLat > maxLatRight) maxLatRight = p.gLat;
    }

    return {
      maxBraking: Math.abs(maxBraking),
      maxAccel,
      maxLatLeft: Math.abs(maxLatLeft),
      maxLatRight,
      overallMaxG: Math.max(
        Math.abs(maxBraking),
        maxAccel,
        Math.abs(maxLatLeft),
        maxLatRight
      ),
    };
  }, [points]);

  // 1. SKELETON STATE
  if (isLoading) {
    return (
      <div
        className={`flex flex-col rounded-sm border border-border bg-surface p-4 ${className}`}
        aria-busy="true"
        aria-label="Loading friction circle"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-surface-elevated animate-pulse" />
            <div className="h-3.5 w-32 rounded bg-surface-elevated animate-pulse" />
          </div>
          <div className="h-3 w-16 rounded bg-surface-elevated animate-pulse" />
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="relative flex h-48 w-48 items-center justify-center rounded-full border border-dashed border-border/60 animate-pulse">
            <div className="h-32 w-32 rounded-full border border-border/40 animate-pulse" />
            <div className="absolute h-16 w-16 rounded-full border border-border/20" />
            <Crosshair className="absolute h-6 w-6 text-foreground-faint/30" />
          </div>
        </div>
      </div>
    );
  }

  // 2. EMPTY STATE
  if (!points || points.length === 0) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded-sm border border-border bg-surface p-6 text-center ${className}`}
      >
        <Compass className="h-8 w-8 text-foreground-faint mb-2" strokeWidth={1.5} />
        <h4 className="readout text-xs font-bold uppercase tracking-wider text-foreground">
          G-G Friction Diagram
        </h4>
        <p className="mt-1 max-w-xs text-[0.7rem] text-foreground-faint">
          No acceleration vectors recorded for this lap. Select a timed lap to visualize tire grip limits.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 flex min-h-[44px] items-center gap-1.5 rounded border border-border bg-surface-elevated px-4 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload Telemetry
          </button>
        )}
      </div>
    );
  }

  // 3. SUCCESS / RENDER STATE
  return (
    <div
      className={`relative flex flex-col rounded-sm border border-border bg-surface p-3.5 shadow-sm ${className}`}
    >
      {/* Header & Max G Highlights */}
      <div className="flex items-center justify-between pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" strokeWidth={1.75} />
          <span className="readout text-xs font-bold uppercase tracking-wider text-foreground">
            G-G Friction Circle
          </span>
          <span className="text-[0.62rem] font-mono text-foreground-faint">
            (Limit Envelope)
          </span>
        </div>

        {stats && (
          <div className="flex items-center gap-2.5 text-[0.65rem] font-mono">
            <span className="text-foreground-faint">
              Max G:{" "}
              <strong className="text-accent font-bold">
                {stats.overallMaxG.toFixed(1)}g
              </strong>
            </span>
            <span className="hidden sm:inline text-rose-400">
              Brake: -{stats.maxBraking.toFixed(1)}g
            </span>
            <span className="hidden sm:inline text-cyan-400">
              Lat: ±{Math.max(stats.maxLatLeft, stats.maxLatRight).toFixed(1)}g
            </span>
          </div>
        )}
      </div>

      {/* Interactive SVG Diagram */}
      <div className="relative flex flex-1 items-center justify-center pt-2">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full max-w-[340px] select-none overflow-visible"
        >
          <defs>
            <radialGradient id="gg-radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.08" />
              <stop offset="85%" stopColor="var(--accent)" stopOpacity="0.01" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grip Envelope Circle / Ellipse (approx 3.5g lat, 4.5g brake, 1.8g accel) */}
          <ellipse
            cx={originX}
            cy={originY}
            rx={((3.5 - 0) / (MAX_X - MIN_X)) * plotWidth}
            ry={((3.5 - 0) / (MAX_Y - MIN_Y)) * plotHeight}
            fill="url(#gg-radar-glow)"
            stroke="var(--accent)"
            strokeOpacity="0.25"
            strokeDasharray="3 3"
          />

          {/* Concentric 1g, 2g, 3g reference rings */}
          {[1.0, 2.0, 3.0].map((ringG) => {
            const rx = (ringG / (MAX_X - MIN_X)) * plotWidth;
            const ry = (ringG / (MAX_Y - MIN_Y)) * plotHeight;
            return (
              <g key={ringG}>
                <ellipse
                  cx={originX}
                  cy={originY}
                  rx={rx}
                  ry={ry}
                  fill="none"
                  stroke="var(--border)"
                  strokeOpacity="0.5"
                  strokeWidth="0.75"
                />
                <text
                  x={originX + rx + 2}
                  y={originY - 3}
                  fontSize="7"
                  fontFamily="monospace"
                  fill="var(--foreground-faint)"
                  opacity="0.6"
                >
                  {ringG}g
                </text>
              </g>
            );
          })}

          {/* Coordinate Axes */}
          {/* Horizontal X axis (Lateral G) */}
          <line
            x1={PADDING}
            y1={originY}
            x2={SVG_WIDTH - PADDING}
            y2={originY}
            stroke="var(--border)"
            strokeWidth="1"
          />
          {/* Vertical Y axis (Longitudinal G) */}
          <line
            x1={originX}
            y1={PADDING}
            x2={originX}
            y2={SVG_HEIGHT - PADDING}
            stroke="var(--border)"
            strokeWidth="1"
          />

          {/* Axis Labels */}
          <text
            x={originX}
            y={PADDING - 8}
            textAnchor="middle"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
            fill="#10b981"
          >
            +ACCEL (+2g)
          </text>
          <text
            x={originX}
            y={SVG_HEIGHT - PADDING + 16}
            textAnchor="middle"
            fontSize="8"
            fontFamily="monospace"
            fontWeight="bold"
            fill="#ef4444"
          >
            -BRAKE (-5g)
          </text>
          <text
            x={PADDING - 6}
            y={originY + 3}
            textAnchor="end"
            fontSize="8"
            fontFamily="monospace"
            fill="var(--foreground-faint)"
          >
            -4g L
          </text>
          <text
            x={SVG_WIDTH - PADDING + 6}
            y={originY + 3}
            textAnchor="start"
            fontSize="8"
            fontFamily="monospace"
            fill="var(--foreground-faint)"
          >
            +4g R
          </text>

          {/* Scatter Points */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r={hoveredPoint?.index === idx ? "4.5" : "1.75"}
              fill={p.color}
              opacity={hoveredPoint?.index === idx ? 1.0 : 0.65}
              className="cursor-pointer transition-all duration-75 hover:opacity-100"
              onMouseEnter={() =>
                setHoveredPoint({
                  index: idx,
                  gLat: p.gLat,
                  gLong: p.gLong,
                  speed: p.speed,
                  gear: p.gear,
                  screenX: p.x,
                  screenY: p.y,
                })
              }
              onMouseLeave={() => setHoveredPoint(null)}
            />
          ))}

          {/* Hover Crosshairs Indicator */}
          {hoveredPoint && (
            <g pointerEvents="none">
              <line
                x1={originX}
                y1={hoveredPoint.screenY}
                x2={hoveredPoint.screenX}
                y2={hoveredPoint.screenY}
                stroke="var(--accent)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <line
                x1={hoveredPoint.screenX}
                y1={originY}
                x2={hoveredPoint.screenX}
                y2={hoveredPoint.screenY}
                stroke="var(--accent)"
                strokeDasharray="2 2"
                strokeWidth="1"
              />
              <circle
                cx={hoveredPoint.screenX}
                cy={hoveredPoint.screenY}
                r="5"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute bottom-2 right-2 rounded border border-border/80 bg-surface-elevated/95 px-2.5 py-1.5 text-[0.65rem] font-mono shadow-md backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-foreground-faint">Lateral:</span>
              <strong
                className={hoveredPoint.gLat >= 0 ? "text-cyan-400" : "text-amber-400"}
              >
                {hoveredPoint.gLat > 0 ? "+" : ""}
                {hoveredPoint.gLat.toFixed(2)}g
              </strong>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground-faint">Longitudinal:</span>
              <strong
                className={hoveredPoint.gLong >= 0 ? "text-emerald-400" : "text-rose-400"}
              >
                {hoveredPoint.gLong > 0 ? "+" : ""}
                {hoveredPoint.gLong.toFixed(2)}g
              </strong>
            </div>
            <div className="flex items-center gap-2 pt-0.5 border-t border-border/50">
              <span className="text-foreground-faint">Speed:</span>
              <span className="text-foreground font-bold">
                {Math.round(hoveredPoint.speed)} km/h
              </span>
              <span className="text-foreground-faint pl-1">Gear:</span>
              <span className="text-accent font-bold">
                {hoveredPoint.gear > 0 ? `G${hoveredPoint.gear}` : "N"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Legend Bar */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 pt-1.5 border-t border-border/50 text-[0.6rem] font-mono text-foreground-faint">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          Braking
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          Cornering
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Acceleration
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          Trail-Braking
        </span>
      </div>
    </div>
  );
}
