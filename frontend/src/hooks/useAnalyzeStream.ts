"use client";

import { useCallback, useState } from "react";
import type { AnalyzeRequest, AnalyzeResponse } from "@/services/api";
import { analyzeTelemetry, RateLimitError } from "@/services/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";
const STREAM_TIMEOUT_MS = 60_000;

export type StreamStage = "idle" | "telemetry" | "strategy" | "rationale" | "done" | "error";

export interface StreamState {
  stage: StreamStage;
  message: string;
  tokens: string;
  partialStrategy: AnalyzeResponse["strategy_data"] | null;
  partialTelemetry: AnalyzeResponse["telemetry_data"] | null;
}

const INITIAL: StreamState = {
  stage: "idle",
  message: "",
  tokens: "",
  partialStrategy: null,
  partialTelemetry: null,
};

// Parse raw SSE text into {event, data} pairs.
// SSE format: "event: <name>\ndata: <json>\n\n"
function* parseSseChunk(raw: string): Generator<{ event: string; data: string }> {
  const blocks = raw.split(/\n\n+/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = "message";
    let data = "";
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data = line.slice(5).trim();
      // Ignore keepalive comment lines (": keepalive")
    }
    if (data) yield { event, data };
  }
}

export function useAnalyzeStream() {
  const [streamState, setStreamState] = useState<StreamState>(INITIAL);
  const [isLoading, setIsLoading] = useState(false);

  const runStream = useCallback(async (
    payload: AnalyzeRequest,
    accessToken?: string,
    opts: { onRateLimit?: (msg: string) => void; onRetry?: () => void } = {},
  ): Promise<AnalyzeResponse | null> => {
    setIsLoading(true);
    setStreamState(INITIAL);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE}/analyze/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "10");
        opts.onRateLimit?.(`Rate limited — retry in ${retryAfter}s`);
        setIsLoading(false);
        return null;
      }

      // Non-2xx or no body — fall back to regular /analyze
      if (!response.ok || !response.body) {
        throw new Error(`stream unavailable: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalResult: AnalyzeResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (terminated by \n\n)
        const boundary = buffer.lastIndexOf("\n\n");
        if (boundary === -1) continue;
        const chunk = buffer.slice(0, boundary + 2);
        buffer = buffer.slice(boundary + 2);

        for (const { event, data } of parseSseChunk(chunk)) {
          let parsed: unknown;
          try { parsed = JSON.parse(data); } catch { continue; }

          if (event === "status") {
            const d = parsed as { stage?: string; message?: string };
            setStreamState((s) => ({
              ...s,
              stage: (d.stage ?? s.stage) as StreamStage,
              message: d.message ?? s.message,
            }));
          } else if (event === "strategy") {
            setStreamState((s) => ({
              ...s,
              partialStrategy: parsed as AnalyzeResponse["strategy_data"],
            }));
          } else if (event === "telemetry") {
            setStreamState((s) => ({
              ...s,
              partialTelemetry: parsed as AnalyzeResponse["telemetry_data"],
            }));
          } else if (event === "token") {
            const tok = typeof parsed === "string" ? parsed : "";
            setStreamState((s) => ({ ...s, tokens: s.tokens + tok }));
          } else if (event === "done") {
            finalResult = parsed as AnalyzeResponse;
            setStreamState({ stage: "done", message: "", tokens: "", partialStrategy: null, partialTelemetry: null });
          } else if (event === "error") {
            const d = parsed as { message?: string };
            setStreamState((s) => ({ ...s, stage: "error", message: d.message ?? "Unknown error" }));
          }
        }

        if (finalResult) break;
      }

      return finalResult;
    } catch (err) {
      // SSE unavailable — transparently fall back to standard /analyze
      if (err instanceof RateLimitError) {
        opts.onRateLimit?.(`Rate limited — retry in ${err.retryAfterSeconds}s`);
        return null;
      }
      opts.onRetry?.();
      try {
        const fallback = await analyzeTelemetry(payload, accessToken);
        setStreamState({ stage: "done", message: "", tokens: "", partialStrategy: null, partialTelemetry: null });
        return fallback;
      } catch {
        setStreamState((s) => ({ ...s, stage: "error", message: "Analysis failed" }));
        return null;
      }
    } finally {
      clearTimeout(timer);
      setIsLoading(false);
    }
  }, []);

  return { streamState, isLoading, runStream };
}
