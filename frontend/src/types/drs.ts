export type WingTrim = "LOW_DRAG" | "BALANCED" | "HIGH_DOWNFORCE";

export interface DrsZoneMetric {
  zone_id: string;
  zone_name: string;
  distance_range_m: string;
  drs_closed_speed_kmh: number;
  drs_open_speed_kmh: number;
  speed_delta_kmh: number;
  time_gain_s: number;
  activation_rate_pct: number;
}

export interface DrsEfficiencyResponse {
  status: "success" | "error";
  year: number;
  event: string;
  session: string;
  driver: string;
  compare_driver?: string | null;
  wing_trim: WingTrim;
  drag_level: number;
  aero_efficiency_index: number;
  avg_drs_gain_kmh: number;
  total_lap_gain_s: number;
  speed_trap_primary_kmh: number;
  speed_trap_compare_kmh?: number | null;
  recommended_trim: WingTrim;
  recommendation_reason: string;
  zones: DrsZoneMetric[];
  fallback: boolean;
  fallback_reason?: string | null;
  source: string;
}
