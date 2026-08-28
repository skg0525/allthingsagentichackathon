/**
 * Scan orchestration.
 *
 * The performance story lives here. Perception is expensive (a vision call)
 * but it is a pure function of the IMAGES — it does not depend on the buyer's
 * weights. So perception is cached per property and reused forever, while
 * scoring re-runs on every request for free.
 *
 * Net effect: the first scan costs one vision call per property; every
 * re-rank after a preference change is sub-millisecond and costs nothing.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { PropertyListing, Perception, AuditResult, TraceStep } from '../types/listing.js';
import { PreferenceProfile } from '../types/preferences.js';
import { perceiveProperty } from './geminiEvaluator.js';
import { scoreProperty } from './scoringEngine.js';
import { buildNarrative } from './narrator.js';
import { traced } from '../telemetry.js';
import { STORE_DIR, APP_ROOT } from '../paths.js';

const CACHE_FILE = join(STORE_DIR, 'perception-cache.json');
/**
 * Committed perception, shipped with the repo.
 *
 * Vision latency swings with Google's load — the same call measured 1.5s and
 * 23s in different windows — so a cold first run is a coin flip. Seeding from a
 * committed file means a fresh clone is instant, while "Re-read the plans" still
 * proves liveness by discarding it and calling the model for real.
 */
const SEED_FILE = join(APP_ROOT, 'data', 'perception-seed.json');

interface CacheEntry { perception: Perception; model: string; at: string }

let cache: Record<string, CacheEntry> | null = null;
/** In-flight de-duplication: two scans racing the same property share one call. */
const inflight = new Map<string, Promise<{ perception: Perception; trace: TraceStep[] }>>();

async function loadCache(): Promise<Record<string, CacheEntry>> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(CACHE_FILE, 'utf8'));
    return cache!;
  } catch { /* no local cache yet — fall back to the shipped seed */ }
  try {
    cache = JSON.parse(await readFile(SEED_FILE, 'utf8'));
    console.log(`[cache] seeded ${Object.keys(cache!).length} properties from the committed file`);
  } catch {
    cache = {};
  }
  return cache!;
}

async function persistCache() {
  await mkdir(dirname(CACHE_FILE), { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache ?? {}, null, 2));
}

/**
 * Empty the cache for real.
 *
 * Writes an empty local file rather than deleting it, so the shipped seed does
 * not silently reload on the next read. "Re-read the plans" has to actually
 * re-read them.
 */
export async function clearPerceptionCache() {
  cache = {};
  await persistCache();
}

export async function cacheStats() {
  const c = await loadCache();
  return { entries: Object.keys(c).length, ids: Object.keys(c) };
}

/** Is this property's perception already on disk? */
export async function hasPerception(listingId: string): Promise<boolean> {
  return Boolean((await loadCache())[listingId]);
}

async function getPerception(
  listing: PropertyListing,
  force: boolean,
): Promise<{ perception: Perception; trace: TraceStep[]; cached: boolean }> {
  const c = await loadCache();

  if (!force && c[listing.id]) {
    return {
      perception: c[listing.id]!.perception,
      cached: true,
      trace: [{
        step: 'Perception cache hit',
        detail: `Reusing the vision pass from ${c[listing.id]!.at} — the floor plan has not changed.`,
        ms: 0,
        status: 'cached',
      }],
    };
  }

  const existing = inflight.get(listing.id);
  if (existing) {
    const { perception, trace } = await existing;
    return { perception, trace, cached: false };
  }

  const job = (async () => {
    const { perception, trace, degraded } = await perceiveProperty(listing);
    if (!degraded) {
      const store = await loadCache();
      store[listing.id] = {
        perception,
        model: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash',
        at: new Date().toISOString(),
      };
      await persistCache();
    }
    return { perception, trace };
  })();

  inflight.set(listing.id, job);
  try {
    const { perception, trace } = await job;
    return { perception, trace, cached: false };
  } finally {
    inflight.delete(listing.id);
  }
}

export async function auditProperty(
  listing: PropertyListing,
  profile: PreferenceProfile,
  opts: { force?: boolean; cachedOnly?: boolean } = {},
): Promise<AuditResult | null> {
  const t0 = Date.now();

  /* Re-scoring after a preference or tradition change must never trigger a
     vision call. Perception does not depend on the profile, so if it is not
     already cached there is nothing to re-score — returning null lets the
     caller leave that property exactly as it was rather than stalling the UI
     behind a minute of model calls the user never asked for. */
  if (opts.cachedOnly && !(await hasPerception(listing.id))) return null;

  return traced('audit.property', {
    'property.id': listing.id,
    'property.address': listing.address,
    'profile.version': profile.version,
    'profile.tradition': profile.tradition,
    'scan.forced': opts.force ?? false,
  }, async (span) => {
  const { perception, trace, cached } = await getPerception(listing, opts.force ?? false);
  span.setAttribute('perception.cached', cached);
  span.setAttribute('perception.entrance', perception.entranceDirection);
  span.setAttribute('perception.kitchen', perception.kitchenQuadrant);
  span.setAttribute('perception.mainFloorSuite',
    perception.mainFloorBedroom && perception.mainFloorFullBath);

  const scoreStart = Date.now();
  const { matchScore, dimensions, redFlags, verdict } = scoreProperty(listing, perception, profile);
  span.setAttribute('score.match', matchScore);
  span.setAttribute('score.redFlags', redFlags.length);
  trace.push({
    step: 'Deterministic scoring',
    detail: `Applied ${dimensions.length} weighted dimensions from profile v${profile.version}. ` +
            `${redFlags.length} hard-constraint flag(s).`,
    ms: Date.now() - scoreStart,
    status: 'ok',
  });

  const { pros, cons, summary } = buildNarrative(listing, perception, dimensions, matchScore, profile);
  trace.push({
    step: 'Narrative assembly',
    detail: `${pros.length} positive signal(s), ${cons.length} concern(s) — derived from the scores above, no extra model call.`,
    ms: 0,
    status: 'ok',
  });

  return {
    propertyId: listing.id,
    matchScore,
    dimensions,
    perception,
    pros,
    cons,
    redFlags,
    summary,
    verdict,
    trace,
    cached,
    totalMs: Date.now() - t0,
  };
  });
}
