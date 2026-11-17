import { create } from "zustand";
import { fetchLiveSession, subscribeToLiveStream } from "../services/liveApi";
import type {
  LiveConnectionStatus,
  LiveRaceTick,
  LiveSessionMeta,
} from "../types/live";

interface LiveState {
  sessionMeta: LiveSessionMeta | null;
  latestTick: LiveRaceTick | null;
  status: LiveConnectionStatus;
  errorMessage: string | null;

  fetchSession: () => Promise<void>;
  startStreaming: () => void;
  stopStreaming: () => void;
  retry: () => Promise<void>;
  setTick: (tick: LiveRaceTick) => void;
}

let activeUnsubscribe: (() => void) | null = null;

export const useLiveStore = create<LiveState>((set, get) => ({
  sessionMeta: null,
  latestTick: null,
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
        set({
          latestTick: tick,
          status: tick.stale ? "stale" : "connected",
          errorMessage: null,
        });
      },
      () => {
        const { latestTick } = get();
        if (latestTick) {
          // Degrade gracefully to stale rather than blanking out the view
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
    set({
      latestTick: tick,
      status: tick.stale ? "stale" : "connected",
    });
  },
}));
