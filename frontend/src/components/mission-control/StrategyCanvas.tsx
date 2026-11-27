"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CloudRain, Gauge, Timer } from "lucide-react";
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
import { GhostLapOverlay } from "./GhostLapOverlay";
import { PitExitCard } from "./PitExitCard";
import { CatchUpPredictorCard } from "./CatchUpPredictorCard";
import { DriverRadarChart } from "./DriverRadarChart";
import { DrsOptimizerCard } from "./DrsOptimizerCard";
import type { SessionId } from "./constants";
import {
  CANVAS_ANIM_DURATION,
  CANVAS_ANIM_STAGGER,
  CANVAS_ANIM_Y_OFFSET,
} from "./strategy-canvas.constants";

type StrategyDeckTab = "pit" | "pace" | "track";

const STRATEGY_DECK_TABS: readonly {
  id: StrategyDeckTab;
  label: string;
  Icon: typeof Timer;
}[] = [
  { id: "pit", label: "Pit & Tyre", Icon: Timer },
  { id: "pace", label: "Pace & Aero", Icon: Gauge },
  { id: "track", label: "Track & Stewards", Icon: CloudRain },
];

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
  const [deckTab, setDeckTab] = useState<StrategyDeckTab>("pit");

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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 sm:px-6 py-4">
      {/* Sub-tab Deck Switcher — lazy-mounts heavy modules to avoid cold-load stampede */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div
          role="tablist"
          aria-label="Strategy deck sections"
          className="flex flex-wrap items-center gap-1.5"
        >
          {STRATEGY_DECK_TABS.map(({ id, label, Icon }) => {
            const active = deckTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDeckTab(id)}
                className={`readout inline-flex min-h-[44px] items-center gap-1.5 rounded border px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  active
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border bg-surface text-foreground-dim hover:border-foreground-dim hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <span className="hidden xl:inline-flex items-center gap-1.5 text-[0.6rem] font-mono uppercase tracking-wider text-foreground-faint">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <span>Strategy Deck Active</span>
        </span>
      </div>

      {deckTab === "pit" && (
        <>
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

          {/* Row 3 — Tyre Card + Gap Gauge */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER }}
          >
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

          {/* Pirelli Tyre Degradation & Stint Cliff Advisor */}
          <motion.div
            initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.15 }}
          >
            <StintCliffAdvisor
              year={year}
              event={eventName}
              driver={driver || "LEC"}
              initialCompound={initialTyreData?.compound || "HARD"}
              currentStintLaps={initialTyreData?.stint_laps ?? 18}
            />
          </motion.div>

          {/* Catch-Up & Overtake Predictor */}
          <motion.div
            initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.25 }}
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

          {/* Scenario comparison cards */}
          {showScenario && (
            <motion.div
              className="isolate"
              initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER * 1.35 }}
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
        </>
      )}

      {deckTab === "pace" && (
        <>
          <PaceDeltaMatrix
            year={year}
            event={eventName}
            session={session}
            initialReferenceDriver={driver || "LEC"}
            lap={selectedLap}
          />
          <GhostLapOverlay
            year={year}
            event={eventName}
            session={session}
            initialDriver1={driver || "LEC"}
            initialDriver2={targetDriver || strat?.competitor_ahead || "PIA"}
            lap={selectedLap ?? 15}
          />
          <DriverRadarChart
            year={year}
            event={eventName}
            session={session}
            driver={driver || "LEC"}
            compareDriver={targetDriver || strat?.competitor_ahead || "PIA"}
          />
          <DrsOptimizerCard
            year={year}
            event={eventName}
            session={session}
            driver={driver || "LEC"}
            compareDriver={targetDriver || strat?.competitor_ahead || "PIA"}
          />
        </>
      )}

      {deckTab === "track" && (
        <>
          <TyreThermalHeatmap
            year={year}
            event={eventName}
            session={session}
            driver={driver}
            lap={selectedLap}
          />
          <RaceControlPanel
            year={year}
            event={eventName}
            session={session}
            selectedLap={selectedLap}
          />
          <WeatherRadarPanel
            year={year}
            event={eventName}
            session={session}
            selectedLap={selectedLap}
          />
        </>
      )}

      {/* Bottom end-of-deck marker */}
      <div className="flex items-center justify-center py-4 border-t border-border/30 text-[0.58rem] font-mono text-foreground-faint uppercase tracking-widest">
        <span>FIA Pit-Wall Telemetry Stream End — Strategy Deck</span>
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
