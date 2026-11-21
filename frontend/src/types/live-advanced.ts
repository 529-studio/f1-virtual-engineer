import type { LiveRaceTick } from "./live";

export interface BufferedSnapshot {
  timestamp: number;
  tick: LiveRaceTick;
}

export interface OvertakeProbability {
  attackerCode: string;
  defenderCode: string;
  gapSeconds: number;
  probability: number; // 0 to 100%
  confidence: "HIGH" | "MEDIUM" | "LOW";
  drsEligible: boolean;
  compoundAdvantageSeconds: number;
  tyreAgeDeltaLaps: number;
  circuitFactor: number;
  factors: string[];
}

export interface MiniSectorSegment {
  sectorIndex: number;
  startFraction: number; // 0.0 to 1.0
  endFraction: number;   // 0.0 to 1.0
  dominantDriverCode: string;
  dominantTeamColor: string;
  deltaSeconds: number;
}

export interface InterpolatedCar {
  driverNumber: number;
  driverCode: string;
  teamName: string;
  teamColor: string;
  position: number;
  x: number;
  y: number;
  progress: number; // 0.0 to 1.0
  inPit: boolean;
  intervalToAhead: number | null;
  tyreCompound: string;
}
