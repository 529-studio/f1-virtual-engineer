/**
 * corner-analytics.ts
 *
 * Pure algorithmic telemetry extraction module for turn-by-turn analysis.
 * Computes:
 * 1. Initial braking point distance (m) & braking delta.
 * 2. Minimum apex speed (km/h) & apex speed delta.
 * 3. Post-apex throttle pickup distance (m) & pickup delta.
 * 4. Micro-sector numerical integration for net corner time delta (seconds).
 * 5. Grounded F1 race engineer tactical debrief summary.
 */

import type { CornerInfo, TrackMapPoint } from "@/services/api";

export interface CornerEnvelope {
  entryDistance: number;
  exitDistance: number;
  cornerDistance: number;
}

export interface DriverCornerMetrics {
  driver: string;
  hasBraking: boolean;
  brakeDistance: number | null;
  minApexSpeed: number;
  apexDistance: number;
  throttlePickupDistance: number | null;
  envelopeTimeSeconds: number;
}

export interface CornerAnalysisResult {
  corner: CornerInfo;
  envelope: CornerEnvelope;
  primary: DriverCornerMetrics;
  compare: DriverCornerMetrics | null;
  deltaBrakeMeters: number | null;
  deltaApexSpeedKph: number | null;
  deltaThrottleMeters: number | null;
  deltaTimeSeconds: number | null;
  debrief: string;
}

/** Entry lead-in distance before the corner marker (meters) */
export const CORNER_ENTRY_METERS = 160;
/** Exit roll-out distance after the corner marker (meters) */
export const CORNER_EXIT_METERS = 100;

/**
 * Calculates the distance envelope around a corner.
 */
export function getCornerEnvelope(corner: CornerInfo, trackLengthM?: number): CornerEnvelope {
  const cornerDist = corner.distance || 0;
  const entryDistance = Math.max(0, cornerDist - CORNER_ENTRY_METERS);
  const exitDistance = trackLengthM && trackLengthM > 0
    ? Math.min(trackLengthM, cornerDist + CORNER_EXIT_METERS)
    : cornerDist + CORNER_EXIT_METERS;

  return {
    entryDistance,
    exitDistance,
    cornerDistance: cornerDist,
  };
}

/**
 * Numerically integrates time through an array of points using trapezoidal approximation.
 * t = sum (delta_d / avg_v) where v is in m/s.
 */
function integrateTimeSeconds(pts: TrackMapPoint[]): number {
  if (pts.length < 2) return 0;
  let totalTime = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const deltaDist = Math.max(0, p2.distance - p1.distance);
    const avgSpeedKph = Math.max(1, (p1.speed + p2.speed) / 2);
    const avgSpeedMs = (avgSpeedKph * 1000) / 3600;
    totalTime += deltaDist / avgSpeedMs;
  }
  return totalTime;
}

/**
 * Analyzes a single driver's telemetry within the corner envelope.
 */
function analyzeDriverCorner(
  driver: string,
  allPoints: TrackMapPoint[],
  envelope: CornerEnvelope
): DriverCornerMetrics {
  // Filter points strictly inside the corner envelope
  const cornerPts = allPoints.filter(
    (pt) => pt.distance >= envelope.entryDistance && pt.distance <= envelope.exitDistance
  );

  if (cornerPts.length === 0) {
    return {
      driver,
      hasBraking: false,
      brakeDistance: null,
      minApexSpeed: 0,
      apexDistance: envelope.cornerDistance,
      throttlePickupDistance: null,
      envelopeTimeSeconds: 0,
    };
  }

  // 1. Identify minimum apex speed and apex distance
  let minApexSpeed = cornerPts[0].speed;
  let apexDistance = cornerPts[0].distance;
  let apexIdx = 0;

  for (let i = 0; i < cornerPts.length; i++) {
    const pt = cornerPts[i];
    if (pt.speed < minApexSpeed) {
      minApexSpeed = pt.speed;
      apexDistance = pt.distance;
      apexIdx = i;
    }
  }

  // 2. Identify initial braking point
  // First point where brake is pressed OR deceleration is sharp (d(speed)/d(distance) < -0.12)
  let brakeDistance: number | null = null;
  let hasBraking = false;

  for (let i = 0; i < cornerPts.length; i++) {
    const pt = cornerPts[i];
    const next = i < cornerPts.length - 1 ? cornerPts[i + 1] : null;
    const dDist = next ? next.distance - pt.distance : 0;
    const accelRate = next && dDist > 0 ? (next.speed - pt.speed) / dDist : 0;

    if (pt.brake || (next && accelRate < -0.12)) {
      brakeDistance = pt.distance;
      hasBraking = true;
      break;
    }
  }

  // 3. Identify post-apex throttle pickup point
  // First point after apex where throttle > 25%
  let throttlePickupDistance: number | null = null;
  for (let i = apexIdx; i < cornerPts.length; i++) {
    const pt = cornerPts[i];
    if (pt.throttle > 25) {
      throttlePickupDistance = pt.distance;
      break;
    }
  }

  const envelopeTimeSeconds = integrateTimeSeconds(cornerPts);

  return {
    driver,
    hasBraking,
    brakeDistance,
    minApexSpeed,
    apexDistance,
    throttlePickupDistance,
    envelopeTimeSeconds,
  };
}

/**
 * Generates an authentic F1 race engineer radio debrief snippet.
 */
