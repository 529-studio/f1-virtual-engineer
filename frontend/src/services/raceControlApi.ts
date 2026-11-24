import type {
  RaceControlFeedResponse,
  StewardInvestigationRequest,
  StewardInvestigationResponse,
} from "@/types/race-control";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export async function fetchRaceControlFeed(
  year: number = 2023,
  event: string = "Singapore Grand Prix",
  session: string = "Race"
): Promise<RaceControlFeedResponse> {
  const query = new URLSearchParams({
    year: String(year),
    event,
    session,
  });

  const endpoint = `${apiBaseUrl}/race-control/feed?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let errorDetail = `Failed to fetch race control feed (${response.status})`;
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

export async function investigateIncident(
  payload: StewardInvestigationRequest
): Promise<StewardInvestigationResponse> {
  const endpoint = `${apiBaseUrl}/race-control/investigate`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Failed to deliberate incident (${response.status})`;
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
