export type IncidentCategory =
  | "COLLISION"
  | "TRACK_LIMITS"
  | "SAFETY_CAR_INFECT"
  | "IMPEDING"
  | "YELLOW_FLAG"
  | "UNSAFE_RELEASE"
  | "TECHNICAL_FLAG";

export type IncidentStatus =
  | "NOTED"
  | "UNDER_INVESTIGATION"
  | "DECISION_REACHED"
  | "NO_FURTHER_ACTION";

export type PenaltyType =
  | "NO_FURTHER_ACTION"
  | "REPRIMAND"
  | "TIME_PENALTY_5S"
  | "TIME_PENALTY_10S"
  | "DRIVE_THROUGH"
  | "GRID_DROP";

export interface RaceControlMessageItem {
  id: string;
  lap: number;
  timestamp_str: string;
  category: IncidentCategory;
  status: IncidentStatus;
  drivers_involved: string[];
  flag: string | null;
  message: string;
  description: string;
}

export interface RaceControlFeedResponse {
  status: "success" | "fallback" | "error";
  year: number;
  event: string;
  session: string;
  total_incidents: number;
  items: RaceControlMessageItem[];
}

export interface StewardInvestigationRequest {
  incident_id: string;
  year?: number;
  event?: string;
  session?: string;
}

export interface PenaltyProbability {
  penalty: PenaltyType;
  probability_pct: number;
  description: string;
}

export interface StewardInvestigationResponse {
  status: "success" | "fallback" | "error";
  incident_id: string;
  category: IncidentCategory;
  drivers_involved: string[];
  regulation_article: string;
  regulation_title: string;
  regulation_snippet: string;
  team_defense_argument: string;
  steward_prosecution_argument: string;
  predicted_verdict: PenaltyType;
  confidence_pct: number;
  penalty_breakdown: PenaltyProbability[];
}

export type RaceControlCategoryFilter = "ALL" | IncidentCategory;
