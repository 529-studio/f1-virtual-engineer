import { describe, it, expect } from "vitest";
import {
  simulateChaseConvergence,
  type ChaseSimulationInput,
  type ChaseSimulationResult,
} from "../catchup-analytics";

describe("catchup-analytics engine", () => {
  const baseInput: ChaseSimulationInput = {
    currentLap: 38,
    totalLaps: 53, // Monza Grand Prix
    initialGapSeconds: 5.4, // Piastri 5.4s behind Leclerc
    leader: {
      driver: "LEC",
      compound: "HARD",
      stintLaps: 23,
      baseLapTimeSeconds: 81.5,
      degradationRateSecPerLap: 0.040,
      cliffLapOffset: 38, // Leader hits cliff at stint lap 38 (race lap 53)
    },
    chaser: {
      driver: "PIA",
      compound: "HARD",
      stintLaps: 10, // 13-lap fresher tyres
      baseLapTimeSeconds: 81.1, // 0.4s faster raw pace
      degradationRateSecPerLap: 0.055,
      cliffLapOffset: 32, // Chaser hits cliff at stint lap 32 (race lap 60 - safe!)
    },
    drsAdvantageSeconds: 0.35,
  };

  it("projects DRS capture and complete overtake when chaser has persistent pace advantage", () => {
    const result: ChaseSimulationResult = simulateChaseConvergence(baseInput);

    expect(result.trajectory).toBeDefined();
    expect(result.trajectory.length).toBe(15); // Laps 39 to 53

    // Piastri catches ~0.4s to 0.6s per lap
    // Reaches DRS (< 1.0s) around Lap 47-48
    expect(result.drsCaptureLap).not.toBeNull();
    expect(result.drsCaptureLap).toBeGreaterThanOrEqual(46);
    expect(result.drsCaptureLap).toBeLessThanOrEqual(49);

    // Overtake (< 0.0s) projected before or on Lap 51
    expect(result.overtakeLap).not.toBeNull();
    expect(result.overtakeLap).toBeGreaterThan(result.drsCaptureLap!);
    expect(result.overtakeLap).toBeLessThanOrEqual(52);

    expect(result.chaseStatus).toBe("SUCCESS");
    expect(result.tacticalDebrief).toContain("PIA");
    expect(result.tacticalDebrief).toContain("LEC");
    expect(result.tacticalDebrief).toContain("DRS");
  });

  it("detects when chase stalls due to chaser hitting tyre cliff before DRS", () => {
    // Chaser tyres are heavily worn and cliff hits after 5 more laps (stint lap 15, race lap 43)
    const cliffInput: ChaseSimulationInput = {
      ...baseInput,
      initialGapSeconds: 7.5,
      chaser: {
        ...baseInput.chaser,
        stintLaps: 10,
        cliffLapOffset: 15, // Hits cliff at Lap 43
      },
    };

    const result = simulateChaseConvergence(cliffInput);

    // Chaser hits cliff at lap 43, pace degrades severely, cannot reach 1.0s DRS
    expect(result.chaseStatus).toBe("CLIFF_STALLED");
    expect(result.drsCaptureLap).toBeNull();
    expect(result.overtakeLap).toBeNull();
    expect(result.tacticalDebrief).toContain("cliff");
  });

  it("handles scenario where race runs out of laps before gap closes", () => {
    const bigGapInput: ChaseSimulationInput = {
      ...baseInput,
      initialGapSeconds: 15.0, // 15 seconds back with only 15 laps left
    };

    const result = simulateChaseConvergence(bigGapInput);

    expect(result.chaseStatus).toBe("OUT_OF_LAPS");
    expect(result.drsCaptureLap).toBeNull();
    expect(result.overtakeLap).toBeNull();
    expect(result.minProjectedGap).toBeGreaterThan(1.0);
  });

  it("handles starting already inside DRS (< 1.0s)", () => {
    const insideDrsInput: ChaseSimulationInput = {
      ...baseInput,
      initialGapSeconds: 0.8,
    };

    const result = simulateChaseConvergence(insideDrsInput);

    // Since initial gap is 0.8s, DRS is already available at current lap
    expect(result.drsCaptureLap).toBe(38);
    expect(result.overtakeLap).toBeLessThanOrEqual(40);
    expect(result.chaseStatus).toBe("SUCCESS");
    expect(result.tacticalDebrief).toContain("DRS already active.");
  });

  it("handles fresh tyre stint with 0 initial stint laps without fallback clobber", () => {
    const freshTyreInput: ChaseSimulationInput = {
      ...baseInput,
      chaser: {
        ...baseInput.chaser,
        stintLaps: 0, // Freshly fitted tyres
      },
    };

    const result = simulateChaseConvergence(freshTyreInput);
    expect(result.chaseStatus).toBe("SUCCESS");
    expect(result.drsCaptureLap).toBe(47); // 2 laps earlier than 10-lap old tyre (49)
  });

  it("accurately applies interactive what-if pace delta overrides", () => {
    // Override pace delta to +0.8s/lap faster for chaser
    const boostedInput: ChaseSimulationInput = {
      ...baseInput,
      paceDeltaOverride: 0.8,
    };

    const boostedResult = simulateChaseConvergence(boostedInput);
    const standardResult = simulateChaseConvergence(baseInput);

    // Boosted pace should capture DRS significantly earlier
    expect(boostedResult.drsCaptureLap!).toBeLessThan(standardResult.drsCaptureLap!);
  });

  it("handles leader pulling away when chaser is slower", () => {
    const chaserSlowerInput: ChaseSimulationInput = {
      ...baseInput,
      paceDeltaOverride: -0.5, // Chaser is 0.5s slower per lap
    };

    const result = simulateChaseConvergence(chaserSlowerInput);
    expect(result.chaseStatus).toBe("OUT_OF_LAPS");
    expect(result.drsCaptureLap).toBeNull();
    expect(result.minProjectedGap).toBe(5.4); // Never got closer than starting gap
  });
});
