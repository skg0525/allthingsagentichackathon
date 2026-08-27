import { PropertyListing } from '../types/listing.js';

/**
 * Curated demo set for Atlanta's north metro.
 *
 * IMPORTANT: nothing here encodes vastu orientation, yard grade or the
 * main-floor suite. Those are the exact facts the vision agent has to
 * recover from the floor plan and aerial imagery. Keeping them out of
 * this file is what makes the demo an honest test of the agent.
 *
 * Image assets are generated once by `npm run assets` and committed, so
 * the three views of a property are always the same house.
 */

const asset = (id: string) => ({
  exterior: `/assets/${id}/exterior.jpg`,
  floorPlan: `/assets/${id}/floorplan.jpg`,
  aerial: `/assets/${id}/aerial.jpg`,
});

export const mockListings: PropertyListing[] = [
  {
    id: 'prop_101',
    address: '1420 Meadowbrook Lane, Alpharetta, GA 30022',
    price: 848000,
    beds: 4, baths: 3, halfBaths: 1, sqft: 2840,
    lotSizeAcres: 0.34, yearBuilt: 2016,
    propertyType: 'Single Family', hoaMonthly: 85,
    images: asset('prop_101'),
    neighborhood: {
      walkScore: 62, transitScore: 48,
      nearestRailStation: 'North Springs MARTA',
      nearestRailMinutesWalk: 14,
      schoolRating: 9, crimeIndexVsMetro: 0.61,
      diversityIndex: 0.74, southAsianPopulationPct: 22.4,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 17, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 44, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Move-in ready craftsman on a level cul-de-sac lot. Main-level guest suite. ' +
      'Fully fenced rear yard backing to protected greenspace. New roof 2022.',
  },
  {
    id: 'prop_102',
    address: '87 Oak Ridge Court, Roswell, GA 30076',
    price: 719000,
    beds: 4, baths: 2, halfBaths: 1, sqft: 2610,
    lotSizeAcres: 0.28, yearBuilt: 1978,
    propertyType: 'Single Family', hoaMonthly: 0,
    images: asset('prop_102'),
    neighborhood: {
      walkScore: 34, transitScore: 21,
      nearestRailStation: 'North Springs MARTA',
      nearestRailMinutesWalk: 48,
      schoolRating: 7, crimeIndexVsMetro: 0.88,
      diversityIndex: 0.51, southAsianPopulationPct: 6.1,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 26, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 52, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Classic two-story with original hardwoods. All bedrooms upstairs. ' +
      'Original HVAC and roof — priced accordingly. Fronts a four-lane connector.',
  },
  {
    id: 'prop_103',
    address: '2210 Canyon Edge Drive, Johns Creek, GA 30097',
    price: 912000,
    beds: 5, baths: 4, halfBaths: 0, sqft: 3320,
    lotSizeAcres: 0.41, yearBuilt: 2009,
    propertyType: 'Single Family', hoaMonthly: 140,
    images: asset('prop_103'),
    neighborhood: {
      walkScore: 28, transitScore: 16,
      nearestRailStation: 'North Springs MARTA',
      nearestRailMinutesWalk: 62,
      schoolRating: 10, crimeIndexVsMetro: 0.44,
      diversityIndex: 0.79, southAsianPopulationPct: 31.8,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 22, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 58, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Executive home in a top-10 school district. Dramatic elevation change at rear ' +
      'of lot with a walk-out basement. Bedrooms on upper level.',
  },
  {
    id: 'prop_104',
    address: '540 Sandy Plains Way, Marietta, GA 30066',
    price: 665000,
    beds: 4, baths: 2, halfBaths: 1, sqft: 2450,
    lotSizeAcres: 0.31, yearBuilt: 2004,
    propertyType: 'Single Family', hoaMonthly: 45,
    images: asset('prop_104'),
    neighborhood: {
      walkScore: 41, transitScore: 24,
      nearestRailStation: 'Dunwoody MARTA',
      nearestRailMinutesWalk: 55,
      schoolRating: 8, crimeIndexVsMetro: 0.72,
      diversityIndex: 0.58, southAsianPopulationPct: 9.3,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 41, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 38, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Best value per square foot in the search area. Flat fenced yard, mature shade trees. ' +
      'Flex room off the foyer currently used as an office.',
  },
  {
    id: 'prop_105',
    address: '318 Pecan Street NE, Brookhaven, GA 30319',
    price: 794000,
    beds: 3, baths: 2, halfBaths: 0, sqft: 2080,
    lotSizeAcres: 0.19, yearBuilt: 1969,
    propertyType: 'Single Family', hoaMonthly: 0,
    images: asset('prop_105'),
    neighborhood: {
      walkScore: 84, transitScore: 71,
      nearestRailStation: 'Brookhaven/Oglethorpe MARTA',
      nearestRailMinutesWalk: 8,
      schoolRating: 8, crimeIndexVsMetro: 0.94,
      diversityIndex: 0.68, southAsianPopulationPct: 11.2,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 34, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 19, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Walk to the village, the park and the train. Charming mid-century ranch on a ' +
      'compact lot. Systems are largely original; inspection strongly encouraged.',
  },
  {
    id: 'prop_106',
    address: '75 Trailview Court, Alpharetta, GA 30009',
    price: 869000,
    beds: 4, baths: 3, halfBaths: 0, sqft: 2760,
    lotSizeAcres: 0.30, yearBuilt: 2019,
    propertyType: 'Single Family', hoaMonthly: 95,
    images: asset('prop_106'),
    neighborhood: {
      walkScore: 58, transitScore: 44,
      nearestRailStation: 'North Springs MARTA',
      nearestRailMinutesWalk: 18,
      schoolRating: 9, crimeIndexVsMetro: 0.58,
      diversityIndex: 0.71, southAsianPopulationPct: 19.6,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 19, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 46, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Modern farmhouse backing to a greenbelt trail. Main-level guest suite with ' +
      'full bath. Fenced level yard, raised beds, tankless water heater.',
  },
  {
    id: 'prop_107',
    address: '1140 Peachtree Walk NE #12, Brookhaven, GA 30319',
    price: 632000,
    beds: 3, baths: 2, halfBaths: 1, sqft: 1940,
    lotSizeAcres: 0.04, yearBuilt: 2021,
    propertyType: 'Townhouse', hoaMonthly: 310,
    images: asset('prop_107'),
    neighborhood: {
      walkScore: 92, transitScore: 79,
      nearestRailStation: 'Brookhaven/Oglethorpe MARTA',
      nearestRailMinutesWalk: 4,
      schoolRating: 8, crimeIndexVsMetro: 0.97,
      diversityIndex: 0.72, southAsianPopulationPct: 13.4,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 33, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 16, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Nearly new townhome four minutes from the train. Walk to restaurants, the ' +
      'park and the village. Bedrooms on the upper levels. Minimal outdoor space.',
  },
  {
    id: 'prop_108',
    address: '4820 Highpoint Crossing, Cumming, GA 30041',
    price: 935000,
    beds: 5, baths: 4, halfBaths: 1, sqft: 3610,
    lotSizeAcres: 0.26, yearBuilt: 2022,
    propertyType: 'Single Family', hoaMonthly: 120,
    images: asset('prop_108'),
    neighborhood: {
      walkScore: 19, transitScore: 8,
      nearestRailStation: 'North Springs MARTA',
      nearestRailMinutesWalk: 74,
      schoolRating: 9, crimeIndexVsMetro: 0.52,
      diversityIndex: 0.49, southAsianPopulationPct: 14.1,
    },
    commutes: [
      { label: 'Alpharetta Tech Corridor', minutes: 29, daysPerWeek: 4 },
      { label: 'Midtown Atlanta', minutes: 63, daysPerWeek: 1 },
    ],
    listingRemarks:
      'Largest home in the search at the best price per foot. Builder warranty still ' +
      'active. Main-level guest suite with full bath. Sound wall along the rear lot line.',
  },
];

export const listingById = (id: string) => mockListings.find((l) => l.id === id);
