"use client";

import type { RadioMessage } from "@/types/radio";
import {
  Radio,
  Clock,
  AlertTriangle,
  RotateCcw,
  Zap,
} from "lucide-react";

interface RadioPlaylistProps {
  messages: RadioMessage[];
  activeId: string | null;
  onSelect: (message: RadioMessage) => void;
  driverFilter: string;
  onFilterChange: (driver: string) => void;
  status: "idle" | "loading" | "loaded" | "error";
  onRetry: () => void;
}

const DRIVER_OPTIONS = ["ALL", "SAI", "NOR", "RUS", "HAM", "VER", "LEC"];

export function RadioPlaylist({
  messages,
  activeId,
  onSelect,
  driverFilter,
  onFilterChange,
  status,
  onRetry,
}: RadioPlaylistProps) {
  return (
    <div className="flex h-full flex-col space-y-3">
      {/* Driver Filter Horizontal Selector Bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground-faint mr-1">
          Driver:
        </span>
        {DRIVER_OPTIONS.map((code) => {
          const isActive = driverFilter.toUpperCase() === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => onFilterChange(code)}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded border px-3 text-xs font-mono font-bold tracking-wider transition-all ${
                isActive
                  ? "border-accent bg-accent/20 text-accent shadow-sm"
                  : "border-border bg-surface/40 text-foreground-dim hover:border-border-accent hover:text-foreground"
              }`}
              aria-pressed={isActive}
              aria-label={`Filter by driver ${code}`}
            >
              {code}
            </button>
          );
        })}
      </div>

      {/* State 1: Skeleton Loading State */}
      {status === "loading" && (
        <div className="space-y-2 py-2" aria-label="Loading radio playlist">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex h-14 animate-pulse items-center justify-between rounded border border-border/40 bg-surface/20 px-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-10 rounded bg-border/40" />
                <div className="h-4 w-36 rounded bg-border/30" />
              </div>
              <div className="h-4 w-12 rounded bg-border/20" />
            </div>
          ))}
        </div>
      )}

      {/* State 2: Error State with Retry Button */}
      {status === "error" && (
        <div className="flex flex-col items-center justify-center rounded border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertTriangle className="mb-2 h-7 w-7 text-red-400" strokeWidth={1.5} />
          <p className="text-xs font-mono font-medium text-red-300">
            Failed to connect to team radio telemetry feed
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3.5 flex min-h-[44px] min-w-[44px] items-center gap-2 rounded border border-red-500/40 bg-surface px-4 py-2 text-xs font-mono font-bold text-red-200 transition-colors hover:bg-red-500/20"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            RETRY CONNECTION
          </button>
        </div>
      )}

      {/* State 3: Empty State when filter yields 0 items */}
      {status !== "loading" && status !== "error" && messages.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded border border-border bg-surface/30 p-8 text-center">
          <Radio className="mb-2 h-8 w-8 text-foreground-faint" strokeWidth={1.5} />
          <p className="text-xs font-mono uppercase tracking-wider text-foreground-dim">
            No radio transmissions match filter &ldquo;{driverFilter}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => onFilterChange("ALL")}
            className="mt-4 flex min-h-[44px] min-w-[44px] items-center gap-1.5 rounded border border-border bg-surface px-4 py-2 text-xs font-mono text-accent transition-colors hover:border-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
            RESET FILTER
          </button>
        </div>
      )}

      {/* List of Messages */}
      {status !== "loading" && status !== "error" && messages.length > 0 && (
        <div className="max-h-[340px] space-y-1.5 overflow-y-auto pr-1">
          {messages.map((item) => {
            const isSelected = activeId === item.id;
            const teamColor = item.team_color || "#3671C6";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`flex min-h-[44px] w-full items-center justify-between rounded border px-3 py-2 text-left transition-all ${
                  isSelected
                    ? "border-accent bg-accent/15 shadow-sm"
                    : "border-border/60 bg-surface/40 hover:border-border-accent hover:bg-surface/80"
                }`}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`Select radio from ${item.driver_code}`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {/* Driver Code Badge */}
                  <span
                    className="flex h-6 min-w-[36px] items-center justify-center rounded px-1.5 text-[11px] font-mono font-bold"
                    style={{
                      backgroundColor: `${teamColor}20`,
                      color: "#FFFFFF",
                      border: `1px solid ${teamColor}50`,
                    }}
                  >
                    {item.driver_code}
                  </span>

                  {/* Transcript preview */}
                  <div className="truncate">
                    <p className="truncate text-xs font-sans text-foreground">
                      {item.transcript}
                    </p>
                    <span className="text-[10px] font-mono text-foreground-dim uppercase">
                      {item.classification.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Right side lap / time badge */}
                <div className="flex items-center gap-1.5 pl-2 text-[11px] font-mono text-foreground-dim flex-shrink-0">
                  {item.lap_number ? (
                    <span>L{item.lap_number}</span>
                  ) : (
                    <Clock className="h-3 w-3" strokeWidth={1.5} />
                  )}
                  {isSelected && (
                    <Zap className="h-3 w-3 text-accent animate-pulse" strokeWidth={2} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
