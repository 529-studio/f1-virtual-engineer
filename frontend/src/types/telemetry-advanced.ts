export interface GGFrictionPoint {
  distance: number;
  g_lat: number;
  g_long: number;
  speed: number;
  gear: number;
}

export interface SteeringTracePoint {
  distance: number;
  steering: number;
  oversteer_flag: boolean;
}

export interface StintCompareResponse {
  driver: string;
  year: number;
  event: string;
  session_type: string;
  lap1: number;
  lap2: number;
  lap1_time_s: number | null;
  lap2_time_s: number | null;
  net_time_delta_s: number | null;
  sample_points: number;
  distance: number[];
  lap1_speed: number[];
  lap2_speed: number[];
  delta_speed: number[];
  lap1_throttle: number[];
  lap2_throttle: number[];
  lap1_brake: number[];
  lap2_brake: number[];
  cumulative_time_delta_s: number[];
  fallback: boolean;
  fallback_reason: string | null;
}

export interface StintCompareParams {
  year: number;
  event: string;
  session_type: string;
  driver: string;
  lap1: number;
  lap2: number;
}

export interface ExportParams {
  year: number;
  event: string;
  session_type: string;
  driver: string;
  lap_number?: number;
  format: "csv" | "parquet";
}
