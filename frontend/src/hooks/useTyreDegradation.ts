"use client";

import { useState, useEffect, useCallback } from "react";
import type { TyreDegradationResponseDTO } from "@/types/tyre-degradation";
import { fetchTyreDegradation, type FetchTyreDegradationParams } from "@/services/tyreDegradationApi";

export interface UseTyreDegradationOptions extends FetchTyreDegradationParams {
  autoFetch?: boolean;
}

export function useTyreDegradation({
  year,
  event,
  driver = "LEC",
  compound = "HARD",
  current_stint_laps = 18,
  autoFetch = true,
}: UseTyreDegradationOptions) {
  const [data, setData] = useState<TyreDegradationResponseDTO | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeCompound, setActiveCompound] = useState<string>(compound);

  const loadData = useCallback(
    async (comp: string) => {
      setStatus("loading");
      setError(null);
      try {
        const result = await fetchTyreDegradation({
          year,
          event,
          driver,
          compound: comp,
          current_stint_laps,
        });
        setData(result);
        setStatus("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load tyre degradation model";
        setError(msg);
        setStatus("error");
      }
    },
    [year, event, driver, current_stint_laps]
  );

  useEffect(() => {
    if (!autoFetch) return;

    let cancelled = false;
    queueMicrotask(async () => {
      if (!cancelled) {
        await loadData(activeCompound);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [autoFetch, loadData, activeCompound]);

  const setCompound = useCallback((comp: string) => {
    setActiveCompound(comp);
  }, []);

  const reload = useCallback(() => {
    loadData(activeCompound);
  }, [loadData, activeCompound]);

  return {
    data,
    status,
    error,
    compound: activeCompound,
    setCompound,
    reload,
  };
}
