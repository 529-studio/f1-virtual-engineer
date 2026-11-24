"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  RaceControlCategoryFilter,
  RaceControlFeedResponse,
  RaceControlMessageItem,
  StewardInvestigationResponse,
} from "@/types/race-control";
import {
  fetchRaceControlFeed,
  investigateIncident,
} from "@/services/raceControlApi";

export interface UseRaceControlParams {
  year?: number;
  event?: string;
  session?: string;
}

export interface UseRaceControlReturn {
  feed: RaceControlFeedResponse | null;
  filteredItems: RaceControlMessageItem[];
  selectedIncident: RaceControlMessageItem | null;
  investigation: StewardInvestigationResponse | null;
  categoryFilter: RaceControlCategoryFilter;
  status: "idle" | "loading" | "loaded" | "error";
  investigationLoading: boolean;
  error: string | null;
  selectIncident: (id: string) => Promise<void>;
  setCategoryFilter: (cat: RaceControlCategoryFilter) => void;
  reload: () => Promise<void>;
}

export function useRaceControl({
  year = 2023,
  event = "Singapore Grand Prix",
  session = "Race",
}: UseRaceControlParams = {}): UseRaceControlReturn {
  const [feed, setFeed] = useState<RaceControlFeedResponse | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [investigation, setInvestigation] = useState<StewardInvestigationResponse | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<RaceControlCategoryFilter>("ALL");
  const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [investigationLoading, setInvestigationLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const investigationCacheRef = useRef<Map<string, StewardInvestigationResponse>>(new Map());

  // Deliberate specific incident
  const runInvestigation = useCallback(
    async (incidentId: string) => {
      setSelectedIncidentId(incidentId);

      // Check cache first
      const cached = investigationCacheRef.current.get(incidentId);
      if (cached) {
        setInvestigation(cached);
        return;
      }

      setInvestigationLoading(true);
      try {
        const result = await investigateIncident({
          incident_id: incidentId,
          year,
          event,
          session,
        });
        investigationCacheRef.current.set(incidentId, result);
        setInvestigation(result);
      } catch (err: unknown) {
        console.warn("Steward investigation call failed:", err);
      } finally {
        setInvestigationLoading(false);
      }
    },
    [year, event, session]
  );

  // Load race control feed
  const loadFeed = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const data = await fetchRaceControlFeed(year, event, session);
      if (!controller.signal.aborted) {
        setFeed(data);
        setStatus("loaded");

        // Auto-select first incident if none selected
        if (data.items.length > 0 && !selectedIncidentId) {
          const firstId = data.items[0].id;
          setSelectedIncidentId(firstId);
          runInvestigation(firstId);
        }
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        const msg = err instanceof Error ? err.message : "Failed to load race control feed";
        setError(msg);
        setStatus("error");
      }
    }
  }, [year, event, session, selectedIncidentId, runInvestigation]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      if (cancelled) return;
      await loadFeed();
    });
    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadFeed]);

  const selectIncident = useCallback(
    async (id: string) => {
      await runInvestigation(id);
    },
    [runInvestigation]
  );

  const filteredItems = (feed?.items || []).filter((item) => {
    if (categoryFilter === "ALL") return true;
    return item.category === categoryFilter;
  });

  const selectedIncident = (feed?.items || []).find((item) => item.id === selectedIncidentId) || null;

  return {
    feed,
    filteredItems,
    selectedIncident,
    investigation,
    categoryFilter,
    status,
    investigationLoading,
    error,
    selectIncident,
    setCategoryFilter,
    reload: loadFeed,
  };
}
