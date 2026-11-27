"use client";

import { useCallback, useEffect, useState } from "react";
import type { DrsEfficiencyResponse, WingTrim } from "@/types/drs";
import { fetchDrsEfficiency } from "@/services/drs";

export interface UseDrsEfficiencyOptions {
  year: number;
  event: string;
  session?: string;
  driver: string;
  compareDriver?: string | null;
  initialTrim?: WingTrim;
  autoFetch?: boolean;
}

const TRIM_DRAG_DEFAULT: Record<WingTrim, number> = {
  LOW_DRAG: 20,
  BALANCED: 50,
  HIGH_DOWNFORCE: 80,
};

export function useDrsEfficiency({
  year,
  event,
  session = "R",
  driver,
  compareDriver = null,
  initialTrim = "BALANCED",
  autoFetch = true,
}: UseDrsEfficiencyOptions) {
  const [data, setData] = useState<DrsEfficiencyResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [wingTrim, setWingTrimState] = useState<WingTrim>(initialTrim);
  const [dragLevel, setDragLevelState] = useState<number>(TRIM_DRAG_DEFAULT[initialTrim]);

  const loadData = useCallback(
    async (trim: WingTrim, drag: number, cancelledRef?: { current: boolean }) => {
      if (!event || !driver) {
        setStatus("idle");
        setData(null);
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        const res = await fetchDrsEfficiency({
          year,
          event,
          session,
          driver,
          compareDriver,
          wingTrim: trim,
          dragLevel: drag,
        });
        if (cancelledRef?.current) return;
        setData(res);
        setStatus("success");
      } catch (err: unknown) {
        if (cancelledRef?.current) return;
        setError(err instanceof Error ? err.message : "Failed to load DRS efficiency metrics");
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
        void loadData(wingTrim, dragLevel, cancelledRef);
      }
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [autoFetch, loadData, wingTrim, dragLevel]);

  const setWingTrim = useCallback((trim: WingTrim) => {
    setWingTrimState(trim);
    setDragLevelState(TRIM_DRAG_DEFAULT[trim]);
  }, []);

  const setDragLevel = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setDragLevelState(clamped);
    if (clamped <= 34) setWingTrimState("LOW_DRAG");
    else if (clamped >= 67) setWingTrimState("HIGH_DOWNFORCE");
    else setWingTrimState("BALANCED");
  }, []);

  const reload = useCallback(() => {
    void loadData(wingTrim, dragLevel);
  }, [loadData, wingTrim, dragLevel]);

  return {
    data,
    status,
    error,
    wingTrim,
    dragLevel,
    setWingTrim,
    setDragLevel,
    reload,
  };
}
