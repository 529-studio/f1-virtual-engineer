import type {
  RaceControlMessageItem,
  StewardInvestigationResponse,
} from "./race-control";

export type StewardReportScope = "selected" | "session";

export interface StewardDossierInput {
  year: number;
  event: string;
  session: string;
  scope: StewardReportScope;
  incidents: RaceControlMessageItem[];
  selectedIncident: RaceControlMessageItem | null;
  investigation: StewardInvestigationResponse | null;
}

export interface StewardExportResult {
  filename: string;
  markdown: string;
  incidentCount: number;
}
