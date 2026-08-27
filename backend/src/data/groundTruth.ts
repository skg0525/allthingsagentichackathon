import { Perception } from '../types/listing.js';

/**
 * What each generated floor plan and aerial was actually drawn to show.
 *
 * These mirror the scene briefs in scripts/generateAssets.ts. Because the
 * imagery was generated from a written spec, the truth is knowable — which is
 * the only reason an accuracy claim about this system means anything.
 *
 * Deliberately NOT imported by any runtime code path. If the agent could read
 * this, the verification would be circular.
 */
export type Truth = Partial<Pick<Perception,
  'entranceDirection' | 'kitchenQuadrant' | 'mainFloorBedroom' |
  'mainFloorFullBath' | 'yardGrade' | 'backsOntoMajorRoad'>>;

export const GROUND_TRUTH: Record<string, Truth> = {
  prop_101: {
    entranceDirection: 'East', kitchenQuadrant: 'South-East',
    mainFloorBedroom: true, mainFloorFullBath: true,
    yardGrade: 'Flat', backsOntoMajorRoad: false,
  },
  prop_102: {
    entranceDirection: 'South', kitchenQuadrant: 'North-East',
    mainFloorBedroom: false, mainFloorFullBath: false,
    backsOntoMajorRoad: true,
  },
  prop_103: {
    entranceDirection: 'North', kitchenQuadrant: 'South-East',
    mainFloorBedroom: false, mainFloorFullBath: false,
    yardGrade: 'Steep Slope',
  },
  prop_104: {
    entranceDirection: 'West', kitchenQuadrant: 'North-West',
    mainFloorBedroom: true, mainFloorFullBath: false,
    yardGrade: 'Flat', backsOntoMajorRoad: false,
  },
  prop_105: {
    entranceDirection: 'North-East', kitchenQuadrant: 'South-East',
    mainFloorBedroom: true, mainFloorFullBath: true,
  },
  prop_106: {
    entranceDirection: 'South', kitchenQuadrant: 'East',
    mainFloorBedroom: true, mainFloorFullBath: true,
    yardGrade: 'Flat', backsOntoMajorRoad: false,
  },
  prop_107: {
    entranceDirection: 'West', kitchenQuadrant: 'North-East',
    mainFloorBedroom: false, mainFloorFullBath: false,
  },
  prop_108: {
    entranceDirection: 'North', kitchenQuadrant: 'South-East',
    mainFloorBedroom: true, mainFloorFullBath: true,
    yardGrade: 'Flat', backsOntoMajorRoad: true,
  },
};

/** One compass point out on a hand-drawn plan is a near miss, not an error. */
export const ADJACENT: Record<string, string[]> = {
  'North': ['North-East', 'North-West'],
  'North-East': ['North', 'East'],
  'East': ['North-East', 'South-East'],
  'South-East': ['East', 'South'],
  'South': ['South-East', 'South-West'],
  'South-West': ['South', 'West'],
  'West': ['South-West', 'North-West'],
  'North-West': ['West', 'North'],
};
