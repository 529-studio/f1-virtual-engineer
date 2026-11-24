"use client";

import { useState, useEffect, useCallback } from "react";
import type { PaceDeltaResponseDTO } from "@/types/pace-delta";
import { fetchPaceDelta, type FetchPaceDeltaParams } from "@/services/paceDeltaApi";

export interface UsePaceDeltaOptions extends FetchPaceDeltaParams {
  autoFetch?: boolean;
}

export function usePaceDelta({
  year,
  event,
  session_type = "Race",
  reference_driver = "LEC",
  lap_number,
  autoFetch = true,
}: UsePaceDeltaOptions) {
  const [data, setData] = useState<PaceDeltaResponseDTO | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeRefDriver, setActiveRefDriver] = useState<string>(reference_driver);

  const loadData = useCallback(
    async (refDriver: string) => {
      setStatus("loading");
      setError(null);
      try {
        const result = await fetchPaceDelta({
          year,
          event,
          session_type,
          reference_driver: refDriver,
          lap_number,
        });
        setData(result);
        setStatus("success");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load pace delta matrix";
        setError(msg);
        setStatus("error");
      }
    },
    [year, event, session_type, lap_number]
  );

  useEffect(() => {
    if (!autoFetch) return;

    let cancelled = false;
    queueMicrotask(async () => {
      if (!cancelled) {
        await loadData(activeRefDriver);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [autoFetch, loadData, activeRefDriver]);

  const setReferenceDriver = useCallback((driver: string) => {
    setActiveRefDriver(driver);
  }, []);

  const reload = useCallback(() => {
    loadData(activeRefDriver);
  }, [loadData, activeRefDriver]);

  return {
    data,
    status,
    error,
    referenceDriver: activeRefDriver,
    setReferenceDriver,
    reload,
  };
}
