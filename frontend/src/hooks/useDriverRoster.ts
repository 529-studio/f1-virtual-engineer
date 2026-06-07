"use client";

import { useEffect, useReducer } from "react";
import { getEventDrivers } from "@/services/api";

const CACHE_KEY_VERSION = "v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  drivers: string[];
  fallback: boolean;
  ts: number;
}

function cacheKey(year: number, event: string) {
  return `f1_drivers_${CACHE_KEY_VERSION}_${year}_${encodeURIComponent(event)}`;
}

function readCache(year: number, event: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(year, event));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.drivers.length > 0 ? entry : null;
  } catch {
    return null;
  }
}

function writeCache(year: number, event: string, drivers: string[], fallback: boolean) {
  try {
    localStorage.setItem(
      cacheKey(year, event),
      JSON.stringify({ drivers, fallback, ts: Date.now() }),
    );
  } catch {
    // storage quota exceeded — ignore
  }
}

type RosterState = {
  fetchedDrivers: readonly string[] | null;
  driversLoading: boolean;
  driversFallback: boolean;
};

type RosterAction =
  | { type: "init"; cached: CacheEntry | null; hasEvent: boolean }
  | { type: "loaded"; drivers: string[]; fallback: boolean }
  | { type: "error" };

function rosterReducer(state: RosterState, action: RosterAction): RosterState {
  switch (action.type) {
    case "init":
      if (!action.hasEvent) return { fetchedDrivers: null, driversLoading: false, driversFallback: false };
      if (action.cached) return { fetchedDrivers: action.cached.drivers, driversLoading: false, driversFallback: action.cached.fallback };
      return { ...state, fetchedDrivers: null, driversLoading: true, driversFallback: false };
    case "loaded":
      return { fetchedDrivers: action.drivers, driversLoading: false, driversFallback: action.fallback };
    case "error":
      return { fetchedDrivers: null, driversLoading: false, driversFallback: true };
  }
}

const INITIAL_STATE: RosterState = { fetchedDrivers: null, driversLoading: false, driversFallback: false };

export function useDriverRoster(year: number, eventName: string) {
  const [state, dispatch] = useReducer(rosterReducer, INITIAL_STATE);

  useEffect(() => {
    const cached = eventName ? readCache(year, eventName) : null;
    dispatch({ type: "init", cached, hasEvent: !!eventName });

    if (!eventName) return;

    let cancelled = false;
    getEventDrivers(year, eventName)
      .then((res) => {
        if (cancelled) return;
        const ok = res.drivers.length > 0;
        if (ok) {
          dispatch({ type: "loaded", drivers: res.drivers, fallback: res.fallback });
          writeCache(year, eventName, res.drivers, res.fallback);
        } else if (!cached) {
          dispatch({ type: "error" });
        }
      })
      .catch(() => {
        if (!cancelled && !cached) dispatch({ type: "error" });
      });

    return () => { cancelled = true; };
  }, [year, eventName]);

  return state;
}
