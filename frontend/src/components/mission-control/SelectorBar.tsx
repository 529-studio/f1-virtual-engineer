"use client";

import { useState } from "react";
import { Layers, SlidersHorizontal, X } from "lucide-react";
import type { AnalyzeResponse, EventInfo, LapInfo, SavedQueryItem } from "@/services/api";
import type { ExportParams } from "@/types/telemetry-advanced";
import type { ExportStatus } from "@/hooks/useAdvancedTelemetry";
import { SESSIONS, f1Seasons, type SessionId } from "./constants";
import { Select, VDivider } from "./primitives";
import { formatLapTime } from "./TelemetryChart";
import { StarButton } from "./StarButton";
import { HelpModal } from "./HelpModal";
import { ExportButton } from "./ExportButton";
import type { MissionIntent } from "./IntentTabBar";

export function SelectorBar({
  year, setYear,
  eventName, setEvent, events, eventsLoading,
  session, setSession,
  driver, setDriver, drivers, driversLoading, driversFallback,
  setFetchedDrivers, setDriversFallback, setDriversLoading,
  lap, setLap, laps, lapsLoading, fastestLapNumber, lapOverlayLoading,
  setLaps, setFastestLapNumber, setLapsLoading, setLapOverlayLoading,
  compareDriver, setCompareDriver, compareLoading,
  setCompareSpeedSeries, setCompareLoading,
  compareYear, setCompareYear, setCrossYearDelta,
  result, isLoading, canRun, onAnalyze,
  savedQueries, onSavedQueriesChange,
  onOpenStintCompare, onExport, exportStatus = "idle", exportError = null,
}: {
  year: number;
  setYear: (n: number) => void;
  eventName: string;
  setEvent: (s: string) => void;
  events: EventInfo[];
  eventsLoading: boolean;
  session: SessionId;
  setSession: (s: SessionId) => void;
  driver: string;
  setDriver: (s: string) => void;
  drivers: readonly string[];
  driversLoading: boolean;
  driversFallback: boolean;
  setFetchedDrivers: (v: readonly string[] | null) => void;
  setDriversFallback: (v: boolean) => void;
  setDriversLoading: (v: boolean) => void;
  lap: string;
  setLap: (s: string) => void;
  laps: LapInfo[];
  lapsLoading: boolean;
  fastestLapNumber: number | null;
  lapOverlayLoading: boolean;
  setLaps: (v: LapInfo[]) => void;
  setFastestLapNumber: (n: number | null) => void;
  setLapsLoading: (v: boolean) => void;
  setLapOverlayLoading: (v: boolean) => void;
  compareDriver: string;
  setCompareDriver: (s: string) => void;
  compareLoading: boolean;
  setCompareSpeedSeries: (v: number[] | null) => void;
  setCompareLoading: (v: boolean) => void;
  compareYear: number | null;
  setCompareYear: (n: number | null) => void;
  setCrossYearDelta: (v: null) => void;
  intent: MissionIntent;
  result: AnalyzeResponse | null;
  isLoading: boolean;
  canRun: boolean;
  onAnalyze: () => void;
  savedQueries: SavedQueryItem[];
  onSavedQueriesChange: (items: SavedQueryItem[]) => void;
  onOpenStintCompare?: () => void;
  onExport?: (params: ExportParams) => Promise<boolean>;
  exportStatus?: ExportStatus;
  exportError?: string | null;
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [showCompareMobile, setShowCompareMobile] = useState(Boolean(compareDriver || compareYear));

  const yearOptions    = f1Seasons().map((y) => ({ id: String(y), label: String(y) }));
  const eventOptions   = events.map((e) => ({ id: e.name, label: e.name }));
  const sessionOptions = SESSIONS.map((s) => ({ id: s.id, label: s.label }));
  const driverOptions  = drivers.map((d) => ({ id: d, label: d }));
  const compareDriverOptions = drivers
    .filter((d) => d !== driver)
    .map((d) => ({ id: d, label: d }));
  const compareYearOptions = f1Seasons()
    .filter((y) => y !== year)
    .map((y) => ({ id: String(y), label: String(y) }));
  const lapOptions = laps.map((l) => {
    const lapTime = l.lap_time_seconds != null ? formatLapTime(l.lap_time_seconds) : null;
    const tag =
      l.lap_number === fastestLapNumber ? "FAST"
      : l.is_pit_in ? "PIT IN"
      : l.is_pit_out ? "OUT"
      : l.compound ?? "";
    const parts = [`L${l.lap_number}`, lapTime, tag].filter(Boolean);
    return { id: String(l.lap_number), label: parts.join(" · ") };
  });

  const handleYearChange = (v: string) => {
    setYear(Number(v));
    setDriver("");
    setFetchedDrivers(null);
    setDriversFallback(false);
    setLap("");
    setLaps([]);
    setFastestLapNumber(null);
    setCompareDriver("");
    setCompareSpeedSeries(null);
    // Cross-year (#229): clear when base year changes
    setCompareYear(null);
    setCrossYearDelta(null);
  };

  const handleEventChange = (v: string) => {
    setEvent(v);
    setDriver("");
    setFetchedDrivers(null);
    setDriversFallback(false);
    setDriversLoading(!!v);
    setLap("");
    setLaps([]);
    setFastestLapNumber(null);
    setCompareDriver("");
    setCompareSpeedSeries(null);
  };

  const handleSessionChange = (v: SessionId) => {
    setSession(v);
    setLap("");
    setLaps([]);
    setFastestLapNumber(null);
    setCompareSpeedSeries(null);
    if (eventName && driver) setLapsLoading(true);
    if (compareDriver) setCompareLoading(true);
  };

  const handleDriverChange = (v: string) => {
    setDriver(v);
    setLap("");
    setLaps([]);
    setFastestLapNumber(null);
    if (eventName && v) setLapsLoading(true);
    if (v && v === compareDriver) {
      setCompareDriver("");
      setCompareSpeedSeries(null);
    }
  };

  const handleLapChange = (v: string) => {
    setLap(v);
    if (v && result) setLapOverlayLoading(true);
  };

  const handleCompareDriverChange = (v: string) => {
    setCompareDriver(v);
    if (v) {
      setCompareLoading(true);
      // Mutually exclusive with cross-year (#229)
      setCompareYear(null);
      setCrossYearDelta(null);
    } else {
      setCompareSpeedSeries(null);
    }
  };

  const handleCompareYearChange = (v: string) => {
    const next = v ? Number(v) : null;
    setCompareYear(next);
    if (next) {
      setCompareDriver("");
      setCompareSpeedSeries(null);
    } else {
      setCrossYearDelta(null);
    }
  };

  return (
    <>
    <div className="flex shrink-0 flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 border-b border-border bg-surface-elevated px-3 sm:px-5 py-2 sm:py-2.5">
      {/* ─── Mobile View (< sm / 640px): Compact Summary Strip + Expandable Filter Drawer ─── */}
      <div className="flex sm:hidden flex-col gap-2 w-full">
        {/* Compact 1-Row Mobile Bar: Session Summary + Quick Tools + Analyze */}
        <div className="flex items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            aria-expanded={mobileFiltersOpen}
            aria-label={mobileFiltersOpen ? "Collapse session selectors" : "Expand session selectors"}
            className="flex flex-1 min-w-0 min-h-[44px] items-center justify-between gap-1.5 rounded border border-border bg-surface px-2.5 py-1.5 text-left text-xs font-mono text-foreground hover:border-accent transition-colors cursor-pointer"
          >
            <span className="truncate font-semibold">
              {year} · {eventName || "Select GP"} · {session} · {driver || "—"} {lap ? `· L${lap}` : ""}
            </span>
            <SlidersHorizontal className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={1.75} />
          </button>

          {onOpenStintCompare && (
            <button
              type="button"
              onClick={onOpenStintCompare}
              disabled={!driver}
              className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded border border-border bg-surface-elevated px-2 py-1 text-xs font-semibold uppercase text-foreground hover:border-accent hover:text-accent disabled:opacity-40 cursor-pointer"
              title="Compare laps"
              aria-label="Open Stint Comparison"
            >
              <Layers className="h-4 w-4 text-accent" />
            </button>
          )}

          {onExport && (
            <ExportButton
              onExport={onExport}
              exportStatus={exportStatus}
              exportError={exportError}
              year={year}
              event={eventName}
              session={session}
              driver={driver}
              lapNumber={lap}
            />
          )}

          <button
            type="button"
            onClick={onAnalyze}
            disabled={!canRun}
            className="btn btn--accent shrink-0 px-3 py-2 min-h-[44px] text-xs font-bold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-30 active:scale-95 transition-all shadow-md"
          >
            {isLoading ? "…" : (!driver || driversLoading || eventsLoading) ? "Sync" : "Analyze"}
          </button>
        </div>

        {mobileFiltersOpen && (
          <div className="flex flex-col gap-2 w-full pt-1 border-t border-border/50">
            {/* Row 1: Year (col-span-4) + Event (col-span-8) */}
            <div className="grid grid-cols-12 gap-1.5 w-full">
              <div className="col-span-4 min-w-0">
                <Select<string>
                  value={String(year)}
                  onChange={handleYearChange}
                  options={yearOptions}
                  placeholder="Year"
                  className="w-full"
                />
              </div>
              <div className="col-span-8 min-w-0">
                <Select<string>
                  value={eventName}
                  onChange={handleEventChange}
                  options={eventOptions}
                  loading={eventsLoading}
                  placeholder="Grand Prix"
                  className="w-full"
                />
              </div>
            </div>

            {/* Row 2: Session (col-span-4) + Driver (col-span-8) */}
            <div className="grid grid-cols-12 gap-1.5 w-full">
              <div className="col-span-4 min-w-0">
                <Select<SessionId>
                  value={session}
                  onChange={handleSessionChange}
                  options={sessionOptions}
                  placeholder="Session"
                  className="w-full"
                />
              </div>
              <div className="col-span-8 min-w-0 relative">
                <Select<string>
                  value={driver}
                  onChange={handleDriverChange}
                  options={driverOptions}
                  loading={driversLoading}
                  placeholder="Driver"
                  className="w-full"
                />
                {driversFallback && eventName ? (
                  <span className="absolute right-7 top-2 text-[0.55rem] text-foreground-faint font-mono" title="Live roster unavailable; using fallback list.">
                    est.
                  </span>
                ) : null}
              </div>
            </div>

            {/* Row 3: Lap Selector + Help + Star */}
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex-1 min-w-0">
                <Select<string>
                  value={lap}
                  onChange={handleLapChange}
                  options={lapOptions}
                  loading={lapsLoading}
                  placeholder="Lap"
                  className="w-full"
                />
              </div>

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="Open help"
                title="Help — selectors, HUD panels, F1 glossary"
                className="readout flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded border border-border text-xs text-foreground-faint transition-colors hover:border-foreground-dim hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent cursor-pointer"
              >
                ?
              </button>

              <StarButton
                kind="analyze"
                payload={{
                  query: compareDriver
                    ? `Analyse ${driver} vs ${compareDriver} at ${eventName} ${year} ${session}`
                    : `Analyse ${driver} ${session} session at ${eventName} ${year}`,
                  driver,
                  compare_driver: compareDriver || null,
                  session_info: { event: eventName, year, session_type: session },
                }}
                canSave={canRun}
                savedQueries={savedQueries}
                onChange={onSavedQueriesChange}
              />
            </div>

            {/* Row 4: Precision Lap Scrubber (if laps > 1) */}
            {laps.length > 1 && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-border/60 bg-surface/80 w-full" title="Drag to scrub race laps">
                <span className="readout text-[0.55rem] font-mono text-foreground-faint shrink-0">
                  L1
                </span>
                <input
                  type="range"
                  min={1}
                  max={laps.length}
                  value={Number(lap) || 1}
                  onChange={(e) => {
                    setLap(e.target.value);
                    if (result) setLapOverlayLoading(true);
                  }}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-surface-elevated accent-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  aria-label="Lap scrubber"
                />
                <span className="readout text-[0.6rem] font-mono font-bold text-accent shrink-0">
                  L{lap || 1}
                </span>
                <span className="readout text-[0.55rem] font-mono text-foreground-faint shrink-0">
                  /{laps.length}
                </span>
                {lapOverlayLoading ? (
                  <span className="label shrink-0 text-[0.55rem] text-foreground-faint animate-pulse">sync…</span>
                ) : null}
              </div>
            )}

            {/* Row 5: Compare Toggle & Controls */}
            {!showCompareMobile && !compareDriver && !compareYear ? (
              <div className="flex items-center justify-between pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowCompareMobile(true)}
                  className="readout min-h-[44px] text-[0.62rem] text-accent/90 hover:text-accent flex items-center gap-1 font-bold uppercase tracking-wider px-2 cursor-pointer"
                >
                  <span>+ Compare Driver / Cross-Year</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 w-full pt-1 border-t border-border/40">
                <div className="flex-1 min-w-0">
                  <Select<string>
                    value={compareDriver}
                    onChange={handleCompareDriverChange}
                    options={compareDriverOptions}
                    loading={compareLoading}
                    placeholder="vs Driver"
                    className="w-full"
                  />
                </div>
                <div className="w-28 shrink-0">
                  <Select<string>
                    value={compareYear ? String(compareYear) : ""}
                    onChange={handleCompareYearChange}
                    options={compareYearOptions}
                    placeholder="vs Year"
                    className="w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleCompareDriverChange("");
                    handleCompareYearChange("");
                    setShowCompareMobile(false);
                  }}
                  title="Clear comparison"
                  aria-label="Clear comparison"
                  className="readout h-11 w-11 min-h-[44px] min-w-[44px] flex shrink-0 items-center justify-center rounded border border-border/60 text-foreground-faint hover:text-foreground text-xs"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Desktop View (sm: and above): Proven Horizontal Flex Toolbar ─── */}
      <div className="hidden sm:flex shrink-0 flex-wrap items-center gap-2 w-full">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Select<string>
            value={String(year)}
            onChange={handleYearChange}
            options={yearOptions}
            placeholder="Year"
          />
          <VDivider />

          <Select<string>
            value={eventName}
            onChange={handleEventChange}
            options={eventOptions}
            loading={eventsLoading}
            placeholder="Grand Prix"
          />
          <VDivider />

          <Select<SessionId>
            value={session}
            onChange={handleSessionChange}
            options={sessionOptions}
            placeholder="Session"
          />
          <VDivider />

          <Select<string>
            value={driver}
            onChange={handleDriverChange}
            options={driverOptions}
            loading={driversLoading}
            placeholder="Driver"
          />
          {driversFallback && eventName ? (
            <span className="label shrink-0 text-foreground-faint" title="Live roster unavailable; using fallback list.">
              est.
            </span>
          ) : null}

          <VDivider />

          {/* F1: Shared Lap Selector & Scrubber */}
          <div className="flex items-center gap-2">
            <Select<string>
              value={lap}
              onChange={handleLapChange}
              options={lapOptions}
              loading={lapsLoading}
              placeholder="Lap"
            />

            {laps.length > 1 && (
              <div className="flex items-center gap-1.5 pl-1" title="Drag to scrub race laps">
                <span className="readout text-[0.55rem] font-mono text-foreground-faint">
                  L1
                </span>
                <input
                  type="range"
                  min={1}
                  max={laps.length}
                  value={Number(lap) || 1}
                  onChange={(e) => {
                    setLap(e.target.value);
                    if (result) setLapOverlayLoading(true);
                  }}
                  className="h-1.5 w-24 md:w-32 cursor-pointer appearance-none rounded-lg bg-surface-elevated accent-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  aria-label="Lap scrubber"
                />
                <span className="readout text-[0.55rem] font-mono font-bold text-foreground">
                  L{lap || 1}
                </span>
                <span className="readout text-[0.5rem] font-mono text-foreground-faint">
                  /{laps.length}
                </span>
              </div>
            )}

            {lapOverlayLoading ? (
              <span className="label shrink-0 text-foreground-faint">syncing…</span>
            ) : null}
          </div>

          <VDivider />

          <Select<string>
            value={compareDriver}
            onChange={handleCompareDriverChange}
            options={compareDriverOptions}
            loading={compareLoading}
            placeholder="vs Driver"
          />

          <VDivider />

          <Select<string>
            value={compareYear ? String(compareYear) : ""}
            onChange={handleCompareYearChange}
            options={compareYearOptions}
            placeholder="vs Year"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onOpenStintCompare && (
            <button
              type="button"
              onClick={onOpenStintCompare}
              disabled={!driver}
              className="flex h-11 min-h-[44px] items-center gap-1.5 rounded border border-border bg-surface-elevated px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-foreground hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40 transition-colors cursor-pointer"
              title="Compare telemetry curves between two laps of this driver"
              aria-label="Open Stint Comparison"
            >
              <Layers className="h-4 w-4 text-accent" />
              <span className="hidden xl:inline">Stint Compare</span>
            </button>
          )}

          {onExport && (
            <ExportButton
              onExport={onExport}
              exportStatus={exportStatus}
              exportError={exportError}
              year={year}
              event={eventName}
              session={session}
              driver={driver}
              lapNumber={lap}
            />
          )}

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Open help"
            title="Help — selectors, HUD panels, F1 glossary"
            className="readout flex h-7 w-7 min-h-[28px] min-w-[28px] shrink-0 items-center justify-center rounded-full border border-border text-[0.65rem] text-foreground-faint transition-colors hover:border-foreground-dim hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            ?
          </button>

          <StarButton
            kind="analyze"
            payload={{
              query: compareDriver
                ? `Analyse ${driver} vs ${compareDriver} at ${eventName} ${year} ${session}`
                : `Analyse ${driver} ${session} session at ${eventName} ${year}`,
              driver,
              compare_driver: compareDriver || null,
              session_info: { event: eventName, year, session_type: session },
            }}
            canSave={canRun}
            savedQueries={savedQueries}
            onChange={onSavedQueriesChange}
          />

          <button
            onClick={onAnalyze}
            disabled={!canRun}
            className="btn btn--accent shrink-0 disabled:cursor-not-allowed disabled:opacity-30"
          >
            {isLoading ? "Computing…" : (!driver || driversLoading || eventsLoading) ? "Syncing…" : "Analyze"}
          </button>
        </div>
      </div>
    </div>

    {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </>
  );
}
