import type { DrsEfficiencyResponse, WingTrim } from "@/types/drs";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export interface FetchDrsEfficiencyParams {
  year: number;
  event: string;
  session?: string;
  driver: string;
  compareDriver?: string | null;
  wingTrim?: WingTrim;
  dragLevel?: number;
}

export async function fetchDrsEfficiency(
  params: FetchDrsEfficiencyParams
): Promise<DrsEfficiencyResponse> {
  const query = new URLSearchParams({
    year: String(params.year),
    event: params.event,
    session: params.session || "R",
    driver: params.driver,
    wing_trim: params.wingTrim || "BALANCED",
  });

  if (params.compareDriver && params.compareDriver !== params.driver) {
    query.set("compare_driver", params.compareDriver);
  }
  if (params.dragLevel != null) {
    query.set("drag_level", String(params.dragLevel));
  }

  const endpoint = `${apiBaseUrl}/telemetry/drs-efficiency?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent": "f1-virtual-engineer/1.0",
    },
  });

  if (response.status === 429) {
    throw new Error("Rate limit reached — wait a few seconds and retry.");
  }

  if (!response.ok) {
    let detail = `Failed to load DRS efficiency telemetry (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) {
        detail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(detail);
  }

  return (await response.json()) as DrsEfficiencyResponse;
}
