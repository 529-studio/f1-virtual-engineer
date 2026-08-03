"use client";

/**
 * TrackMapPanel — data-fetching wrapper around TrackMapCanvas.
 *
 * Receives session params from the parent (TelemetryChartGrid / store),
 * calls POST /track-map, handles loading/error states, and renders the
 * TrackMapCanvas. Designed to be dropped into the telemetry tab with
 * minimal prop drilling.
 */

import { useEffect, useRef, useState } from "react";
import { getTrackMap, type TrackMapResponse } from "@/services/api";
import { TrackMapCanvas } from "./TrackMapCanvas";

// ─── Constants ─────────────────────────────────────────────────────────────
/** Minimum ms between successive fetches for same params (debounce). */
const FETCH_DEBOUNCE_MS = 400;

// ─── Types ─────────────────────────────────────────────────────────────────
export interface TrackMapPanelProps {
  year: number;
  event: string;
  session_type: string;
  driver: string;
  lap_number?: number | null;
  compare_driver?: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────
export function TrackMapPanel({
  year,
  event,
  session_type,
  driver,
  lap_number,
  compare_driver,
}: TrackMapPanelProps) {
  const [data, setData] = useState<TrackMapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Serialise params to detect actual changes
  const paramsKey = `${year}|${event}|${session_type}|${driver}|${lap_number ?? "fastest"}|${compare_driver ?? ""}`;

  useEffect(() => {
    // Skip if any required field is missing
    if (!year || !event || !session_type || !driver) return;

    // Debounce rapid selector changes
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getTrackMap({
          year,
          event,
          session_type,
          driver,
          lap_number: lap_number ?? null,
          compare_driver: compare_driver ?? null,
        });
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load track map");
      } finally {
        setLoading(false);
      }
    }, FETCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // ── Render states ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[340px] items-center justify-center gap-3">
        {/* Animated dot loader — CSS only, no JS */}
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-1.5 w-1.5 rounded-full bg-accent"
              style={{
                animation: "pulse 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </span>
        <span className="readout text-[0.65rem] uppercase tracking-widest text-foreground-faint">
          Loading track map…
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
        <p className="readout text-[0.6rem] uppercase tracking-widest text-amber-400">
          Track map unavailable
        </p>
        <p className="text-[length:var(--text-readout)] text-foreground-faint">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-32 items-center justify-center">
        <p className="readout text-[0.6rem] uppercase tracking-widest text-foreground-faint">
          Select a session to view track map
        </p>
      </div>
    );
  }

  return <TrackMapCanvas data={data} />;
}
