"use client";

import { useEffect, useState } from "react";
import { lookupKnowledge } from "@/services/api";
import type { AnalyzeResponse, KnowledgeCitation, LapDeltaCrossYearResponse, LapDeltaResponse, WeatherSummaryResponse } from "@/services/api";
import { LapDeltaChart } from "./LapDeltaChart";
import { ReferencesPanel } from "./ReferencesPanel";
import { TelemetryChart } from "./TelemetryChart";
import { TimeAxis } from "./TimeAxis";
import { TrackMapPanel } from "./TrackMapPanel";
import { WeatherMismatchBadge } from "./WeatherMismatchBadge";

export function TelemetryChartGrid({
  tel, isLoading, hasData, animateKey, compareDriver, compareSpeedSeries,
  driver, lapDelta, lapDeltaLoading,
  year, event, session_type, lapNumber,
  compareYear, crossYearDelta, crossYearLoading,
  weather, compareYearWeather,
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
  /** Grand Prix name — passed to TrackMapPanel */
  event: string;
  /** Session code (R/Q/FP1 etc.) — passed to TrackMapPanel */
  session_type: string;
  /** Currently selected lap number (null = fastest) */
  lapNumber?: number | null;
  compareYear: number | null;
  crossYearDelta: LapDeltaCrossYearResponse | null;
  crossYearLoading: boolean;
  weather: WeatherSummaryResponse | null;
  compareYearWeather: WeatherSummaryResponse | null;
}) {
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

      {/* ── Flex-1 area: telemetry charts + delta charts grow to fill available height ── */}
      <div className="flex min-h-0 flex-1 flex-col gap-0">
        {(["Speed", "Throttle", "Brake"] as const).map((label, i) => {
          const ch = label === "Speed"    ? tel?.speed
                   : label === "Throttle" ? tel?.throttle
                   :                        tel?.brake;
          const overlay = label === "Speed" && compareSpeedSeries && compareDriver
            ? { compareSeries: compareSpeedSeries, compareLabel: compareDriver }
            : {};
          return (
            <div key={label} className={`min-h-0 flex-1 ${i > 0 ? "mt-3" : ""}`}>
              <TelemetryChart
                label={label}
                unit={label === "Speed" ? "KPH" : "%"}
                mode={label === "Speed" ? "line" : "area"}
                channelData={ch}
                isLoading={isLoading}
                hasData={hasData}
                animateKey={animateKey}
                sectorFractions={sectorFractions}
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

        {/* Cross-year Δt — same chart, different question. */}
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
      </div>

      {/* ── Shrink-0 area: TimeAxis then Track Map — never steals height from charts ── */}
      <div className="shrink-0">
        <TimeAxis
          lapDurationS={hasData ? lapDurationS : null}
          sectorBoundariesS={sectorBoundariesS}
          showYGutter={hasData}
        />

        {/* Track Map — always uses fastest lap for complete circuit shape.
            Rendered below TimeAxis so the time axis aligns with charts above. */}
        {event && session_type && driver ? (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="label">Track Map</span>
              <span className="readout text-[0.5rem] uppercase tracking-widest text-foreground-faint">
                Fastest Lap
              </span>
              {hasData && tel?.lap_number ? (
                <span className="readout ml-auto border border-border px-1.5 py-0.5 text-[0.5rem] uppercase tracking-widest text-foreground-faint">
                  Charts: Lap {tel.lap_number}
                </span>
              ) : null}
            </div>
            <TrackMapPanel
              year={year}
              event={event}
              session_type={session_type}
              driver={driver}
              lap_number={null}
              compare_driver={compareDriver || null}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
