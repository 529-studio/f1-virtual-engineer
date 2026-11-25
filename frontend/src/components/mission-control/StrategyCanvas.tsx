"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { AnalyzeResponse, PitExitResponse, StrategyData, TyreAnalyzeResponse } from "@/services/api";
import { PitWindowTimeline } from "./PitWindowTimeline";
import { GapGauge } from "./GapGauge";
import { ScenarioComparison } from "./ScenarioComparison";
import { TyreCard } from "./TyreCard";
import { TyreThermalHeatmap } from "./TyreThermalHeatmap";
import { RaceControlPanel } from "./RaceControlPanel";
import { WeatherRadarPanel } from "./WeatherRadarPanel";
import { PaceDeltaMatrix } from "./PaceDeltaMatrix";
import { StintCliffAdvisor } from "./StintCliffAdvisor";
import { VoicePitWallAudio } from "./VoicePitWallAudio";
import { GhostLapOverlay } from "./GhostLapOverlay";
import { PitExitCard } from "./PitExitCard";
import { CatchUpPredictorCard } from "./CatchUpPredictorCard";
import { DriverRadarChart } from "./DriverRadarChart";
import type { SessionId } from "./constants";
import {
  CANVAS_ANIM_DURATION,
  CANVAS_ANIM_STAGGER,
  CANVAS_ANIM_Y_OFFSET,
} from "./strategy-canvas.constants";

// StrategyCanvas — the main-canvas companion for Strategy mode.
// Replaces the empty TelemetryChartGrid so the ~900px canvas is never wasted.
//
// Layout:
//   ┌──────────────────────────────────────────┐
//   │  PIT WINDOW TIMELINE      (full-width)   │
//   ├──────────────────────────────────────────┤
//   │  PIT EXIT CARD (Headline strategy call)  │
//   ├─────────────────────────────┬────────────┤
//   │  TYRE CARD                  │ GAP GAUGE  │
//   ├─────────────────────────────┴────────────┤
//   │  SCENARIO COMPARISON (what-if 2-col)     │
//   └──────────────────────────────────────────┘

interface StrategyCanvasProps {
  result: AnalyzeResponse | null;
  strat: StrategyData | null | undefined;
  hasData: boolean;
  isLoading: boolean;
  year: number;
  eventName: string;
  session: SessionId;
  driver: string;
  targetDriver?: string | null;
  pitExit?: PitExitResponse | null;
  selectedLap?: number | null;
  pitExitLoading?: boolean;
  initialTyreData?: TyreAnalyzeResponse | null;
  totalLaps?: number;
}

