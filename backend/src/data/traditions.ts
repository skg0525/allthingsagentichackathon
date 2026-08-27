import { CardinalDirection } from '../types/listing.js';

/**
 * Directional rule sets.
 *
 * Two traditions, deliberately chosen because they DISAGREE. Vastu treats a
 * south-facing entrance as a flaw; classical Feng Shui treats it as the ideal
 * ("bright hall", maximum sun). Switching tradition therefore genuinely
 * re-orders the list rather than nudging it — which is also the honest position:
 * these are cultural frameworks, not physics, and the app should not pretend
 * one is objectively correct.
 *
 * Scores are 0-100 desirability for placing that element in that direction.
 */

export type TraditionId = 'vastu' | 'fengshui';

export interface Tradition {
  id: TraditionId;
  name: string;
  origin: string;
  /** One sentence a judge who has never heard of this can understand. */
  blurb: string;
  elementLabels: { entrance: string; kitchen: string; master: string };
  entrance: Partial<Record<CardinalDirection, number>>;
  kitchen: Partial<Record<CardinalDirection, number>>;
  master: Partial<Record<CardinalDirection, number>>;
  /** Relative influence of each element on the overall directional score. */
  mix: { entrance: number; kitchen: number; master: number };
  /** Directions that trip a hard flag when `strictEntrance` is on. */
  flaggedEntrances: CardinalDirection[];
  notes: { entrance: string; kitchen: string; master: string };
}

export const TRADITIONS: Record<TraditionId, Tradition> = {
  vastu: {
    id: 'vastu',
    name: 'Vastu Shastra',
    origin: 'Indian / Hindu architectural tradition',
    blurb:
      'A traditional Indian system that assigns meaning to the compass direction ' +
      'of a home\'s entrance and rooms. Widely observed in Indian households and ' +
      'often decisive in a purchase — but absent from every listing portal.',
    elementLabels: {
      entrance: 'Main entrance',
      kitchen: 'Kitchen (Agni / fire)',
      master: 'Primary bedroom',
    },
    entrance: {
      'East': 100, 'North': 95, 'North-East': 85,
      'West': 60, 'North-West': 55, 'South-East': 45,
      'South-West': 20, 'South': 10, 'Unknown': 50,
    },
    kitchen: {
      'South-East': 100,          // Agni, the fire corner
      'North-West': 75, 'South': 55, 'West': 50, 'East': 45,
      'South-West': 35, 'North': 30, 'North-East': 15, 'Unknown': 50,
    },
    master: {
      'South-West': 100, 'West': 80, 'South': 70,
      'North-West': 55, 'East': 45, 'North': 40,
      'South-East': 35, 'North-East': 15, 'Unknown': 50,
    },
    mix: { entrance: 0.45, kitchen: 0.3, master: 0.25 },
    flaggedEntrances: ['South', 'South-West'],
    notes: {
      entrance:
        'East and North are most auspicious — they catch the morning sun. ' +
        'South-facing entrances are traditionally avoided.',
      kitchen:
        'The South-East is the Agni (fire) corner and the preferred place for a ' +
        'kitchen. North-East is avoided.',
      master:
        'South-West is associated with stability and is preferred for the primary ' +
        'bedroom. North-East is avoided.',
    },
  },

  fengshui: {
    id: 'fengshui',
    name: 'Feng Shui',
    origin: 'Chinese classical compass school',
    blurb:
      'A Chinese system of situating buildings so that qi flows favourably. ' +
      'Its compass rules differ from Vastu — notably, a south-facing entrance is ' +
      'the classical ideal rather than a flaw.',
    elementLabels: {
      entrance: 'Main entrance (qi mouth)',
      kitchen: 'Kitchen (fire star)',
      master: 'Primary bedroom',
    },
    entrance: {
      // "Bright hall" — facing south with the back to the north is the classic
      // auspicious siting. North-East and South-West are the "devil's gates".
      'South': 100, 'South-East': 90, 'East': 85,
      'West': 60, 'North-West': 55, 'North': 40,
      'North-East': 20, 'South-West': 20, 'Unknown': 50,
    },
    kitchen: {
      // Wood feeds Fire: the eastern sectors support the hearth.
      'East': 100, 'South-East': 95, 'South': 70,
      'North': 50, 'West': 40, 'North-West': 35,
      'North-East': 15, 'South-West': 15, 'Unknown': 50,
    },
    master: {
      // North-West is the "heaven" / patriarch position; the devil's-gate
      // diagonal is avoided for sleeping.
      'North-West': 100, 'West': 90, 'North': 70,
      'South': 55, 'East': 50, 'South-East': 45,
      'North-East': 20, 'South-West': 20, 'Unknown': 50,
    },
    mix: { entrance: 0.45, kitchen: 0.3, master: 0.25 },
    flaggedEntrances: ['North-East', 'South-West'],
    notes: {
      entrance:
        'A south-facing entrance is the classical ideal — the "bright hall". ' +
        'North-East and South-West sit on the "devil\'s gate" diagonal and are avoided.',
      kitchen:
        'Eastern sectors are favoured: in the five-element cycle, Wood feeds Fire ' +
        'and supports the hearth.',
      master:
        'North-West is the traditional position of authority and rest. The ' +
        'North-East / South-West diagonal is avoided for sleeping.',
    },
  },
};

export const DEFAULT_TRADITION: TraditionId = 'vastu';
export const traditionOf = (id?: string): Tradition =>
  TRADITIONS[(id as TraditionId) in TRADITIONS ? (id as TraditionId) : DEFAULT_TRADITION];
