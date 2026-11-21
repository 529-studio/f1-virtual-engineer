"use client";

import { useState } from "react";
import { Activity, Zap } from "lucide-react";
import type { MiniSectorSegment } from "@/types/live-advanced";

interface MiniSectorBarProps {
  segments: MiniSectorSegment[];
  driver1Code?: string;
  driver2Code?: string;
  isLoading?: boolean;
}

export function MiniSectorBar({
  segments,
  driver1Code = "VER",
  driver2Code = "NOR",
  isLoading = false,
}: MiniSectorBarProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 rounded border border-border bg-surface p-3 animate-pulse">
        <div className="h-3.5 w-32 rounded bg-surface-elevated" />
        <div className="h-6 w-full rounded bg-surface-elevated" />
      </div>
    );
  }

  if (!segments || segments.length === 0) {
    return null;
  }

  // Count micro-sectors won
  const d1Wins = segments.filter((s) => s.dominantDriverCode === driver1Code).length;
  const d2Wins = segments.filter((s) => s.dominantDriverCode === driver2Code).length;
  const hoveredSegment = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div
      className="flex flex-col gap-2 rounded border border-border bg-surface p-3"
      role="region"
      aria-label="AWS-style Mini-Sector Dominance Map"
    >
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          <span className="readout text-[0.68rem] font-bold uppercase tracking-wider text-foreground">
            Mini-Sector Dominance
          </span>
        </div>

        <div className="flex items-center gap-3 text-[0.65rem]">
          <span className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segments[0]?.dominantTeamColor || "#3671C6" }}
            />
            <span className="font-bold text-foreground">{driver1Code}</span>
            <span className="text-foreground-faint">({d1Wins})</span>
          </span>
          <span className="text-border">|</span>
          <span className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: segments[segments.length - 1]?.dominantTeamColor || "#FF8000" }}
            />
            <span className="font-bold text-foreground">{driver2Code}</span>
            <span className="text-foreground-faint">({d2Wins})</span>
          </span>
        </div>
      </div>

      {/* Mini-sector Blocks Grid */}
      <div className="relative flex h-6 w-full items-center gap-0.5 rounded overflow-hidden bg-surface-elevated p-0.5 border border-border/60">
        {segments.map((seg, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <button
              key={seg.sectorIndex}
              type="button"
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="h-full flex-1 rounded-xs transition-transform duration-100 cursor-pointer hover:scale-y-125 hover:z-10"
              style={{
                backgroundColor: seg.dominantTeamColor,
                opacity: isHovered ? 1 : 0.85,
              }}
              title={`Mini-Sector ${seg.sectorIndex}: ${seg.dominantDriverCode} (${seg.deltaSeconds > 0 ? `+${seg.deltaSeconds}s` : `${seg.deltaSeconds}s`})`}
              aria-label={`Mini Sector ${seg.sectorIndex}`}
            />
          );
        })}
      </div>

      {/* Active hover inspector readout */}
      <div className="flex items-center justify-between text-[0.62rem] font-mono text-foreground-dim min-h-[16px]">
        {hoveredSegment ? (
          <>
            <span className="font-semibold text-accent">
              Mini-Sector {hoveredSegment.sectorIndex} / {segments.length}
            </span>
            <span className="flex items-center gap-1 text-foreground">
              <Zap className="h-3 w-3 text-accent" />
              <span className="font-bold">{hoveredSegment.dominantDriverCode}</span>
              <span className="text-foreground-dim">faster by</span>
              <span className="font-bold text-emerald-400">
                {Math.abs(hoveredSegment.deltaSeconds).toFixed(3)}s
              </span>
            </span>
          </>
        ) : (
          <span className="text-foreground-faint italic">
            Hover individual micro-sectors to inspect delta advantages along the lap
          </span>
        )}
      </div>
    </div>
  );
}
