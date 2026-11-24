import type { PaceDeltaResponseDTO } from "@/types/pace-delta";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export interface FetchPaceDeltaParams {
  year: number;
  event: string;
  session_type?: string;
  reference_driver?: string;
  lap_number?: number;
}

export async function fetchPaceDelta(
  params: FetchPaceDeltaParams
): Promise<PaceDeltaResponseDTO> {
  const query = new URLSearchParams({
    year: String(params.year),
    event: params.event,
    session_type: params.session_type || "Race",
    reference_driver: params.reference_driver || "LEC",
  });

  if (params.lap_number != null) {
    query.set("lap_number", String(params.lap_number));
  }

  const endpoint = `${apiBaseUrl}/telemetry/pace-delta?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "f1-virtual-engineer/1.0",
    },
  });

  if (!response.ok) {
    let errorDetail = `Failed to fetch pace delta telemetry (${response.status})`;
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
