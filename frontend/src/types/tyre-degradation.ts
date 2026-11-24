/**
 * Pirelli Tyre Degradation DTOs
 */

export interface DegradationPointDTO {
  lap: number;
  time_loss_s: number;
  grip_percent: number;
}

export interface TyreDegradationResponseDTO {
  status: string;
  year: number;
  event: string;
  driver: string;
  compound: string;
  current_stint_laps: number;
  current_time_loss_s: number;
  projected_cliff_lap: number;
  laps_until_cliff: number;
  pit_window_start_lap: number;
  pit_window_end_lap: number;
  undercut_gain_estimate_s: number;
  overcut_viable: boolean;
  trajectory: DegradationPointDTO[];
  fallback: boolean;
}