export function generateEngineerDebrief(params: {
  cornerNumber: number;
  cornerLetter?: string;
  driverCode: string;
  compareCode?: string | null;
  deltaBrakeMeters?: number | null;
  deltaApexSpeedKph?: number | null;
  deltaThrottleMeters?: number | null;
  deltaTimeSeconds?: number | null;
}): string {
  const {
    cornerNumber,
    cornerLetter = "",
    driverCode,
    compareCode,
    deltaBrakeMeters,
    deltaApexSpeedKph,
    deltaThrottleMeters,
    deltaTimeSeconds,
  } = params;

  const cornerLabel = `Turn ${cornerNumber}${cornerLetter}`;

  if (!compareCode) {
    return `${driverCode} baseline telemetry loaded for ${cornerLabel}. Telemetry shows clean single-car telemetry trace.`;
  }

  const clauses: string[] = [];

  // Braking assessment
  if (deltaBrakeMeters !== null && deltaBrakeMeters !== undefined) {
    if (deltaBrakeMeters > 5) {
      clauses.push(`${driverCode} braked ${Math.round(deltaBrakeMeters)}m deeper into entry`);
    } else if (deltaBrakeMeters < -5) {
      clauses.push(`${driverCode} braked ${Math.round(Math.abs(deltaBrakeMeters))}m earlier for stability`);
    } else {
      clauses.push(`both drivers braked identically at entry`);
    }
  }

  // Apex speed assessment
  if (deltaApexSpeedKph !== null && deltaApexSpeedKph !== undefined) {
    if (deltaApexSpeedKph > 2) {
      clauses.push(`carrying +${Math.round(deltaApexSpeedKph)} km/h rolling apex speed`);
    } else if (deltaApexSpeedKph < -2) {
      clauses.push(`sacrificing ${Math.round(Math.abs(deltaApexSpeedKph))} km/h minimum apex speed`);
    }
  }

  // Throttle pickup assessment
  if (deltaThrottleMeters !== null && deltaThrottleMeters !== undefined) {
    if (deltaThrottleMeters < -3) {
      clauses.push(`picking up throttle ${Math.round(Math.abs(deltaThrottleMeters))}m earlier`);
    } else if (deltaThrottleMeters > 3) {
      clauses.push(`picking up throttle ${Math.round(deltaThrottleMeters)}m later`);
    }
  }

  const tacticalNote = clauses.length > 0 ? clauses.join(", ") : `${driverCode} and ${compareCode} matched closely`;

  let outcomeNote = "";
  if (deltaTimeSeconds !== null && deltaTimeSeconds !== undefined) {
    const absDelta = Math.abs(deltaTimeSeconds).toFixed(3);
    if (deltaTimeSeconds < -0.005) {
      outcomeNote = `, yielding a net gain of +${absDelta}s through ${cornerLabel}.`;
    } else if (deltaTimeSeconds > 0.005) {
      outcomeNote = `, resulting in a net loss of -${absDelta}s through ${cornerLabel}.`;
    } else {
      outcomeNote = `, dead heat through ${cornerLabel} (±0.000s).`;
    }
  } else {
    outcomeNote = ` through ${cornerLabel}.`;
  }

  return `${tacticalNote}${outcomeNote}`;
}

/**
 * Main analysis function: extracts corner metrics for primary and compare drivers.
 */
export function extractCornerMetrics(
  corner: CornerInfo,
  points: TrackMapPoint[],
  comparePoints?: TrackMapPoint[] | null,
  driverCode: string = "DRV",
  compareCode?: string | null
): CornerAnalysisResult {
  const envelope = getCornerEnvelope(corner);
  const primary = analyzeDriverCorner(driverCode, points, envelope);

  let compare: DriverCornerMetrics | null = null;
  let deltaBrakeMeters: number | null = null;
  let deltaApexSpeedKph: number | null = null;
  let deltaThrottleMeters: number | null = null;
  let deltaTimeSeconds: number | null = null;

  if (comparePoints && comparePoints.length > 0 && compareCode) {
    compare = analyzeDriverCorner(compareCode, comparePoints, envelope);

    // Delta Braking: Positive means primary braked deeper (later) along the track distance
    if (primary.hasBraking && compare.hasBraking && primary.brakeDistance !== null && compare.brakeDistance !== null) {
      deltaBrakeMeters = primary.brakeDistance - compare.brakeDistance;
    }

    // Delta Apex Speed: Positive means primary had higher min speed
    deltaApexSpeedKph = primary.minApexSpeed - compare.minApexSpeed;

    // Delta Throttle Pickup: Negative means primary picked up throttle earlier (shorter distance)
    if (primary.throttlePickupDistance !== null && compare.throttlePickupDistance !== null) {
      deltaThrottleMeters = primary.throttlePickupDistance - compare.throttlePickupDistance;
    }

    // Delta Time: Negative means primary took less time (faster)
    if (primary.envelopeTimeSeconds > 0 && compare.envelopeTimeSeconds > 0) {
      deltaTimeSeconds = primary.envelopeTimeSeconds - compare.envelopeTimeSeconds;
    }
  }

  const debrief = generateEngineerDebrief({
    cornerNumber: corner.number,
    cornerLetter: corner.letter,
    driverCode,
    compareCode,
    deltaBrakeMeters,
    deltaApexSpeedKph,
    deltaThrottleMeters,
    deltaTimeSeconds,
  });

  return {
    corner,
    envelope,
    primary,
    compare,
    deltaBrakeMeters,
    deltaApexSpeedKph,
    deltaThrottleMeters,
    deltaTimeSeconds,
    debrief,
  };
}
