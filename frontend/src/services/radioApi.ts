import type { RadioFeedResponse } from "@/types/radio";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export interface RadioAnalyzeResult {
  status: "success" | "error";
  classification: string;
  severity: "low" | "medium" | "high";
  trigger_phrase: string;
  urgency: number;
  speaker: string;
  fallback: boolean;
  fallback_reason?: string;
}

export async function fetchRadioFeed(
  sessionKey: number = 9165,
  driverNumber?: number
): Promise<RadioFeedResponse> {
  const query = new URLSearchParams({ session_key: String(sessionKey) });
  if (driverNumber != null) {
    query.set("driver_number", String(driverNumber));
  }

  const endpoint = `${apiBaseUrl}/radio/feed?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch radio feed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function analyzeRadioTranscript(
  transcript: string,
  driver?: string
): Promise<RadioAnalyzeResult> {
  const endpoint = `${apiBaseUrl}/radio/analyze`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ transcript, driver }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to analyze radio transcript: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
