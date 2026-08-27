/**
 * The autonomous half of the system.
 *
 * Everything else in this codebase runs because a human clicked something. This
 * does not. Cloud Scheduler pings /api/agent/run on a cron; the agent pulls
 * whatever is new on the market, reads each floor plan and aerial without being
 * asked, scores them against the profile it has been learning, and decides on
 * its own whether anything is worth surfacing.
 *
 * The decision is the point. A run that finds nothing good writes a brief that
 * says so and does not notify — an agent that pings you about every house is
 * just a worse email alert.
 */
import { randomUUID } from 'node:crypto';
import { PropertyListing, AuditResult } from '../types/listing.js';
import { PreferenceProfile } from '../types/preferences.js';
import { incomingListings } from '../data/incomingListings.js';
import { auditProperty } from './auditService.js';
import { getProfile } from './memoryManager.js';
import { saveBrief, listSeenIds, markSeen } from './briefStore.js';

/** Only wake someone for a property that genuinely clears their bar. */
const NOTIFY_THRESHOLD = 80;

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

function headlineFor(audit: AuditResult, listing: PropertyListing): string {
  if (audit.redFlags.length) return audit.redFlags[0]!;
  const best = [...audit.dimensions].sort((a, b) => b.score * b.weight - a.score * a.weight)[0];
  return best ? `${best.label}: ${best.reason}` : listing.listingRemarks;
}

/**
 * One autonomous pass. Safe to call repeatedly — listings already seen are
 * skipped, so a cron that fires twice does not produce two briefs about the
 * same house.
 */
export async function runWatchCycle(
  userId: string,
  trigger: 'schedule' | 'manual' = 'schedule',
  opts: { replay?: boolean } = {},
): Promise<DailyBrief> {
  const startedAt = Date.now();
  const profile: PreferenceProfile = await getProfile(userId);

  const seen = opts.replay ? new Set<string>() : new Set(await listSeenIds(userId));
  const fresh = incomingListings.filter((l) => !seen.has(l.id));

  const findings: BriefFinding[] = [];

  for (const listing of fresh) {
    try {
      const audit = await auditProperty(listing, profile);
      if (!audit) continue;
      findings.push({
        propertyId: listing.id,
        address: listing.address,
        price: listing.price,
        matchScore: audit.matchScore,
        headline: headlineFor(audit, listing),
        reason: audit.summary,
        redFlags: audit.redFlags,
        thumbnail: listing.images.exterior,
        worthTouring: audit.matchScore >= NOTIFY_THRESHOLD,
      });
      if (!opts.replay) await markSeen(userId, listing.id);
    } catch (err) {
      console.error(`[watch] ${listing.id} failed:`, (err as Error).message);
    }
  }

  findings.sort((a, b) => b.matchScore - a.matchScore);
  const worth = findings.filter((f) => f.worthTouring);

  const summary =
    fresh.length === 0
      ? 'No new listings since the last run. Nothing needed your attention.'
      : worth.length > 0
        ? `${worth.length} of ${findings.length} new listing${findings.length === 1 ? '' : 's'} ` +
          `clear your bar. Top is ${worth[0]!.address.split(',')[0]} at ${worth[0]!.matchScore}/100 — ` +
          `worth booking a tour.`
        : `Checked ${findings.length} new listing${findings.length === 1 ? '' : 's'}. ` +
          `None cleared ${NOTIFY_THRESHOLD}/100, so nothing worth your time. ` +
          `Best was ${findings[0]?.matchScore ?? 0}/100.`;

  const brief: DailyBrief = {
    id: randomUUID(),
    runAt: new Date().toISOString(),
    trigger,
    newListingsSeen: fresh.length,
    analysed: findings.length,
    findings,
    // The agent decides. Silence is a valid, deliberate outcome.
    notify: worth.length > 0,
    summary,
    profileVersion: profile.version,
    durationMs: Date.now() - startedAt,
  };

  await saveBrief(userId, brief);
  console.log(
    `[watch] ${trigger} run: ${findings.length} analysed, ` +
    `${worth.length} worth touring, notify=${brief.notify} (${brief.durationMs}ms)`,
  );
  return brief;
}
