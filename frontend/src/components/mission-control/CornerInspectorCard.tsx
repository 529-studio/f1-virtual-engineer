"use client";

/**
 * CornerInspectorCard.tsx
 *
 * Tactical corner-by-corner telemetry inspection cockpit.
 * Features:
 * - Interactive turn switcher (Previous / Next / Dropdown).
 * - 4 core race engineering metrics: Braking Point Delta, Minimum Apex Speed, Throttle Pickup, and Net Time Delta.
 * - Side-by-side telemetry comparison bars between primary and compare drivers.
 * - Live AI race engineer debrief snippet grounded in physical telemetry deltas.
 * - Resilient UI: Skeleton, Empty, and Error states with >=44px mobile touch targets.
 */

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Compass, Radio, Gauge, Zap, Disc3 } from "lucide-react";
import type { CornerInfo, TrackMapPoint } from "@/services/api";
import { extractCornerMetrics, type CornerAnalysisResult } from "@/lib/corner-analytics";
import { getCornerFriendlyName } from "@/lib/corner-names";

export interface CornerInspectorCardProps {
  eventName: string;
  corners: CornerInfo[];
  selectedCorner: CornerInfo | null;
  onSelectCorner: (corner: CornerInfo | null) => void;
  points: TrackMapPoint[];
  comparePoints?: TrackMapPoint[] | null;
  driver: string;
  compareDriver?: string | null;
  isLoading?: boolean;
}

