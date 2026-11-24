/**
 * Pace Delta Matrix DTOs
 */

export type SectorStatus = "session_fastest" | "personal_best" | "slower" | "reference";

export interface SectorSplitDTO {
  time_s: number;
  delta_s: number;
  status: SectorStatus;
}

export interface DriverPaceRowDTO {
  driver_code: string;
  driver_name: string;
  team: string;
  team_color: string;
  position: number;
  lap_number: number;
  compound: string;
  tyre_age_laps: number;
  s1: SectorSplitDTO;
  s2: SectorSplitDTO;
  s3: SectorSplitDTO;
  lap_time_s: number;
  lap_delta_s: number;
  speed_trap_kmh: number;
}

export interface PaceDeltaResponseDTO {
  status: string;
  year: number;
  event: string;
  session: string;
  reference_driver: string;
  lap_number: number;
  drivers: DriverPaceRowDTO[];
  session_best_s1: number;
  session_best_s2: number;
  session_best_s3: number;
  session_best_lap: number;
  fallback: boolean;
}
