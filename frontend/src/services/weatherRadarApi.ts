import type { WeatherRadarResponse } from "@/types/weather-radar";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

export async function fetchWeatherRadar(
  year: number = 2024,
  event: string = "British Grand Prix",
  session: string = "Race",
  lap?: number | null
): Promise<WeatherRadarResponse> {
  const query = new URLSearchParams({
    year: String(year),
    event,
    session,
  });

  if (lap != null) {
    query.set("lap", String(lap));
  }

  const endpoint = `${apiBaseUrl}/weather/radar?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let errorDetail = `Failed to fetch weather radar (${response.status})`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) {
        errorDetail = typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
