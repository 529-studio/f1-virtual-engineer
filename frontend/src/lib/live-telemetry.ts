import type { LiveDriverSnapshot, LiveTyreCompound } from "../types/live";
import type { MiniSectorSegment, OvertakeProbability } from "../types/live-advanced";

export const TEAM_COLOR_MAP: Record<string, string> = {
  "red bull racing": "#3671C6",
  "red bull": "#3671C6",
  "ferrari": "#E80020",
  "mclaren": "#FF8000",
  "mercedes": "#27F4D2",
  "aston martin": "#229971",
  "alpine": "#0093CC",
  "williams": "#64C4FF",
  "rb": "#6692FF",
  "racing bulls": "#6692FF",
  "kick sauber": "#52E252",
  "sauber": "#52E252",
  "haas f1 team": "#B6BABD",
  "haas": "#B6BABD",
};

export const DRIVER_TEAM_MAP: Record<string, string> = {
  VER: "#3671C6",
  PER: "#3671C6",
  LEC: "#E80020",
  SAI: "#E80020",
  HAM: "#27F4D2",
  RUS: "#27F4D2",
  NOR: "#FF8000",
  PIA: "#FF8000",
  ALO: "#229971",
  STR: "#229971",
  GAS: "#0093CC",
  OCO: "#0093CC",
  ALB: "#64C4FF",
  SAR: "#64C4FF",
  COL: "#64C4FF",
  TSU: "#6692FF",
  RIC: "#6692FF",
  LAW: "#6692FF",
  HUL: "#B6BABD",
  MAG: "#B6BABD",
  BEA: "#B6BABD",
  BOT: "#52E252",
  ZHO: "#52E252",
};

export function getTeamColor(teamName?: string, driverCode?: string): string {
  if (driverCode && DRIVER_TEAM_MAP[driverCode.toUpperCase()]) {
    return DRIVER_TEAM_MAP[driverCode.toUpperCase()];
  }
  if (teamName) {
    const key = teamName.toLowerCase().trim();
    for (const [name, color] of Object.entries(TEAM_COLOR_MAP)) {
      if (key.includes(name)) return color;
    }
  }
  return "#00E5FF"; // default cyan accent
}

const CIRCUIT_OVERTAKE_FACTORS: Record<string, number> = {
  monza: 0.85,
  spa: 0.82,
  silverstone: 0.78,
  sakhir: 0.75,
  bahrain: 0.75,
  spielberg: 0.75,
  "red bull ring": 0.75,
  interlagos: 0.72,
  sao_paulo: 0.72,
  montreal: 0.70,
  "las vegas": 0.70,
  vegas: 0.70,
  baku: 0.68,
  suzuka: 0.60,
  austin: 0.65,
  zandvoort: 0.35,
  hungaroring: 0.25,
  budapest: 0.25,
  monaco: 0.12,
  monte_carlo: 0.12,
};

const COMPOUND_PACE_WEIGHT: Record<LiveTyreCompound, number> = {
  SOFT: 3,
  MEDIUM: 2,
  HARD: 1,
  INTERMEDIATE: 1.5,
  WET: 1.0,
  UNKNOWN: 1.8,
};

