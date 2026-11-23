export type WheelPosition = "FL" | "FR" | "RL" | "RR";

export type ThermalStatus =
  | "COLD"
  | "OPTIMAL"
  | "WARM"
  | "OVERHEATING"
  | "BLISTERING";

export type PressureStatus = "OPTIMAL" | "OVER_INFLATED" | "UNDER_INFLATED";

export interface TyreZoneTemps {
  inner_c: number;
  center_c: number;
  outer_c: number;
}

export interface TyreWheelThermalData {
  position: WheelPosition;
  compound: string;
  surface_temp: TyreZoneTemps;
  carcass_temp_c: number;
  bulk_temp_c: number;
  thermal_status: ThermalStatus;
  pressure_status: PressureStatus;
  pressure_psi: number;
  camber_deg: number;
  graining_risk: boolean;
  blistering_risk: boolean;
  thermal_cliff_risk: boolean;
  camber_bias_c: number;
}

export interface TyreThermalResponse {
  status: "success" | "fallback" | "error";
  year: number;
  event: string;
  session: string;
  driver: string;
  lap_number: number;
  stint_laps: number;
  wheels: Record<WheelPosition, TyreWheelThermalData>;
  critical_alerts: string[];
}

export interface TyreThermalParams {
  year: number;
  event: string;
  session_type?: string;
  driver?: string;
  lap_number?: number;
}

export type TyreViewMode = "surface" | "cutaway";
