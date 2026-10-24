"use client";

/**
 * CatchUpPredictorCard.tsx
 *
 * Real-time tyre degradation divergence & DRS overtake convergence predictor.
 * Features:
 * - Mathematical non-linear gap convergence trajectory projection.
 * - Interactive SVG graph with 1.0s DRS threshold, dynamic ceiling scale, and milestone markers.
 * - What-If pace delta slider (±0.80s/lap) with real-time recalculation.
 * - AI Strategist pit-wall debrief.
 * - Strict 529 Engineering Protocols:
 *   - Zero raw Unicode emojis (vector Lucide icons only: Zap, Flag, AlertTriangle, etc.).
 *   - 3 UI states: Skeleton, Empty, and Active.
 *   - Mobile touch targets >= 44px with zero horizontal scroll leak.
 */

import { useState, useMemo } from "react";
import {
  TrendingDown,
  Zap,
  Flag,
  AlertTriangle,
  Timer,
  SlidersHorizontal,
  Radio,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import {
  simulateChaseConvergence,
  type ChaseSimulationInput,
  type ChaseSimulationResult,
  type DriverStintProfile,
} from "@/lib/catchup-analytics";

export interface CatchUpPredictorCardProps {
  currentLap?: number | null;
  totalLaps?: number | null;
  initialGapSeconds?: number | null;
  driver?: string | null;
  targetDriver?: string | null;
  driverCompound?: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET" | string | null;
  targetCompound?: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET" | string | null;
  driverStintLaps?: number | null;
  targetStintLaps?: number | null;
  isLoading?: boolean;
}

const COMPOUND_PROFILES: Record<string, { degRate: number; cliff: number; baseOffset: number }> = {
  SOFT: { degRate: 0.075, cliff: 22, baseOffset: -0.4 },
  MEDIUM: { degRate: 0.050, cliff: 30, baseOffset: -0.15 },
  HARD: { degRate: 0.035, cliff: 42, baseOffset: 0.0 },
  INTERMEDIATE: { degRate: 0.045, cliff: 26, baseOffset: 0.0 },
  WET: { degRate: 0.040, cliff: 32, baseOffset: 0.0 },
};

export function CatchUpPredictorCard({
  currentLap = 38,
  totalLaps = 53,
  initialGapSeconds = 5.4,
  driver = "PIA",
  targetDriver = "LEC",
  driverCompound = "HARD",
  targetCompound = "HARD",
  driverStintLaps = 10,
  targetStintLaps = 23,
  isLoading = false,
}: CatchUpPredictorCardProps) {
  // Interactive What-If pace delta override (±0.80s/lap)
  const [paceOverride, setPaceOverride] = useState<number>(0);
  const [hoveredLapIndex, setHoveredLapIndex] = useState<number | null>(null);

  // Fallback defaults for robust calculation
  const effCurrentLap = currentLap && currentLap > 0 ? currentLap : 38;
  const effTotalLaps = totalLaps && totalLaps >= effCurrentLap ? totalLaps : 53;
  const effGap =
    initialGapSeconds != null && !Number.isNaN(initialGapSeconds)
      ? Math.max(0, initialGapSeconds)
      : 5.4;
  const effDriver = driver?.trim() || "PIA";
  const effTargetDriver = targetDriver?.trim() || "LEC";

  // Build simulation profiles
  const simulationInput: ChaseSimulationInput = useMemo(() => {
    // Determine compound base degradation rates
    const normCompound = (c: string | null | undefined): DriverStintProfile["compound"] => {
      const upper = (c || "HARD").toUpperCase();
      if (upper === "SOFT" || upper === "MEDIUM" || upper === "HARD" || upper === "INTERMEDIATE" || upper === "WET") {
        return upper;
      }
      return "HARD";
    };

    const targetNorm = normCompound(targetCompound);
    const driverNorm = normCompound(driverCompound);

    const targetProfileData = COMPOUND_PROFILES[targetNorm] ?? COMPOUND_PROFILES.HARD;
    const driverProfileData = COMPOUND_PROFILES[driverNorm] ?? COMPOUND_PROFILES.HARD;

    // Issue #29 Code Review Fix (2.1): Fresh tyre stints with 0 stint laps must not be overwritten by fallback
    const targetStint = targetStintLaps != null && targetStintLaps >= 0 ? targetStintLaps : 23;
    const driverStint = driverStintLaps != null && driverStintLaps >= 0 ? driverStintLaps : 10;

    const leaderProfile: DriverStintProfile = {
      driver: effTargetDriver,
      compound: targetNorm,
      stintLaps: targetStint,
      baseLapTimeSeconds: 81.5 + targetProfileData.baseOffset,
      degradationRateSecPerLap: targetProfileData.degRate,
      cliffLapOffset: targetProfileData.cliff,
    };

    const chaserProfile: DriverStintProfile = {
      driver: effDriver,
      compound: driverNorm,
      stintLaps: driverStint,
      baseLapTimeSeconds: 81.1 + driverProfileData.baseOffset,
      degradationRateSecPerLap: driverProfileData.degRate,
      cliffLapOffset: driverProfileData.cliff,
    };

    return {
      currentLap: effCurrentLap,
      totalLaps: effTotalLaps,
      initialGapSeconds: effGap,
      leader: leaderProfile,
      chaser: chaserProfile,
      paceDeltaOverride: paceOverride,
      drsAdvantageSeconds: 0.35,
    };
  }, [
    effCurrentLap,
    effTotalLaps,
    effGap,
    effDriver,
    effTargetDriver,
    driverCompound,
    targetCompound,
    driverStintLaps,
    targetStintLaps,
    paceOverride,
  ]);

  // Run pure simulation
  const result: ChaseSimulationResult = useMemo(() => {
    return simulateChaseConvergence(simulationInput);
  }, [simulationInput]);

  // SKELETON STATE
  if (isLoading) {
    return (
      <div
        data-testid="catchup-predictor-skeleton"
        className="flex flex-col gap-3 rounded-lg border border-border/80 bg-surface/90 p-4 backdrop-blur-sm animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded bg-surface-raised" />
          <div className="h-5 w-24 rounded bg-surface-raised" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded bg-surface-raised/60" />
          ))}
        </div>
        <div className="h-40 rounded bg-surface-raised/40" />
        <div className="h-12 rounded bg-surface-raised/30" />
      </div>
    );
  }

  // EMPTY STATE: If no target competitor or gap is 0 with no rival
  if (!effTargetDriver || (effGap <= 0 && paceOverride === 0 && !targetDriver)) {
    return (
      <div
        data-testid="catchup-predictor-empty"
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-surface/50 p-6 text-center"
      >
        <TrendingDown className="h-8 w-8 text-muted/60 stroke-[1.5]" />
        <p className="text-sm font-medium text-foreground">No Target Competitor Tracked</p>
        <p className="max-w-xs text-xs text-muted">
          Select a competitor driver or telemetry delta to activate live catch-up and DRS convergence forecasting.
        </p>
      </div>
    );
  }

  // ACTIVE STATE CALCULATIONS FOR SVG
  const svgWidth = 600;
  const svgHeight = 160;
  const padding = { top: 22, right: 35, bottom: 28, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const trajectory = result.trajectory;

  // Issue #29 Code Review Fix (2.4): Dynamically compute maxGap across projected trajectory so negative overrides don't clip
  const maxTrajGap = trajectory.reduce((max, pt) => Math.max(max, pt.gapSeconds), effGap);
  const maxGap = Math.max(maxTrajGap * 1.15, 6.0);

  // Coordinate scales
  const getX = (lap: number) => {
    const totalSpan = Math.max(1, effTotalLaps - effCurrentLap);
    const progress = (lap - effCurrentLap) / totalSpan;
    return padding.left + progress * graphWidth;
  };

  const getY = (gap: number) => {
    const clampedGap = Math.max(0, Math.min(gap, maxGap));
    const ratio = clampedGap / maxGap;
    return padding.top + (1 - ratio) * graphHeight;
  };

  // Build SVG path strings
  const points = [
    { x: getX(effCurrentLap), y: getY(effGap), lap: effCurrentLap, gap: effGap },
    ...trajectory.map((p) => ({
      x: getX(p.lap),
      y: getY(p.gapSeconds),
      lap: p.lap,
      gap: p.gapSeconds,
    })),
  ];

  const linePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, "");

  const zeroY = getY(0);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${zeroY.toFixed(1)} L ${points[0].x.toFixed(1)} ${zeroY.toFixed(1)} Z`
      : "";

  const drsY = getY(1.0);
  const showInitialGapLine = Math.abs(effGap - 1.0) >= 0.25 && effGap >= 0.25;

  // DRS capture coordinates
  const drsPoint = result.drsCaptureLap
    ? points.find((pt) => pt.lap === result.drsCaptureLap)
    : null;

  // Overtake coordinates
  const overtakePoint = result.overtakeLap
    ? points.find((pt) => pt.lap === result.overtakeLap)
    : null;

  // Status badge config
  const statusConfig = {
    SUCCESS: {
      label: "CONVERGING",
      tone: "border-status-ok/40 bg-status-ok/10 text-status-ok",
      icon: ShieldCheck,
    },
    CLIFF_STALLED: {
      label: "CLIFF STALLED",
      tone: "border-status-warn/40 bg-status-warn/10 text-status-warn",
      icon: AlertTriangle,
    },
    OUT_OF_LAPS: {
      label: "DEFICIT PERSISTS",
      tone: "border-status-error/40 bg-status-error/10 text-status-error",
      icon: TrendingDown,
    },
  }[result.chaseStatus];

  const StatusIcon = statusConfig.icon;

  const activeHoverPoint =
    hoveredLapIndex !== null && trajectory[hoveredLapIndex]
      ? trajectory[hoveredLapIndex]
      : null;

  // Issue #29 Code Review Fix (2.5): Dynamic cliff safety margin badge
  const cliffMargin = simulationInput.chaser.cliffLapOffset - simulationInput.chaser.stintLaps;

  return (
    <div
      data-testid="catchup-predictor-card"
      className="flex flex-col gap-3 rounded-lg border border-border/80 bg-surface/90 p-4 backdrop-blur-sm transition-all"
    >
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-surface-raised text-accent">
            <TrendingDown className="h-4 w-4 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider text-foreground uppercase">
              Catch-Up & Overtake Predictor
            </h3>
            <p className="text-[11px] text-muted flex items-center gap-1 font-mono">
              <span className="text-foreground font-semibold">{effDriver}</span>
              <ChevronRight className="h-3 w-3 inline text-muted/60" />
              <span>{effTargetDriver}</span>
              <span className="text-border">|</span>
              <span>Gap {effGap.toFixed(1)}s</span>
              <span className="text-border">|</span>
              <span>Lap {effCurrentLap}/{effTotalLaps}</span>
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${statusConfig.tone}`}>
          <StatusIcon className="h-3.5 w-3.5 stroke-[1.75]" />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      {/* 2. Key Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Metric 1: Projected DRS Window */}
        <div className="flex flex-col rounded border border-border/60 bg-surface-raised/40 p-2.5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] uppercase font-mono tracking-wider">DRS Window</span>
            <Zap className="h-3.5 w-3.5 text-accent stroke-[1.75]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground font-mono">
              {result.drsCaptureLap ? `Lap ${result.drsCaptureLap}` : "Unreachable"}
            </span>
            {result.drsCaptureLap && (
              <span className="text-[10px] text-muted font-mono">
                (+{Math.max(0, result.drsCaptureLap - effCurrentLap)}L)
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Projected Pass Window */}
        <div className="flex flex-col rounded border border-border/60 bg-surface-raised/40 p-2.5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] uppercase font-mono tracking-wider">Projected Pass</span>
            <Flag className="h-3.5 w-3.5 text-status-ok stroke-[1.75]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground font-mono">
              {result.overtakeLap ? `Lap ${result.overtakeLap}` : "Out of Laps"}
            </span>
            {result.overtakeLap && (
              <span className="text-[10px] text-muted font-mono">
                (+{Math.max(0, result.overtakeLap - effCurrentLap)}L)
              </span>
            )}
          </div>
        </div>

        {/* Metric 3: Rolling Pace Delta */}
        <div className="flex flex-col rounded border border-border/60 bg-surface-raised/40 p-2.5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] uppercase font-mono tracking-wider">Net Pace Delta</span>
            <Timer className="h-3.5 w-3.5 text-foreground/80 stroke-[1.75]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={`text-base font-bold font-mono ${
                (trajectory[0]?.paceDelta ?? 0) >= 0 ? "text-status-ok" : "text-status-warn"
              }`}
            >
              {(trajectory[0]?.paceDelta ?? 0) >= 0 ? "+" : ""}
              {(trajectory[0]?.paceDelta ?? 0).toFixed(2)} s/L
            </span>
          </div>
        </div>

        {/* Metric 4: Tyre Cliff Safety Margin */}
        <div className="flex flex-col rounded border border-border/60 bg-surface-raised/40 p-2.5">
          <div className="flex items-center justify-between text-muted">
            <span className="text-[10px] uppercase font-mono tracking-wider">Tyre Cliff</span>
            <AlertTriangle className="h-3.5 w-3.5 text-status-warn stroke-[1.75]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-base font-bold text-foreground font-mono">
              {cliffMargin > 0 ? `+${cliffMargin} Laps` : "In Cliff"}
            </span>
            <span
              className={`text-[10px] font-mono ${
                cliffMargin <= 0
                  ? "text-status-error font-semibold"
                  : cliffMargin <= 3
                  ? "text-status-warn font-semibold"
                  : "text-status-ok"
              }`}
            >
              {cliffMargin <= 0 ? "Critical" : cliffMargin <= 3 ? "Warning" : "Safe"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive SVG Convergence Graph */}
      <div className="relative rounded border border-border/60 bg-surface-raised/20 p-2">
        <svg
          role="img"
          aria-label="Catch-Up Gap Convergence Graph"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-36 sm:h-44 select-none"
        >
          <defs>
            <linearGradient id="gapConvergenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent, #38bdf8)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-accent, #38bdf8)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid: 0.0s baseline */}
          <line
            x1={padding.left}
            y1={zeroY}
            x2={svgWidth - padding.right}
            y2={zeroY}
            stroke="currentColor"
            className="text-border/80"
            strokeWidth="1.5"
          />
          <text
            x={padding.left - 6}
            y={zeroY + 3}
            textAnchor="end"
            className="text-[10px] fill-muted font-mono"
          >
            0.0s
          </text>

          {/* Grid: 1.0s DRS threshold line */}
          <line
            x1={padding.left}
            y1={drsY}
            x2={svgWidth - padding.right}
            y2={drsY}
            stroke="var(--color-accent, #38bdf8)"
            strokeDasharray="4 4"
            strokeWidth="1.25"
            strokeOpacity="0.75"
          />
          <text
            x={padding.left - 6}
            y={drsY + 3}
            textAnchor="end"
            className="text-[10px] fill-accent font-mono font-medium"
          >
            1.0s
          </text>
          <text
            x={svgWidth - padding.right}
            y={drsY - 4}
            textAnchor="end"
            className="text-[9px] fill-accent font-mono uppercase tracking-wider"
          >
            DRS Detection Window
          </text>

          {/* Initial Gap Grid line (conditional to prevent label collision) */}
          {showInitialGapLine && (
            <>
              <line
                x1={padding.left}
                y1={getY(effGap)}
                x2={svgWidth - padding.right}
                y2={getY(effGap)}
                stroke="currentColor"
                className="text-border/30"
                strokeDasharray="2 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 6}
                y={getY(effGap) + 3}
                textAnchor="end"
                className="text-[10px] fill-muted font-mono"
              >
                {effGap.toFixed(1)}s
              </text>
            </>
          )}

          {/* Convergence Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#gapConvergenceGradient)" />}

          {/* Convergence Trajectory Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-accent, #38bdf8)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* DRS Capture Point Marker */}
          {drsPoint && (
            <g transform={`translate(${drsPoint.x}, ${drsPoint.y})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2={zeroY - drsPoint.y}
                stroke="var(--color-accent, #38bdf8)"
                strokeDasharray="2 2"
                strokeWidth="1"
                opacity="0.6"
              />
              <circle r="4.5" fill="var(--color-accent, #38bdf8)" stroke="#090d16" strokeWidth="2" />
              <text
                x="0"
                y="-9"
                textAnchor="middle"
                className="text-[9px] fill-accent font-mono font-semibold"
              >
                DRS L{drsPoint.lap}
              </text>
            </g>
          )}

          {/* Overtake Point Marker */}
          {overtakePoint && (
            <g transform={`translate(${overtakePoint.x}, ${overtakePoint.y})`}>
              <circle r="5" fill="#10b981" stroke="#090d16" strokeWidth="2" />
              <text
                x="0"
                y="-9"
                textAnchor="middle"
                className="text-[9px] fill-status-ok font-mono font-semibold"
              >
                PASS L{overtakePoint.lap}
              </text>
            </g>
          )}

          {/* X-axis tick labels */}
          <text
            x={padding.left}
            y={svgHeight - 8}
            textAnchor="middle"
            className="text-[10px] fill-muted font-mono"
          >
            L{effCurrentLap}
          </text>
          <text
            x={getX(Math.round((effCurrentLap + effTotalLaps) / 2))}
            y={svgHeight - 8}
            textAnchor="middle"
            className="text-[10px] fill-muted font-mono"
          >
            L{Math.round((effCurrentLap + effTotalLaps) / 2)}
          </text>
          <text
            x={svgWidth - padding.right}
            y={svgHeight - 8}
            textAnchor="middle"
            className="text-[10px] fill-muted font-mono"
          >
            L{effTotalLaps}
          </text>

          {/* Interactive Lap Hit Areas with touch support */}
          {trajectory.map((pt, i) => {
            const cx = getX(pt.lap);
            return (
              <rect
                key={pt.lap}
                x={cx - 12}
                y={padding.top}
                width={24}
                height={graphHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredLapIndex(i)}
                onMouseLeave={() => setHoveredLapIndex(null)}
                onTouchStart={() => setHoveredLapIndex(i)}
              />
            );
          })}
        </svg>

        {/* Hover inspection readout overlay */}
        {activeHoverPoint && (
          <div className="absolute top-3 right-3 rounded border border-border/80 bg-surface/95 px-2 py-1 text-[11px] font-mono shadow-md backdrop-blur-sm pointer-events-none">
            <span className="text-muted">Lap {activeHoverPoint.lap}:</span>{" "}
            <span className="font-semibold text-foreground">
              {activeHoverPoint.gapSeconds.toFixed(2)}s gap
            </span>{" "}
            <span className="text-accent">
              ({activeHoverPoint.paceDelta >= 0 ? "+" : ""}
              {activeHoverPoint.paceDelta.toFixed(2)}s/L)
            </span>
          </div>
        )}
      </div>

      {/* 4. Interactive What-If Pace Slider */}
      <div className="flex flex-col gap-1.5 rounded border border-border/60 bg-surface-raised/30 p-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent stroke-[1.75]" />
            <span>What-If Pace Delta</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${
                paceOverride > 0
                  ? "bg-status-ok/15 text-status-ok"
                  : paceOverride < 0
                  ? "bg-status-warn/15 text-status-warn"
                  : "bg-surface-raised text-muted"
              }`}
            >
              {paceOverride > 0 ? `+${paceOverride.toFixed(2)}s push` : paceOverride < 0 ? `${paceOverride.toFixed(2)}s conserve` : "Baseline (0.00s)"}
            </span>
            {paceOverride !== 0 && (
              <button
                type="button"
                onClick={() => setPaceOverride(0)}
                aria-label="Reset pace override"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5 stroke-[1.75]" />
              </button>
            )}
          </div>
        </div>

        {/* Range slider with touch area */}
        <div className="flex items-center gap-2 py-1">
          <span className="text-[10px] text-muted font-mono shrink-0">-0.80s</span>
          <input
            type="range"
            min="-0.80"
            max="0.80"
            step="0.05"
            value={paceOverride}
            onChange={(e) => setPaceOverride(parseFloat(e.target.value))}
            aria-label="Pace Delta Override Slider"
            aria-valuetext={`${paceOverride > 0 ? "+" : ""}${paceOverride.toFixed(2)}s per lap`}
            className="w-full accent-accent cursor-pointer min-h-[44px]"
          />
          <span className="text-[10px] text-muted font-mono shrink-0">+0.80s</span>
        </div>
      </div>

      {/* 5. AI Strategist Tactical Debrief */}
      <div className="flex items-start gap-2.5 rounded border border-border/70 bg-surface-raised/50 p-3 text-xs">
        <Radio className="h-4 w-4 shrink-0 text-accent stroke-[1.75] mt-0.5" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
            AI Race Strategist Debrief
          </span>
          <p className="text-[12px] leading-relaxed text-foreground/90 font-sans">
            &ldquo;{result.tacticalDebrief}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
