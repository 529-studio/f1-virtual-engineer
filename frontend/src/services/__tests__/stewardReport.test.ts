import { describe, expect, it } from "vitest";
import { buildStewardDossier, buildStewardPrintableHtml } from "../stewardReport";
import type { RaceControlMessageItem, StewardInvestigationResponse } from "@/types/race-control";

const sampleIncidents: RaceControlMessageItem[] = [
  {
    id: "rc-01",
    lap: 19,
    timestamp_str: "12:35:10",
    category: "SAFETY_CAR_INFECT",
    status: "DECISION_REACHED",
    drivers_involved: ["SAR"],
    flag: "YELLOW",
    message: "SAFETY CAR DEPLOYED",
    description: "Front wing debris at Turn 8.",
  },
  {
    id: "rc-02",
    lap: 54,
    timestamp_str: "13:28:44",
    category: "COLLISION",
    status: "UNDER_INVESTIGATION",
    drivers_involved: ["PER", "ALB"],
    flag: "YELLOW",
    message: "TURN 13 COLLISION",
    description: "Late braking contact at Turn 13.",
  },
];

const sampleInvestigation: StewardInvestigationResponse = {
  status: "success",
  incident_id: "rc-02",
  category: "COLLISION",
  drivers_involved: ["PER", "ALB"],
  regulation_article: "Article 33.4",
  regulation_title: "Causing an Avoidable Collision",
  regulation_snippet: "Maneuvers liable to hinder other drivers are prohibited.",
  team_defense_argument: "Car 11 held the inside apex.",
  steward_prosecution_argument: "Car 11 understeered into Car 23.",
  predicted_verdict: "TIME_PENALTY_5S",
  confidence_pct: 92,
  penalty_breakdown: [
    { penalty: "TIME_PENALTY_5S", probability_pct: 70, description: "Standard collision penalty." },
  ],
};

describe("stewardReport service", () => {
  it("formats selected incident markdown with regulation citation and verdict", () => {
    const result = buildStewardDossier({
      year: 2023,
      event: "Singapore Grand Prix",
      session: "Race",
      scope: "selected",
      incidents: sampleIncidents,
      selectedIncident: sampleIncidents[1],
      investigation: sampleInvestigation,
    });

    expect(result.incidentCount).toBe(1);
    expect(result.filename).toBe("steward-dossier-2023-singapore-grand-prix-race-rc-02.md");
    expect(result.markdown).toContain("Article 33.4");
    expect(result.markdown).toContain("TIME_PENALTY_5S");
    expect(result.markdown).toContain("Car 11 held the inside apex.");
    expect(result.markdown).not.toContain("rc-01");
  });

  it("includes all session incidents when scope is session and builds printable HTML", () => {
    const result = buildStewardDossier({
      year: 2023,
      event: "Singapore Grand Prix",
      session: "Race",
      scope: "session",
      incidents: sampleIncidents,
      selectedIncident: sampleIncidents[1],
      investigation: sampleInvestigation,
    });

    expect(result.incidentCount).toBe(2);
    expect(result.markdown).toContain("rc-01");
    expect(result.markdown).toContain("rc-02");

    const html = buildStewardPrintableHtml({
      year: 2023,
      event: "Singapore Grand Prix",
      session: "Race",
      scope: "session",
      incidents: sampleIncidents,
      selectedIncident: sampleIncidents[1],
      investigation: sampleInvestigation,
    });
    expect(html).toContain("FIA Post-Race Steward Dossier");
    expect(html).toContain("@media print");
  });
});
