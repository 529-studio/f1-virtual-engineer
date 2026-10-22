"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ControversyFinding, PitExitResponse, TyreAnalyzeResponse } from "@/services/api";
import { PitExitCard } from "./PitExitCard";
import { TyreCard } from "./TyreCard";
import { StewardsViewPanel } from "./StewardsViewPanel";
import type { SessionId } from "./constants";

export interface MissionBoardProps {
  lap: number;
  totalLaps: number;
  pitExit: PitExitResponse | null;
  tyreStatus: TyreAnalyzeResponse | null;
  stewardsFindings: ControversyFinding[];
  isLoading?: boolean;
  year: number;
  eventName: string;
  session: SessionId;
  driver: string;
}

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "var(--status-error)",
  MEDIUM: "var(--status-warn)",
  HARD: "var(--foreground)",
  INTERMEDIATE: "var(--status-info)",
  WET: "var(--status-info)",
};

const STORAGE_COLLAPSE_KEY = "apex_mission_board_collapsed";

export function MissionBoard({
  lap,
  totalLaps,
  pitExit,
  tyreStatus,
  stewardsFindings,
  isLoading,
  year,
  eventName,
  session,
  driver,
}: MissionBoardProps) {
  const [expandedCard, setExpandedCard] = useState<"pit_exit" | "tyre" | "stewards" | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COLLAPSE_KEY);
      if (saved === "true") {
        queueMicrotask(() => setIsCollapsed(true));
      }
    } catch {
      // ignore in private mode
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_COLLAPSE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleExpand = (card: "pit_exit" | "tyre" | "stewards") => {
    setExpandedCard((curr) => (curr === card ? null : card));
  };

  // Find most relevant incident for current lap
  const relevantIncident = stewardsFindings.find(
    (f) => Math.abs(f.lap - lap) <= 3
  ) ?? stewardsFindings[0];

  const hasIncidentNearLap = Boolean(
    relevantIncident && Math.abs(relevantIncident.lap - lap) <= 3
  );

  // Skeleton shimmer for zero-input cold paint
  if (isLoading && !pitExit && !tyreStatus) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-5 py-3 border-b border-border bg-surface/50">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded border border-border bg-surface-elevated/40 p-3 animate-pulse"
          >
            <div className="flex justify-between items-center mb-2">
              <div className="h-3 w-20 bg-surface rounded" />
              <div className="h-3 w-12 bg-surface rounded" />
            </div>
            <div className="h-5 w-36 bg-surface rounded mb-2" />
            <div className="h-3 w-48 bg-surface rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Derive Pit Exit preview text
  const projPos = pitExit?.projected_position ?? 1;
  const isContested = pitExit?.position_is_contested ?? false;
  const pitHeadline = isContested ? `PIT NOW → P${projPos} or P${projPos + 1}` : `PIT NOW → P${projPos}`;
  const carAhead = pitExit?.car_ahead;
  const pitSubtitle = carAhead
    ? `out behind ${carAhead.driver_code} +${carAhead.gap_s.toFixed(1)}s · ${
        pitExit?.traffic_state === "DRS_RANGE" ? "DRS range" : "traffic"
      }`
    : pitExit?.fallback
    ? pitExit.fallback_reason ?? "Pace window establishing"
    : "clean air ahead in lead";

  // Derive Tyre status preview
  const compound = tyreStatus?.compound ?? "HARD";
  const stintLaps = tyreStatus?.stint_laps ?? (lap <= 15 ? lap : lap - 15);
  const cliffEst = tyreStatus?.cliff_lap_estimate ?? (lap <= 15 ? 18 : 42);
  const lapsToCliff = cliffEst - stintLaps;
  const tyreHeadline =
    lapsToCliff <= 0
      ? "Pace drop imminent · cliff reached"
      : `~${lapsToCliff} laps before predicted cliff`;
  const tyreSubtitle = `${compound} compound · L${stintLaps} on tyres`;

  // ─── Collapsed 1-Line Telemetry Ribbon Mode ─────────────────────────────
  if (isCollapsed) {
    return (
      <section className="border-b border-border bg-surface/90 px-4 py-2 flex items-center justify-between text-xs font-mono transition-all">
        <div className="flex items-center gap-3 md:gap-5 overflow-x-auto min-w-0 pr-2">
          {/* Pit Exit pill */}
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              setExpandedCard("pit_exit");
            }}
            className="flex shrink-0 items-center gap-1.5 hover:text-foreground text-left cursor-pointer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span className="text-foreground-faint text-[0.62rem] uppercase tracking-wider">Pit Exit:</span>
            <span className="font-bold text-foreground text-[0.68rem]">{pitHeadline}</span>
          </button>

          <span className="text-border shrink-0">|</span>

          {/* Tyre pill */}
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              setExpandedCard("tyre");
            }}
            className="flex shrink-0 items-center gap-1.5 hover:text-foreground text-left cursor-pointer"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: COMPOUND_COLORS[compound] ?? "var(--status-warn)" }}
            />
            <span className="text-foreground-faint text-[0.62rem] uppercase tracking-wider">Tyre:</span>
            <span className="text-foreground text-[0.68rem]">{tyreHeadline}</span>
          </button>

          {/* Stewards pill */}
          <span className="text-border shrink-0">|</span>
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              setExpandedCard("stewards");
            }}
            className="flex shrink-0 items-center gap-1.5 hover:text-foreground text-left cursor-pointer"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            <span className="text-foreground-faint text-[0.62rem] uppercase tracking-wider">Steward:</span>
            <span className="text-foreground text-[0.68rem] truncate max-w-[200px]">
              {hasIncidentNearLap && relevantIncident
                ? `L${relevantIncident.lap} ${relevantIncident.event_type.replace(/_/g, " ")}`
                : "Green (No incidents)"}
            </span>
          </button>
        </div>

        {/* Expand button */}
        <button
          type="button"
          onClick={handleToggleCollapse}
          title="Expand Mission Board"
          aria-label="Expand Mission Board"
          className="readout shrink-0 flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-wider text-accent border border-accent/40 bg-accent/10 px-2.5 py-1 rounded hover:bg-accent/20 cursor-pointer"
        >
          <span>Expand</span>
          <span className="text-xs leading-none">↓</span>
        </button>
      </section>
    );
  }

  // ─── Expanded 3-Card Grid Mode ──────────────────────────────────────────
  return (
    <section className="border-b border-border bg-surface px-5 py-2.5 relative">
      {/* Top Header Row with Collapse Control */}
      <div className="flex items-center justify-between mb-2">
        <span className="label text-[0.58rem] uppercase tracking-widest text-foreground-dim">
          Mission Strategy Overview
        </span>
        <button
          type="button"
          onClick={handleToggleCollapse}
          title="Collapse to compact ribbon to maximize chart height"
          aria-label="Collapse Mission Board"
          className="readout flex items-center gap-1 text-[0.6rem] uppercase tracking-wider text-foreground-faint hover:text-foreground px-2 py-0.5 rounded hover:bg-surface-elevated cursor-pointer transition-colors"
        >
          <span>Collapse</span>
          <span className="text-xs leading-none">↑</span>
        </button>
      </div>

      {/* 3 Story Cards Tap-to-Expand Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: PIT EXIT CALL */}
        <button
          type="button"
          onClick={() => toggleExpand("pit_exit")}
          className={`group text-left rounded border transition-all p-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer ${
            expandedCard === "pit_exit"
              ? "border-accent bg-surface-elevated shadow-md"
              : "border-border bg-surface hover:border-foreground-dim"
          }`}
          aria-expanded={expandedCard === "pit_exit"}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="label text-[0.6rem] uppercase tracking-wider text-accent font-semibold">
              Pit Exit Call
            </span>
            <span className="readout text-[0.55rem] font-mono uppercase text-foreground-faint group-hover:text-foreground">
              {expandedCard === "pit_exit" ? "collapse ↑" : "details →"}
            </span>
          </div>
          <p className="readout font-mono text-sm font-bold text-foreground">
            {pitHeadline}
          </p>
          <p className="text-[0.68rem] text-foreground-dim truncate mt-0.5">
            {pitSubtitle}
          </p>
          <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1 text-[0.58rem] font-mono text-foreground-faint">
            <span>AS OF L{lap} / {totalLaps}</span>
            <span className="text-foreground-dim">Monza · 22.0s loss</span>
          </div>
        </button>

        {/* Card 2: TYRE STATUS */}
        <button
          type="button"
          onClick={() => toggleExpand("tyre")}
          className={`group text-left rounded border transition-all p-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer ${
            expandedCard === "tyre"
              ? "border-accent bg-surface-elevated shadow-md"
              : "border-border bg-surface hover:border-foreground-dim"
          }`}
          aria-expanded={expandedCard === "tyre"}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="label text-[0.6rem] uppercase tracking-wider text-amber-400 font-semibold">
              Tyre Status
            </span>
            <span
              className="readout border px-1 py-0.2 rounded text-[0.5rem] font-mono uppercase font-bold"
              style={{
                borderColor: COMPOUND_COLORS[compound] ?? "var(--foreground-dim)",
                color: COMPOUND_COLORS[compound] ?? "var(--foreground)",
              }}
            >
              {compound}
            </span>
          </div>
          <p className="readout font-mono text-sm font-bold text-foreground">
            {tyreHeadline}
          </p>
          <p className="text-[0.68rem] text-foreground-dim truncate mt-0.5">
            {tyreSubtitle}
          </p>
          <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1 text-[0.58rem] font-mono text-foreground-faint">
            <span>AS OF L{lap} / {totalLaps}</span>
            <span className="text-foreground-dim">Cliff est L{cliffEst}</span>
          </div>
        </button>

        {/* Card 3: STEWARD'S VIEW */}
        <button
          type="button"
          onClick={() => toggleExpand("stewards")}
          className={`group text-left rounded border transition-all p-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer ${
            expandedCard === "stewards"
              ? "border-accent bg-surface-elevated shadow-md"
              : "border-border bg-surface hover:border-foreground-dim"
          }`}
          aria-expanded={expandedCard === "stewards"}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="label text-[0.6rem] uppercase tracking-wider text-cyan-400 font-semibold">
              Steward&apos;s View
            </span>
            <span className="readout text-[0.55rem] font-mono uppercase text-foreground-faint group-hover:text-foreground">
              {expandedCard === "stewards" ? "collapse ↑" : "details →"}
            </span>
          </div>
          {hasIncidentNearLap && relevantIncident ? (
            <>
              <p className="readout font-mono text-sm font-bold text-foreground truncate">
                L{relevantIncident.lap} {relevantIncident.event_type.replace(/_/g, " ").toUpperCase()}
              </p>
              <p className="text-[0.68rem] text-foreground-dim truncate mt-0.5">
                {relevantIncident.drivers.join(" / ")} · {relevantIncident.question}
              </p>
              <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1 text-[0.58rem] font-mono text-foreground-faint">
                <span>AS OF L{lap} / {totalLaps}</span>
                <span className="text-foreground-dim">{relevantIncident.verdict_likelihood}</span>
              </div>
            </>
          ) : (
            <>
              <p className="readout font-mono text-sm font-semibold text-foreground truncate">
                Track status green
              </p>
              <p className="text-[0.68rem] text-foreground-dim truncate mt-0.5">
                No stewards inquiry at this point in the race
              </p>
              <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-1 text-[0.58rem] font-mono text-foreground-faint">
                <span>AS OF L{lap} / {totalLaps}</span>
                <span className="text-foreground-dim">All cars compliant</span>
              </div>
            </>
          )}
        </button>
      </div>

      {/* Expanded view container */}
      <AnimatePresence>
        {expandedCard === "pit_exit" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden border-t border-border pt-3"
          >
            <PitExitCard
              projection={pitExit}
              event={eventName}
              driver={driver}
              lap={lap}
            />
          </motion.div>
        )}

        {expandedCard === "tyre" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden border-t border-border pt-3"
          >
            <TyreCard
              year={year}
              event={eventName}
              session={session}
              driver={driver}
            />
          </motion.div>
        )}

        {expandedCard === "stewards" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden border-t border-border pt-3"
          >
            <StewardsViewPanel findings={stewardsFindings} />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
