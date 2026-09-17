"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  getCrossYearLapDelta, getEventLaps, getEventsByYear, getLapDelta,
  getPitExitProjection, getTelemetry, getWeatherSummary,
} from "@/services/api";
import type {
  AnalyzeHistoryItem, AnalyzeResponse, ControversyFinding, EventInfo,
  LapDeltaCrossYearResponse, LapDeltaResponse, LapInfo, PitExitResponse,
  SavedQueryItem, StrategyData, TelemetryHistoryItem, TrackMapResponse, TyreAnalyzeResponse, WeatherSummaryResponse,
} from "@/services/api";
import { useMissionStore } from "@/lib/store";
import { useSupabase } from "@/components/auth/SupabaseProvider";
import {
  CoachmarksModal,
  FALLBACK_DRIVERS, IntentTabBar, MissionBoard, MissionFooter, MissionHeader, NavRail,
  SelectorBar, StrategyHUD, TelemetryChartGrid, type SessionId,
} from "@/components/mission-control";
import { StrategyCanvas } from "@/components/mission-control/StrategyCanvas";
import { TrackMapPanel } from "@/components/mission-control/TrackMapPanel";
import { useDriverRoster } from "@/hooks/useDriverRoster";
import { useAnalyzeStream } from "@/hooks/useAnalyzeStream";

