export type NormalizationMode = "session_relative" | "historic_benchmark";

export type PerformanceAxisKey =
  | "braking"
  | "cornering"
  | "throttle_pickup"
  | "tyre_management"
  | "top_speed"
  | "consistency";

export interface DriverRadarAxis {
  key: PerformanceAxisKey;
  label: string;
  score: number;
  raw_value: string;
  benchmark_value: string;
}

export interface DriverRadarProfile {
  driver_code: string;
  team_name: string;
  team_color: string;
  overall_score: number;
  axes: DriverRadarAxis[];
}

export interface DriverPerformanceResponse {
  status: "success" | "error";
  year: number;
  event: string;
  session: string;
  mode: NormalizationMode;
  primary: DriverRadarProfile;
  compare?: DriverRadarProfile | null;
  fallback: boolean;
  fallback_reason?: string | null;
  source: string;
}
