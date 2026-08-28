/**
 * Turn a shortlist into a tour you can actually drive.
 *
 * This is the agent doing something rather than reporting something. Given a
 * handful of properties, it decides a sensible order, allocates realistic time
 * at each door, writes what to check while standing there — informed by what it
 * already found wrong in the floor plan — and emits a Google Maps directions
 * link with the stops as waypoints.
 *
 * The Maps URL is the deliberate choice over the Directions API: the universal
 * URL scheme needs no key, no quota and no billing, and it opens natively in
 * Google Maps on whichever phone scans it.
 */
import { Type, ThinkingLevel } from '@google/genai';
import { PropertyListing, AuditResult } from '../types/listing.js';
import { PreferenceProfile } from '../types/preferences.js';
import { callWithFallback } from './geminiEvaluator.js';
import { traced } from '../telemetry.js';

export interface TourStop {
  propertyId: string;
  address: string;
  order: number;
  arriveAt: string;
  minutesOnSite: number;
  /** The specific thing to verify in person, given what the agent already saw. */
  whatToCheck: string;
  matchScore: number;
}

export interface TourPlan {
  stops: TourStop[];
  startAddress: string;
  startTime: string;
  totalMinutes: number;
  /** Opens directly in Google Maps with every stop as a waypoint. */
  mapsUrl: string;
  summary: string;
  degraded: boolean;
}

/**
 * Universal Maps URL. Waypoints are addresses, so no geocoding is needed and
 * the link works on any device signed into any account.
 */
export function buildMapsUrl(origin: string, stops: string[]): string {
  if (!stops.length) return '';
  const enc = encodeURIComponent;
  const destination = stops[stops.length - 1]!;
  const waypoints = stops.slice(0, -1);
  const params = [
    'api=1',
    `origin=${enc(origin)}`,
    `destination=${enc(destination)}`,
    waypoints.length ? `waypoints=${waypoints.map(enc).join('%7C')}` : '',
    'travelmode=driving',
  ].filter(Boolean);
  return `https://www.google.com/maps/dir/?${params.join('&')}`;
}

const SYSTEM = `
You plan house-viewing routes. You are given several properties a buyer wants to
tour, what an architectural agent already found in each one, and where the buyer
is starting from.

Decide:
1. The ORDER to visit them. Group by geography to minimise driving — these are
   real Atlanta-metro suburbs, so use what you know about how they sit relative
   to one another. Break ties by putting the strongest match earlier, while the
   buyer is still fresh.
2. minutesOnSite for each: 30 for a straightforward look, 45 where there is
   something specific and slow to verify.
3. whatToCheck — ONE sentence, the single most useful thing to do while standing
   there, informed by what the agent already flagged. Be concrete and physical:
   "measure the ground-floor bath — the plan shows no tub" beats "check the
   bathroom". If a red flag exists, that is what to check.

Assume 20 minutes of driving between stops. Return strictly valid JSON.
`.trim();

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    order: { type: Type.ARRAY, items: { type: Type.STRING } },
    stops: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          propertyId: { type: Type.STRING },
          minutesOnSite: { type: Type.INTEGER },
          whatToCheck: { type: Type.STRING },
        },
        required: ['propertyId', 'minutesOnSite', 'whatToCheck'],
      },
    },
    summary: { type: Type.STRING },
  },
  required: ['order', 'stops', 'summary'],
};

const addMinutes = (hhmm: string, mins: number): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h ?? 10) * 60 + (m ?? 0) + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const DRIVE_MINUTES = 20;

export async function planTour(
  listings: PropertyListing[],
  audits: Record<string, AuditResult | undefined>,
  profile: PreferenceProfile,
  opts: { startAddress?: string; startTime?: string } = {},
): Promise<TourPlan> {
  const startAddress = opts.startAddress?.trim() || 'Midtown Atlanta, GA';
  const startTime = opts.startTime?.trim() || '10:00';

  return traced('agent.planTour', {
    'tour.stops': listings.length,
    'tour.start': startAddress,
  }, async (span) => {
    const context = listings.map((l) => {
      const a = audits[l.id];
      return {
        propertyId: l.id,
        address: l.address,
        matchScore: a?.matchScore ?? null,
        redFlags: a?.redFlags ?? [],
        concerns: a?.cons?.slice(0, 2) ?? [],
      };
    });

    let ordered = listings.map((l) => l.id);
    let details: Record<string, { minutesOnSite: number; whatToCheck: string }> = {};
    let summary = '';
    let degraded = false;

    try {
      const { text } = await callWithFallback((model) => ({
        model,
        contents: [{ role: 'user', parts: [{
          text: `Starting from: ${startAddress} at ${startTime}\n\n`
              + `Properties:\n${JSON.stringify(context, null, 2)}`,
        }] }],
        config: {
          systemInstruction: SYSTEM,
          responseMimeType: 'application/json',
          responseSchema: SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
      }));
      const parsed = JSON.parse(text);
      const valid: string[] = (parsed.order ?? []).filter((id: string) => ordered.includes(id));
      // Anything the model dropped still gets visited — losing a house the buyer
      // asked to see is worse than a slightly worse route.
      ordered = [...valid, ...ordered.filter((id) => !valid.includes(id))];
      for (const s of parsed.stops ?? []) {
        details[s.propertyId] = {
          minutesOnSite: Math.min(90, Math.max(15, s.minutesOnSite ?? 30)),
          whatToCheck: s.whatToCheck ?? '',
        };
      }
      summary = parsed.summary ?? '';
    } catch (err) {
      degraded = true;
      // Best match first is a defensible order when the model is unavailable.
      ordered = [...listings]
        .sort((a, b) => (audits[b.id]?.matchScore ?? 0) - (audits[a.id]?.matchScore ?? 0))
        .map((l) => l.id);
      summary = 'Ordered by match score — route optimisation was unavailable.';
      console.warn('[tour] planning degraded:', (err as Error).message);
    }

    let clock = startTime;
    const stops: TourStop[] = ordered.map((id, i) => {
      const listing = listings.find((l) => l.id === id)!;
      const d = details[id] ?? { minutesOnSite: 30, whatToCheck: '' };
      if (i > 0) clock = addMinutes(clock, DRIVE_MINUTES);
      const arriveAt = clock;
      clock = addMinutes(clock, d.minutesOnSite);
      return {
        propertyId: id,
        address: listing.address,
        order: i + 1,
        arriveAt,
        minutesOnSite: d.minutesOnSite,
        whatToCheck: d.whatToCheck
          || audits[id]?.redFlags[0]
          || 'General walkthrough.',
        matchScore: audits[id]?.matchScore ?? 0,
      };
    });

    const totalMinutes = stops.reduce((t, s) => t + s.minutesOnSite, 0)
      + Math.max(0, stops.length - 1) * DRIVE_MINUTES;

    span.setAttribute('tour.totalMinutes', totalMinutes);
    span.setAttribute('tour.degraded', degraded);

    return {
      stops,
      startAddress,
      startTime,
      totalMinutes,
      mapsUrl: buildMapsUrl(startAddress, stops.map((s) => s.address)),
      summary: summary || `${stops.length} stops, about ${Math.round(totalMinutes / 60 * 10) / 10} hours.`,
      degraded,
    };
  });
}
