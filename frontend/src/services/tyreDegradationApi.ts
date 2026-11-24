import type { TyreDegradationResponseDTO } from "@/types/tyre-degradation";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export interface FetchTyreDegradationParams {
  year: number;
  event: string;
  driver?: string;
  compound?: string;
  current_stint_laps?: number;
}

export async function fetchTyreDegradation(
  params: FetchTyreDegradationParams
): Promise<TyreDegradationResponseDTO> {
  const query = new URLSearchParams({
    year: String(params.year),
    event: params.event,
    driver: params.driver || "LEC",
    compound: params.compound || "HARD",
    current_stint_laps: String(params.current_stint_laps ?? 18),
  });

  const endpoint = `${apiBaseUrl}/telemetry/tyre-degradation?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "f1-virtual-engineer/1.0",
    },
  });

  if (!response.ok) {
    let errorDetail = `Failed to fetch tyre degradation curve (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
