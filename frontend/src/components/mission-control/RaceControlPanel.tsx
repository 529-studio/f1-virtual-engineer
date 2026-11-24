"use client";

import React from "react";
import {
  AlertTriangle,
  RotateCcw,
  Scale,
  Info,
} from "lucide-react";
import { useRaceControl } from "@/hooks/useRaceControl";
import { RaceControlTimeline } from "./RaceControlTimeline";
import { StewardInvestigationCard } from "./StewardInvestigationCard";

export interface RaceControlPanelProps {
  year?: number;
  event?: string;
  session?: string;
}

export function RaceControlPanel({
  year = 2023,
  event = "Singapore Grand Prix",
  session = "Race",
}: RaceControlPanelProps) {
  const {
    feed,
    filteredItems,
    selectedIncident,
    investigation,
    categoryFilter,
    status,
    investigationLoading,
    error,
    selectIncident,
    setCategoryFilter,
    reload,
  } = useRaceControl({
    year,
    event,
    session,
  });

  // 1. Loading Skeleton State
  if (status === "loading" && !feed) {
    return (
      <div
        className="w-full flex flex-col gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 backdrop-blur-md animate-pulse"
        role="status"
        aria-label="Loading race control feed"
      >
        <div className="flex items-center justify-between">
          <div className="h-6 w-52 bg-neutral-800 rounded" />
          <div className="h-9 w-32 bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5 h-80 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
          <div className="lg:col-span-7 h-80 bg-neutral-900/60 rounded-xl border border-neutral-800/80" />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (status === "error" && !feed) {
    return (
      <div
        className="w-full p-5 rounded-xl border border-red-900/60 bg-red-950/20 backdrop-blur-md text-neutral-200"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="flex-1">
            <h4 className="text-sm font-mono font-bold text-red-300">
              Race Control Feed Error
            </h4>
            <p className="text-xs font-mono text-neutral-400 mt-1">
              {error || "Failed to retrieve race control messages for this session."}
            </p>
            <button
              onClick={() => reload()}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded bg-red-950 border border-red-800 text-xs font-mono text-red-200 hover:bg-red-900/80 min-h-[46px] min-w-[46px] transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-red-400" strokeWidth={1.75} />
              <span>Retry Race Control Feed</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Empty State
  if (!feed || feed.items.length === 0) {
    return (
      <div className="w-full p-6 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center">
        <Info className="w-6 h-6 text-neutral-500 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-xs font-mono text-neutral-400">
          No race control incidents recorded for {event} {year}.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="race-control-panel"
      className="w-full flex flex-col gap-4 rounded-xl border border-neutral-800/80 bg-neutral-950/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-cyan-400" strokeWidth={1.75} />
            <h2 className="text-sm font-mono font-bold tracking-wide text-neutral-100 uppercase">
              AI Race Control &amp; Steward Investigation Engine
            </h2>
          </div>
          <p className="text-xs font-mono text-neutral-400 mt-0.5">
            {event} {year} • Official FIA FastF1 Incident Ingestion &amp; Regulatory RAG
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => reload()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 text-xs font-mono min-h-[46px] min-w-[46px] transition-colors"
            aria-label="Reload race control feed"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.75} />
            <span>Sync Feed</span>
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Cockpit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Incident Timeline */}
        <div className="lg:col-span-5 w-full overflow-hidden">
          <RaceControlTimeline
            items={filteredItems}
            selectedId={selectedIncident?.id || null}
            onSelectIncident={selectIncident}
            categoryFilter={categoryFilter}
            onFilterChange={setCategoryFilter}
          />
        </div>

        {/* Right: Active Steward Investigation & Probability Breakdown */}
        <div className="lg:col-span-7 w-full overflow-hidden">
          <StewardInvestigationCard
            investigation={investigation}
            isLoading={investigationLoading}
            incident={selectedIncident}
          />
        </div>
      </div>
    </div>
  );
}
