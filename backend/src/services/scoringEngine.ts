/**
 * Deterministic scoring.
 *
 * The split that makes this system trustworthy:
 *   Gemini does PERCEPTION  — "what does this floor plan actually show?"
 *   This file does JUDGEMENT — "given what it shows, how well does it fit?"
 *
 * Judgement is pure, unit-testable arithmetic. Two runs over the same
 * perception always produce the same score, so a buyer can compare houses
 * week over week and the ranking means something. It also means changing a
 * preference weight re-ranks the whole list with zero model calls.
 */
import { PropertyListing, Perception, DimensionScore, CardinalDirection } from '../types/listing.js';
import { PreferenceProfile, DimensionKey, DIMENSION_LABELS } from '../types/preferences.js';
import { Tradition, traditionOf } from '../data/traditions.js';

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function verdictFor(score: number): DimensionScore['verdict'] {
  if (score >= 85) return 'ideal';
  if (score >= 65) return 'acceptable';
  if (score >= 40) return 'concern';
  return 'dealbreaker';
}

/* -------------------- directional (vastu / feng shui) -------------------- */
// The rule tables live in data/traditions.ts. This function is tradition-agnostic:
// swap the table and the whole ranking changes with no code change.

function scoreDirectional(p: Perception, t: Tradition) {
  const e = t.entrance[p.entranceDirection] ?? 50;
  const k = t.kitchen[p.kitchenQuadrant] ?? 50;
  const m = t.master[p.masterBedQuadrant] ?? 50;
  const score = clamp(e * t.mix.entrance + k * t.mix.kitchen + m * t.mix.master);
  const reason = [
    `${t.name}: entrance ${p.entranceDirection} (${e}/100)`,
    `kitchen ${p.kitchenQuadrant} (${k}/100)`,
    `primary bed ${p.masterBedQuadrant} (${m}/100)`,
  ].join(', ');
  return { score, reason };
}

/* ------------------------ main-floor suite ------------------------ */
function scoreMainFloor(p: Perception) {
  if (p.mainFloorBedroom && p.mainFloorFullBath)
    return { score: 100, reason: 'Main-floor bedroom with an adjoining full bath.' };
  if (p.mainFloorBedroom)
    return { score: 45, reason: 'Main-floor bedroom present, but only a half bath on that level.' };
  return { score: 0, reason: 'No bedroom on the main floor.' };
}

/* ----------------------------- yard ------------------------------ */
function scoreYard(p: Perception, lotAcres: number) {
  let s =
    p.yardGrade === 'Flat' ? 100 :
    p.yardGrade === 'Gentle Slope' ? 65 :
    p.yardGrade === 'Steep Slope' ? 15 : 50;

  const privacy =
    p.yardPrivacy === 'High' ? 100 :
    p.yardPrivacy === 'Medium' ? 65 :
    p.yardPrivacy === 'Low' ? 25 : 50;

  s = s * 0.5 + privacy * 0.3;
  s += p.yardFenced ? 10 : 0;
  s += lotAcres >= 0.3 ? 10 : lotAcres >= 0.2 ? 5 : 0;
  if (p.backsOntoMajorRoad) s -= 25;

  const notes = [`${p.yardGrade.toLowerCase()} grade`, `${p.yardPrivacy.toLowerCase()} privacy`];
  if (p.yardFenced) notes.push('fenced'); else notes.push('unfenced');
  notes.push(`${lotAcres} acre lot`);
  if (p.backsOntoMajorRoad) notes.push('backs onto a major road');
  return { score: clamp(s), reason: notes.join(', ') };
}

/* ---------------------------- commute ---------------------------- */
/** The commute you make four days a week matters more than the one you make once. */
export function primaryCommute(l: PropertyListing) {
  return l.commutes.length
    ? l.commutes.reduce((a, b) => (a.daysPerWeek > b.daysPerWeek ? a : b))
    : undefined;
}

function scoreCommute(l: PropertyListing, max: number) {
  if (!l.commutes.length) return { score: 50, reason: 'No commute targets configured.' };

  const totalDays = l.commutes.reduce((s, c) => s + c.daysPerWeek, 0) || 1;
  const per = (mins: number) => {
    const ratio = mins / max;
    return ratio <= 0.6 ? 100 : ratio <= 1 ? 100 - (ratio - 0.6) * 100 : 60 - (ratio - 1) * 90;
  };
  // Weight each destination by how often it is actually driven.
  const score = clamp(
    l.commutes.reduce((s, c) => s + per(c.minutes) * c.daysPerWeek, 0) / totalDays,
  );

  const primary = primaryCommute(l)!;
  const others = l.commutes.filter((c) => c !== primary);
  const tail = others.length
    ? ` Also ${others.map((c) => `${c.minutes} min to ${c.label} ${c.daysPerWeek}x/wk`).join(', ')}.`
    : '';
  return {
    score,
    reason: `${primary.minutes} min to ${primary.label}, ${primary.daysPerWeek}x/week ` +
            `(your ceiling is ${max} min).${tail}`,
  };
}

/* -------------------------- walkability -------------------------- */
function scoreWalkability(l: PropertyListing) {
  const n = l.neighborhood;
  const railBonus = n.nearestRailMinutesWalk <= 10 ? 100 : n.nearestRailMinutesWalk <= 20 ? 70 : n.nearestRailMinutesWalk <= 40 ? 35 : 10;
  const score = clamp(n.walkScore * 0.45 + n.transitScore * 0.25 + railBonus * 0.3);
  return {
    score,
    reason: `Walk Score ${n.walkScore}, Transit ${n.transitScore}, ${n.nearestRailMinutesWalk} min walk to ${n.nearestRailStation}.`,
  };
}

