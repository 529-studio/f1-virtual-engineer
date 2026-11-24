"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { WeatherRadarResponse } from "@/types/weather-radar";
import { fetchWeatherRadar } from "@/services/weatherRadarApi";

export function useWeatherRadar(
  year: number,
  event: string,
  session: string,
  lap?: number | null
) {
  const [data, setData] = useState<WeatherRadarResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFrameOffset, setSelectedFrameOffset] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);

  const loadData = useCallback(async () => {
    if (!year || !event) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchWeatherRadar(year, event, session, lap);
      if (isMountedRef.current) {
        setData(res);
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load weather radar");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [year, event, session, lap]);

  useEffect(() => {
    let cancelled = false;
    isMountedRef.current = true;

    queueMicrotask(async () => {
      if (cancelled) return;
      await loadData();
    });

    return () => {
      cancelled = true;
      isMountedRef.current = false;
    };
  }, [loadData]);

  // Forecast animation loop: cycles 0 -> 5 -> 10 -> 15 -> 20 -> 0 every 1.5 seconds
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedFrameOffset((prev) => {
        const frames = [0, 5, 10, 15, 20];
        const nextIdx = (frames.indexOf(prev) + 1) % frames.length;
        return frames[nextIdx];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return {
    data,
    loading,
    error,
    selectedFrameOffset,
    setSelectedFrameOffset,
    isPlaying,
    setIsPlaying,
    refetch: loadData,
  };
}
