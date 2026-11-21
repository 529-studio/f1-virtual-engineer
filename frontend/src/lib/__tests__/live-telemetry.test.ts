import { describe, it, expect } from "vitest";
import {
  calculateOvertakeProbability,
  generateMiniSectors,
  getTeamColor,
  interpolateSplinePosition,
} from "../live-telemetry";
import type { LiveDriverSnapshot } from "@/types/live";

describe("live-telemetry helpers", () => {
  it("resolves team colors accurately", () => {
    expect(getTeamColor("Red Bull Racing")).toBe("#3671C6");
    expect(getTeamColor("Ferrari")).toBe("#E80020");
    expect(getTeamColor("McLaren")).toBe("#FF8000");
    expect(getTeamColor(undefined, "VER")).toBe("#3671C6");
    expect(getTeamColor(undefined, "LEC")).toBe("#E80020");
    expect(getTeamColor(undefined, "NOR")).toBe("#FF8000");
    expect(getTeamColor("Unknown Team")).toBe("#00E5FF");
  });

  it("calculates realistic overtake probability with DRS eligibility", () => {
    const drivers: LiveDriverSnapshot[] = [
      {
        position: 1,
        driver_number: 4,
        driver_code: "NOR",
        team_name: "McLaren",
        interval_to_ahead: null,
        gap_to_leader: null,
        last_lap_time: 91.5,
        current_stint: 2,
        tyre_compound: "HARD",
        tyre_age: 18,
        pit_stops: 1,
        in_pit: false,
      },
      {
        position: 2,
        driver_number: 1,
        driver_code: "VER",
        team_name: "Red Bull Racing",
        interval_to_ahead: 0.65,
        gap_to_leader: 0.65,
        last_lap_time: 90.8,
        current_stint: 2,
        tyre_compound: "MEDIUM",
        tyre_age: 6,
        pit_stops: 1,
        in_pit: false,
      },
    ];

    const result = calculateOvertakeProbability(drivers, "Monza");
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.attackerCode).toBe("VER");
    expect(result.defenderCode).toBe("NOR");
    expect(result.drsEligible).toBe(true);
    expect(result.gapSeconds).toBe(0.65);
    expect(result.probability).toBeGreaterThan(60);
    expect(result.confidence).toBe("HIGH");
    expect(result.factors.some((f) => f.includes("DRS"))).toBe(true);
  });

  it("penalizes hard track overtaking such as Monaco", () => {
    const drivers: LiveDriverSnapshot[] = [
      {
        position: 1,
        driver_number: 16,
        driver_code: "LEC",
        team_name: "Ferrari",
        interval_to_ahead: null,
        gap_to_leader: null,
        last_lap_time: 75.2,
        current_stint: 1,
        tyre_compound: "HARD",
        tyre_age: 20,
        pit_stops: 0,
        in_pit: false,
      },
      {
        position: 2,
        driver_number: 81,
        driver_code: "PIA",
        team_name: "McLaren",
        interval_to_ahead: 0.9,
        gap_to_leader: 0.9,
        last_lap_time: 75.1,
        current_stint: 1,
        tyre_compound: "MEDIUM",
        tyre_age: 15,
        pit_stops: 0,
        in_pit: false,
      },
    ];

    const result = calculateOvertakeProbability(drivers, "Monaco");
    expect(result).not.toBeNull();
    if (!result) return;

    // Monaco track factor is 0.12, so probability should be heavily dampened
    expect(result.circuitFactor).toBe(0.12);
    expect(result.probability).toBeLessThan(30);
  });

  it("interpolates spline positions smoothly without NaN or bounds errors", () => {
    const mockPoints = [
      { x: 100, y: 100, distance: 0 },
      { x: 200, y: 100, distance: 1000 },
      { x: 200, y: 300, distance: 2000 },
      { x: 100, y: 300, distance: 3000 },
      { x: 100, y: 100, distance: 4000 },
    ];

    // At progress 0: matches first point
    const start = interpolateSplinePosition(0.0, mockPoints);
    expect(start.x).toBe(100);
    expect(start.y).toBe(100);

    // At progress 0.25: halfway along first leg
    const mid1 = interpolateSplinePosition(0.25, mockPoints);
    expect(mid1.x).toBe(200);
    expect(mid1.y).toBe(100);

    // At progress 0.375: halfway down second leg
    const mid2 = interpolateSplinePosition(0.375, mockPoints);
    expect(mid2.x).toBe(200);
    expect(mid2.y).toBe(200);

    // Progress clamped gracefully
    const over = interpolateSplinePosition(1.5, mockPoints);
    expect(over.x).toBe(100);
    expect(over.y).toBe(100);
  });

  it("generates mini-sectors with continuous fractions", () => {
    const sectors = generateMiniSectors("VER", "NOR", 20);
    expect(sectors.length).toBe(20);
    expect(sectors[0].startFraction).toBe(0.0);
    expect(sectors[19].endFraction).toBeCloseTo(1.0);
    for (const s of sectors) {
      expect(["VER", "NOR"]).toContain(s.dominantDriverCode);
      expect(s.dominantTeamColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
