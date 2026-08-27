import { z } from 'zod';

/* ------------------------------------------------------------------ *
 * Ground-truth listing facts.
 * These are the things a real MLS feed gives you. Everything else
 * (vastu orientation, yard grade, main-floor suite) is DERIVED by the
 * vision agent from the floor plan + aerial imagery — never hardcoded.
 * ------------------------------------------------------------------ */

export interface NeighborhoodFacts {
  walkScore: number;          // 0-100
  transitScore: number;       // 0-100
  nearestRailStation: string;
  nearestRailMinutesWalk: number;
  schoolRating: number;       // 1-10
  crimeIndexVsMetro: number;  // 1.0 = metro average, <1 safer
  diversityIndex: number;     // 0-1 Simpson index, higher = more diverse
  southAsianPopulationPct: number;
}

export interface PropertyListing {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  halfBaths: number;
  sqft: number;
  lotSizeAcres: number;
  yearBuilt: number;
  propertyType: 'Single Family' | 'Townhouse' | 'Condo';
  hoaMonthly: number;
  /** Local, coherent asset set. All three images are the SAME house. */
  images: {
    exterior: string;
    floorPlan: string;
    aerial: string;
  };
  neighborhood: NeighborhoodFacts;
  /**
   * Drive-time targets at 8am rush hour.
   * daysPerWeek is what stops an occasional trip being scored like a daily one.
   */
  commutes: { label: string; minutes: number; daysPerWeek: number }[];
  /** Narrative notes straight from the listing sheet. */
  listingRemarks: string;
}

/* ------------------------------------------------------------------ *
 * What Gemini PERCEIVES from the images. Perception only — no scoring.
 * Scoring is deterministic and lives in scoringEngine.ts.
 * ------------------------------------------------------------------ */

export const CardinalDirection = z.enum([
  'North', 'North-East', 'East', 'South-East',
  'South', 'South-West', 'West', 'North-West', 'Unknown',
]);
export type CardinalDirection = z.infer<typeof CardinalDirection>;

export const PerceptionSchema = z.object({
  entranceDirection: CardinalDirection,
  entranceEvidence: z.string(),
  kitchenQuadrant: CardinalDirection,
  kitchenEvidence: z.string(),
  masterBedQuadrant: CardinalDirection,
  masterBedEvidence: z.string(),
  mainFloorBedroom: z.boolean(),
  mainFloorFullBath: z.boolean(),
  mainFloorSuiteEvidence: z.string(),
  yardGrade: z.enum(['Flat', 'Gentle Slope', 'Steep Slope', 'Unknown']),
  yardPrivacy: z.enum(['High', 'Medium', 'Low', 'Unknown']),
  yardFenced: z.boolean(),
  yardEvidence: z.string(),
  backsOntoMajorRoad: z.boolean(),
  siteEvidence: z.string(),
});
export type Perception = z.infer<typeof PerceptionSchema>;

/* ------------------------------------------------------------------ *
 * Deterministic score breakdown produced by scoringEngine.ts
 * ------------------------------------------------------------------ */

export interface DimensionScore {
  key: string;
  label: string;
  score: number;      // 0-100
  weight: number;     // 0-1, from the user's live preference profile
  weighted: number;   // score * weight
  verdict: 'ideal' | 'acceptable' | 'concern' | 'dealbreaker';
  reason: string;
}

export interface AuditResult {
  propertyId: string;
  matchScore: number;
  dimensions: DimensionScore[];
  perception: Perception;
  pros: string[];
  cons: string[];
  redFlags: string[];
  summary: string;
  /** Real observability: what the agent actually did, with timings. */
  trace: TraceStep[];
  cached: boolean;
  totalMs: number;
}

export interface TraceStep {
  step: string;
  detail: string;
  ms: number;
  status: 'ok' | 'cached' | 'degraded' | 'error';
}
