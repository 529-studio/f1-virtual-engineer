"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, Gauge, Navigation, Timer, X, Zap } from "lucide-react";
import {
  getTeamColor,
  interpolateSplinePosition,
  type SplinePoint,
} from "@/lib/live-telemetry";
import type { LiveDriverSnapshot, LiveSafetyCarState } from "@/types/live";

export interface CircuitDefinition {
  id: string;
  name: string;
  lengthKm: number;
  waypoints: [number, number][];
  drsZones: [number, number][];
}

const RAW_CIRCUITS: Record<string, CircuitDefinition> = {
  interlagos: {
    id: "interlagos",
    name: "Interlagos",
    lengthKm: 4.309,
    waypoints: [
      [180, 480], [340, 460], [520, 430], [700, 390], [820, 310],
      [850, 210], [760, 140], [640, 170], [560, 250], [470, 230],
      [430, 140], [330, 120], [240, 180], [280, 270], [200, 330],
      [140, 400], [180, 480],
    ],
    drsZones: [[0.02, 0.16], [0.58, 0.72]],
  },
  monza: {
    id: "monza",
    name: "Monza",
    lengthKm: 5.793,
    waypoints: [
      [160, 460], [440, 460], [740, 460], [840, 420], [830, 340],
      [750, 260], [720, 160], [610, 120], [480, 150], [350, 180],
      [250, 150], [170, 210], [150, 320], [160, 460],
    ],
    drsZones: [[0.03, 0.24], [0.42, 0.56]],
  },
  suzuka: {
    id: "suzuka",
    name: "Suzuka",
    lengthKm: 5.807,
    waypoints: [
      [220, 450], [420, 440], [600, 420], [740, 360], [790, 260],
      [710, 190], [620, 230], [560, 170], [480, 130], [380, 180],
      [430, 270], [320, 310], [210, 230], [140, 290], [150, 390],
      [220, 450],
    ],
    drsZones: [[0.02, 0.17]],
  },
  silverstone: {
    id: "silverstone",
    name: "Silverstone",
    lengthKm: 5.891,
    waypoints: [
      [220, 460], [440, 470], [660, 450], [800, 380], [830, 260],
      [740, 160], [600, 130], [470, 170], [390, 250], [290, 200],
      [190, 150], [150, 240], [180, 350], [220, 460],
    ],
    drsZones: [[0.14, 0.28], [0.55, 0.70]],
  },
  spa: {
    id: "spa",
    name: "Spa-Francorchamps",
    lengthKm: 7.004,
    waypoints: [
      [160, 430], [310, 460], [430, 370], [560, 270], [720, 160],
      [840, 130], [860, 220], [760, 310], [660, 350], [560, 420],
      [440, 470], [300, 390], [200, 320], [140, 370], [160, 430],
    ],
    drsZones: [[0.16, 0.34], [0.76, 0.90]],
  },
  "marina bay": {
    id: "marina_bay",
    name: "Marina Bay",
    lengthKm: 4.94,
    waypoints: [
      [210, 450], [410, 450], [590, 420], [760, 430], [840, 350],
      [800, 220], [690, 150], [560, 180], [460, 140], [340, 160],
      [230, 220], [160, 310], [180, 400], [210, 450],
    ],
    drsZones: [[0.03, 0.16], [0.46, 0.60], [0.78, 0.90]],
  },
  "abu dhabi": {
    id: "abu_dhabi",
    name: "Yas Marina",
    lengthKm: 5.281,
    waypoints: [
      [180, 440], [380, 460], [620, 450], [810, 410], [850, 290],
      [740, 190], [580, 140], [420, 160], [320, 240], [230, 200],
      [150, 270], [150, 370], [180, 440],
    ],
    drsZones: [[0.18, 0.34], [0.44, 0.58]],
  },
  "las vegas": {
    id: "las_vegas",
    name: "Las Vegas",
    lengthKm: 6.201,
    waypoints: [
      [160, 440], [420, 460], [720, 450], [850, 380], [830, 250],
      [700, 150], [510, 140], [340, 170], [220, 240], [150, 340],
      [160, 440],
    ],
    drsZones: [[0.10, 0.28], [0.54, 0.72]],
  },
  sakhir: {
    id: "sakhir",
    name: "Sakhir",
    lengthKm: 5.412,
    waypoints: [
      [190, 460], [460, 460], [740, 440], [830, 350], [780, 230],
      [660, 170], [550, 230], [470, 150], [340, 140], [250, 220],
      [290, 310], [180, 360], [190, 460],
    ],
    drsZones: [[0.03, 0.20], [0.36, 0.50], [0.76, 0.90]],
  },
};

