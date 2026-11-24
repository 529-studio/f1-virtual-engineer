"use client";

import React from "react";
import {
  FileText,
  Gavel,
  Scale,
  ShieldAlert,
  Zap,
} from "lucide-react";
import type {
  PenaltyType,
  RaceControlMessageItem,
  StewardInvestigationResponse,
} from "@/types/race-control";

export interface StewardInvestigationCardProps {
  investigation: StewardInvestigationResponse | null;
  isLoading: boolean;
  incident: RaceControlMessageItem | null;
}

function getVerdictColor(verdict: PenaltyType): { bg: string; text: string; border: string } {
  switch (verdict) {
    case "TIME_PENALTY_5S":
    case "TIME_PENALTY_10S":
    case "DRIVE_THROUGH":
      return {
        bg: "bg-red-950/80",
        text: "text-red-300",
        border: "border-red-600",
      };
    case "REPRIMAND":
      return {
        bg: "bg-amber-950/80",
        text: "text-amber-300",
        border: "border-amber-600",
      };
    case "NO_FURTHER_ACTION":
      return {
        bg: "bg-emerald-950/80",
        text: "text-emerald-300",
        border: "border-emerald-600",
      };
    default:
      return {
        bg: "bg-neutral-900",
        text: "text-neutral-300",
        border: "border-neutral-700",
      };
  }
}

function getBarColor(penalty: PenaltyType): string {
  switch (penalty) {
    case "TIME_PENALTY_5S":
      return "#EF4444";
    case "TIME_PENALTY_10S":
      return "#B91C1C";
    case "NO_FURTHER_ACTION":
      return "#10B981";
    case "REPRIMAND":
      return "#F59E0B";
    case "DRIVE_THROUGH":
      return "#A855F7";
    default:
      return "#38BDF8";
  }
}

export function StewardInvestigationCard({
  investigation,
  isLoading,
  incident,
}: StewardInvestigationCardProps) {
  if (isLoading) {
    return (
      <div
        className="w-full h-full flex flex-col gap-4 p-4 rounded-xl border border-neutral-800 bg-neutral-950/70 animate-pulse backdrop-blur-md"
        role="status"
        aria-label="Deliberating steward investigation"
      >
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-neutral-800 rounded" />
          <div className="h-6 w-32 bg-neutral-800 rounded" />
        </div>
        <div className="h-28 bg-neutral-900/60 rounded-lg border border-neutral-800" />
        <div className="h-36 bg-neutral-900/60 rounded-lg border border-neutral-800" />
      </div>
    );
  }

  if (!investigation && !incident) {
    return (
      <div className="w-full p-8 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/40 text-center font-mono text-xs text-neutral-500">
        Select an incident from the timeline to initiate FIA Steward deliberation.
      </div>
    );
  }

  const verdictStyle = investigation ? getVerdictColor(investigation.predicted_verdict) : { bg: "", text: "", border: "" };

  return (
    <div className="w-full flex flex-col bg-neutral-950/80 rounded-xl border border-neutral-800/80 p-3 sm:p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
            <Gavel className="w-4 h-4 text-cyan-400" strokeWidth={1.75} />
            AI Steward Deliberation
          </span>
          {incident && (
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-xs font-mono font-bold text-neutral-300">
              LAP {incident.lap}
            </span>
          )}
        </div>

        {investigation && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${verdictStyle.bg} ${verdictStyle.text} ${verdictStyle.border}`}
            >
              {investigation.predicted_verdict.replace(/_/g, " ")}
            </span>
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] font-mono text-neutral-400">
              {investigation.confidence_pct}% CONFIDENCE
            </span>
          </div>
        )}
      </div>

      {investigation ? (
        <div className="flex flex-col gap-4 mt-4">
          {/* Arguments Grid: Team Defense vs Steward Prosecution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Team Defense Argument */}
            <div className="flex flex-col p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 mb-2">
                <Scale className="w-4 h-4 text-emerald-400" strokeWidth={1.75} />
                <span>TEAM DEFENSE ARGUMENT</span>
              </div>
              <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                {investigation.team_defense_argument}
              </p>
            </div>

            {/* Steward Prosecution Argument */}
            <div className="flex flex-col p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-400 mb-2">
                <ShieldAlert className="w-4 h-4 text-red-400" strokeWidth={1.75} />
                <span>STEWARD PROSECUTION ARGUMENT</span>
              </div>
              <p className="text-xs font-mono text-neutral-300 leading-relaxed">
                {investigation.steward_prosecution_argument}
              </p>
            </div>
          </div>

          {/* FIA Regulation Grounding Citation */}
          <div className="flex flex-col p-3 rounded-lg border border-neutral-800 bg-neutral-900/40">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="flex items-center gap-1.5 text-neutral-300 font-bold">
                <FileText className="w-4 h-4 text-purple-400" strokeWidth={1.75} />
                <span>{investigation.regulation_article}</span>
              </span>
              <span className="text-[10px] text-purple-300/80 font-semibold uppercase">
                FIA STATUTORY GROUNDING
              </span>
            </div>
            <p className="text-xs font-mono font-medium text-neutral-200 mb-1">
              {investigation.regulation_title}
            </p>
            <div className="p-2.5 rounded bg-neutral-950/80 border border-neutral-800/80 text-[11px] font-mono text-neutral-400 italic leading-relaxed">
              &quot;{investigation.regulation_snippet}&quot;
            </div>
          </div>

          {/* SVG Penalty Probability Distribution Breakdown */}
          <div className="flex flex-col p-3 rounded-lg border border-neutral-800 bg-neutral-900/50">
            <span className="text-xs font-mono font-bold text-neutral-300 mb-2.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" strokeWidth={1.75} />
              PENALTY PROBABILITY DISTRIBUTION (NORMALIZED 100%)
            </span>

            <div className="flex flex-col gap-2">
              {investigation.penalty_breakdown
                .filter((p) => p.probability_pct > 0)
                .map((item) => (
                  <div key={item.penalty} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-300 font-medium">
                        {item.penalty.replace(/_/g, " ")}
                      </span>
                      <span className="font-bold text-neutral-200">
                        {item.probability_pct}%
                      </span>
                    </div>

                    {/* Progress Bar Track */}
                    <div className="w-full h-2 rounded bg-neutral-800 overflow-hidden">
                      <div
                        className="h-full rounded transition-all duration-500"
                        style={{
                          width: `${item.probability_pct}%`,
                          backgroundColor: getBarColor(item.penalty),
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {item.description}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs font-mono text-neutral-400">
          Loading regulatory evidence...
        </div>
      )}
    </div>
  );
}
