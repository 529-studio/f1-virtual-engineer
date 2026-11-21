import { create } from "zustand";
import { fetchLiveSession, subscribeToLiveStream } from "../services/liveApi";
import type {
  LiveConnectionStatus,
  LiveRaceTick,
  LiveSessionMeta,
} from "../types/live";
import type { BufferedSnapshot } from "../types/live-advanced";

interface LiveState {
  sessionMeta: LiveSessionMeta | null;
  latestTick: LiveRaceTick | null;
  displayedTick: LiveRaceTick | null;
  ringBuffer: BufferedSnapshot[];
  delaySeconds: number;
  status: LiveConnectionStatus;
  errorMessage: string | null;

  fetchSession: () => Promise<void>;
  startStreaming: () => void;
  stopStreaming: () => void;
  retry: () => Promise<void>;
  setTick: (tick: LiveRaceTick) => void;
  setDelaySeconds: (seconds: number) => void;
}

let activeUnsubscribe: (() => void) | null = null;

function computeDisplayedTick(
  buffer: BufferedSnapshot[],
  latest: LiveRaceTick | null,
  delaySeconds: number
): LiveRaceTick | null {
  if (!latest) return null;
  if (delaySeconds <= 0 || buffer.length === 0) return latest;

  const targetTimestamp = Date.now() - delaySeconds * 1000;
  let closest: BufferedSnapshot | null = null;
  for (let i = buffer.length - 1; i >= 0; i--) {
    const snap = buffer[i];
    if (snap.timestamp <= targetTimestamp) {
      closest = snap;
      break;
    }
  }

  return closest ? closest.tick : buffer[0].tick;
}

export const useLiveStore = create<LiveState>((set, get) => ({
  sessionMeta: null,
  latestTick: null,
  displayedTick: null,
  ringBuffer: [],
  delaySeconds: 0,
  status: "idle",
  errorMessage: null,

  fetchSession: async () => {
    set({ status: "connecting", errorMessage: null });
    try {
      const meta = await fetchLiveSession();
      if (!meta) {
        set({ sessionMeta: null, status: "empty" });
        return;
      }
      set({ sessionMeta: meta });
      get().startStreaming();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load live session";
      set({ status: "error", errorMessage: msg });
    }
  },

  startStreaming: () => {
    if (activeUnsubscribe) {
      activeUnsubscribe();
      activeUnsubscribe = null;
    }

    set({ status: "connecting" });

    activeUnsubscribe = subscribeToLiveStream(
      (tick: LiveRaceTick) => {
        const now = Date.now();
        const prevBuffer = get().ringBuffer;
        const newBuffer = [...prevBuffer, { timestamp: now, tick }].filter(
          (s) => s.timestamp >= now - 75000
        );
        const delaySeconds = get().delaySeconds;
        const displayedTick = computeDisplayedTick(newBuffer, tick, delaySeconds);

        set({
          latestTick: tick,
          displayedTick,
          ringBuffer: newBuffer,
          status: tick.stale ? "stale" : "connected",
          errorMessage: null,
        });
      },
      () => {
        const { latestTick } = get();
        if (latestTick) {
          set({ status: "stale" });
        } else {
          set({
            status: "error",
            errorMessage: "Connection to live telemetry stream interrupted",
          });
        }
      }
    );
  },

  stopStreaming: () => {
    if (activeUnsubscribe) {
      activeUnsubscribe();
      activeUnsubscribe = null;
    }
  },

  retry: async () => {
    get().stopStreaming();
    await get().fetchSession();
  },

  setTick: (tick: LiveRaceTick) => {
    const now = Date.now();
    const prevBuffer = get().ringBuffer;
    const newBuffer = [...prevBuffer, { timestamp: now, tick }].filter(
      (s) => s.timestamp >= now - 75000
    );
    const delaySeconds = get().delaySeconds;
    const displayedTick = computeDisplayedTick(newBuffer, tick, delaySeconds);

    set({
      latestTick: tick,
      displayedTick,
      ringBuffer: newBuffer,
      status: tick.stale ? "stale" : "connected",
    });
  },

  setDelaySeconds: (seconds: number) => {
    const { ringBuffer, latestTick } = get();
    const clamped = Math.max(0, Math.min(seconds, 60));
    const displayedTick = computeDisplayedTick(ringBuffer, latestTick, clamped);
    set({ delaySeconds: clamped, displayedTick });
  },
}));
