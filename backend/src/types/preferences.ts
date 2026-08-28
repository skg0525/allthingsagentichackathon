/**
 * The buyer's living preference profile.
 *
 * This is the agent's long-term memory. It is persisted per-user (Firestore in
 * the cloud, a local JSON file when running without credentials) and it is the
 * ONLY thing that turns raw perception into a match score. Change the profile
 * and every property re-ranks instantly — no model call required.
 */

import { TraditionId, DEFAULT_TRADITION } from '../data/traditions.js';

export type DimensionKey =
  | 'vastu'
  | 'mainFloorSuite'
  | 'yard'
  | 'commute'
  | 'walkability'
  | 'maintenance'
  | 'community';

export interface PreferenceProfile {
  userId: string;
  /** Which directional tradition the compass dimension is scored against. */
  tradition: TraditionId;
  weights: Record<DimensionKey, number>;   // 0-1, relative importance
  hardConstraints: {
    mainFloorBedroomRequired: boolean;
    mainFloorFullBathRequired: boolean;
    maxCommuteMinutes: number;
    /** Cap the score when the entrance faces a direction the active tradition flags. */
    strictEntrance: boolean;
    flatYardRequired: boolean;
    /** Set when the buyer calls road adjacency a dealbreaker, not a preference. */
    noMajorRoadAdjacency: boolean;
    maxPrice: number;
    minYearBuilt: number;
  };
  /** Free-text lessons learned from thumbs up/down. Fed back into the narrator. */
  /**
   * What you said about individual houses.
   *
   * Weight changes express what you like in general. They cannot express "not
   * this one" — a weighted average over seven dimensions barely moves, and if
   * the house happens to score well on the dimension you raised, it moves UP.
   * Rejecting a specific house has to be recorded against that house.
   */
  propertyFeedback: Record<string, 'rejected' | 'shortlisted'>;
  learnedNotes: string[];
  updatedAt: string;
  version: number;
}

/** `vastu` is the dimension's stable key; its LABEL follows the chosen tradition. */
export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  vastu: 'Directional Compliance',
  mainFloorSuite: 'Main-Floor Bedroom + Full Bath',
  yard: 'Backyard & Site',
  commute: 'Commute',
  walkability: 'Walkability & Transit',
  maintenance: 'Age & Maintenance Risk',
  community: 'Community & Safety',
};

/** Seeded from the buyer's stated priorities on day one. */
export function defaultProfile(userId: string): PreferenceProfile {
  return {
    userId,
    tradition: DEFAULT_TRADITION,
    weights: {
      vastu: 0.9,
      mainFloorSuite: 1.0,
      yard: 0.95,
      commute: 0.85,
      walkability: 0.8,
      maintenance: 0.7,
      community: 0.75,
    },
    hardConstraints: {
      mainFloorBedroomRequired: true,
      mainFloorFullBathRequired: true,
      maxCommuteMinutes: 30,
      strictEntrance: true,
      flatYardRequired: false,
      noMajorRoadAdjacency: false,
      maxPrice: 950000,
      minYearBuilt: 1980,
    },
    propertyFeedback: {},
    learnedNotes: [],
    updatedAt: new Date().toISOString(),
    version: 1,
  };
}
