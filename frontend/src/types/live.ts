export type LiveSafetyCarState = "NONE" | "VSC" | "SC" | "RED_FLAG";

export type LiveTyreCompound =
  | "SOFT"
  | "MEDIUM"
  | "HARD"
  | "INTERMEDIATE"
  | "WET"
  | "UNKNOWN";

export type LiveSource = "openf1" | "replay";

export type LiveConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "stale"
  | "error"
  | "empty";

export interface LiveSessionMeta {
  session_key: number;
  meeting_key: number;
  circuit_key: number;
  circuit_short_name: string;
  country_name: string;
  session_name: string;
  session_type: string;
  date_start: string;
  date_end: string;
  is_live: boolean;
  source: LiveSource;
}

export interface LiveDriverSnapshot {
  position: number;
  driver_number: number;
  driver_code: string;
  team_name: string;
  interval_to_ahead: number | null;
  gap_to_leader: number | null;
  last_lap_time: number | null;
  current_stint: number;
  tyre_compound: LiveTyreCompound;
  tyre_age: number;
  pit_stops: number;
  in_pit: boolean;
  coordinates?: [number, number] | null;
}

export interface LiveRaceTick {
  session_key: number;
  polled_at: string;
  delay_seconds: number;
  stale: boolean;
  source: LiveSource;
  safety_car_status: LiveSafetyCarState;
  leader_lap: number;
  drivers: LiveDriverSnapshot[];
}
