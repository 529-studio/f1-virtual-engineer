"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TyreThermalParams,
  TyreThermalResponse,
  TyreViewMode,
  WheelPosition,
} from "@/types/tyre-thermal";
import { fetchTyreThermal } from "@/services/tyreThermalApi";

export interface UseTyreThermalReturn {
  data: TyreThermalResponse | null;
  selectedWheel: WheelPosition;
  viewMode: TyreViewMode;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  setSelectedWheel: (pos: WheelPosition) => void;
  setViewMode: (mode: TyreViewMode) => void;
  reload: () => Promise<void>;
}

export function useTyreThermal(
  params: TyreThermalParams | null
): UseTyreThermalReturn {
  const [data, setData] = useState<TyreThermalResponse | null>(null);
  const [selectedWheel, setSelectedWheel] = useState<WheelPosition>("FL");
  const [viewMode, setViewMode] = useState<TyreViewMode>("surface");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const year = params?.year;
  const event = params?.event;
  const sessionType = params?.session_type;
  const driver = params?.driver;
  const lapNumber = params?.lap_number;

  const loadData = useCallback(async () => {
    if (!year || !event) {
      setStatus("idle");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const response = await fetchTyreThermal({
        year,
        event,
        session_type: sessionType,
        driver,
        lap_number: lapNumber,
      });
      if (!controller.signal.aborted) {
        setData(response);
        setStatus("success");
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        const msg = err instanceof Error ? err.message : "Failed to load tyre thermal data";
        setError(msg);
        setStatus("error");
      }
    }
  }, [year, event, sessionType, driver, lapNumber]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      if (cancelled) return;
      await loadData();
    });
    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadData]);

  return {
    data,
    selectedWheel,
    viewMode,
    status,
    error,
    setSelectedWheel,
    setViewMode,
    reload: loadData,
  };
}