/* -------------------------- maintenance -------------------------- */
function scoreMaintenance(l: PropertyListing) {
  const age = new Date().getFullYear() - l.yearBuilt;
  // Major systems (roof, HVAC, water heater) cluster around 20-30 years.
  let score = age <= 8 ? 100 : age <= 15 ? 88 : age <= 25 ? 70 : age <= 40 ? 42 : 22;
  if (l.propertyType === 'Condo') score -= 20; // shared-stack water damage exposure
  return {
    score: clamp(score),
    reason: `Built ${l.yearBuilt} (${age} yrs). ${
      age > 40 ? 'Expect roof, HVAC and plumbing to be at or past end of life.'
      : age > 25 ? 'Budget for at least one major system replacement.'
      : 'Major systems still well inside their service life.'
    }`,
  };
}

/* --------------------------- community --------------------------- */
function scoreCommunity(l: PropertyListing) {
  const n = l.neighborhood;
  const schools = n.schoolRating * 10;
  const safety = clamp((1.4 - n.crimeIndexVsMetro) * 100);
  const diversity = clamp(n.diversityIndex * 100);
  // A mixed Indian/white household wants genuine mix, not a monoculture
  // either way — reward being meaningfully represented without dominance.
  const representation = clamp(100 - Math.abs(n.southAsianPopulationPct - 20) * 3.2);
  const score = clamp(schools * 0.3 + safety * 0.3 + diversity * 0.2 + representation * 0.2);
  return {
    score,
    reason: `Schools ${n.schoolRating}/10, crime ${(n.crimeIndexVsMetro * 100).toFixed(0)}% of metro average, ` +
            `diversity index ${n.diversityIndex.toFixed(2)}, ${n.southAsianPopulationPct}% South Asian.`,
  };
}

/* ------------------------- orchestration ------------------------- */

export interface ScoreOutcome {
  matchScore: number;
  dimensions: DimensionScore[];
  redFlags: string[];
}

export function scoreProperty(
  listing: PropertyListing,
  perception: Perception,
  profile: PreferenceProfile,
): ScoreOutcome {
  const hc = profile.hardConstraints;

  const tradition = traditionOf(profile.tradition);

  const raw: Record<DimensionKey, { score: number; reason: string }> = {
    vastu: scoreDirectional(perception, tradition),
    mainFloorSuite: scoreMainFloor(perception),
    yard: scoreYard(perception, listing.lotSizeAcres),
    commute: scoreCommute(listing, hc.maxCommuteMinutes),
    walkability: scoreWalkability(listing),
    maintenance: scoreMaintenance(listing),
    community: scoreCommunity(listing),
  };

  const dimensions: DimensionScore[] = (Object.keys(raw) as DimensionKey[]).map((key) => {
    const weight = profile.weights[key] ?? 0.5;
    return {
      key,
      // The compass dimension is named after whichever tradition is active.
      label: key === 'vastu' ? `${tradition.name} Compliance` : DIMENSION_LABELS[key],
      score: raw[key].score,
      weight,
      weighted: Math.round(raw[key].score * weight * 10) / 10,
      verdict: verdictFor(raw[key].score),
      reason: raw[key].reason,
    };
  });

  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0) || 1;
  let matchScore = clamp(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight);

  /* Hard constraints are not soft-scored away. A violated dealbreaker
     caps the headline number so a pretty house can never outrank the
     buyer's actual non-negotiables. */
  const redFlags: string[] = [];
  const cap = (limit: number, msg: string) => { redFlags.push(msg); matchScore = Math.min(matchScore, limit); };

  if (hc.mainFloorBedroomRequired && !perception.mainFloorBedroom)
    cap(55, 'No main-floor bedroom — you listed this as required.');
  if (hc.mainFloorFullBathRequired && perception.mainFloorBedroom && !perception.mainFloorFullBath)
    cap(65, 'Main-floor bedroom has no full bath on that level.');
  if (hc.strictEntrance && tradition.flaggedEntrances.includes(perception.entranceDirection))
    cap(60, `${perception.entranceDirection}-facing main entrance — flagged under ${tradition.name}.`);
  if (hc.flatYardRequired && perception.yardGrade === 'Steep Slope')
    cap(55, 'Steep backyard grade — you require a flat lot.');
  if (perception.yardGrade === 'Steep Slope')
    redFlags.push('Steep rear grade limits usable yard and adds drainage risk.');
  if (perception.backsOntoMajorRoad)
    redFlags.push('Property fronts or backs onto a major road — noise and child-safety concern.');
  if (listing.price > hc.maxPrice)
    cap(70, `$${listing.price.toLocaleString()} is over your $${hc.maxPrice.toLocaleString()} ceiling.`);
  if (listing.yearBuilt < hc.minYearBuilt)
    redFlags.push(`Built ${listing.yearBuilt}, older than your ${hc.minYearBuilt} cutoff — maintenance exposure.`);

  // Only the commute they actually make most days can cap the score.
  const primary = primaryCommute(listing);
  if (primary && primary.minutes > hc.maxCommuteMinutes * 1.3)
    cap(68, `${primary.minutes} min to ${primary.label} ${primary.daysPerWeek}x/week is well past your ${hc.maxCommuteMinutes} min limit.`);

  return { matchScore, dimensions, redFlags };
}