export function StrategyCanvas({
  result,
  strat,
  hasData,
  isLoading,
  year,
  eventName,
  session,
  driver,
  targetDriver,
  pitExit,
  selectedLap,
  pitExitLoading,
  initialTyreData,
  totalLaps,
}: StrategyCanvasProps) {
  if (!hasData || !strat) {
    return (
      <StrategyCanvasEmpty isLoading={isLoading} driver={driver} eventName={eventName} />
    );
  }

  const pitWindow = strat.recommended_pit_window_laps as [number, number];
  const showGapGauge =
    strat.current_gap_seconds != null && strat.pit_loss_seconds != null;
  const showScenario =
    result?.intent?.intent_type === "strategy" && Boolean(driver) && Boolean(eventName);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
      {/* Scroll Affordance Banner */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2 text-[0.62rem] text-foreground-faint font-mono">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span className="font-semibold uppercase tracking-wider text-foreground-dim">Strategy Deck Active</span>
        </span>
        <span className="flex items-center gap-1.5 text-foreground-faint">
          <span>Extended Telemetry: Tyre Thermal · Race Control · Weather Radar · Catch-Up · Scenarios</span>
          <ChevronDown className="h-3 w-3 text-accent animate-bounce" />
        </span>
      </div>

      {/* Row 1 — Pit Window Timeline */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION }}
      >
        <PitWindowTimeline
          pitWindow={pitWindow}
          targetLap={strat.target_lap}
          fallback={strat.fallback}
        />
      </motion.div>

      {/* Row 2 — Pit Exit Card (Headline deterministic call) */}
      {(pitExit || pitExitLoading) && (
        <motion.div
          initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 0.5 }}
        >
          <PitExitCard
            projection={pitExit}
            isLoading={pitExitLoading}
            event={eventName}
            driver={driver}
            lap={selectedLap ?? undefined}
          />
        </motion.div>
      )}

      {/* Row 3 — Tyre Card + Gap Gauge
          On mobile (< sm), stack vertically so TyreCard has full 100% width.
          NOTE: do NOT add min-h-0 here — it causes TyreCard to collapse
          to zero height when the canvas flex parent doesn't have explicit
          height, which makes ScenarioComparison visually overlap TyreCard. */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4"
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER }}
      >
        {/* TyreCard wrapper: flex-1 for width, but NO min-w-0/min-h-0
            so the card keeps its natural height. */}
        <div className="flex-1 w-full">
          <TyreCard
            year={year}
            event={eventName}
            session={session}
            driver={driver}
            lap={selectedLap}
            initialData={initialTyreData}
          />
        </div>

        {showGapGauge && (
          <div className="shrink-0 w-full sm:w-auto">
            <GapGauge
              currentGap={strat.current_gap_seconds!}
              pitLoss={strat.pit_loss_seconds!}
              undercutRisk={strat.undercut_risk}
              competitor={strat.competitor_ahead}
              trackName={eventName}
            />
          </div>
        )}
      </motion.div>

      {/* Row 3.5 — Tyre Thermal 3D Heatmap & Carcass Cutaway */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.25 }}
      >
        <TyreThermalHeatmap
          year={year}
          event={eventName}
          session={session}
          driver={driver}
          lap={selectedLap}
        />
      </motion.div>

      {/* Row 3.6 — Race Control Incident Feed & Steward Deliberation Engine */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.35 }}
      >
        <RaceControlPanel
          year={year}
          event={eventName}
          session={session}
          selectedLap={selectedLap}
        />
      </motion.div>

      {/* Row 3.7 — Track Weather Radar & Compound Cross-Over Predictor */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.42 }}
      >
        <WeatherRadarPanel
          year={year}
          event={eventName}
          session={session}
          selectedLap={selectedLap}
        />
      </motion.div>

      {/* Row 3.8 — Multi-Driver Pace Delta Matrix & Sector Splits */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.46 }}
      >
        <PaceDeltaMatrix
          year={year}
          event={eventName}
          session={session}
          initialReferenceDriver={driver || "LEC"}
          lap={selectedLap}
        />
      </motion.div>

      {/* Row 3.9 — Pirelli Tyre Degradation & Stint Cliff Advisor */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.48 }}
      >
        <StintCliffAdvisor
          year={year}
          event={eventName}
          driver={driver || "LEC"}
          initialCompound={initialTyreData?.compound || "HARD"}
          currentStintLaps={initialTyreData?.stint_laps ?? 18}
        />
      </motion.div>

      {/* Row 3.10 — Hands-Free Pit-Wall Voice Synthesizer */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.49 }}
      >
        <VoicePitWallAudio
          driver={driver || "LEC"}
          pitWindowLap={34}
          cliffLap={38}
          lastTacticalMessage={Array.isArray(strat?.rationale) ? strat.rationale[0] : (typeof strat?.rationale === "string" ? strat.rationale : undefined)}
        />
      </motion.div>

      {/* Row 3.11 — Head-to-Head Ghost Lap Telemetry Trace Overlay */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.495 }}
      >
        <GhostLapOverlay
          year={year}
          event={eventName}
          session={session}
          initialDriver1={driver || "LEC"}
          initialDriver2={targetDriver || strat?.competitor_ahead || "PIA"}
          lap={selectedLap ?? 15}
        />
      </motion.div>

      {/* Row 3.12 — 6-Axis Driver Telemetry Performance Radar */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.498 }}
      >
        <DriverRadarChart
          year={year}
          event={eventName}
          session={session}
          driver={driver || "LEC"}
          compareDriver={targetDriver || strat?.competitor_ahead || "PIA"}
        />
      </motion.div>

      {/* Row 4 — Catch-Up & Overtake Predictor */}
      <motion.div
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.5 }}
      >
        <CatchUpPredictorCard
          currentLap={selectedLap ?? strat.gap_sampled_at_lap ?? 38}
          totalLaps={totalLaps ?? 53}
          initialGapSeconds={strat.current_gap_seconds ?? 5.4}
          driver={driver || "PIA"}
          targetDriver={targetDriver || strat.competitor_ahead || "LEC"}
          driverCompound={initialTyreData?.compound || "HARD"}
          targetCompound="HARD"
          driverStintLaps={initialTyreData?.stint_laps ?? 10}
          targetStintLaps={23}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Row 5 — Scenario comparison cards
          `isolate` creates a new stacking context so that when
          AnimatePresence expands ScenarioComparison the animated
          overflow cannot bleed visually into Row 2 above it. */}
      {showScenario && (
        <motion.div
          className="isolate"
          initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 2 }}
        >
          <ScenarioComparison
            year={year}
            event={eventName}
            sessionType={session}
            driver={driver}
            targetDriver={targetDriver ?? null}
          />
        </motion.div>
      )}
      {/* Bottom end-of-deck marker */}
      <div className="flex items-center justify-center py-4 border-t border-border/30 text-[0.58rem] font-mono text-foreground-faint uppercase tracking-widest">
        <span>FIA Pit-Wall Telemetry Stream End — All Strategy Modules Synchronized</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StrategyCanvasEmpty — shown before first Analyze or while loading.
// Skeletons mirror the real layout so the canvas always has shape.
// ---------------------------------------------------------------------------

interface StrategyCanvasEmptyProps {
  isLoading: boolean;
  driver: string;
  eventName: string;
}

function StrategyCanvasEmpty({ isLoading, driver, eventName }: StrategyCanvasEmptyProps) {
  const isReady = Boolean(driver) && Boolean(eventName);

  if (isLoading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
        <div className="h-16 animate-pulse border border-border bg-surface-elevated/40" />
        <div className="flex flex-1 gap-4">
          <div className="flex-1 animate-pulse border border-border bg-surface-elevated/40" />
          <div className="w-24 animate-pulse border border-border bg-surface-elevated/40" />
        </div>
        <div className="h-44 animate-pulse border border-border bg-surface-elevated/40" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-28 animate-pulse border border-border bg-surface-elevated/40" />
          <div className="h-28 animate-pulse border border-border bg-surface-elevated/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-4">
      <div className="border border-dashed border-border px-8 py-6 text-center">
        <p className="label mb-3 text-foreground-dim">Strategy Canvas</p>
        {isReady ? (
          <p className="readout text-[0.7rem] text-foreground-dim">
            Press{" "}
            <span className="font-bold text-accent">Analyze</span>
            {" "}in Strategy mode to see the pit window timeline,
            tyre wear curve, and what-if scenario comparison.
          </p>
        ) : (
          <p className="readout text-[0.65rem] text-foreground-faint">
            Select a Grand Prix, session, and driver above, then press Analyze.
          </p>
        )}
      </div>
    </div>
  );
}