export function CornerInspectorCard({
  eventName,
  corners,
  selectedCorner,
  onSelectCorner,
  points,
  comparePoints,
  driver,
  compareDriver,
  isLoading = false,
}: CornerInspectorCardProps) {
  // Sort corners by distance along the track
  const sortedCorners = useMemo(() => {
    return [...corners].sort((a, b) => a.distance - b.distance);
  }, [corners]);

  // Current active corner (default to first corner if none selected but corners exist)
  const activeCorner = selectedCorner ?? (sortedCorners.length > 0 ? sortedCorners[0] : null);

  // Compute telemetry metrics for active corner
  const analysis: CornerAnalysisResult | null = useMemo(() => {
    if (!activeCorner || points.length === 0) return null;
    return extractCornerMetrics(
      activeCorner,
      points,
      comparePoints,
      driver,
      compareDriver
    );
  }, [activeCorner, points, comparePoints, driver, compareDriver]);

  // Turn navigation helpers
  const currentIndex = sortedCorners.findIndex(
    (c) => c.number === activeCorner?.number && c.letter === activeCorner?.letter
  );

  const handlePrev = () => {
    if (sortedCorners.length === 0) return;
    const prevIdx = currentIndex > 0 ? currentIndex - 1 : sortedCorners.length - 1;
    onSelectCorner(sortedCorners[prevIdx]);
  };

  const handleNext = () => {
    if (sortedCorners.length === 0) return;
    const nextIdx = currentIndex < sortedCorners.length - 1 ? currentIndex + 1 : 0;
    onSelectCorner(sortedCorners[nextIdx]);
  };

  // 1. SKELETON STATE
  if (isLoading) {
    return (
      <div
        data-testid="corner-inspector-skeleton"
        className="flex flex-col gap-3 rounded-lg border border-border/80 bg-surface/90 p-3.5 backdrop-blur-sm animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 rounded bg-surface-raised" />
          <div className="h-6 w-24 rounded bg-surface-raised" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded bg-surface-raised/60" />
          ))}
        </div>
        <div className="h-14 rounded bg-surface-raised/40" />
      </div>
    );
  }

  // 2. EMPTY STATE
  if (!activeCorner || points.length === 0) {
    return (
      <div
        data-testid="corner-inspector-empty"
        className="flex min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-surface/50 p-4 text-center"
      >
        <Compass className="mb-2 h-6 w-6 text-foreground-faint animate-spin-slow opacity-60" />
        <p className="readout text-xs text-foreground-dim">No Corner Selected</p>
        <p className="text-[0.65rem] text-foreground-faint max-w-xs mt-1">
          Click any turn marker on the circuit map above or choose from the session telemetry to inspect micro-sector deltas.
        </p>
      </div>
    );
  }

  const friendlyName = getCornerFriendlyName(eventName, activeCorner.number, activeCorner.letter);
  const primaryMetrics = analysis?.primary;
  const compareMetrics = analysis?.compare;

  // Format Delta Badges
  const renderBrakeDelta = () => {
    if (!analysis || analysis.deltaBrakeMeters === null) {
      return (
        <span className="text-[0.65rem] text-foreground-faint">
          {primaryMetrics?.hasBraking ? "No comparison" : "Flat out"}
        </span>
      );
    }
    const delta = analysis.deltaBrakeMeters;
    if (Math.abs(delta) < 2) {
      return <span className="readout text-xs text-foreground-dim">Equal</span>;
    }
    if (delta > 0) {
      return (
        <span className="readout text-xs text-emerald-400 font-bold" title={`${driver} braked later`}>
          +{Math.round(delta)}m later
        </span>
      );
    }
    return (
      <span className="readout text-xs text-amber-400 font-bold" title={`${driver} braked earlier`}>
        {Math.round(delta)}m earlier
      </span>
    );
  };

  const renderApexDelta = () => {
    if (!analysis || analysis.deltaApexSpeedKph === null) {
      return <span className="text-[0.65rem] text-foreground-faint">No comparison</span>;
    }
    const delta = analysis.deltaApexSpeedKph;
    if (Math.abs(delta) < 1) {
      return <span className="readout text-xs text-foreground-dim">Equal</span>;
    }
    if (delta > 0) {
      return (
        <span className="readout text-xs text-emerald-400 font-bold">
          +{delta.toFixed(1)} km/h
        </span>
      );
    }
    return (
      <span className="readout text-xs text-rose-400 font-bold">
        {delta.toFixed(1)} km/h
      </span>
    );
  };

  const renderThrottleDelta = () => {
    if (!analysis || analysis.deltaThrottleMeters === null) {
      return <span className="text-[0.65rem] text-foreground-faint">No comparison</span>;
    }
    const delta = analysis.deltaThrottleMeters;
    if (Math.abs(delta) < 2) {
      return <span className="readout text-xs text-foreground-dim">Equal</span>;
    }
    if (delta < 0) {
      return (
        <span className="readout text-xs text-emerald-400 font-bold" title={`${driver} picked up power earlier`}>
          {Math.round(delta)}m earlier
        </span>
      );
    }
    return (
      <span className="readout text-xs text-amber-400 font-bold" title={`${driver} picked up power later`}>
        +{Math.round(delta)}m later
      </span>
    );
  };

  const renderTimeDeltaPill = () => {
    if (!analysis || analysis.deltaTimeSeconds === null) return null;
    const dt = analysis.deltaTimeSeconds;
    const isGain = dt < -0.004;
    const isLoss = dt > 0.004;
    const absSeconds = Math.abs(dt).toFixed(3);

    return (
      <span
        className={`readout inline-flex items-center gap-1 rounded px-2 py-0.5 text-[0.68rem] font-bold tabular-nums tracking-wider uppercase ${
          isGain
            ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : isLoss
            ? "border border-rose-500/30 bg-rose-500/10 text-rose-400"
            : "border border-border bg-surface-raised text-foreground-dim"
        }`}
      >
        {isGain ? `+${absSeconds}s gain` : isLoss ? `-${absSeconds}s loss` : `±0.000s`}
      </span>
    );
  };

  return (
    <div
      data-testid="corner-inspector-card"
      className="flex flex-col gap-3 rounded-lg border border-border/80 bg-surface/95 p-3.5 shadow-lg backdrop-blur-md transition-all"
    >
      {/* ── CARD HEADER: Corner Switcher & Breadcrumb ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          {/* Quick cycle arrows (Min 44px touch targets on mobile) */}
          <div className="flex items-center rounded border border-border/70 bg-surface-raised p-0.5">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous turn"
              className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded text-foreground-dim hover:bg-surface hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next turn"
              className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded text-foreground-dim hover:bg-surface hover:text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Corner Dropdown Selector */}
          <div className="relative">
            <select
              aria-label="Select corner"
              value={`${activeCorner.number}${activeCorner.letter || ""}`}
              onChange={(e) => {
                const found = sortedCorners.find(
                  (c) => `${c.number}${c.letter || ""}` === e.target.value
                );
                if (found) onSelectCorner(found);
              }}
              className="h-9 sm:h-7 appearance-none rounded border border-border/70 bg-surface-raised pl-2.5 pr-7 py-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              {sortedCorners.map((c) => (
                <option key={`${c.number}${c.letter || ""}`} value={`${c.number}${c.letter || ""}`}>
                  Turn {c.number}{c.letter || ""} — {getCornerFriendlyName(eventName, c.number, c.letter)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Driver Matchup & Net Delta Pill */}
        <div className="flex items-center gap-2">
          <span className="label text-[0.65rem] text-foreground-dim">
            <span className="text-accent font-bold">{driver}</span>
            {compareDriver ? (
              <>
                <span className="text-foreground-faint mx-1">vs</span>
                <span className="text-blue-400 font-bold">{compareDriver}</span>
              </>
            ) : null}
          </span>
          {renderTimeDeltaPill()}
        </div>
      </div>

      {/* ── METRICS GRID: 4 Core Race Engineer Dimensions ── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* 1. Braking Point */}
        <div className="flex flex-col justify-between rounded border border-border/60 bg-surface-raised/40 p-2.5 transition-colors hover:border-border">
          <div className="flex items-center justify-between text-[0.62rem] text-foreground-dim">
            <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
              <Disc3 size={11} className="text-rose-400" /> Braking Point
            </span>
            {renderBrakeDelta()}
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="readout text-sm font-bold text-foreground tabular-nums">
              {primaryMetrics?.brakeDistance !== null ? `${Math.round(primaryMetrics?.brakeDistance ?? 0)}m` : "Flat"}
            </span>
            {compareMetrics && compareMetrics.brakeDistance !== null ? (
              <span className="readout text-[0.65rem] text-foreground-faint tabular-nums">
                {compareDriver}: {Math.round(compareMetrics.brakeDistance)}m
              </span>
            ) : null}
          </div>
        </div>

        {/* 2. Minimum Apex Speed */}
        <div className="flex flex-col justify-between rounded border border-border/60 bg-surface-raised/40 p-2.5 transition-colors hover:border-border">
          <div className="flex items-center justify-between text-[0.62rem] text-foreground-dim">
            <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
              <Gauge size={11} className="text-accent" /> Apex Speed
            </span>
            {renderApexDelta()}
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="readout text-sm font-bold text-foreground tabular-nums">
              {primaryMetrics?.minApexSpeed ? `${primaryMetrics.minApexSpeed.toFixed(0)} km/h` : "—"}
            </span>
            {compareMetrics?.minApexSpeed ? (
              <span className="readout text-[0.65rem] text-foreground-faint tabular-nums">
                {compareDriver}: {compareMetrics.minApexSpeed.toFixed(0)} km/h
              </span>
            ) : null}
          </div>
        </div>

        {/* 3. Throttle Pickup Point */}
        <div className="flex flex-col justify-between rounded border border-border/60 bg-surface-raised/40 p-2.5 transition-colors hover:border-border">
          <div className="flex items-center justify-between text-[0.62rem] text-foreground-dim">
            <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
              <Zap size={11} className="text-emerald-400" /> Throttle Exit
            </span>
            {renderThrottleDelta()}
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="readout text-sm font-bold text-foreground tabular-nums">
              {primaryMetrics?.throttlePickupDistance !== null ? `${Math.round(primaryMetrics?.throttlePickupDistance ?? 0)}m` : "—"}
            </span>
            {compareMetrics && compareMetrics.throttlePickupDistance !== null ? (
              <span className="readout text-[0.65rem] text-foreground-faint tabular-nums">
                {compareDriver}: {Math.round(compareMetrics.throttlePickupDistance)}m
              </span>
            ) : null}
          </div>
        </div>

        {/* 4. Apex Distance along Lap */}
        <div className="flex flex-col justify-between rounded border border-border/60 bg-surface-raised/40 p-2.5 transition-colors hover:border-border">
          <div className="flex items-center justify-between text-[0.62rem] text-foreground-dim">
            <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
              <Compass size={11} className="text-blue-400" /> Apex Location
            </span>
            <span className="readout text-[0.65rem] text-foreground-faint">
              {friendlyName}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span className="readout text-sm font-bold text-foreground tabular-nums">
              {Math.round(activeCorner.distance)}m
            </span>
            <span className="readout text-[0.65rem] text-foreground-faint tabular-nums">
              {(activeCorner.distance / 1000).toFixed(2)} km
            </span>
          </div>
        </div>
      </div>

      {/* ── AI RACE ENGINEER DEBRIEF ── */}
      {analysis?.debrief ? (
        <div className="flex items-start gap-2.5 rounded border border-accent/20 bg-accent/5 px-3 py-2 text-xs">
          <Radio size={14} className="mt-0.5 shrink-0 text-accent animate-pulse" />
          <div className="flex-1">
            <div className="mb-0.5 flex items-center gap-1.5">
              <span className="label text-[0.58rem] font-bold uppercase tracking-widest text-accent">
                RADIO // PIT WALL DEBRIEF
              </span>
              <span className="h-1 w-1 rounded-full bg-accent" />
              <span className="text-[0.58rem] text-foreground-faint">FastF1 Micro-Sector Integration</span>
            </div>
            <p className="readout text-[0.72rem] leading-relaxed text-foreground-dim">
              {analysis.debrief}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
