"use client";

/**
 * TrackMapCanvas 2.0 — Interactive 2D circuit map with dynamic aspect-ratio adaptation.
 *
 * Renders an SVG circuit trace derived from FastF1 X/Y position data.
 * Features:
 * - Dynamic circuit bounding box: eliminates dead space on elongated tracks (e.g. Monza, Spa).
 * - Intuitive zoom (wheel, pinch, and step buttons) and free drag-to-pan.
 * - Fullscreen expand modal for deep dive sector analysis.
 * - Telemetry heatmap (speed, gear, brake), compare-driver overlay, corner annotations, hover tooltip.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { CornerInfo, TrackMapPoint, TrackMapResponse } from "@/services/api";

// ─── Layout & Style constants ──────────────────────────────────────────────
const VIEWBOX_SIZE = 1000;          // SVG viewBox fallback dimension
const TRACK_STROKE_WIDTH = 6;       // base track line width
const COMPARE_STROKE_WIDTH = 4;     // compare driver line width
const CORNER_RADIUS = 14;           // corner annotation circle radius
const CORNER_FONT_SIZE = 10;        // corner number text size
const HOVER_SNAP_PX = 20;           // px radius for hover snap

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
        fill="rgba(0,0,0,0.8)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1}
      />
      <text
        x={corner.x}
        y={corner.y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={CORNER_FONT_SIZE}
        fontFamily="var(--font-mono, monospace)"
        fontWeight="bold"
        pointerEvents="none"
      >
        {corner.number}{corner.letter ?? ""}
      </text>
    </g>
  );
}

function HoverTooltip({
  pt,
  x,
  y,
  containerWidth,
}: {
  pt: TrackMapPoint;
  x: number;
  y: number;
  containerWidth: number;
}) {
  const clampLeft = Math.min(Math.max(10, x + 14), containerWidth - 190);
  return (
    <div
      className="pointer-events-none absolute z-30 rounded border border-border/70 bg-surface/95 px-3 py-2 text-xs shadow-xl backdrop-blur-md"
      style={{
        left: `${clampLeft}px`,
        top: `${Math.max(10, y - 10)}px`,
      }}
    >
      <p className="readout mb-1 text-[0.62rem] font-bold uppercase tracking-wider text-accent">
        {(pt.distance / 1000).toFixed(2)} km
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
  heightClass?: string;
}

export function TrackMapCanvas({ data, heightClass = "h-full" }: TrackMapCanvasProps) {
  const [mode, setMode] = useState<HeatmapMode>("speed");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; containerWidth: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { points, compare_points, corners, driver, compare_driver } = data;

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  // Listen for Escape key to dismiss fullscreen modal
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // ─── Dynamic Circuit Bounding Box Calculation ────────────────────────────
  // Tight fit around track trace + corners with minimal safe padding, eliminating
  // the rigid 1:1 square squish for elongated circuits like Monza or Spa.
  const circuitBounds = useMemo(() => {
    if (!points.length) {
      return { minX: 0, minY: 0, width: VIEWBOX_SIZE, height: VIEWBOX_SIZE, aspect: 1 };
    }
    const allPts = [...points, ...compare_points];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of allPts) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    // Keep corners within visible bounds
    for (const c of corners) {
      if (c.x - CORNER_RADIUS < minX) minX = c.x - CORNER_RADIUS;
      if (c.x + CORNER_RADIUS > maxX) maxX = c.x + CORNER_RADIUS;
      if (c.y - CORNER_RADIUS < minY) minY = c.y - CORNER_RADIUS;
      if (c.y + CORNER_RADIUS > maxY) maxY = c.y + CORNER_RADIUS;
    }

    const pad = 24;
    const bX = Math.max(0, Math.floor(minX - pad));
    const bY = Math.max(0, Math.floor(minY - pad));
    const bW = Math.max(100, Math.ceil(maxX + pad) - bX);
    const bH = Math.max(100, Math.ceil(maxY + pad) - bY);

    return {
      minX: bX,
      minY: bY,
      width: bW,
      height: bH,
      aspect: bW / bH,
    };
  }, [points, compare_points, corners]);

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
  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0 || isDragging) return;
      const rect = svgRef.current.getBoundingClientRect();

      // Map screen pixel cursor to viewBox coordinates
      const svgX = circuitBounds.minX + ((e.clientX - rect.left) / rect.width) * circuitBounds.width;
      const svgY = circuitBounds.minY + ((e.clientY - rect.top) / rect.height) * circuitBounds.height;

      let nearestIdx = 0;
      let nearestDist = Infinity;
      points.forEach((pt, idx) => {
        const d = Math.hypot(pt.x - svgX, pt.y - svgY);
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = idx;
        }
      });

      // Convert snap threshold to viewBox units
      const pxToVb = circuitBounds.width / rect.width;
      if (nearestDist < HOVER_SNAP_PX * pxToVb) {
        setHoveredIdx(nearestIdx);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, containerWidth: rect.width });
      } else {
        setHoveredIdx(null);
        setTooltipPos(null);
      }
    },
    [points, isDragging, circuitBounds],
  );

  const handleSvgMouseLeave = useCallback(() => {
    setHoveredIdx(null);
    setTooltipPos(null);
  }, []);

  // Drag-to-pan handlers (active whenever zoomed or user drags)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    };
  }, []);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    containerRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    containerRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  const handleContainerMouseLeave = useCallback(() => {
    setIsDragging(false);
    dragStartRef.current = null;
  }, []);

  // Natural mouse wheel zooming
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom((z) => Math.min(3.5, Math.max(1, +(z + delta).toFixed(2))));
    }
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

  // Reusable SVG Track Content
  const renderSvgTrack = () => (
    <svg
      ref={svgRef}
      viewBox={`${circuitBounds.minX} ${circuitBounds.minY} ${circuitBounds.width} ${circuitBounds.height}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full max-h-full max-w-full drop-shadow-md select-none"
      onMouseMove={handleSvgMouseMove}
      onMouseLeave={handleSvgMouseLeave}
      aria-label={`${data.event} ${data.session_type} circuit map — ${driver}${compare_driver ? ` vs ${compare_driver}` : ""}`}
    >
      {/* Circuit outline base */}
      <polyline
        points={buildPolylinePoints(points)}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={TRACK_STROKE_WIDTH + 2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Compare driver trace */}
      {compare_points.length > 0 && (
        <polyline
          points={buildPolylinePoints(compare_points)}
          fill="none"
          stroke="rgba(96,165,250,0.5)"
          strokeWidth={COMPARE_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="8 4"
        />
      )}

      {/* Primary driver colored telemetry segments */}
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
            opacity={isHovered ? 1 : 0.92}
          />
        );
      })}

      {/* DRS zones */}
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
            stroke="rgba(34,197,94,0.35)"
            strokeWidth={TRACK_STROKE_WIDTH + 6}
            strokeLinecap="round"
            pointerEvents="none"
          />
        );
      })}

      {/* Hover cursor dot */}
      {hoveredPoint && (
        <circle
          cx={hoveredPoint.x}
          cy={hoveredPoint.y}
          r={9}
          fill="white"
          opacity={0.95}
          pointerEvents="none"
          className="filter drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]"
        />
      )}

      {/* Corner annotations */}
      {corners.map((c) => (
        <CornerMarker key={`${c.number}${c.letter ?? ""}`} corner={c} />
      ))}

      {/* Start/finish marker */}
      {points.length > 0 && (
        <circle
          cx={points[0].x}
          cy={points[0].y}
          r={8}
          fill="white"
          stroke="#E10600"
          strokeWidth={2.5}
        />
      )}
    </svg>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5 h-full w-full">
      {/* Mode toggle, zoom controls, and expand */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Heatmap Mode Selector */}
          <div className="flex gap-px rounded border border-border overflow-hidden">
            {HEATMAP_MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMode(m.key)}
                className={`px-2.5 py-1 readout text-[0.58rem] uppercase tracking-wider transition-colors cursor-pointer ${
                  mode === m.key
                    ? "bg-accent text-white font-bold"
                    : "bg-surface text-foreground-dim hover:bg-surface-elevated"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Zoom and Fit Controls */}
          <div className="flex items-center gap-px rounded border border-border overflow-hidden bg-surface">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
              disabled={zoom <= 1}
              aria-label="Zoom out"
              title="Zoom out"
              className="px-2 py-0.5 readout text-[0.62rem] text-foreground-dim hover:bg-surface-elevated disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              aria-label="Reset zoom to fit"
              title="Reset zoom to fit"
              className="px-2 py-0.5 readout text-[0.58rem] font-bold tracking-wider text-foreground-dim hover:bg-surface-elevated cursor-pointer"
            >
              {zoom === 1 ? "FIT" : `${Math.round(zoom * 100)}%`}
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.5, +(z + 0.25).toFixed(2)))}
              disabled={zoom >= 3.5}
              aria-label="Zoom in"
              title="Zoom in"
              className="px-2 py-0.5 readout text-[0.62rem] text-foreground-dim hover:bg-surface-elevated disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Legend & Fullscreen Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            {mode === "speed" && <SpeedLegend min={minSpeed} max={maxSpeed} />}
            {mode === "gear"  && <GearLegend />}
            {mode === "brake" && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3 rounded-sm bg-[#E10600]" />
                  <span className="readout text-[0.52rem] text-foreground-faint">Brake</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-3 rounded-sm bg-[rgba(34,197,94,0.7)]" />
                  <span className="readout text-[0.52rem] text-foreground-faint">Throttle</span>
                </span>
              </div>
            )}
          </div>

          {/* Fullscreen Expand Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            title="Expand to Fullscreen Track Map"
            aria-label="Expand Track Map"
            className="flex h-6 w-6 items-center justify-center rounded border border-border bg-surface text-foreground-dim hover:text-foreground hover:bg-surface-elevated cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* SVG Canvas Viewport with Free Drag-Pan and Dynamic Bounds */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleContainerMouseLeave}
        onWheel={handleWheel}
        className={`relative min-h-[260px] flex-1 w-full flex items-center justify-center overflow-auto mc-scroll rounded border border-border/40 bg-surface/40 p-3 select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        } ${heightClass}`}
      >
        <div
          className="relative flex items-center justify-center transition-transform duration-100 ease-out"
          style={{
            width: zoom > 1 ? `${zoom * 100}%` : "100%",
            height: zoom > 1 ? `${zoom * 100}%` : "100%",
            maxWidth: zoom > 1 ? "none" : "100%",
            maxHeight: zoom > 1 ? "none" : "100%",
            aspectRatio: `${circuitBounds.width} / ${circuitBounds.height}`,
          }}
        >
          {renderSvgTrack()}

          {/* Hover tooltip */}
          {hoveredPoint && tooltipPos && (
            <HoverTooltip
              pt={hoveredPoint}
              x={tooltipPos.x}
              y={tooltipPos.y}
              containerWidth={tooltipPos.containerWidth}
            />
          )}
        </div>
      </div>

      {/* Bottom Driver Legend & Track Length */}
      <div className="flex shrink-0 items-center gap-4 text-xs font-mono">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-5 bg-[#E10600]" />
          <span className="readout text-[0.6rem] uppercase tracking-wider text-foreground-dim">{driver}</span>
        </span>
        {compare_driver && compare_points.length > 0 && (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-5"
              style={{
                background: "rgba(96,165,250,0.7)",
                backgroundImage: "repeating-linear-gradient(90deg, rgba(96,165,250,0.7) 0 6px, transparent 6px 10px)",
              }}
            />
            <span className="readout text-[0.6rem] uppercase tracking-wider text-foreground-dim">{compare_driver}</span>
          </span>
        )}
        {data.track_length_m > 0 && (
          <span className="ml-auto readout text-[0.6rem] text-foreground-faint">
            {(data.track_length_m / 1000).toFixed(3)} km
          </span>
        )}
      </div>

      {/* Fullscreen Modal View (teleported to body) */}
      {mounted &&
        isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex flex-col bg-background/95 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold uppercase tracking-widest text-foreground">
                  {data.event} — {data.session_type} Circuit Map
                </span>
                <span className="readout text-xs text-foreground-dim">
                  Driver: {driver} {compare_driver ? `vs ${compare_driver}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="btn btn--accent px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>

            <div className="flex-1 w-full min-h-0 flex items-center justify-center p-4">
              <div
                className="relative h-full w-full max-h-[82vh] flex items-center justify-center"
                style={{
                  aspectRatio: `${circuitBounds.width} / ${circuitBounds.height}`,
                }}
              >
                {renderSvgTrack()}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
