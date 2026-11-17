import type { LiveRaceTick, LiveSessionMeta } from "../types/live";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export function parseLiveTickEvent(rawEventData: string): LiveRaceTick {
  const parsed = JSON.parse(rawEventData);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid live tick event data: not an object");
  }
  return parsed as LiveRaceTick;
}

export async function fetchLiveSession(): Promise<LiveSessionMeta | null> {
  const url = `${apiBaseUrl.replace(/\/+$/, "")}/live/session`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch live session: HTTP ${response.status}`);
  }

  return response.json();
}

export function subscribeToLiveStream(
  onTick: (tick: LiveRaceTick) => void,
  onError?: (error: Event) => void
): () => void {
  const url = `${apiBaseUrl.replace(/\/+$/, "")}/live/stream`;
  let eventSource: EventSource | null = null;
  let isClosed = false;

  try {
    eventSource = new EventSource(url);

    eventSource.addEventListener("tick", (event: MessageEvent) => {
      if (isClosed) return;
      try {
        const tick = parseLiveTickEvent(event.data);
        onTick(tick);
      } catch (err) {
        console.error("Failed to parse live stream tick:", err);
      }
    });

    eventSource.onmessage = (event: MessageEvent) => {
      if (isClosed) return;
      try {
        const tick = parseLiveTickEvent(event.data);
        onTick(tick);
      } catch {
        // Ignore keepalives or non-JSON comments
      }
    };

    eventSource.onerror = (err) => {
      if (isClosed) return;
      if (onError) {
        onError(err);
      }
    };
  } catch (err) {
    console.error("Failed to initialize EventSource:", err);
  }

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
