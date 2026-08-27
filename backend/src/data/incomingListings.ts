import { PropertyListing } from '../types/listing.js';

/**
 * The market feed.
 *
 * These are properties that have NOT yet been seen. They only enter the system
 * when the autonomous agent runs — which is the point: the agent finds them
 * while you are asleep, reads their floor plans unprompted, and decides on its
 * own whether any of them are worth waking you up for.
 *
 * In production this is an MLS/IDX feed. Here it is a queue, so an overnight
 * run is reproducible on demand for a demo.
 */

const asset = (id: string) => ({
  exterior: `/assets/${id}/exterior.jpg`,
  floorPlan: `/assets/${id}/floorplan.jpg`,
  aerial: `/assets/${id}/aerial.jpg`,
});

export const incomingListings: PropertyListing[] = [
  {
    id: 'prop_109',
    address: '18 Wren Hollow Court, Alpharetta, GA 30022',
    price: 879000,
    beds: 5, baths: 4, halfBaths: 0, sqft: 3040,
    lotSizeAcres: 0.38, yearBuilt: 2020,
    propertyType: 'Single Family', hoaMonthly: 90,
    images: asset('prop_109'),
    neighborhood: {
      walkScore: 64, transitScore: 50,
      nearestRailStation: 'North Springs MARTA',
      nearestRailMinutesWalk: 12,
      schoolRating: 9, crimeIndexVsMetro: 0.55,
      diversityIndex: 0.76, southAsianPopulationPct: 24.1,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 15, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 42, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Just listed. Craftsman on a cul-de-sac with a main-level in-law suite and full ' +
      'bath. Large flat fenced yard backing to woods. Original owner, meticulously kept.',
  },
  {
    id: 'prop_110',
    address: '903 Ridgeline Drive, Roswell, GA 30075',
    price: 604000,
    beds: 4, baths: 2, halfBaths: 1, sqft: 2180,
    lotSizeAcres: 0.24, yearBuilt: 1985,
    propertyType: 'Single Family', hoaMonthly: 0,
    images: asset('prop_110'),
    neighborhood: {
      walkScore: 31, transitScore: 18,
      nearestRailStation: 'North Springs MARTA',
      nearestRailMinutesWalk: 51,
      schoolRating: 7, crimeIndexVsMetro: 0.91,
      diversityIndex: 0.47, southAsianPopulationPct: 5.4,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 28, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 49, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Just listed. Split-level with great bones, priced to move. Backs to the rail ' +
      'corridor. Bedrooms on the upper split.',
  },
];

export const incomingById = (id: string) => incomingListings.find((l) => l.id === id);
