import type { DriverPerformanceResponse, NormalizationMode } from "@/types/performance";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export interface FetchDriverPerformanceParams {
  year: number;
  event: string;
  session?: string;
  driver: string;
  compareDriver?: string | null;
  mode?: NormalizationMode;
}

export async function fetchDriverPerformance(
  params: FetchDriverPerformanceParams
): Promise<DriverPerformanceResponse> {
  const query = new URLSearchParams({
    year: String(params.year),
    event: params.event,
    session: params.session || "R",
    driver: params.driver,
    mode: params.mode || "session_relative",
  });

  if (params.compareDriver && params.compareDriver !== params.driver) {
    query.set("compare_driver", params.compareDriver);
  }

  const endpoint = `${apiBaseUrl}/telemetry/driver-performance?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "f1-virtual-engineer/1.0",
    },
  });

  if (response.status === 429) {
    throw new Error("Rate limit reached — please wait a few seconds and retry.");
  }

  if (!response.ok) {
    let errorDetail = `Failed to load driver performance profile (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) {
        errorDetail =
          typeof errJson.detail === "string"
            ? errJson.detail
            : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(errorDetail);
  }

  return (await response.json()) as DriverPerformanceResponse;
}
