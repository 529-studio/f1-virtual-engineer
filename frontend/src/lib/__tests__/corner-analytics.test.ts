import { describe, it, expect } from "vitest";
import {
  extractCornerMetrics,
  getCornerEnvelope,
  generateEngineerDebrief,
  type CornerAnalysisResult,
} from "../corner-analytics";
import type { CornerInfo, TrackMapPoint } from "@/services/api";

describe("corner-analytics engine", () => {
  const sampleCorner: CornerInfo = {
    number: 1,
    letter: "",
    x: 500,
    y: 200,
    angle: 90,
    distance: 600, // 600 meters from start line
  };

  // Generate synthetic points along the corner: 400m to 750m
  // D_entry = 600 - 160 = 440m; D_exit = 600 + 100 = 700m
  const makePoints = (speedProfile: (d: number) => number, brakeProfile: (d: number) => boolean, throttleProfile: (d: number) => number): TrackMapPoint[] => {
    const pts: TrackMapPoint[] = [];
    for (let d = 400; d <= 750; d += 20) {
      pts.push({
        x: d,
        y: 200,
        distance: d,
        speed: speedProfile(d),
        gear: 3,
        brake: brakeProfile(d),
        throttle: throttleProfile(d),
        drs: 0,
      });
    }
    return pts;
  };

  it("calculates corner envelope correctly", () => {
    const envelope = getCornerEnvelope(sampleCorner, 5800);
    expect(envelope.entryDistance).toBe(440); // 600 - 160
    expect(envelope.exitDistance).toBe(700);  // 600 + 100
    expect(envelope.cornerDistance).toBe(600);
  });

  it("handles track boundary clamp in envelope", () => {
    const nearStartCorner: CornerInfo = {
      number: 1,
      letter: "",
      x: 100,
      y: 100,
      angle: 45,
      distance: 80,
    };
    const envelope = getCornerEnvelope(nearStartCorner, 5800);
    expect(envelope.entryDistance).toBe(0);
    expect(envelope.exitDistance).toBe(180);
  });

  it("extracts braking point, apex speed, throttle pickup, and deltas between two drivers", () => {
    // Driver A (LEC): brakes at 480m, apex min speed 85 km/h at 600m, throttle pickup at 640m
    const driverAPoints = makePoints(
      (d) => (d < 480 ? 320 : d <= 600 ? 320 - (d - 480) * (235 / 120) : 85 + (d - 600) * 1.5),
      (d) => d >= 480 && d <= 600,
      (d) => (d <= 600 ? 0 : Math.min(100, (d - 620) * 2.5))
    );

    // Driver B (SAI): brakes earlier at 460m, apex min speed 90 km/h at 600m, throttle pickup later at 660m
    const driverBPoints = makePoints(
      (d) => (d < 460 ? 320 : d <= 600 ? 320 - (d - 460) * (230 / 140) : 90 + (d - 600) * 1.2),
      (d) => d >= 460 && d <= 600,
      (d) => (d <= 600 ? 0 : Math.min(100, (d - 640) * 2.0))
    );

    const result: CornerAnalysisResult = extractCornerMetrics(
      sampleCorner,
      driverAPoints,
      driverBPoints,
      "LEC",
      "SAI"
    );

    // Braking metrics
    expect(result.primary.brakeDistance).toBe(480);
    expect(result.compare?.brakeDistance).toBe(460);
    expect(result.deltaBrakeMeters).toBe(20); // LEC braked 20m deeper (+20m)

    // Apex speed metrics
    expect(result.primary.minApexSpeed).toBeCloseTo(85, 0);
    expect(result.compare?.minApexSpeed).toBeCloseTo(90, 0);
    expect(result.deltaApexSpeedKph).toBeCloseTo(-5, 0); // LEC was 5 km/h slower at apex

    // Throttle pickup metrics
    expect(result.primary.throttlePickupDistance).toBe(640);
    expect(result.compare?.throttlePickupDistance).toBe(660);
    expect(result.deltaThrottleMeters).toBe(-20); // LEC got on throttle 20m earlier (-20m)

    // Time delta exists and is finite
    expect(result.deltaTimeSeconds).toBeDefined();
    expect(Number.isFinite(result.deltaTimeSeconds)).toBe(true);

    // Engineer debrief
    expect(result.debrief).toBeDefined();
    expect(result.debrief.length).toBeGreaterThan(20);
    expect(result.debrief).toContain("LEC");
  });

  it("handles flat-out corner with no braking gracefully", () => {
    // Flat-out bend: 310 km/h throughout, 0% brake, 100% throttle
    const flatPoints = makePoints(
      () => 310,
      () => false,
      () => 100
    );

    const result = extractCornerMetrics(sampleCorner, flatPoints, undefined, "VER", null);
    expect(result.primary.hasBraking).toBe(false);
    expect(result.primary.brakeDistance).toBeNull();
    expect(result.compare).toBeNull();
    expect(result.deltaBrakeMeters).toBeNull();
    expect(result.deltaApexSpeedKph).toBeNull();
  });

  it("handles empty or sparse point arrays without crashing", () => {
    const result = extractCornerMetrics(sampleCorner, [], [], "VER", "HAM");
    expect(result.primary.hasBraking).toBe(false);
    expect(result.primary.minApexSpeed).toBe(0);
    expect(result.primary.brakeDistance).toBeNull();
  });

  it("generates debrief capturing late braking and earlier throttle pickup", () => {
    const debrief = generateEngineerDebrief({
      cornerNumber: 1,
      cornerLetter: "",
      driverCode: "LEC",
      compareCode: "SAI",
      deltaBrakeMeters: 14,
      deltaApexSpeedKph: -4,
      deltaThrottleMeters: -6,
      deltaTimeSeconds: -0.026,
    });

    expect(debrief).toContain("LEC");
    expect(debrief).toContain("Turn 1");
    expect(debrief).toContain("braked");
    expect(debrief).toContain("throttle");
  });

  it("handles chicane letters like Turn 1A and Turn 1B", () => {
    const chicaneCornerA: CornerInfo = {
      number: 1,
      letter: "A",
      x: 500,
      y: 200,
      angle: 90,
      distance: 600,
    };
    const debriefA = generateEngineerDebrief({
      cornerNumber: chicaneCornerA.number,
      cornerLetter: chicaneCornerA.letter,
      driverCode: "VER",
      compareCode: "NOR",
      deltaBrakeMeters: 5,
      deltaApexSpeedKph: 3,
    });
    expect(debriefA).toContain("Turn 1A");
  });

  it("safely handles different sampling lengths between primary and compare", () => {
    const ptsA = makePoints(() => 200, () => false, () => 80);
    // Sparsely sampled points for driver B
    const ptsB: TrackMapPoint[] = [
      { x: 400, y: 200, distance: 400, speed: 210, gear: 4, brake: false, throttle: 85, drs: 0 },
      { x: 600, y: 200, distance: 600, speed: 190, gear: 3, brake: true, throttle: 10, drs: 0 },
      { x: 750, y: 200, distance: 750, speed: 230, gear: 5, brake: false, throttle: 100, drs: 0 },
    ];

    const result = extractCornerMetrics(sampleCorner, ptsA, ptsB, "LEC", "HAM");
    expect(result.primary.driver).toBe("LEC");
    expect(result.compare?.driver).toBe("HAM");
    expect(result.compare?.minApexSpeed).toBe(190);
    expect(result.compare?.brakeDistance).toBe(600);
  });

  it("does not detect braking that occurs after the apex as entry braking", () => {
    // Driver navigates Turn 1 without braking (gentle coast down from 260 to 250 at apex 600m, on throttle to 270 at 640m),
    // then applies hard brakes at 680m for the following corner.
    const postApexBrakePts = makePoints(
      (d) => (d <= 600 ? 260 - (d - 400) * 0.05 : d <= 640 ? 250 + (d - 600) * 0.5 : 270),
      (d) => d >= 680,
      (d) => (d >= 600 ? 100 : 0)
    );

    const result = extractCornerMetrics(sampleCorner, postApexBrakePts, null, "VER", null);
    expect(result.primary.hasBraking).toBe(false);
    expect(result.primary.brakeDistance).toBeNull();
  });
});
