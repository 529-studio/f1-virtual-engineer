/**
 * Pure non-linear simulation engine for lap-by-lap tyre degradation divergence,
 * DRS window entry calculation, and overtake convergence projection.
 *
 * Adheres strictly to 529 Engineering Protocols:
 * - Deterministic, pure mathematical calculations.
 * - Zero Unicode emojis (e.g. no ⚡, 🏁, ⚠️).
 */

export interface DriverStintProfile {
  driver: string;
  compound: "SOFT" | "MEDIUM" | "HARD" | "INTERMEDIATE" | "WET";
  stintLaps: number;
  baseLapTimeSeconds: number;
  degradationRateSecPerLap: number;
  cliffLapOffset: number; // Stint lap count when compound hits cliff
}

export interface ChaseSimulationInput {
  currentLap: number;
  totalLaps: number;
  initialGapSeconds: number;
  leader: DriverStintProfile;
  chaser: DriverStintProfile;
  drsAdvantageSeconds?: number; // default ~0.35s when gap <= 1.0s
  paceDeltaOverride?: number; // Interactive slider adjustment in seconds (+: chaser faster, -: chaser slower)
}

export interface LapProjectionPoint {
  lap: number;
  gapSeconds: number;
  leaderStintAge: number;
  chaserStintAge: number;
  paceDelta: number; // positive = chaser is faster
  isDrsActive: boolean;
  leaderInCliff: boolean;
  chaserInCliff: boolean;
}

export type ChaseStatus = "SUCCESS" | "CLIFF_STALLED" | "OUT_OF_LAPS";

export interface ChaseSimulationResult {
  trajectory: LapProjectionPoint[];
  drsCaptureLap: number | null;
  overtakeLap: number | null;
  chaseStatus: ChaseStatus;
  minProjectedGap: number;
  tacticalDebrief: string;
}

const DEFAULT_DRS_ADVANTAGE = 0.35;
const TYRE_AGE_GRIP_DELTA_COEFF = 0.008; // Grip loss per lap of tyre age divergence
const CLIFF_DEGRADATION_MULTIPLIER = 2.5;

/**
 * Calculates rolling single-lap pace delta between leader and chaser.
 * Positive delta means the chaser is faster than the leader.
 */
export function calculateRollingPaceDelta(
  leader: DriverStintProfile,
  chaser: DriverStintProfile,
  lapOffset: number,
  isDrsActive: boolean,
  paceDeltaOverride = 0,
  drsAdvantage = DEFAULT_DRS_ADVANTAGE
): {
  delta: number;
  leaderAge: number;
  chaserAge: number;
  leaderInCliff: boolean;
  chaserInCliff: boolean;
} {
  const leaderAge = leader.stintLaps + lapOffset;
  const chaserAge = chaser.stintLaps + lapOffset;

  const leaderInCliff = leaderAge >= leader.cliffLapOffset;
  const chaserInCliff = chaserAge >= chaser.cliffLapOffset;

  // Base mechanical pace differential (Leader - Chaser)
  const rawDelta = leader.baseLapTimeSeconds - chaser.baseLapTimeSeconds;

  // Differential in grip due to tyre stint age delta
  const tyreAgeDelta = (leaderAge - chaserAge) * TYRE_AGE_GRIP_DELTA_COEFF;

  // Incremental degradation wear over simulated projection horizon
  const leaderDegFactor = leaderInCliff ? CLIFF_DEGRADATION_MULTIPLIER : 1.0;
  const chaserDegFactor = chaserInCliff ? CLIFF_DEGRADATION_MULTIPLIER : 1.0;

  const leaderDegradation = leaderDegFactor * leader.degradationRateSecPerLap * lapOffset;
  const chaserDegradation = chaserDegFactor * chaser.degradationRateSecPerLap * lapOffset;

  const degradationDelta = leaderDegradation - chaserDegradation;
  const drsDelta = isDrsActive ? drsAdvantage : 0.0;

  const totalDelta = rawDelta + tyreAgeDelta + degradationDelta + drsDelta + paceDeltaOverride;

  return {
    delta: totalDelta,
    leaderAge,
    chaserAge,
    leaderInCliff,
    chaserInCliff,
  };
}

/**
 * Generates an F1 pit-wall tactical debrief summary string without emojis.
 */
