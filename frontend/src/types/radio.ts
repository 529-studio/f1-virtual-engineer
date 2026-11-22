export type RadioClassification =
  | "tyre_issue"
  | "brake_issue"
  | "engine_issue"
  | "traffic"
  | "weather"
  | "strategy_request"
  | "none";

export type RadioUrgency = 1 | 2 | 3 | 4 | 5;

export type RadioSpeaker = "driver" | "race_engineer" | "unknown";

export interface RadioMessage {
  id: string;
  meeting_key: number;
  session_key: number;
  driver_number: number;
  driver_code: string;
  team_name: string;
  team_color?: string;
  timestamp_utc: string;
  lap_number: number | null;
  recording_url: string;
  duration_seconds: number;
  transcript: string;
  classification: RadioClassification;
  urgency: RadioUrgency;
  speaker: RadioSpeaker;
  trigger_phrase: string;
}

export interface RadioFeedResponse {
  status: "success" | "fixture_fallback" | "error";
  total_messages: number;
  session_name: string;
  circuit_name: string;
  items: RadioMessage[];
}

export interface RadioFilterState {
  driverFilter: string;
  classificationFilter: RadioClassification | "all";
  searchKeyword: string;
}

export interface RadioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isPitWallFilter: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
}
