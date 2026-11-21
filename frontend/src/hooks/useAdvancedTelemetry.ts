"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ExportParams,
  StintCompareParams,
  StintCompareResponse,
} from "@/types/telemetry-advanced";
import {
  downloadTelemetryFile,
  getStintCompare,
} from "@/services/telemetry-advanced.api";

export type ExportStatus = "idle" | "downloading" | "success" | "error";

export function useAdvancedTelemetry() {
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);

  const [stintData, setStintData] = useState<StintCompareResponse | null>(null);
  const [stintLoading, setStintLoading] = useState<boolean>(false);
  const [stintError, setStintError] = useState<string | null>(null);

  // In-memory cache for stint comparisons
  const stintCacheRef = useRef<Map<string, StintCompareResponse>>(new Map());

  const exportTelemetry = useCallback(
    async (params: ExportParams): Promise<boolean> => {
      setExportStatus("downloading");
      setExportError(null);
      setExportedFilename(null);

      try {
        const filename = await downloadTelemetryFile(params);
        setExportStatus("success");
        setExportedFilename(filename);

        // Auto-reset back to idle after 3.5 seconds
        setTimeout(() => {
          setExportStatus("idle");
        }, 3500);

        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Download failed";
        setExportStatus("error");
        setExportError(message);
        return false;
      }
    },
    []
  );

  const fetchStint = useCallback(
    async (params: StintCompareParams): Promise<StintCompareResponse | null> => {
      const cacheKey = `${params.year}-${params.event}-${params.session_type}-${params.driver}-${params.lap1}-${params.lap2}`;
      const cached = stintCacheRef.current.get(cacheKey);
      if (cached) {
        setStintData(cached);
        setStintError(null);
        return cached;
      }

      setStintLoading(true);
      setStintError(null);

      try {
        const result = await getStintCompare(params);
        stintCacheRef.current.set(cacheKey, result);
        setStintData(result);
        return result;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Stint comparison failed";
        setStintError(message);
        setStintData(null);
        return null;
      } finally {
        setStintLoading(false);
      }
    },
    []
  );

  const clearStint = useCallback(() => {
    setStintData(null);
    setStintError(null);
  }, []);

  return {
    exportStatus,
    exportError,
    exportedFilename,
    exportTelemetry,
    stintData,
    stintLoading,
    stintError,
    fetchStint,
    clearStint,
  };
}
