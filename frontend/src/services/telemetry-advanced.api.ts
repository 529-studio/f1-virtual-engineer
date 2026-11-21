import type {
  ExportParams,
  StintCompareParams,
  StintCompareResponse,
} from "@/types/telemetry-advanced";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "/api";

/**
 * Fetch raw telemetry file (CSV or Parquet) from backend as a binary Blob.
 */
export async function exportTelemetryBlob(
  params: ExportParams
): Promise<{ blob: Blob; filename: string }> {
  const query = new URLSearchParams({
    year: String(params.year),
    event: params.event,
    session_type: params.session_type,
    driver: params.driver,
    format: params.format,
  });

  if (params.lap_number != null) {
    query.set("lap_number", String(params.lap_number));
  }

  const endpoint = `${apiBaseUrl}/telemetry/export?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept:
        params.format === "parquet"
          ? "application/vnd.apache.parquet"
          : "text/csv",
    },
  });

  if (!response.ok) {
    let errorDetail = `Export failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) errorDetail = errJson.detail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  // Extract filename from Content-Disposition header if available
  const disposition = response.headers.get("content-disposition");
  let filename = `${params.driver}_${params.event.replace(/\s+/g, "_")}_${params.year}_lap${params.lap_number ?? "fastest"}.${params.format}`;
  if (disposition) {
    const match = disposition.match(/filename=["']?([^"']+)["']?/);
    if (match?.[1]) {
      filename = match[1];
    }
  }

  const blob = await response.blob();
  return { blob, filename };
}

/**
 * Initiates browser file download for exported telemetry.
 */
export async function downloadTelemetryFile(params: ExportParams): Promise<string> {
  const { blob, filename } = await exportTelemetryBlob(params);
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);
  return filename;
}

/**
 * Fetch multi-lap stint comparison (Lap 1 vs Lap 2) for the current driver.
 */
export async function getStintCompare(
  params: StintCompareParams
): Promise<StintCompareResponse> {
  const query = new URLSearchParams({
    year: String(params.year),
    event: params.event,
    session_type: params.session_type,
    driver: params.driver,
    lap1: String(params.lap1),
    lap2: String(params.lap2),
  });

  const endpoint = `${apiBaseUrl}/telemetry/stint-compare?${query.toString()}`;
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    let errorDetail = `Stint comparison failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson?.detail) errorDetail = errJson.detail;
    } catch {
      // ignore json parse error
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
