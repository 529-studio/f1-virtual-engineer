"use client";

import React from "react";
import {
  Clock,
  Flag,
} from "lucide-react";
import type {
  IncidentCategory,
  RaceControlCategoryFilter,
  RaceControlMessageItem,
} from "@/types/race-control";

export interface RaceControlTimelineProps {
  items: RaceControlMessageItem[];
  selectedId: string | null;
  onSelectIncident: (id: string) => void;
  categoryFilter: RaceControlCategoryFilter;
  onFilterChange: (filter: RaceControlCategoryFilter) => void;
}

const CATEGORY_FILTERS: { key: RaceControlCategoryFilter; label: string }[] = [
  { key: "ALL", label: "ALL INCIDENTS" },
  { key: "COLLISION", label: "COLLISIONS" },
  { key: "TRACK_LIMITS", label: "TRACK LIMITS" },
  { key: "SAFETY_CAR_INFECT", label: "SAFETY CAR" },
  { key: "TECHNICAL_FLAG", label: "FLAGS / TECH" },
];

function getCategoryBadgeColor(cat: IncidentCategory): string {
  switch (cat) {
    case "COLLISION":
      return "bg-red-950/80 text-red-300 border-red-700/80";
    case "TRACK_LIMITS":
      return "bg-amber-950/80 text-amber-300 border-amber-700/80";
    case "SAFETY_CAR_INFECT":
      return "bg-yellow-950/80 text-yellow-300 border-yellow-700/80";
    default:
      return "bg-sky-950/80 text-sky-300 border-sky-700/80";
  }
}

export function RaceControlTimeline({
  items,
  selectedId,
  onSelectIncident,
  categoryFilter,
  onFilterChange,
}: RaceControlTimelineProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Category Filter Bar (Kiosk ergonomics >= 44px) */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        role="region"
        aria-label="Race Control Category Filters"
      >
        {CATEGORY_FILTERS.map((f) => {
          const isActive = categoryFilter === f.key;
          return (
            <button
              key={f.key}
              data-testid={`category-filter-${f.key}`}
              onClick={() => onFilterChange(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-mono min-h-[44px] min-w-[44px] border shrink-0 transition-all ${
                isActive
                  ? "bg-neutral-800 text-cyan-300 border-cyan-500 font-bold shadow-md shadow-cyan-950/40"
                  : "bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:bg-neutral-850 hover:text-neutral-200"
              }`}
              aria-pressed={isActive}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Incidents Timeline Stream */}
      <div
        className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1"
        role="feed"
        aria-label="Race Control Incidents Timeline"
      >
        {items.length === 0 ? (
          <div className="p-6 rounded-lg border border-dashed border-neutral-800 text-center text-neutral-500 font-mono text-xs">
            No incidents detected in this filter category.
          </div>
        ) : (
          items.map((item) => {
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                data-testid={`incident-item-${item.id}`}
                onClick={() => onSelectIncident(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectIncident(item.id);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                aria-label={`Incident on Lap ${item.lap}: ${item.message}`}
                className={`flex flex-col p-3 rounded-lg border transition-all cursor-pointer min-h-[52px] ${
                  isSelected
                    ? "bg-neutral-900/95 border-cyan-500 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-950/30"
                    : "bg-neutral-900/50 border-neutral-800 hover:bg-neutral-900/80 hover:border-neutral-700"
                }`}
              >
                {/* Meta Row: Lap, Time, Category, Status */}
                <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs font-mono font-bold">
                      LAP {item.lap}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-neutral-400">
                      <Clock className="w-3 h-3 text-neutral-500" strokeWidth={1.5} />
                      {item.timestamp_str}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${getCategoryBadgeColor(
                        item.category
                      )}`}
                    >
                      {item.category.replace("_", " ")}
                    </span>
                    {item.flag && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-950 border border-neutral-800 text-neutral-300">
                        <Flag className="w-2.5 h-2.5 text-yellow-400" strokeWidth={1.5} />
                        {item.flag}
                      </span>
                    )}
                  </div>
                </div>

                {/* Official Message Banner */}
                <p className="text-xs font-mono font-bold text-neutral-200 break-words leading-snug">
                  {item.message}
                </p>

                {/* Subtext description & Drivers Involved */}
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-neutral-800/60 text-[11px] font-mono text-neutral-400">
                  <span className="truncate max-w-[260px] text-neutral-400">{item.description}</span>
                  {(item.drivers_involved || []).length > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {(item.drivers_involved || []).map((d) => (
                        <span
                          key={d}
                          className="px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-neutral-200 font-bold text-[10px]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