export function generateChaseDebrief(
  leader: DriverStintProfile,
  chaser: DriverStintProfile,
  status: ChaseStatus,
  drsLap: number | null,
  overtakeLap: number | null,
  avgPaceDelta: number
): string {
  const tyreDeltaLaps = leader.stintLaps - chaser.stintLaps;
  const paceFormatted = Math.abs(avgPaceDelta).toFixed(2);

  if (status === "SUCCESS") {
    const drsText = drsLap
      ? `DRS detection projected on Lap ${drsLap}.`
      : `DRS already active.`;
    const overtakeText = overtakeLap
      ? `Overtake window opens at Lap ${overtakeLap}.`
      : `Overtake imminent.`;

    return `${chaser.driver} is cutting the deficit by ${paceFormatted}s/lap with a ${tyreDeltaLaps}-lap tyre offset against ${leader.driver}. ${drsText} ${overtakeText}`;
  }

  if (status === "CLIFF_STALLED") {
    return `${chaser.driver} projected to hit compound cliff before closing the gap on ${leader.driver}. Tyre degradation limits convergence.`;
  }

  return `${chaser.driver} pace advantage (${paceFormatted}s/lap) is insufficient to catch ${leader.driver} before chequered flag. Out of laps.`;
}

/**
 * Simulates non-linear chase convergence from currentLap through totalLaps.
 */
export function simulateChaseConvergence(input: ChaseSimulationInput): ChaseSimulationResult {
  const {
    currentLap,
    totalLaps,
    initialGapSeconds,
    leader,
    chaser,
    drsAdvantageSeconds = DEFAULT_DRS_ADVANTAGE,
    paceDeltaOverride = 0,
  } = input;

  const trajectory: LapProjectionPoint[] = [];
  let currentGap = initialGapSeconds;
  let minProjectedGap = initialGapSeconds;

  let drsCaptureLap: number | null = initialGapSeconds <= 1.0 ? currentLap : null;
  let overtakeLap: number | null = initialGapSeconds <= 0.0 ? currentLap : null;
  let chaserEncounteredCliffBeforeOvertake = false;

  const remainingLaps = Math.max(0, totalLaps - currentLap);
  let cumulativePaceDelta = 0;

  for (let offset = 1; offset <= remainingLaps; offset++) {
    const projectedLap = currentLap + offset;
    const isDrs = currentGap <= 1.0;

    const {
      delta,
      leaderAge,
      chaserAge,
      leaderInCliff,
      chaserInCliff,
    } = calculateRollingPaceDelta(
      leader,
      chaser,
      offset,
      isDrs,
      paceDeltaOverride,
      drsAdvantageSeconds
    );

    cumulativePaceDelta += delta;

    if (chaserInCliff && overtakeLap === null) {
      chaserEncounteredCliffBeforeOvertake = true;
    }

    currentGap = Math.max(0, currentGap - delta);

    if (currentGap < minProjectedGap) {
      minProjectedGap = currentGap;
    }

    if (drsCaptureLap === null && currentGap <= 1.0) {
      drsCaptureLap = projectedLap;
    }

    if (overtakeLap === null && currentGap <= 0.0) {
      overtakeLap = projectedLap;
    }

    trajectory.push({
      lap: projectedLap,
      gapSeconds: Number(currentGap.toFixed(3)),
      leaderStintAge: leaderAge,
      chaserStintAge: chaserAge,
      paceDelta: Number(delta.toFixed(3)),
      isDrsActive: isDrs,
      leaderInCliff,
      chaserInCliff,
    });
  }

  // Determine chase status
  let chaseStatus: ChaseStatus = "OUT_OF_LAPS";
  if (overtakeLap !== null) {
    chaseStatus = "SUCCESS";
  } else if (chaserEncounteredCliffBeforeOvertake && (drsCaptureLap === null || minProjectedGap > 0.0)) {
    chaseStatus = "CLIFF_STALLED";
  } else {
    chaseStatus = "OUT_OF_LAPS";
  }

  const avgDelta = trajectory.length > 0 ? cumulativePaceDelta / trajectory.length : 0;
  const tacticalDebrief = generateChaseDebrief(
    leader,
    chaser,
    chaseStatus,
    drsCaptureLap,
    overtakeLap,
    avgDelta
  );

  return {
    trajectory,
    drsCaptureLap,
    overtakeLap,
    chaseStatus,
    minProjectedGap: Number(minProjectedGap.toFixed(3)),
    tacticalDebrief,
  };
}
