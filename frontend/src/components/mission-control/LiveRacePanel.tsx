"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Flag,
  Radio,
  RotateCcw,
  Info,
} from "lucide-react";
import { useLiveStore } from "@/store/useLiveStore";
import type { LiveDriverSnapshot, LiveTyreCompound } from "@/types/live";
import { calculateOvertakeProbability, generateMiniSectors } from "@/lib/live-telemetry";
import { BroadcastDelaySlider } from "./BroadcastDelaySlider";
import { OvertakeProbabilityGauge } from "./OvertakeProbabilityGauge";
import { MiniSectorBar } from "./MiniSectorBar";
import { TrackMapPanel } from "./TrackMapPanel";

const TYRE_STYLES: Record<
  LiveTyreCompound,
  { label: string; bg: string; text: string; border: string }
> = {
  SOFT: { label: "S", bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/40" },
  MEDIUM: { label: "M", bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/40" },
  HARD: { label: "H", bg: "bg-slate-200/20", text: "text-slate-200", border: "border-slate-300/40" },
  INTERMEDIATE: { label: "I", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" },
  WET: { label: "W", bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/40" },
  UNKNOWN: { label: "?", bg: "bg-zinc-800/40", text: "text-zinc-400", border: "border-zinc-700" },
};

function formatLapTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return "--:--.---";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
  }
  return secs.toFixed(3);
}

function formatGap(gap: number | null, isLeader: boolean): string {
  if (isLeader) return "LEADER";
  if (gap === null) return "--";
  return `+${gap.toFixed(3)}s`;
}

interface LiveRacePanelProps {
  onSwitchHistorical?: () => void;
}

export function LiveRacePanel({ onSwitchHistorical }: LiveRacePanelProps) {
  const {
    sessionMeta,
    latestTick,
    displayedTick,
    delaySeconds,
    setDelaySeconds,
    status,
    errorMessage,
    fetchSession,
    retry,
  } = useLiveStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Derive active tick from delayed state or latest
  const tick = displayedTick ?? latestTick;

  const overtakeData = useMemo(() => {
    if (!tick?.drivers || tick.drivers.length < 2) return null;
    return calculateOvertakeProbability(
      tick.drivers,
      sessionMeta?.circuit_short_name || "Interlagos"
    );
  }, [tick, sessionMeta]);

  const miniSectors = useMemo(() => {
    if (!tick?.drivers || tick.drivers.length < 2) return [];
    const d1 = tick.drivers[0]?.driver_code || "VER";
    const d2 = tick.drivers[1]?.driver_code || "NOR";
    return generateMiniSectors(d1, d2, 24);
  }, [tick]);

  // Countdown timer for next session (Las Vegas FP1) in Empty state
  const [countdown, setCountdown] = useState<string>("");

  useEffect(() => {
    const targetDate = new Date("2026-11-20T00:30:00Z").getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetDate - now;
      if (diff <= 0) {
        setCountdown("Session Starting Shortly");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // 1. SKELETON STATE
  if (status === "connecting" && !latestTick) {
    return (
      <div className="flex flex-1 flex-col p-4 sm:p-6 gap-4 min-h-[400px]">
        <div className="flex items-center justify-between border-b border-border pb-3 animate-pulse">
          <div className="h-6 w-48 rounded bg-surface-elevated" />
          <div className="h-6 w-32 rounded bg-surface-elevated" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full rounded border border-border/50 bg-surface/40 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // 2. ERROR STATE
  if (status === "error" && !latestTick) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-500/10 p-4 border border-red-500/20 mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" strokeWidth={1.75} />
        </div>
        <h3 className="readout text-base font-bold uppercase tracking-wider text-foreground mb-1">
          Live Stream Unavailable
        </h3>
        <p className="text-sm text-foreground-dim max-w-md mb-6">
          {errorMessage || "Unable to establish connection to OpenF1 live stream."}
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="flex min-h-[44px] items-center gap-2 px-5 py-2.5 rounded border border-accent bg-accent/10 text-accent font-mono text-xs uppercase tracking-wider hover:bg-accent/20 transition-all cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          Retry Connection
        </button>
      </div>
    );
  }

  // 3. EMPTY STATE (Outside session window)
  if (status === "empty") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-surface-elevated p-4 border border-border mb-4">
          <Radio className="h-8 w-8 text-foreground-dim" strokeWidth={1.75} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-surface text-[0.65rem] font-mono text-foreground-dim uppercase tracking-wider mb-2">
          <Info className="h-3.5 w-3.5 text-foreground-dim" strokeWidth={1.75} />
          Session Window Inactive
        </div>
        <h3 className="readout text-lg font-bold uppercase tracking-wider text-foreground mb-2">
          No Live Session Active
        </h3>
        <p className="text-sm text-foreground-dim max-w-md mb-4">
          Live telemetry activates 30 minutes before official track sessions.
        </p>

        {/* Countdown Box */}
        <div className="mb-6 rounded border border-border bg-surface px-6 py-3 font-mono">
          <span className="text-[0.65rem] text-foreground-faint uppercase tracking-widest block mb-0.5">
            Next: Las Vegas GP · Free Practice 1
          </span>
          <span className="text-base font-bold text-accent tracking-widest">
            {countdown}
          </span>
        </div>

        {onSwitchHistorical && (
          <button
            type="button"
            onClick={onSwitchHistorical}
            className="flex min-h-[44px] items-center gap-2 px-5 py-2.5 rounded border border-border bg-surface-elevated text-foreground hover:border-accent hover:text-accent font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Switch to Historical Telemetry
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
    );
  }

  // 4. ACTIVE LIVE STATE
  if (!tick) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Top Session Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Freshness Badge */}
          {tick.stale ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[0.65rem] font-mono font-bold uppercase tracking-wider text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} />
              LIVE · OpenF1 · STALE DATA
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[0.65rem] font-mono font-bold uppercase tracking-wider text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE · OpenF1 · ~3s delay
            </div>
          )}

          <div className="h-3.5 w-px bg-border hidden sm:block" />

          {/* Session details */}
          <div className="flex items-center gap-2 text-xs font-mono text-foreground">
            <span className="font-semibold text-accent">
              {sessionMeta?.circuit_short_name || "Interlagos"}
            </span>
            <span className="text-foreground-faint">·</span>
            <span className="text-foreground-dim">
              {sessionMeta?.session_name || "Race"}
            </span>
            <span className="text-foreground-faint">·</span>
            <span className="text-foreground-dim">
              Lap {tick.leader_lap}
            </span>
          </div>
        </div>

        {/* Safety Car Status */}
        {tick.safety_car_status !== "NONE" && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider ${
              tick.safety_car_status === "RED_FLAG"
                ? "bg-red-500/20 text-red-400 border border-red-500/40"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
            }`}
          >
            <Flag className="h-3.5 w-3.5" strokeWidth={1.75} />
            {tick.safety_car_status === "VSC"
              ? "Virtual Safety Car"
              : tick.safety_car_status === "SC"
              ? "Safety Car Deployed"
              : "Red Flag — Session Suspended"}
          </div>
        )}
      </div>

      {/* Broadcast Delay Sync Slider */}
      <div className="border-b border-border/80 px-4 py-2.5 bg-surface/40 shrink-0">
        <BroadcastDelaySlider
          delaySeconds={delaySeconds}
          onDelayChange={setDelaySeconds}
        />
      </div>

      {/* Main Cockpit Split View: 2D Track Map (Left 48%) + Position Ladder (Right 52%) */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row overflow-y-auto lg:overflow-hidden mc-scroll">
        {/* Left Column: Overtake Probability, Animated 2D Track Map, Mini-Sectors */}
        <div className="flex w-full shrink-0 flex-col border-b lg:border-b-0 lg:border-r border-border lg:w-[48%] p-3.5 gap-3 lg:overflow-y-auto mc-scroll">
          {/* Overtake Probability Forecast */}
          <OvertakeProbabilityGauge data={overtakeData} />

          {/* Animated 2D Circuit Track Map */}
          <div className="flex flex-col rounded border border-border bg-surface p-3 min-h-[300px] h-[340px]">
            <div className="mb-2 flex items-center justify-between">
              <span className="readout text-[0.65rem] font-bold uppercase tracking-wider text-accent">
                2D Circuit Track Car Tracker
              </span>
              <span className="text-[0.6rem] font-mono text-foreground-faint">
                {tick.drivers.length} Cars on Track
              </span>
            </div>
            <div className="min-h-0 flex-1">
              <TrackMapPanel
                year={sessionMeta?.date_start ? new Date(sessionMeta.date_start).getFullYear() : 2024}
                event={sessionMeta?.circuit_short_name || "Italian Grand Prix"}
                session_type={sessionMeta?.session_type || "R"}
                driver={tick.drivers[0]?.driver_code || "VER"}
                liveDrivers={tick.drivers}
              />
            </div>
          </div>

          {/* Mini-Sector Dominance Ribbon */}
          <MiniSectorBar
            segments={miniSectors}
            driver1Code={tick.drivers[0]?.driver_code || "VER"}
            driver2Code={tick.drivers[1]?.driver_code || "NOR"}
          />
        </div>

        {/* Right Column: Live Position Ladder Table */}
        <div className="flex w-full shrink-0 flex-col lg:w-[52%] min-h-0 flex-1 overflow-x-auto overflow-y-auto mc-scroll p-4">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-border/80 text-[0.65rem] uppercase tracking-wider text-foreground-faint">
                <th className="py-2 px-2 text-center w-10">Pos</th>
                <th className="py-2 px-3">Driver</th>
                <th className="py-2 px-3">Interval</th>
                <th className="py-2 px-3">Leader Gap</th>
                <th className="py-2 px-3">Last Lap</th>
                <th className="py-2 px-3 text-center">Stint</th>
                <th className="py-2 px-3 text-center">Tyre</th>
                <th className="py-2 px-3 text-center">Pit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tick.drivers.map((d: LiveDriverSnapshot) => {
                const tyreStyle = TYRE_STYLES[d.tyre_compound] || TYRE_STYLES.UNKNOWN;
                const isLeader = d.position === 1;

                return (
                  <tr
                    key={d.driver_number}
                    className="hover:bg-surface/60 transition-colors group"
                  >
                    {/* Position */}
                    <td className="py-2 px-2 text-center font-bold text-foreground">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-sm ${
                          d.position === 1
                            ? "bg-accent/20 text-accent font-bold"
                            : d.position <= 3
                            ? "bg-surface-elevated text-foreground font-semibold"
                            : "text-foreground-dim"
                        }`}
                      >
                        {d.position}
                      </span>
                    </td>

                    {/* Driver & Team */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground tracking-wide">
                          {d.driver_code}
                        </span>
                        <span className="text-[0.65rem] text-foreground-dim truncate max-w-[120px] sm:max-w-none">
                          {d.team_name}
                        </span>
                        {d.in_pit && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[0.55rem] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            PIT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Interval to car ahead */}
                    <td className="py-2 px-3 text-foreground-dim">
                      {formatGap(d.interval_to_ahead, isLeader)}
                    </td>

                    {/* Gap to leader */}
                    <td className="py-2 px-3 text-foreground-dim">
                      {formatGap(d.gap_to_leader, isLeader)}
                    </td>

                    {/* Last Lap Time */}
                    <td className="py-2 px-3 font-semibold text-foreground">
                      {formatLapTime(d.last_lap_time)}
                    </td>

                    {/* Stint */}
                    <td className="py-2 px-3 text-center text-foreground-dim">
                      {d.current_stint}
                    </td>

                    {/* Tyre Compound & Age */}
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-flex h-5 w-5 items-center justify-center rounded border font-bold text-[0.62rem] ${tyreStyle.bg} ${tyreStyle.text} ${tyreStyle.border}`}
                          title={`${d.tyre_compound} (${d.tyre_age} laps)`}
                        >
                          {tyreStyle.label}
                        </span>
                        <span className="text-[0.65rem] text-foreground-faint">
                          {d.tyre_age}L
                        </span>
                      </div>
                    </td>

                    {/* Pit stops */}
                    <td className="py-2 px-3 text-center text-foreground-dim">
                      {d.pit_stops}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attribution Footer Bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-border bg-surface/50 px-4 py-2 text-[0.65rem] font-mono text-foreground-faint">
        <div className="flex items-center gap-2">
          <span>Live timing via</span>
          <a
            href="https://openf1.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground-dim hover:text-accent underline transition-colors"
          >
            OpenF1 API
          </a>
          <span>(CC BY-NC-SA 4.0)</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3 text-accent" strokeWidth={1.5} />
          <span>Polling tick 8s</span>
        </div>
      </div>
    </div>
  );
}
