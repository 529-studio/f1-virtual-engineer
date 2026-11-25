"use client";

import { useCallback, useEffect, useState } from "react";
import type { DriverPerformanceResponse, NormalizationMode } from "@/types/performance";
import { fetchDriverPerformance } from "@/services/performance";

export interface UseDriverPerformanceOptions {
  year: number;
  event: string;
  session?: string;
  driver: string;
  compareDriver?: string | null;
  initialMode?: NormalizationMode;
  autoFetch?: boolean;
}

export function useDriverPerformance({
  year,
  event,
  session = "R",
  driver,
  compareDriver = null,
  initialMode = "session_relative",
  autoFetch = true,
}: UseDriverPerformanceOptions) {
  const [data, setData] = useState<DriverPerformanceResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<NormalizationMode>(initialMode);

  const loadData = useCallback(
    async (activeMode: NormalizationMode, cancelledRef?: { current: boolean }) => {
      if (!event || !driver) {
        setStatus("idle");
        setData(null);
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        const res = await fetchDriverPerformance({
          year,
          event,
          session,
          driver,
          compareDriver,
          mode: activeMode,
        });
        if (cancelledRef?.current) return;
        setData(res);
        setStatus("success");
      } catch (err: unknown) {
        if (cancelledRef?.current) return;
        setError(err instanceof Error ? err.message : "Failed to load driver radar profile");
        setStatus("error");
      }
    },
    [year, event, session, driver, compareDriver]
  );

  useEffect(() => {
    if (!autoFetch) return;
    const cancelledRef = { current: false };
    queueMicrotask(() => {
      if (!cancelledRef.current) {
        void loadData(mode, cancelledRef);
      }
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [autoFetch, loadData, mode]);

  const reload = useCallback(() => {
    void loadData(mode);
  }, [loadData, mode]);

  return {
    data,
    status,
    error,
    mode,
    setMode,
    reload,
  };
}
