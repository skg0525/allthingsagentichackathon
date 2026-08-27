/** Mirrors backend/src/types/listing.ts + preferences.ts */

export type CardinalDirection =
  | 'North' | 'North-East' | 'East' | 'South-East'
  | 'South' | 'South-West' | 'West' | 'North-West' | 'Unknown';

export interface NeighborhoodFacts {
  walkScore: number;
  transitScore: number;
  nearestRailStation: string;
  nearestRailMinutesWalk: number;
  schoolRating: number;
  crimeIndexVsMetro: number;
  diversityIndex: number;
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
  propertyType: string;
  hoaMonthly: number;
  images: { exterior: string; floorPlan: string; aerial: string };
  neighborhood: NeighborhoodFacts;
  commutes: { label: string; minutes: number; daysPerWeek: number }[];
  listingRemarks: string;
}

export interface Perception {
  entranceDirection: CardinalDirection;
  entranceEvidence: string;
  kitchenQuadrant: CardinalDirection;
  kitchenEvidence: string;
  masterBedQuadrant: CardinalDirection;
  masterBedEvidence: string;
  mainFloorBedroom: boolean;
  mainFloorFullBath: boolean;
  mainFloorSuiteEvidence: string;
  yardGrade: 'Flat' | 'Gentle Slope' | 'Steep Slope' | 'Unknown';
  yardPrivacy: 'High' | 'Medium' | 'Low' | 'Unknown';
  yardFenced: boolean;
  yardEvidence: string;
  backsOntoMajorRoad: boolean;
  siteEvidence: string;
}

export type Verdict = 'ideal' | 'acceptable' | 'concern' | 'dealbreaker';

export interface DimensionScore {
  key: DimensionKey;
  label: string;
  score: number;
  weight: number;
  weighted: number;
  verdict: Verdict;
  reason: string;
}

export interface TraceStep {
  step: string;
  detail: string;
  ms: number;
  status: 'ok' | 'cached' | 'degraded' | 'error';
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
  trace: TraceStep[];
  cached: boolean;
  totalMs: number;
}

export type DimensionKey =
  | 'vastu' | 'mainFloorSuite' | 'yard' | 'commute'
  | 'walkability' | 'maintenance' | 'community';

export type TraditionId = 'vastu' | 'fengshui';

export interface Tradition {
  id: TraditionId;
  name: string;
  origin: string;
  blurb: string;
  elementLabels: { entrance: string; kitchen: string; master: string };
  entrance: Partial<Record<CardinalDirection, number>>;
  kitchen: Partial<Record<CardinalDirection, number>>;
  master: Partial<Record<CardinalDirection, number>>;
  flaggedEntrances: CardinalDirection[];
  notes: { entrance: string; kitchen: string; master: string };
}

export interface PreferenceProfile {
  userId: string;
  tradition: TraditionId;
  weights: Record<DimensionKey, number>;
  hardConstraints: {
    mainFloorBedroomRequired: boolean;
    mainFloorFullBathRequired: boolean;
    maxCommuteMinutes: number;
    strictEntrance: boolean;
    flatYardRequired: boolean;
    maxPrice: number;
    minYearBuilt: number;
  };
  learnedNotes: string[];
  updatedAt: string;
  version: number;
}

export interface BriefFinding {
  propertyId: string;
  address: string;
  price: number;
  matchScore: number;
  headline: string;
  reason: string;
  redFlags: string[];
  thumbnail: string;
  worthTouring: boolean;
}

export interface DailyBrief {
  id: string;
  runAt: string;
  trigger: 'schedule' | 'manual';
  newListingsSeen: number;
  analysed: number;
  findings: BriefFinding[];
  notify: boolean;
  summary: string;
  profileVersion: number;
  durationMs: number;
}

export interface AdhocResult {
  perception: Perception;
  isFloorPlan: boolean;
  whatISee: string;
  directional: { tradition: string; score: number; reason: string };
  trace: TraceStep[];
}

export interface HealthPayload {
  status: string;
  model: string;
  memoryBackend: string;
  perceptionCache: { entries: number; ids: string[] };
  listings: number;
  pendingMarketListings: number;
  revision: string;
  region: string;
}
