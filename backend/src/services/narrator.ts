/**
 * Pros / cons / summary assembly.
 *
 * Deliberately NOT a second model call. Every sentence here is built from
 * either the deterministic dimension scores or the evidence strings Gemini
 * already produced during the vision pass, so the narrative can never drift
 * away from the numbers it sits next to — and a scan stays one call deep.
 */
import { PropertyListing, Perception, DimensionScore } from '../types/listing.js';
import { PreferenceProfile } from '../types/preferences.js';
import { traditionOf } from '../data/traditions.js';

export function buildNarrative(
  listing: PropertyListing,
  perception: Perception,
  dimensions: DimensionScore[],
  matchScore: number,
  profile: PreferenceProfile,
) {
  const byScore = [...dimensions].sort((a, b) => b.weighted - a.weighted);
  const pros: string[] = [];
  const cons: string[] = [];

  for (const d of byScore) {
    const line = `${d.label}: ${d.reason}`;
    if (d.verdict === 'ideal') pros.push(line);
    else if (d.verdict === 'acceptable' && d.weight >= 0.8) pros.push(line);
    else if (d.verdict === 'concern' || d.verdict === 'dealbreaker') cons.push(line);
  }

  // Surface the agent's own visual evidence — this is what a Zillow filter can't do.
  if (perception.mainFloorBedroom && perception.mainFloorFullBath)
    pros.push(`Verified from the floor plan: ${perception.mainFloorSuiteEvidence}`);
  else if (perception.mainFloorSuiteEvidence !== 'Vision unavailable.')
    cons.push(`Read from the floor plan: ${perception.mainFloorSuiteEvidence}`);

  if (perception.yardEvidence !== 'Vision unavailable.') {
    (perception.yardGrade === 'Flat' ? pros : cons).push(`From the aerial: ${perception.yardEvidence}`);
  }

  const top = byScore[0];
  const worst = [...dimensions].sort((a, b) => a.score - b.score)[0]!;
  const verdict =
    matchScore >= 85 ? 'Strong fit — worth a tour this week.'
    : matchScore >= 70 ? 'Worth a look, with one thing to check in person.'
    : matchScore >= 55 ? 'Compromised on something you said mattered.'
    : 'Skip unless your priorities change.';

  const learned = profile.learnedNotes.length
    ? ` Applying ${profile.learnedNotes.length} preference${profile.learnedNotes.length === 1 ? '' : 's'} learned from your past feedback.`
    : '';

  const tradition = traditionOf(profile.tradition);
  const summary =
    `${verdict} ${listing.address.split(',')[0]} scores ${matchScore}/100 against your profile. ` +
    `Strongest dimension is ${top?.label.toLowerCase()} (${top?.score}/100); weakest is ` +
    `${worst.label.toLowerCase()} (${worst.score}/100). ` +
    `The entrance reads ${perception.entranceDirection} and the kitchen sits in the ` +
    `${perception.kitchenQuadrant} quadrant, scored under ${tradition.name}.${learned}`;

  return { pros: pros.slice(0, 6), cons: cons.slice(0, 6), summary };
}