export function calculateOvertakeProbability(
  drivers: LiveDriverSnapshot[],
  circuitName?: string
): OvertakeProbability | null {
  if (!drivers || drivers.length < 2) return null;

  // Sort by race position
  const sorted = [...drivers].sort((a, b) => a.position - b.position);

  // Find the closest active battle on track
  let bestAttacker: LiveDriverSnapshot | null = null;
  let bestDefender: LiveDriverSnapshot | null = null;
  let minGap = Infinity;

  for (let i = 1; i < sorted.length; i++) {
    const attacker = sorted[i];
    const defender = sorted[i - 1];

    if (attacker.in_pit || defender.in_pit) continue;

    const gap = attacker.interval_to_ahead ?? (attacker.gap_to_leader != null && defender.gap_to_leader != null
      ? attacker.gap_to_leader - defender.gap_to_leader
      : null);

    if (gap != null && gap > 0 && gap < minGap) {
      minGap = gap;
      bestAttacker = attacker;
      bestDefender = defender;
    }
  }

  // Fallback to P2 attacking P1
  if (!bestAttacker || !bestDefender) {
    bestDefender = sorted[0];
    bestAttacker = sorted[1];
    minGap = bestAttacker.interval_to_ahead ?? 1.2;
  }

  const circuitKey = (circuitName ?? "").toLowerCase().replace(/[\s_-]+/g, " ");
  let circuitFactor = 0.55;
  for (const [key, factor] of Object.entries(CIRCUIT_OVERTAKE_FACTORS)) {
    if (circuitKey.includes(key)) {
      circuitFactor = factor;
      break;
    }
  }

  const factors: string[] = [];

  // 1. Proximity score (0 to 45 pts)
  const drsEligible = minGap <= 1.0;
  let proximityScore = Math.max(0, (2.0 - minGap) / 2.0) * 35;
  if (drsEligible) {
    proximityScore += 12;
    factors.push(`DRS zone eligible (${minGap.toFixed(2)}s gap)`);
  } else {
    factors.push(`Pursuit delta: +${minGap.toFixed(2)}s`);
  }

  // 2. Tyre Compound Delta (-15 to +20 pts)
  const attackerPace = COMPOUND_PACE_WEIGHT[bestAttacker.tyre_compound] ?? 2;
  const defenderPace = COMPOUND_PACE_WEIGHT[bestDefender.tyre_compound] ?? 2;
  const compoundDeltaAdvantage = (attackerPace - defenderPace) * 0.45; // ~0.45s advantage per tier
  const compoundScore = (attackerPace - defenderPace) * 10;
  if (compoundScore > 0) {
    factors.push(`Tyre compound tier advantage (${bestAttacker.tyre_compound} vs ${bestDefender.tyre_compound})`);
  } else if (compoundScore < 0) {
    factors.push(`Harder compound penalty (${bestAttacker.tyre_compound} vs ${bestDefender.tyre_compound})`);
  }

  // 3. Tyre Age Delta (-15 to +20 pts)
  const tyreAgeDeltaLaps = bestDefender.tyre_age - bestAttacker.tyre_age;
  const tyreAgeScore = Math.min(Math.max(tyreAgeDeltaLaps * 1.5, -15), 20);
  if (tyreAgeDeltaLaps > 5) {
    factors.push(`Tyres ${tyreAgeDeltaLaps} laps fresher than defender`);
  } else if (tyreAgeDeltaLaps < -5) {
    factors.push(`Tyres ${Math.abs(tyreAgeDeltaLaps)} laps older than defender`);
  }

  // 4. Track factor weight
  const rawProbability = (proximityScore + compoundScore + tyreAgeScore + 20) * circuitFactor;
  const clampedProbability = Math.round(Math.min(Math.max(rawProbability, 5), 98));

  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    minGap <= 0.8 ? "HIGH" : minGap <= 1.5 ? "MEDIUM" : "LOW";

  return {
    attackerCode: bestAttacker.driver_code,
    defenderCode: bestDefender.driver_code,
    gapSeconds: Math.round(minGap * 1000) / 1000,
    probability: clampedProbability,
    confidence,
    drsEligible,
    compoundAdvantageSeconds: Math.round(compoundDeltaAdvantage * 100) / 100,
    tyreAgeDeltaLaps,
    circuitFactor,
    factors,
  };
}

export function generateMiniSectors(
  driver1Code = "VER",
  driver2Code = "NOR",
  numSectors = 24
): MiniSectorSegment[] {
  const c1 = DRIVER_TEAM_MAP[driver1Code] ?? "#3671C6";
  const c2 = DRIVER_TEAM_MAP[driver2Code] ?? "#FF8000";

  const segments: MiniSectorSegment[] = [];
  const step = 1.0 / numSectors;

  for (let i = 0; i < numSectors; i++) {
    // Alternating micro-sector dominance with realistic clustering
    const isDriver1Dominant = (i % 5 < 3 && i < 16) || i === 22 || i === 23;
    const driverCode = isDriver1Dominant ? driver1Code : driver2Code;
    const color = isDriver1Dominant ? c1 : c2;
    const delta = isDriver1Dominant ? 0.04 + (i % 3) * 0.02 : -(0.03 + (i % 2) * 0.02);

    segments.push({
      sectorIndex: i + 1,
      startFraction: i * step,
      endFraction: (i + 1) * step,
      dominantDriverCode: driverCode,
      dominantTeamColor: color,
      deltaSeconds: Math.round(delta * 1000) / 1000,
    });
  }

  return segments;
}

export interface SplinePoint {
  x: number;
  y: number;
  distance: number;
}

/**
 * Interpolates (x, y) along a track spline given a normalized progress fraction [0.0, 1.0].
 */
export function interpolateSplinePosition(
  progress: number,
  points: SplinePoint[]
): { x: number; y: number } {
  if (!points || points.length === 0) {
    return { x: 500, y: 500 };
  }
  if (points.length === 1) {
    return { x: points[0].x, y: points[0].y };
  }

  const normalized = Math.min(Math.max(progress, 0.0), 1.0);
  const totalPoints = points.length;
  const totalLength = points[totalPoints - 1].distance || 1;
  const targetDistance = normalized * totalLength;

  // Binary search for segment bracket
  let low = 0;
  let high = totalPoints - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (points[mid].distance < targetDistance) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const idx1 = Math.max(0, Math.min(low - 1, totalPoints - 2));
  const idx2 = idx1 + 1;

  const pt1 = points[idx1];
  const pt2 = points[idx2];

  const segDist = pt2.distance - pt1.distance;
  const t = segDist > 0 ? Math.min(Math.max((targetDistance - pt1.distance) / segDist, 0), 1) : 0;

  return {
    x: pt1.x + (pt2.x - pt1.x) * t,
    y: pt1.y + (pt2.y - pt1.y) * t,
  };
}