function resolveCircuit(circuitName?: string | null): CircuitDefinition {
  const key = (circuitName || "").toLowerCase().trim();
  if (key.includes("monza") || key.includes("ital")) return RAW_CIRCUITS.monza;
  if (key.includes("suzuka") || key.includes("japan")) return RAW_CIRCUITS.suzuka;
  if (key.includes("silverstone") || key.includes("brit")) return RAW_CIRCUITS.silverstone;
  if (key.includes("spa") || key.includes("belg")) return RAW_CIRCUITS.spa;
  if (key.includes("marina") || key.includes("singapore")) return RAW_CIRCUITS["marina bay"];
  if (key.includes("yas") || key.includes("abu")) return RAW_CIRCUITS["abu dhabi"];
  if (key.includes("vegas")) return RAW_CIRCUITS["las vegas"];
  if (key.includes("sakhir") || key.includes("bahrain")) return RAW_CIRCUITS.sakhir;
  return RAW_CIRCUITS.interlagos;
}

function buildSplinePoints(waypoints: [number, number][]): SplinePoint[] {
  // Subdivide each segment with Catmull-Rom-like midpoint smoothing for crisp curves
  const dense: [number, number][] = [];
  const n = waypoints.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = waypoints[(i - 1 + (n - 1)) % (n - 1)];
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const p3 = waypoints[(i + 2) % (n - 1)];
    const steps = 12;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1[0] +
          (-p0[0] + p2[0]) * t +
          (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
          (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y =
        0.5 *
        (2 * p1[1] +
          (-p0[1] + p2[1]) * t +
          (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
          (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      dense.push([x, y]);
    }
  }
  dense.push(waypoints[waypoints.length - 1]);

  const points: SplinePoint[] = [];
  let dist = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i > 0) {
      const dx = dense[i][0] - dense[i - 1][0];
      const dy = dense[i][1] - dense[i - 1][1];
      dist += Math.hypot(dx, dy);
    }
    points.push({ x: dense[i][0], y: dense[i][1], distance: dist });
  }
  return points;
}

function buildSvgPath(points: SplinePoint[]): string {
  if (points.length === 0) return "";
  return points
    .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");
}

function buildSegmentPath(points: SplinePoint[], startFrac: number, endFrac: number): string {
  const segPts: { x: number; y: number }[] = [];
  const samples = 24;
  for (let i = 0; i <= samples; i++) {
    const frac = startFrac + ((endFrac - startFrac) * i) / samples;
    segPts.push(interpolateSplinePosition(frac, points));
  }
  return segPts
    .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(" ");
}

interface CarAnimState {
  progress: number;
  targetProgress: number;
}

export interface LiveTrackGpsSplineProps {
  circuitName?: string | null;
  drivers: LiveDriverSnapshot[];
  safetyCarStatus?: LiveSafetyCarState;
}

export function LiveTrackGpsSpline({
  circuitName,
  drivers,
  safetyCarStatus = "NONE",
}: LiveTrackGpsSplineProps) {
  const circuit = useMemo(() => resolveCircuit(circuitName), [circuitName]);
  const splinePoints = useMemo(() => buildSplinePoints(circuit.waypoints), [circuit]);
  const trackPath = useMemo(() => buildSvgPath(splinePoints), [splinePoints]);
  const drsPaths = useMemo(
    () => circuit.drsZones.map(([s, e]) => buildSegmentPath(splinePoints, s, e)),
    [circuit, splinePoints]
  );

  const [selectedDriverCode, setSelectedDriverCode] = useState<string | null>(null);
  const markerRefs = useRef<Map<number, SVGGElement>>(new Map());
  const animStateRef = useRef<Map<number, CarAnimState>>(new Map());
  const splineRef = useRef<SplinePoint[]>(splinePoints);
  const scStatusRef = useRef<LiveSafetyCarState>(safetyCarStatus);

  useEffect(() => {
    splineRef.current = splinePoints;
  }, [splinePoints]);

  useEffect(() => {
    scStatusRef.current = safetyCarStatus;
  }, [safetyCarStatus]);

  // Compute deterministic target progress [0, 1) from race gaps / position
  useEffect(() => {
    const nowPhase = ((Date.now() % 90000) / 90000);
    for (const d of drivers) {
      const gap = d.gap_to_leader ?? (d.position - 1) * 1.4;
      const lapDurationSec = d.last_lap_time && d.last_lap_time > 50 ? d.last_lap_time : 90;
      const gapFraction = (gap / lapDurationSec) % 1;
      const targetProgress = (nowPhase - gapFraction + 2) % 1;

      const existing = animStateRef.current.get(d.driver_number);
      if (existing) {
        existing.targetProgress = targetProgress;
      } else {
        animStateRef.current.set(d.driver_number, {
          progress: targetProgress,
          targetProgress,
        });
      }
    }
  }, [drivers]);

  // 60fps decoupled requestAnimationFrame loop — zero per-frame React setState
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.1);
      lastTs = now;

      const speedFactor =
        scStatusRef.current === "RED_FLAG"
          ? 0
          : scStatusRef.current === "SC" || scStatusRef.current === "VSC"
          ? 1 / 135
          : 1 / 90;

      const lerpAlpha = 1 - Math.exp(-dt * 4.5);
      const pts = splineRef.current;

      animStateRef.current.forEach((state, driverNum) => {
        // Advance target smoothly between 8s SSE ticks
        state.targetProgress = (state.targetProgress + dt * speedFactor) % 1;

        // Shortest-arc circular interpolation across 0/1 finish line
        let diff = state.targetProgress - state.progress;
        if (diff > 0.5) diff -= 1;
        if (diff < -0.5) diff += 1;

        state.progress = (state.progress + diff * lerpAlpha + 1) % 1;

        const pos = interpolateSplinePosition(state.progress, pts);
        const el = markerRefs.current.get(driverNum);
        if (el) {
          el.setAttribute("transform", `translate(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)})`);
        }
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const selectedDriver = useMemo(
    () => drivers.find((d) => d.driver_code === selectedDriverCode) ?? null,
    [drivers, selectedDriverCode]
  );

  const startFinishPos = splinePoints[0] ?? { x: 180, y: 480 };

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded bg-[#07090e] border border-border/60"
      data-testid="live-track-gps-spline"
    >
      {/* Top Circuit HUD */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[0.65rem] font-mono">
        <div className="flex items-center gap-2 text-foreground-dim">
          <Navigation className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          <span className="font-semibold text-foreground uppercase tracking-wider">
            {circuit.name}
          </span>
          <span className="text-foreground-faint">{circuit.lengthKm.toFixed(3)} km</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[0.58rem] text-emerald-400">
            <Zap className="h-3 w-3" strokeWidth={1.75} />
            DRS
          </span>
          <span className="text-[0.58rem] text-foreground-faint">60FPS SPLINE</span>
        </div>
      </div>

      {/* SVG Circuit Canvas */}
      <div className="relative min-h-0 flex-1 w-full px-2">
        <svg
          viewBox="80 80 840 440"
          className="h-full w-full select-none"
          role="img"
          aria-label={`Live GPS track minimap for ${circuit.name}`}
        >
          {/* Outer track kerb */}
          <path
            d={trackPath}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={16}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner asphalt */}
          <path
            d={trackPath}
            fill="none"
            stroke="#161b26"
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Center racing line */}
          <path
            d={trackPath}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />

          {/* DRS Zone Overlays */}
          {drsPaths.map((dPath, idx) => (
            <path
              key={idx}
              d={dPath}
              fill="none"
              stroke="#10b981"
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.75}
            />
          ))}

          {/* Start / Finish Datum */}
          <g transform={`translate(${startFinishPos.x}, ${startFinishPos.y})`}>
            <rect
              x={-3}
              y={-12}
              width={6}
              height={24}
              rx={1}
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth={1}
            />
            <text
              x={0}
              y={-18}
              textAnchor="middle"
              className="fill-foreground-faint font-mono text-[10px] font-bold"
            >
              S/F
            </text>
          </g>

          {/* Animated Car Dots (DOM transform driven by rAF) */}
          {drivers.map((d) => {
            const color = getTeamColor(d.team_name, d.driver_code);
            const isLeader = d.position === 1;
            const isSelected = d.driver_code === selectedDriverCode;
            const initProgress = Math.max(0, 1 - (d.position - 1) * 0.04);
            const initPos = interpolateSplinePosition(initProgress, splinePoints);

            return (
              <g
                key={d.driver_number}
                ref={(node) => {
                  if (node) markerRefs.current.set(d.driver_number, node);
                  else markerRefs.current.delete(d.driver_number);
                }}
                transform={`translate(${initPos.x.toFixed(2)}, ${initPos.y.toFixed(2)})`}
                className="live-car-dot cursor-pointer"
                role="button"
                tabIndex={0}
                aria-label={`Select driver ${d.driver_code} P${d.position}`}
                onClick={() =>
                  setSelectedDriverCode((prev) =>
                    prev === d.driver_code ? null : d.driver_code
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedDriverCode((prev) =>
                      prev === d.driver_code ? null : d.driver_code
                    );
                  }
                }}
              >
                {/* Invisible >=44px hit area for touch ergonomics */}
                <circle r={22} fill="transparent" />

                {/* Leader or Selected Halo */}
                {(isLeader || isSelected) && (
                  <circle
                    r={isSelected ? 15 : 13}
                    fill="none"
                    stroke={isSelected ? "#ffffff" : "#22d3ee"}
                    strokeWidth={2}
                    opacity={0.9}
                  />
                )}

                {/* Car dot */}
                <circle
                  r={isLeader || isSelected ? 8 : 6.5}
                  fill={d.in_pit ? "#f59e0b" : color}
                  stroke="#090d16"
                  strokeWidth={2}
                />

                {/* Driver Label for Top 3, Selected, or Pit */}
                {(d.position <= 3 || isSelected || d.in_pit) && (
                  <g transform="translate(0, -14)">
                    <rect
                      x={-16}
                      y={-10}
                      width={32}
                      height={13}
                      rx={3}
                      fill="rgba(9, 13, 22, 0.88)"
                      stroke={color}
                      strokeWidth={0.8}
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      className="fill-white font-mono text-[8.5px] font-bold"
                    >
                      {d.in_pit ? `${d.driver_code}*` : d.driver_code}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Selected Driver Telemetry Popover */}
        {selectedDriver && (
          <div
            className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 rounded border border-border bg-surface/95 backdrop-blur px-3 py-2 text-xs font-mono shadow-lg"
            data-testid="live-track-driver-popover"
          >
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <span
                className="inline-flex items-center gap-1.5 font-bold text-foreground"
                style={{ color: getTeamColor(selectedDriver.team_name, selectedDriver.driver_code) }}
              >
                <Flag className="h-3.5 w-3.5" strokeWidth={1.75} />
                P{selectedDriver.position} {selectedDriver.driver_code}
              </span>
              <span className="inline-flex items-center gap-1 text-foreground-dim">
                <Timer className="h-3 w-3" strokeWidth={1.75} />
                {selectedDriver.position === 1
                  ? "LEADER"
                  : selectedDriver.gap_to_leader != null
                  ? `+${selectedDriver.gap_to_leader.toFixed(3)}s`
                  : "--"}
              </span>
              <span className="inline-flex items-center gap-1 text-foreground-dim">
                <Gauge className="h-3 w-3" strokeWidth={1.75} />
                {selectedDriver.tyre_compound} ({selectedDriver.tyre_age}L)
              </span>
              {selectedDriver.in_pit && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-400 border border-amber-500/40">
                  IN PIT
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedDriverCode(null)}
              aria-label="Close driver telemetry popover"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded border border-border/60 text-foreground-dim hover:text-foreground hover:border-accent cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>

      {/* Quick Driver Focus Strip (kiosk >= 44px touch targets) */}
      <div className="flex items-center gap-1.5 overflow-x-auto px-2 pb-2 pt-1 mc-scroll">
        {drivers.slice(0, 6).map((d) => {
          const isSelected = d.driver_code === selectedDriverCode;
          const color = getTeamColor(d.team_name, d.driver_code);
          return (
            <button
              key={d.driver_number}
              type="button"
              onClick={() =>
                setSelectedDriverCode((prev) =>
                  prev === d.driver_code ? null : d.driver_code
                )
              }
              className={`inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded border px-2.5 text-[0.65rem] font-mono font-bold transition-colors cursor-pointer ${
                isSelected
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-border/60 bg-surface/60 text-foreground-dim hover:border-border hover:text-foreground"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span>P{d.position}</span>
              <span>{d.driver_code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
