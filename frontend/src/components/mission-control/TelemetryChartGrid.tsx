"use client";

import { useEffect, useState, useMemo } from "react";
import { Maximize2 } from "lucide-react";
import { lookupKnowledge } from "@/services/api";
import type { AnalyzeResponse, CornerInfo, KnowledgeCitation, LapDeltaCrossYearResponse, LapDeltaResponse, WeatherSummaryResponse } from "@/services/api";
import { getCornerEnvelope } from "@/lib/corner-analytics";
import { LapDeltaChart } from "./LapDeltaChart";
import { ReferencesPanel } from "./ReferencesPanel";
import { TelemetryChart } from "./TelemetryChart";
import { TimeAxis } from "./TimeAxis";
import { WeatherMismatchBadge } from "./WeatherMismatchBadge";

export function TelemetryChartGrid({
  tel, isLoading, hasData, animateKey, compareDriver, compareSpeedSeries,
  driver, lapDelta, lapDeltaLoading,
  year, compareYear, crossYearDelta, crossYearLoading,
  weather, compareYearWeather,
  selectedCorner, trackLengthM, onSelectCorner,
}: {
  tel: AnalyzeResponse["telemetry_data"] | undefined;
  isLoading: boolean;
  hasData: boolean;
  animateKey: number;
  compareDriver: string;
  compareSpeedSeries: number[] | null;
  driver: string;
  lapDelta: LapDeltaResponse | null;
  lapDeltaLoading: boolean;
  year: number;
  compareYear: number | null;
  crossYearDelta: LapDeltaCrossYearResponse | null;
  crossYearLoading: boolean;
  weather: WeatherSummaryResponse | null;
  compareYearWeather: WeatherSummaryResponse | null;
  selectedCorner?: CornerInfo | null;
  trackLengthM?: number;
  onSelectCorner?: (corner: CornerInfo | null) => void;
}) {
  const [cornerFocusedRaw, setCornerFocusedRaw] = useState(false);
  const isCornerFocused = selectedCorner ? cornerFocusedRaw : false;

  // Derive active corner fractional envelope along lap
  const cornerFractionRange = useMemo(() => {
    if (!selectedCorner) return null;
    const totalDist = trackLengthM && trackLengthM > 0 ? trackLengthM : 5800;
    const envelope = getCornerEnvelope(selectedCorner, totalDist);
    return {
      start: Math.max(0, envelope.entryDistance / totalDist),
      end: Math.min(1, envelope.exitDistance / totalDist),
      label: `Turn ${selectedCorner.number}${selectedCorner.letter || ""}`,
    };
  }, [selectedCorner, trackLengthM]);
  const lapDurationS = tel?.lap_duration_s ?? null;
  const sectorBoundariesS = tel?.sector_boundaries_s ?? [];
  const fallback = Boolean(tel?.fallback);
  // Sector lines on each chart: fractions of the X axis, derived from boundary seconds / lap duration.
  const sectorFractions =
    hasData && lapDurationS && lapDurationS > 0
      ? sectorBoundariesS.map((s) => s / lapDurationS).filter((f) => f > 0 && f < 1)
      : undefined;

  // Cross-year citation chip (#229 slice 4). Triggers a knowledge_lookup
  // whenever the chart actually has data — pre-fallback responses don't
  // earn a chip, since "telemetry unavailable" isn't an interesting RAG
  // question. Query is just "{driver} {year_a} vs {year_b}" so the
  // BM25 scorer can hit car_w14_to_w15_*, regulation_2026_*, etc.
  const [crossYearCitations, setCrossYearCitations] = useState<KnowledgeCitation[] | undefined>(undefined);
  const showCrossYear = Boolean(
    compareYear && driver && compareYear !== year,
  );
  const crossYearHasData = Boolean(
    crossYearDelta && !crossYearDelta.fallback && (crossYearDelta.delta_seconds?.length ?? 0) > 1,
  );
  useEffect(() => {
    // Stale citations from a previous (driver, year, compareYear) tuple
    // are gated by `showCrossYear` in the JSX, so we don't reset them
    // synchronously here — that would trip react-hooks/set-state-in-effect.
    // The next valid effect run replaces them.
    if (!showCrossYear || !crossYearHasData || !compareYear) return;
    let cancelled = false;
    const earlier = Math.min(year, compareYear);
    const later = Math.max(year, compareYear);
    void lookupKnowledge(`${driver} ${earlier} vs ${later} car generation`).then((cites) => {
      if (!cancelled) setCrossYearCitations(cites);
    });
    return () => { cancelled = true; };
  }, [showCrossYear, crossYearHasData, driver, year, compareYear]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-0 px-6 py-4">
      {hasData && fallback && (
        <div
          className="status-bar mb-3 flex shrink-0 items-center gap-2 border px-3 py-2"
          data-status="warn"
          style={{ borderColor: "var(--status-warn)", background: "var(--status-warn-dim)" }}
        >
          <span className="status-pill" data-status="warn">FALLBACK</span>
          <span className="readout text-[length:var(--text-readout)] text-foreground">
            {tel?.fallback_reason ?? "Live telemetry unavailable — showing estimate"}
          </span>
        </div>
      )}

      {/* Selected Corner Zoom & Highlight Banner */}
      {selectedCorner && (
        <div className="mb-3 flex shrink-0 items-center justify-between rounded border border-border/80 bg-surface px-3 py-1.5 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="readout text-[0.7rem] font-bold text-foreground">
              Turn {selectedCorner.number}{selectedCorner.letter || ""}
            </span>
            <span className="text-[0.62rem] text-foreground-faint">
              ({Math.round(selectedCorner.distance)}m envelope: -160m / +100m)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCornerFocusedRaw((prev) => !prev)}
              className="flex items-center gap-1.5 rounded border border-border/80 bg-surface-raised px-2.5 py-1 text-[0.65rem] font-semibold text-foreground hover:border-accent hover:text-accent transition-colors cursor-pointer"
            >
              <Maximize2 size={11} className={isCornerFocused ? "text-accent" : ""} />
              {isCornerFocused ? "Full Lap View" : `Zoom Turn ${selectedCorner.number}`}
            </button>
            <button
              type="button"
              onClick={() => {
                setCornerFocusedRaw(false);
                onSelectCorner?.(null);
              }}
              className="text-[0.62rem] text-foreground-faint hover:text-foreground transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {(["Speed", "Throttle", "Brake"] as const).map((label, i) => {
        const ch = label === "Speed"    ? tel?.speed
                 : label === "Throttle" ? tel?.throttle
                 :                        tel?.brake;
        const overlay = label === "Speed" && compareSpeedSeries && compareDriver
          ? { compareSeries: compareSpeedSeries, compareLabel: compareDriver }
          : {};
        return (
          <div key={label} className={`min-h-[105px] lg:min-h-0 flex-1 ${i > 0 ? "mt-3" : ""}`}>
            <TelemetryChart
              label={label}
              unit={label === "Speed" ? "KPH" : "%"}
              mode={label === "Speed" ? "line" : "area"}
              channelData={ch}
              isLoading={isLoading}
              hasData={hasData}
              animateKey={animateKey}
              sectorFractions={sectorFractions}
              highlightFractionRange={cornerFractionRange}
              sliceRange={isCornerFocused && cornerFractionRange ? { startFraction: cornerFractionRange.start, endFraction: cornerFractionRange.end } : null}
              {...overlay}
            />
          </div>
        );
      })}

      {compareDriver ? (
        <div className="mt-3 min-h-0 flex-1">
          <LapDeltaChart
            distances={lapDelta?.distance_m ?? []}
            deltas={lapDelta?.delta_seconds ?? []}
            referenceDriver={driver}
            compareDriver={compareDriver}
            isLoading={lapDeltaLoading}
            hasData={Boolean(
              lapDelta && !lapDelta.fallback && (lapDelta.delta_seconds?.length ?? 0) > 1,
            )}
            animateKey={animateKey}
            fallback={Boolean(lapDelta?.fallback)}
            fallbackReason={lapDelta?.fallback_reason ?? null}
          />
        </div>
      ) : null}

      {/* Cross-year Δt (#229): same chart, different question. Labels
          carry the year, not driver — the LapDeltaChart treats
          referenceDriver/compareDriver as opaque tokens for the legend
          and the warn/accent semantics still hold (positive ⇒ year_b
          slower at that distance ⇒ older car was faster there). */}
      {showCrossYear ? (
        <div className="mt-3 min-h-0 flex-1">
          <LapDeltaChart
            distances={crossYearDelta?.distance_m ?? []}
            deltas={crossYearDelta?.delta_seconds ?? []}
            referenceDriver={`${driver} ${compareYear}`}
            compareDriver={`${driver} ${year}`}
            isLoading={crossYearLoading}
            hasData={crossYearHasData}
            animateKey={animateKey}
            fallback={Boolean(crossYearDelta?.fallback)}
            fallbackReason={crossYearDelta?.fallback_reason ?? null}
          />
          {crossYearHasData && compareYear ? (
            <WeatherMismatchBadge
              yearA={year}
              yearB={compareYear}
              weatherA={weather}
              weatherB={compareYearWeather}
            />
          ) : null}
          {crossYearHasData && crossYearCitations && crossYearCitations.length > 0 ? (
            <ReferencesPanel items={crossYearCitations} />
          ) : null}
        </div>
      ) : null}

      <TimeAxis
        lapDurationS={hasData ? lapDurationS : null}
        sectorBoundariesS={sectorBoundariesS}
        showYGutter={hasData}
      />
    </div>
  );
}
