export interface RadarCell {
  x: number;
  y: number;
  intensity_dbz: number;
  rain_rate_mmh: number;
  radius_km: number;
}

export interface RadarSweepForecast {
  time_offset_min: number;
  cells: RadarCell[];
  track_impact: boolean;
  projected_grip_pct: number;
}

export interface WeatherTimelineSample {
  minute: number;
  lap_estimate: number | null;
  rainfall: boolean;
  rainfall_intensity: number;
  air_temp_c: number;
  track_temp_c: number;
  humidity_pct: number;
  wind_speed_kmh: number;
  wind_direction_deg: number;
  track_grip_pct: number;
  recommended_compound: "SLICK" | "INTERMEDIATE" | "WET";
  water_film_mm?: number;
}

export interface CompoundCrossOverWindow {
  current_compound: "SLICK" | "INTERMEDIATE" | "WET";
  recommended_compound: "SLICK" | "INTERMEDIATE" | "WET";
  crossover_status: "OPTIMAL" | "APPROACHING" | "CRITICAL" | "PAST_WINDOW";
  crossover_lap: number | null;
  crossover_in_minutes: number | null;
  grip_pct: number;
  water_film_mm: number;
  pit_call: string;
}

export interface WeatherRadarResponse {
  status: "success" | "error";
  year: number;
  event: string;
  session_type: string;
  current_metrics: WeatherTimelineSample;
  crossover: CompoundCrossOverWindow;
  radar_frames: RadarSweepForecast[];
  timeline: WeatherTimelineSample[];
  wind_vector: {
    speed_kmh: number;
    direction_deg: number;
    dx: number;
    dy: number;
  };
  fallback: boolean;
  fallback_reason: string | null;
}
