import { describe, expect, it } from "vitest";

describe("Weather Radar & Track Grip Dynamics", () => {
  it("classifies tyre compounds based on grip percentage thresholds", () => {
    function classifyCompound(gripPct: number): "SLICK" | "INTERMEDIATE" | "WET" {
      if (gripPct >= 88.0) return "SLICK";
      if (gripPct >= 65.0) return "INTERMEDIATE";
      return "WET";
    }

    expect(classifyCompound(100.0)).toBe("SLICK");
    expect(classifyCompound(88.0)).toBe("SLICK");
    expect(classifyCompound(87.9)).toBe("INTERMEDIATE");
    expect(classifyCompound(65.0)).toBe("INTERMEDIATE");
    expect(classifyCompound(64.9)).toBe("WET");
    expect(classifyCompound(45.0)).toBe("WET");
  });

  it("calculates wind drift displacement across forecast offsets", () => {
    function calculateDrift(
      speedKmh: number,
      directionDeg: number,
      offsetMin: number
    ): { dx: number; dy: number } {
      const rad = (directionDeg * Math.PI) / 180;
      const distKm = (speedKmh / 60.0) * offsetMin;
      return {
        dx: Number((distKm * Math.sin(rad)).toFixed(2)),
        dy: Number((-distKm * Math.cos(rad)).toFixed(2)),
      };
    }

    // Wind blowing North (0 deg) -> drift dy < 0
    const drift0 = calculateDrift(30, 0, 10);
    expect(drift0.dx).toBe(0);
    expect(drift0.dy).toBe(-5.0);

    // Wind blowing East (90 deg) -> drift dx > 0
    const drift90 = calculateDrift(60, 90, 5);
    expect(drift90.dx).toBe(5.0);
    expect(drift90.dy).toBe(-0.0);
  });

  it("correctly evaluates track impact radius", () => {
    function isTrackImpacted(cellX: number, cellY: number, cellRadiusKm: number): boolean {
      const dist = Math.sqrt(cellX * cellX + cellY * cellY);
      return dist <= cellRadiusKm + 1.2;
    }

    // Cell at origin (0, 0)
    expect(isTrackImpacted(0, 0, 2.5)).toBe(true);
    // Cell far away (15, 15)
    expect(isTrackImpacted(15, 15, 2.5)).toBe(false);
    // Cell near boundary (2.0, 1.5) -> dist = 2.5, radius = 2.0 -> 2.5 <= 3.2
    expect(isTrackImpacted(2.0, 1.5, 2.0)).toBe(true);
  });
});
