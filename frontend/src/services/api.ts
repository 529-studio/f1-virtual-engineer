export interface AnalyzeRequest {
  query: string;
  driver?: string | null;
  session_info?: Record<string, unknown> | null;
}

export interface TelemetryChannel {
  min: number;
  max: number;
  avg: number;
  unit: string;
}

export interface AnalyzeResponse {
  status: "success" | "error";
  agent_response: string;
  query: string;
  intent?: {
    driver?: string | null;
    year?: number | null;
    event?: string | null;
    session_type?: string | null;
    needs_clarification?: boolean;
  };
  telemetry_data?: {
    sample_points?: number;
    speed?: TelemetryChannel;
    gear?: TelemetryChannel;
    rpm?: TelemetryChannel;
    fallback?: boolean;
    fallback_reason?: string | null;
  };
  error?: string | null;
}

export async function analyzeTelemetry(
  payload: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not configured. Add it to frontend/.env.local.",
    );
  }
  const response = await fetch(`${apiBaseUrl}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Analyze request failed with status ${response.status}`);
  }

  return (await response.json()) as AnalyzeResponse;
}