export default function MissionControlPage() {
  const { theme, result, setResult } = useMissionStore();
  const { session: authSession } = useSupabase();
  const [historyRefreshSignal, setHistoryRefreshSignal] = useState(0);
  const [telemetryHistoryRefreshSignal, setTelemetryHistoryRefreshSignal] = useState(0);
  const [radioHistoryRefreshSignal] = useState(0);
  const [savedQueries, setSavedQueries] = useState<SavedQueryItem[]>([]);

  const { streamState, isLoading, runStream } = useAnalyzeStream();

  // F4: DECIDED DEMO RACE: 2024 Italian Grand Prix (Monza) LEC
  const [year, setYear]       = useState<number>(2024);
  const [eventName, setEvent] = useState<string>("Italian Grand Prix");
  const [session, setSession] = useState<SessionId>("R");
  const [driver, setDriver]   = useState<string>("LEC");

  const [events, setEvents]               = useState<EventInfo[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const { fetchedDrivers, driversLoading, driversFallback } = useDriverRoster(year, eventName);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setFetchedDrivers = (_v: readonly string[] | null) => { /* managed by hook */ };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setDriversFallback = (_v: boolean) => { /* managed by hook */ };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const setDriversLoading = (_v: boolean) => { /* managed by hook */ };

  const drivers: readonly string[] =
    eventName && fetchedDrivers && fetchedDrivers.length > 0 ? fetchedDrivers : FALLBACK_DRIVERS;

  // F1: Shared lap cursor scrubbed across Strategy and Telemetry
  const [lap, setLap]                           = useState<string>("15");
  const [laps, setLaps]                         = useState<LapInfo[]>([]);
  const [fastestLapNumber, setFastestLapNumber] = useState<number | null>(33);
  const [lapsLoading, setLapsLoading]           = useState(false);
  const [lapOverlayLoading, setLapOverlayLoading] = useState(false);

  // When set, the Speed chart overlays this driver's fastest-lap trace as a dashed muted line.
  const [compareDriver, setCompareDriver]             = useState<string>("PIA");
  const [compareSpeedSeries, setCompareSpeedSeries]   = useState<number[] | null>(null);
  const [compareLoading, setCompareLoading]           = useState(false);

  // Issue #229: cross-year mode. Compares the SAME driver's fastest lap
  // at this event in `compareYear` vs the currently selected `year`.
  // Mutually exclusive with compareDriver — the same chart slot can't
  // host two different "vs" semantics without confusing the colours.
  const [compareYear, setCompareYear] = useState<number | null>(null);
  const [crossYearDelta, setCrossYearDelta] = useState<LapDeltaCrossYearResponse | null>(null);

  // Issue #184: per-distance Δt(reference vs compare). Loading state is
  // derived in the chart from "compareDriver set but no payload" — no
  // separate flag needed, which also keeps us out of the
  // react-hooks/set-state-in-effect rule.
  const [lapDelta, setLapDelta] = useState<LapDeltaResponse | null>(null);

  // Issue #235: per-session weather summary. Drives the header pill.
  // Refetches whenever year/event/session changes — same dependency
  // surface as the lap roster fetch below.
  const [weather, setWeather] = useState<WeatherSummaryResponse | null>(null);

  // Issue #242: cross-year weather mismatch. Second weather payload
  // for `compareYear` so the badge can compare conditions across the
  // two seasons. Stays null until cross-year mode is active.
  const [compareYearWeather, setCompareYearWeather] = useState<WeatherSummaryResponse | null>(null);

  // Issue #182: explicit intent toggle. Default "strategy" routes to the Strategy HUD
  // and reveals the pit window + pit exit card immediately on first run.
  const [intent, setIntent] = useState<"telemetry" | "strategy">("strategy");

  // Cleared on the next successful Analyze; surfaced in StrategyHUD when set.
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // Retry status for /analyze (#162). 'idle' once a request settles; 'retrying'
  // while the network-blip retry is mid-flight; 'failed' if even the retry
  // didn't surface a response — drives the "Try again" CTA in the HUD.
  const [retryState, setRetryState] = useState<"idle" | "retrying" | "failed">("idle");

  // F4: Static pre-baked demo race bundle for instant zero-latency cold landing
  const [demoRaceData, setDemoRaceData] = useState<{
    total_laps: number;
    fastest_lap_number: number;
    pit_loss_seconds: number;
    laps: LapInfo[];
    pit_exit_by_lap: Record<string, PitExitResponse>;
    tyre_status_by_lap: Record<string, TyreAnalyzeResponse>;
    stewards_findings: ControversyFinding[];
    strategy_data: StrategyData;
    compare_scenarios: unknown[];
    telemetry_data: AnalyzeResponse["telemetry_data"];
    track_map?: TrackMapResponse;
    weather?: WeatherSummaryResponse;
    lap_delta?: LapDeltaResponse;
    compare_speed_series?: number[];
  } | null>(null);

  const [livePitExit, setLivePitExit] = useState<PitExitResponse | null>(null);
  const [pitExitLoading, setPitExitLoading] = useState(false);

  const isDemoSession =
    year === 2024 &&
    eventName === "Italian Grand Prix" &&
    session === "R" &&
    driver === "LEC";

  const isDemoRace = isDemoSession && Boolean(demoRaceData);

  const currentPitExit: PitExitResponse | null = isDemoRace
    ? demoRaceData?.pit_exit_by_lap?.[lap || "15"] ?? null
    : !eventName || !driver || !lap
    ? null
    : livePitExit;

  const currentTyreStatus: TyreAnalyzeResponse | null = isDemoRace
    ? demoRaceData?.tyre_status_by_lap?.[lap || "15"] ?? null
    : null;

  const stewardsFindings: ControversyFinding[] =
    result?.controversy_analysis && result.controversy_analysis.length > 0
      ? result.controversy_analysis
      : demoRaceData?.stewards_findings ?? [];

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // F4: First-run users: hydrate immediately from static demo-race.json for zero-latency
  // cold paint with zero network/FastF1 calls.
  useEffect(() => {
    fetch("/demo-race.json")
      .then((r) => r.json())
      .then((demo) => {
        setDemoRaceData(demo);
        if (result === null) {
          setResult({
            status: "success",
            agent_response: "Italian Grand Prix 2024: Charles Leclerc pit strategy (Ferrari). Pitted on Lap 15 from Mediums to Hards, executing a winning 1-stop strategy.",
            query: "Pit strategy for LEC at Italian Grand Prix 2024 R",
            intent: {
              intent: "strategy_query",
              intent_type: "strategy",
              driver: "LEC",
              year: 2024,
              event: "Italian Grand Prix",
              session_type: "R",
            },
            strategy_data: demo.strategy_data,
            telemetry_data: demo.telemetry_data,
            controversy_analysis: demo.stewards_findings,
          });
        }
        if (demo.laps && demo.laps.length > 0) {
          setLaps(demo.laps);
        }
        if (demo.fastest_lap_number) {
          setFastestLapNumber(demo.fastest_lap_number);
        }
        if (demo.weather) {
          setWeather(demo.weather);
        }
        if (demo.lap_delta) {
          setLapDelta(demo.lap_delta);
        }
        if (demo.compare_speed_series) {
          setCompareSpeedSeries(demo.compare_speed_series);
        }
      })
      .catch(() => {
        if (result !== null) return;
        fetch("/fixture-default.json")
          .then((r) => r.json())
          .then((data) => {
            if (result === null) setResult(data as AnalyzeResponse);
          })
          .catch(() => {});
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    getEventsByYear(year)
      .then((res) => {
        if (cancelled) return;
        const today = new Date().toISOString().slice(0, 10);
        const visible = (res.events ?? []).filter(
          (e) => !e.event_date || e.event_date <= today,
        );
        setEvents(visible);
        if (!eventName) {
          setEvent(visible.at(-1)?.name ?? "");
        }
      })
      .catch(() => { if (!cancelled) setEvents([]); })
      .finally(() => { if (!cancelled) setEventsLoading(false); });
    return () => { cancelled = true; };
  }, [year, eventName]);

  // Issue #235: weather fetch.
  useEffect(() => {
    if (isDemoSession) return;
    if (!eventName) return;
    let cancelled = false;
    getWeatherSummary({ year, event: eventName, session_type: session })
      .then((res) => { if (!cancelled) setWeather(res); })
      .catch(() => { /* keep last good payload */ });
    return () => { cancelled = true; };
  }, [year, eventName, session, isDemoSession]);

  // Issue #242: parallel fetch for `compareYear`.
  useEffect(() => {
    if (isDemoSession) return;
    if (!eventName || !compareYear || compareYear === year) return;
    let cancelled = false;
    getWeatherSummary({ year: compareYear, event: eventName, session_type: session })
      .then((res) => { if (!cancelled) setCompareYearWeather(res); })
      .catch(() => { /* keep last good payload */ });
    return () => { cancelled = true; };
  }, [compareYear, eventName, session, year, isDemoSession]);

  // Driver roster is now managed by useDriverRoster hook above (localStorage cache + background refresh).

  // Lap roster — on demo race, laps are already hydrated from demo-race.json
  useEffect(() => {
    if (isDemoSession) return;
    if (!eventName || !driver) return;
    let cancelled = false;
    getEventLaps(year, eventName, session, driver)
      .then((res) => {
        if (!cancelled) {
          const loadedLaps = res.laps ?? [];
          setLaps(loadedLaps);
          setFastestLapNumber(res.fastest_lap_number);
          if (loadedLaps.length > 0) setLap(String(loadedLaps[0].lap_number));
        }
      })
      .catch(() => { if (!cancelled) { setLaps([]); setFastestLapNumber(null); } })
      .finally(() => { if (!cancelled) setLapsLoading(false); });
    return () => { cancelled = true; };
  }, [year, eventName, session, driver, isDemoSession]);

  // Live Pit Exit projection when not on demo race
  useEffect(() => {
    if (isDemoSession) return;
    if (!eventName || !driver || !lap) return;
    const lapNumber = Number(lap);
    if (!Number.isFinite(lapNumber) || lapNumber <= 0) return;
    let cancelled = false;
    queueMicrotask(() => setPitExitLoading(true));
    getPitExitProjection(
      { year, event: eventName, session: session as "R" | "S", driver, lap: lapNumber },
      authSession?.access_token,
    )
      .then((res) => {
        if (!cancelled) setLivePitExit(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setLivePitExit({
            as_of_lap: lapNumber,
            total_laps: laps.length || 53,
            current_position: 0,
            projected_position: 0,
            position_delta: 0,
            position_is_contested: false,
            car_ahead: null,
            car_behind: null,
            traffic_state: "TRAFFIC",
            pit_loss_s: 22.0,
            pit_loss_source: `per-track table: ${eventName}`,
            confidence: "LOW",
            confidence_reasons: [],
            assumptions: ["rivals hold pace", "no safety car"],
            field: [],
            notes: [],
            fallback: true,
            fallback_reason: err instanceof Error ? err.message : "Projection failed",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setPitExitLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDemoSession, year, eventName, session, driver, lap, authSession?.access_token, laps.length]);

  // Patch only `telemetry_data` on the existing analysis when a non-fastest lap is picked.
  // Agent narrative intentionally stays untouched — that requires a fresh /analyze run.
  useEffect(() => {
    if (isDemoSession || !result || !eventName || !driver || lap === "") return;
    const lapNumber = Number(lap);
    if (!Number.isFinite(lapNumber)) return;
    if (result.telemetry_data?.lap_number === lapNumber) return;

    let cancelled = false;
    getTelemetry(
      { year, event: eventName, session_type: session, driver, lap_number: lapNumber },
      authSession?.access_token,
    )
      .then((res) => {
        if (cancelled || !res.data) return;
        setResult({
          ...result,
          telemetry_data: {
            sample_points: res.data.sample_points,
            speed: res.data.speed,
            gear: res.data.gear,
            rpm: res.data.rpm,
            throttle: res.data.throttle ?? undefined,
            brake: res.data.brake ?? undefined,
            fallback: res.data.fallback,
            fallback_reason: res.data.fallback_reason ?? null,
            lap_number: res.data.lap_number ?? lapNumber,
            lap_duration_s: res.data.lap_duration_s ?? null,
            sector_boundaries_s: res.data.sector_boundaries_s ?? [],
          },
        });
        if (authSession && !res.data.fallback) setTelemetryHistoryRefreshSignal((n) => n + 1);
      })
      .catch(() => { /* silent — chart keeps existing series */ })
      .finally(() => { if (!cancelled) setLapOverlayLoading(false); });
    return () => { cancelled = true; };
  }, [lap, result, eventName, driver, session, year, setResult, authSession, isDemoSession]);

  // Compare-driver fastest-lap speed trace.
  useEffect(() => {
    if (isDemoSession || !compareDriver || !eventName) return;
    let cancelled = false;
    getTelemetry(
      { year, event: eventName, session_type: session, driver: compareDriver },
      authSession?.access_token,
    )
      .then((res) => {
        if (cancelled) return;
        setCompareSpeedSeries(res.data?.speed?.series ?? null);
        if (authSession && res.data && !res.data.fallback) {
          setTelemetryHistoryRefreshSignal((n) => n + 1);
        }
      })
      .catch(() => { if (!cancelled) setCompareSpeedSeries(null); })
      .finally(() => { if (!cancelled) setCompareLoading(false); });
    return () => { cancelled = true; };
  }, [compareDriver, year, eventName, session, authSession, isDemoSession]);

  // Issue #184: lap-delta fetch. Triggers only when both drivers and a
  // session/event are pinned. We don't synchronously flip a loading
  // flag here — the chart derives "loading" as "compareDriver set but
  // payload doesn't yet match the requested pair" (see lapDeltaLoading
  // below). Keeps the effect side-effect-free at sync time and
  // satisfies react-hooks/set-state-in-effect.
  useEffect(() => {
    if (isDemoSession || !compareDriver || !driver || !eventName || compareDriver === driver) return;
    let cancelled = false;
    getLapDelta({
      year,
      event: eventName,
      session_type: session,
      reference_driver: driver,
      compare_driver: compareDriver,
    })
      .then((res) => { if (!cancelled) setLapDelta(res); })
      .catch(() => { if (!cancelled) setLapDelta(null); });
    return () => { cancelled = true; };
  }, [driver, compareDriver, year, eventName, session, isDemoSession]);

  // Issue #229: cross-year fetch. Mirrors the lap-delta effect — fires
  // only when both years and a driver are pinned and the years differ.
  // Stays parked in its own effect so the two compare modes don't
  // share state and accidentally render half-stale chart data.
  useEffect(() => {
    if (!compareYear || !driver || !eventName || compareYear === year) return;
    let cancelled = false;
    getCrossYearLapDelta({
      event: eventName,
      session_type: session,
      driver,
      year_a: compareYear,
      year_b: year,
    })
      .then((res) => { if (!cancelled) setCrossYearDelta(res); })
      .catch(() => { if (!cancelled) setCrossYearDelta(null); });
    return () => { cancelled = true; };
  }, [compareYear, driver, eventName, session, year]);

  const canRun = !isLoading && !!eventName && !!driver;

  // Fire analyze once automatically when the page first has a complete
  // selector set (year + event + session + driver). The ref guards against
  // re-firing if the user changes a selector before the first result lands.
  const hasAutoAnalyzed = useRef(false);

  // Single source of truth for the analyze call. Takes explicit args so
  // history-click handlers can replay against fresh values without
  // waiting for setState to flush. handleAnalyze and handleSelect*
  // both funnel through here.
  const runAnalyze = useCallback(async (args: {
    year: number;
    eventName: string;
    session: SessionId;
    driver: string;
    targetDriver?: string;
    intent?: "telemetry" | "strategy";
  }) => {
    setRateLimitMessage(null);
    setRetryState("idle");
    const strategyMode = (args.intent ?? intent) === "strategy";
    const query = strategyMode
      ? args.targetDriver
        ? `Pit strategy for ${args.driver} chasing ${args.targetDriver} at ${args.eventName} ${args.year} ${args.session}`
        : `Pit strategy for ${args.driver} at ${args.eventName} ${args.year} ${args.session}`
      : `Analyse ${args.driver} ${args.session} session at ${args.eventName} ${args.year}`;

    const res = await runStream(
      {
        query,
        driver: args.driver,
        session_info: { event: args.eventName, year: args.year, session_type: args.session },
        target_driver: args.targetDriver || null,
      },
      authSession?.access_token,
      {
        onRateLimit: (msg) => { setRateLimitMessage(msg); setRetryState("idle"); },
        onRetry: () => setRetryState("retrying"),
      },
    );

    if (res) {
      setResult(res as AnalyzeResponse);
      setRetryState("idle");
      if (authSession) setHistoryRefreshSignal((n) => n + 1);
    } else if (streamState.stage !== "error" && !rateLimitMessage) {
      setRetryState("failed");
    }
  }, [runStream, setResult, authSession, intent, streamState.stage, rateLimitMessage]);

  const handleAnalyze = useCallback(async () => {
    if (!canRun) return;
    await runAnalyze({ year, eventName, session, driver, targetDriver: compareDriver, intent });
  }, [canRun, year, eventName, session, driver, compareDriver, intent, runAnalyze]);

  // One-shot auto-analyze: fires when the initial defaults are all ready.
  // hasAutoAnalyzed guards against re-firing on subsequent selector changes.
  useEffect(() => {
    if (hasAutoAnalyzed.current || isDemoSession) return;
    if (!eventName || !driver || isLoading) return;
    hasAutoAnalyzed.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runAnalyze({ year, eventName, session, driver });
  }, [eventName, driver, year, session, isLoading, runAnalyze, isDemoSession]);

  const handleSelectHistory = useCallback((item: AnalyzeHistoryItem) => {
    const nextYear = item.year ?? year;
    const nextEvent = item.event ?? eventName;
    const nextSession = (item.session_type as SessionId | null) ?? session;
    const nextDriver = item.driver ?? driver;
    if (item.year) setYear(item.year);
    if (item.event) setEvent(item.event);
    if (item.session_type) setSession(item.session_type as SessionId);
    if (item.driver) setDriver(item.driver);
    if (nextEvent && nextDriver) {
      void runAnalyze({ year: nextYear, eventName: nextEvent, session: nextSession, driver: nextDriver });
    }
  }, [year, eventName, session, driver, runAnalyze]);

  const handleSelectTelemetryHistory = useCallback((item: TelemetryHistoryItem) => {
    setYear(item.year);
    setEvent(item.event);
    setSession(item.session_type as SessionId);
    setDriver(item.driver);
    setLap(item.lap_number != null ? String(item.lap_number) : "");
    if (item.event && item.driver) {
      void runAnalyze({
        year: item.year,
        eventName: item.event,
        session: item.session_type as SessionId,
        driver: item.driver,
      });
    }
  }, [runAnalyze]);

  const handleSelectSaved = useCallback((item: SavedQueryItem) => {
    const p = item.payload as Record<string, unknown>;
    if (item.kind === "analyze") {
      const info = (p.session_info as Record<string, unknown> | undefined) ?? {};
      const nextYear = typeof info.year === "number" ? info.year : year;
      const nextEvent = typeof info.event === "string" ? info.event : eventName;
      const nextSession = (typeof info.session_type === "string" ? info.session_type : session) as SessionId;
      const nextDriver = typeof p.driver === "string" ? p.driver : driver;
      if (typeof info.year === "number") setYear(info.year);
      if (typeof info.event === "string") setEvent(info.event);
      if (typeof info.session_type === "string") setSession(info.session_type as SessionId);
      if (typeof p.driver === "string") setDriver(p.driver);
      // compare_driver was added in #153; older rows may lack it, treat
      // an explicit null or absence the same as "no comparison".
      if (typeof p.compare_driver === "string") setCompareDriver(p.compare_driver);
      else setCompareDriver("");
      if (nextEvent && nextDriver) {
        void runAnalyze({ year: nextYear, eventName: nextEvent, session: nextSession, driver: nextDriver });
      }
    } else if (item.kind === "telemetry") {
      const nextYear = typeof p.year === "number" ? p.year : year;
      const nextEvent = typeof p.event === "string" ? p.event : eventName;
      const nextSession = (typeof p.session_type === "string" ? p.session_type : session) as SessionId;
      const nextDriver = typeof p.driver === "string" ? p.driver : driver;
      if (typeof p.year === "number") setYear(p.year);
      if (typeof p.event === "string") setEvent(p.event);
      if (typeof p.session_type === "string") setSession(p.session_type as SessionId);
      if (typeof p.driver === "string") setDriver(p.driver);
      if (typeof p.lap_number === "number") setLap(String(p.lap_number));
      else setLap("");
      if (nextEvent && nextDriver) {
        void runAnalyze({ year: nextYear, eventName: nextEvent, session: nextSession, driver: nextDriver });
      }
    }
  }, [year, eventName, session, driver, runAnalyze]);

  const tel     = result?.telemetry_data;
  // During streaming, show partial strategy as soon as the strategy event arrives
  // so the pit window block reveals before the LLM rationale finishes.
  const strat   = result?.strategy_data ?? streamState.partialStrategy ?? null;
  const hasData = !isLoading && (!!result || streamState.stage === "done");
  const animKey = result ? 1 : 0;

  // Lap-delta loading is derived, not stored — the chart treats the
  // request as in-flight whenever a compare driver is picked but the
  // latest payload doesn't yet describe that driver pair.
  const lapDeltaLoading = Boolean(
    compareDriver && driver && (
      !lapDelta ||
      lapDelta.reference_driver !== driver ||
      lapDelta.compare_driver !== compareDriver
    ),
  );

  // Same derivation pattern for cross-year (#229) — request is in
  // flight when years differ but the latest payload doesn't yet
  // describe (driver, year_a=compareYear, year_b=year).
  const crossYearLoading = Boolean(
    compareYear && driver && compareYear !== year && (
      !crossYearDelta ||
      crossYearDelta.driver !== driver ||
      crossYearDelta.year_a !== compareYear ||
      crossYearDelta.year_b !== year
    ),
  );

  const displayDriver = result?.intent?.driver ?? driver ?? "—";
  const displayEvent  = result?.intent?.event  ?? eventName ?? "—";
  const displayLap = lap
    ? `LAP ${lap}${Number(lap) === fastestLapNumber ? " · FAST" : ""}`
    : tel?.lap_number != null
    ? `LAP ${tel.lap_number}${tel.lap_number === fastestLapNumber ? " · FAST" : ""}`
    : hasData ? "FAST LAP" : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <CoachmarksModal />
      <NavRail />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MissionHeader
          displayDriver={displayDriver} displayEvent={displayEvent} displayLap={displayLap}
          weather={weather}
        />

        {/* F4: First-run Mission Board (3 story cards: Pit Exit, Tyre Status, Steward's View) */}
        <MissionBoard
          lap={Number(lap) || 15}
          totalLaps={laps.length || demoRaceData?.total_laps || 53}
          pitExit={currentPitExit}
          tyreStatus={currentTyreStatus}
          stewardsFindings={stewardsFindings}
          isLoading={isLoading && !demoRaceData}
          year={year}
          eventName={eventName}
          session={session}
          driver={driver}
        />

        <SelectorBar
          year={year} setYear={setYear}
          eventName={eventName} setEvent={setEvent} events={events} eventsLoading={eventsLoading}
          session={session} setSession={setSession}
          driver={driver} setDriver={setDriver} drivers={drivers}
          driversLoading={driversLoading} driversFallback={driversFallback}
          setFetchedDrivers={setFetchedDrivers} setDriversFallback={setDriversFallback}
          setDriversLoading={setDriversLoading}
          lap={lap} setLap={setLap} laps={laps} lapsLoading={lapsLoading}
          fastestLapNumber={fastestLapNumber} lapOverlayLoading={lapOverlayLoading}
          setLaps={setLaps} setFastestLapNumber={setFastestLapNumber}
          setLapsLoading={setLapsLoading} setLapOverlayLoading={setLapOverlayLoading}
          compareDriver={compareDriver} setCompareDriver={setCompareDriver}
          compareLoading={compareLoading}
          setCompareSpeedSeries={setCompareSpeedSeries} setCompareLoading={setCompareLoading}
          compareYear={compareYear} setCompareYear={setCompareYear}
          setCrossYearDelta={setCrossYearDelta}
          intent={intent}
          result={result} isLoading={isLoading} canRun={canRun} onAnalyze={handleAnalyze}
          savedQueries={savedQueries} onSavedQueriesChange={setSavedQueries}
        />

        <IntentTabBar intent={intent} setIntent={setIntent} />

        {/* Task 1 (plan: strategy-canvas-layout): gate canvas on mode.
            Strategy mode renders StrategyCanvas with pit window timeline,
            tyre wear, gap gauge, and scenario cards — never blank charts.
            Telemetry mode is unchanged. */}
        {/* Content Area — fills remaining height after header + bars + footer */}
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          {intent === "strategy" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <StrategyCanvas
                result={result}
                strat={strat}
                hasData={hasData}
                isLoading={isLoading}
                year={year}
                eventName={eventName}
                session={session}
                driver={driver}
                targetDriver={compareDriver || null}
                pitExit={currentPitExit}
                selectedLap={Number(lap) || 15}
                pitExitLoading={!isDemoRace && pitExitLoading}
                initialTyreData={currentTyreStatus}
              />
            </div>
          ) : (
            <>
              {/* Left: Charts column (60%) */}
              <div className="flex min-h-0 w-[60%] flex-col border-r border-border">
                <TelemetryChartGrid
                  tel={tel} isLoading={isLoading} hasData={hasData} animateKey={animKey}
                  compareDriver={compareDriver} compareSpeedSeries={compareSpeedSeries}
                  driver={driver} lapDelta={lapDelta} lapDeltaLoading={lapDeltaLoading}
                  year={year} compareYear={compareYear}
                  crossYearDelta={crossYearDelta} crossYearLoading={crossYearLoading}
                  weather={weather} compareYearWeather={compareYearWeather}
                />
              </div>

              {/* Right: Track Map column (40%) */}
              {eventName && session && driver ? (
                <div className="flex min-h-0 w-[40%] flex-col px-4 py-4">
                  <div className="mb-2 flex shrink-0 items-center gap-2">
                    <span className="label text-[0.6rem] uppercase tracking-widest">Track Map</span>
                    <span className="readout text-[0.5rem] uppercase tracking-widest text-foreground-faint">Fastest Lap</span>
                  </div>
                  <div className="min-h-0 flex-1">
                    <TrackMapPanel
                      year={year}
                      event={eventName}
                      session_type={session}
                      driver={driver}
                      lap_number={null}
                      compare_driver={compareDriver || null}
                      initialData={isDemoSession ? (demoRaceData?.track_map as TrackMapResponse | null) : null}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 w-[40%] flex-col px-4 py-4" />
              )}
            </>
          )}
        </div>

        <MissionFooter tel={tel} strat={strat} hasData={hasData} execution={result?.execution} />
      </div>

      <StrategyHUD
        result={result} strat={strat} isLoading={isLoading} hasData={hasData}
        session={session} theme={theme} rateLimitMessage={rateLimitMessage}
        retryState={retryState} onRetryClick={handleAnalyze}
        year={year} eventName={eventName} driver={driver}
        targetDriver={compareDriver}
        streamStage={streamState.stage}
        streamMessage={streamState.message}
        streamTokens={streamState.tokens}
        historyRefreshSignal={historyRefreshSignal}
        onSelectHistory={handleSelectHistory}
        telemetryHistoryRefreshSignal={telemetryHistoryRefreshSignal}
        onSelectTelemetryHistory={handleSelectTelemetryHistory}
        radioHistoryRefreshSignal={radioHistoryRefreshSignal}
        savedQueries={savedQueries}
        onSavedQueriesChange={setSavedQueries}
        onSelectSaved={handleSelectSaved}
      />
    </div>
  );
}
