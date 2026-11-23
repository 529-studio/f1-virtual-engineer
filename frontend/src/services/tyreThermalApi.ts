import type {
  TyreThermalParams,
  TyreThermalResponse,
} from "@/types/tyre-thermal";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export async function fetchTyreThermal(
  params: TyreThermalParams
): Promise<TyreThermalResponse> {
  const query = new URLSearchParams({
    year: String(params.year),
    event: params.event,
    session_type: params.session_type || "Race",
    driver: params.driver || "LEC",
  });

  if (params.lap_number != null) {
    query.set("lap_number", String(params.lap_number));
  }

  const endpoint = `${apiBaseUrl}/telemetry/tyre-thermal?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let errorDetail = `Failed to fetch tyre thermal data (${response.status})`;
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
