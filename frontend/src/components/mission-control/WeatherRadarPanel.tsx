"use client";

import { useMemo } from "react";
import {
  CloudRain,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
} from "lucide-react";
import { useWeatherRadar } from "@/hooks/useWeatherRadar";
import { WeatherRadarCanvas } from "./WeatherRadarCanvas";

interface WeatherRadarPanelProps {
  year: number;
  event: string;
  session: string;
  selectedLap?: number | null;
}

export function WeatherRadarPanel({
  year,
  event,
  session,
  selectedLap,
}: WeatherRadarPanelProps) {
  const {
    data,
    loading,
    error,
    selectedFrameOffset,
    setSelectedFrameOffset,
    isPlaying,
    setIsPlaying,
    refetch,
  } = useWeatherRadar(year, event, session, selectedLap);

  // Current active frame by offset
  const activeFrame = useMemo(() => {
    if (!data?.radar_frames || data.radar_frames.length === 0) return null;
    return (
      data.radar_frames.find((f) => f.time_offset_min === selectedFrameOffset) ??
      data.radar_frames[0]
    );
  }, [data, selectedFrameOffset]);

  // Loading Skeleton State
  if (loading && !data) {
    return (
      <section
        data-testid="weather-radar-skeleton"
        className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4 animate-pulse w-full"
        aria-busy="true"
        aria-label="Loading Track Weather Radar"
      >
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="h-5 w-48 bg-neutral-800 rounded" />
          <div className="h-7 w-28 bg-neutral-800 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-5 flex justify-center">
            <div className="w-[260px] h-[260px] rounded-full bg-neutral-850 border border-neutral-800" />
          </div>
          <div className="md:col-span-7 flex flex-col gap-3">
            <div className="h-16 bg-neutral-850 rounded-lg border border-neutral-800" />
            <div className="h-12 bg-neutral-850 rounded-lg border border-neutral-800" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="h-14 bg-neutral-850 rounded" />
              <div className="h-14 bg-neutral-850 rounded" />
              <div className="h-14 bg-neutral-850 rounded" />
              <div className="h-14 bg-neutral-850 rounded" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Error State with Retry Button
  if (error || !data) {
    return (
      <section
        data-testid="weather-radar-error"
        className="rounded-xl border border-red-900/50 bg-neutral-950 p-6 flex flex-col items-center justify-center gap-3 text-center w-full"
        role="alert"
      >
        <AlertTriangle className="h-8 w-8 text-red-400 stroke-[1.75]" />
        <p className="text-sm font-mono text-neutral-300">
          {error || "Weather radar telemetry unavailable for this session"}
        </p>
        <button
          onClick={refetch}
          className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 hover:bg-neutral-750 text-xs font-mono text-cyan-300 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Retry Radar Telemetry</span>
        </button>
      </section>
    );
  }

  const { current_metrics, crossover, wind_vector } = data;
  const currentGrip = activeFrame?.projected_grip_pct ?? current_metrics.track_grip_pct;

  return (
    <section
      data-testid="weather-radar-panel"
      className="rounded-xl border border-neutral-800 bg-surface p-4 sm:p-5 flex flex-col gap-4 shadow-xl"
      aria-label="Track Weather Radar and Compound Crossover Panel"
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
            <CloudRain className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-mono font-bold tracking-wider text-foreground uppercase flex items-center gap-2">
              <span>Track Weather Radar & Cross-Over Predictor</span>
              {data.fallback && (
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600 text-amber-300">
                  FALLBACK SIM
                </span>
              )}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-mono text-foreground-faint">
              Doppler 25km sweep · Surface film modeling · Dynamic slick/inter/wet threshold
            </p>
          </div>
        </div>

        {/* Urgency Status Pill */}
        <div className="flex items-center gap-2">
          {crossover.crossover_status === "CRITICAL" ? (
            <span
              data-testid="crossover-status-badge"
              className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-red-950/80 border border-red-500 text-red-200 shadow-md shadow-red-950/50 flex items-center gap-1.5 animate-pulse"
            >
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span>Critical Crossover Window</span>
            </span>
          ) : crossover.crossover_status === "APPROACHING" ? (
            <span
              data-testid="crossover-status-badge"
              className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-amber-950/80 border border-amber-500 text-amber-200 shadow-md shadow-amber-950/50 flex items-center gap-1.5"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span>Crossover Approaching (~{crossover.crossover_in_minutes}m)</span>
            </span>
          ) : (
            <span
              data-testid="crossover-status-badge"
              className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-emerald-950/70 border border-emerald-500/70 text-emerald-200 flex items-center gap-1.5"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Optimal Window ({crossover.current_compound})</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Grid: Radar Canvas (Left/Top) + Strategy HUD (Right/Bottom) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Radar Dome & Controls (5 Cols) */}
        <div className="md:col-span-5 flex flex-col items-center gap-3 w-full">
          <WeatherRadarCanvas
            cells={activeFrame?.cells || []}
            windDirectionDeg={wind_vector.direction_deg}
            windSpeedKmh={wind_vector.speed_kmh}
            trackImpact={Boolean(activeFrame?.track_impact)}
            timeOffsetMin={selectedFrameOffset}
          />

          {/* Forecast Scrubber Controls (Kiosk ergonomics >= 44px) */}
          <div
            className="flex items-center justify-center gap-1.5 w-full flex-wrap pt-1"
            role="region"
            aria-label="Radar Forecast Scrubber"
          >
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              data-testid="radar-play-pause-btn"
              title={isPlaying ? "Pause Forecast Loop" : "Play Forecast Loop"}
              aria-label={isPlaying ? "Pause Forecast Loop" : "Play Forecast Loop"}
              className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg border font-mono text-xs flex items-center justify-center cursor-pointer transition-all ${
                isPlaying
                  ? "bg-cyan-950 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950"
                  : "bg-neutral-900 border-neutral-750 text-neutral-300 hover:text-white"
              }`}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            {[0, 5, 10, 15, 20].map((offset) => {
              const active = selectedFrameOffset === offset;
              return (
                <button
                  key={offset}
                  type="button"
                  data-testid={`forecast-step-${offset}`}
                  onClick={() => {
                    setIsPlaying(false);
                    setSelectedFrameOffset(offset);
                  }}
                  className={`min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg border font-mono text-xs cursor-pointer transition-all ${
                    active
                      ? "bg-cyan-950/90 text-cyan-200 border-cyan-400 font-bold shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-500/50"
                      : "bg-neutral-900/60 text-neutral-400 border-neutral-800 hover:bg-neutral-850 hover:text-neutral-200"
                  }`}
                  aria-pressed={active}
                >
                  {offset === 0 ? "NOW" : `+${offset}m`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Strategic Telemetry & Cross-Over Calling (7 Cols) */}
        <div className="md:col-span-7 flex flex-col gap-3.5 w-full">
          {/* Headline Strategic Pit Call Banner */}
          <div
            data-testid="pit-call-banner"
            className="p-3.5 rounded-xl border border-neutral-750 bg-neutral-900/80 shadow-md flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-accent" />
                <span>PIT WALL STRATEGY DIRECTIVE</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-200">
                REC: {crossover.recommended_compound}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-mono font-bold text-foreground tracking-wide leading-snug">
              {crossover.pit_call}
            </p>
          </div>

          {/* Dynamic Track Grip Gauge */}
          <div className="p-3.5 rounded-xl border border-neutral-800 bg-neutral-950/60 flex flex-col gap-2">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-cyan-400" />
                <span>TRACK SURFACE GRIP COEFFICIENT</span>
              </span>
              <span className="font-bold text-cyan-300 text-sm">
                {currentGrip.toFixed(1)}%
              </span>
            </div>

            {/* Grip Bar with Compound Zones */}
            <div className="relative w-full h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
              {/* Colored fill bar */}
              <div
                className="h-full transition-all duration-500 rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, currentGrip))}%`,
                  background:
                    currentGrip >= 88
                      ? "linear-gradient(90deg, #10b981, #22d3ee)"
                      : currentGrip >= 65
                      ? "linear-gradient(90deg, #f59e0b, #10b981)"
                      : "linear-gradient(90deg, #ef4444, #f59e0b)",
                }}
              />
              {/* Threshold markers */}
              <div
                title="Slick / Inters crossover (88%)"
                className="absolute top-0 bottom-0 w-0.5 bg-neutral-300 z-10 opacity-70"
                style={{ left: "88%" }}
              />
              <div
                title="Inters / Full Wet crossover (65%)"
                className="absolute top-0 bottom-0 w-0.5 bg-neutral-300 z-10 opacity-70"
                style={{ left: "65%" }}
              />
            </div>

            {/* Grip Scale Labels */}
            <div className="flex justify-between items-center text-[9px] font-mono text-neutral-500 px-0.5">
              <span>WET (&lt;65%)</span>
              <span className="text-neutral-400">INTERS (65-88%)</span>
              <span className="text-emerald-400 font-bold">SLICKS (&gt;88%)</span>
            </div>

            {/* Water film depth indicator */}
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-850">
              <span className="flex items-center gap-1">
                <Droplets className="h-3 w-3 text-cyan-400" />
                <span>Water Film Depth:</span>
              </span>
              <span className="font-bold text-neutral-200">
                {current_metrics.water_film_mm ?? 0.0} mm
              </span>
            </div>
          </div>

          {/* Environmental Telemetry 4-Card Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/50 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                <Thermometer className="h-3 w-3 text-amber-400" />
                <span>Track Temp</span>
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-foreground">
                {current_metrics.track_temp_c}°C
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/50 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                <Thermometer className="h-3 w-3 text-cyan-400" />
                <span>Air Temp</span>
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-foreground">
                {current_metrics.air_temp_c}°C
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/50 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                <Droplets className="h-3 w-3 text-blue-400" />
                <span>Humidity</span>
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-foreground">
                {current_metrics.humidity_pct}%
              </span>
            </div>

            <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/50 flex flex-col gap-0.5">
              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                <Wind className="h-3 w-3 text-emerald-400" />
                <span>Wind</span>
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-foreground">
                {Math.round(current_metrics.wind_speed_kmh)} km/h
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
