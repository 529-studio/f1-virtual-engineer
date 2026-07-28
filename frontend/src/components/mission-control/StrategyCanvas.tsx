"use client";

import { motion } from "framer-motion";
import type { AnalyzeResponse, StrategyData } from "@/services/api";
import { PitWindowTimeline } from "./PitWindowTimeline";
import { GapGauge } from "./GapGauge";
import { ScenarioComparison } from "./ScenarioComparison";
import { TyreCard } from "./TyreCard";
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

      {/* Row 2 — Tyre Card + Gap Gauge
          NOTE: do NOT add min-h-0 here — it causes TyreCard to collapse
          to zero height when the canvas flex parent doesn't have explicit
          height, which makes ScenarioComparison visually overlap TyreCard. */}
      <motion.div
        className="flex gap-4"
        initial={{ opacity: 0, y: CANVAS_ANIM_Y_OFFSET }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: CANVAS_ANIM_DURATION, delay: CANVAS_ANIM_STAGGER }}
      >
        {/* TyreCard wrapper: flex-1 for width, but NO min-w-0/min-h-0
            so the card keeps its natural height. */}
        <div className="flex-1">
          <TyreCard year={year} event={eventName} session={session} driver={driver} />
        </div>

        {showGapGauge && (
          <div className="shrink-0">
            <GapGauge
              currentGap={strat.current_gap_seconds!}
              pitLoss={strat.pit_loss_seconds!}
              undercutRisk={strat.undercut_risk}
              competitor={strat.competitor_ahead}
            />
          </div>
        )}
      </motion.div>

      {/* Row 3 — Scenario comparison cards
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
