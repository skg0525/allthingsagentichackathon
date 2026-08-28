/**
 * VastuNest agent API.
 *
 * Routes of note:
 *   GET  /api/health          backend + model + memory-store status (demo proof)
 *   GET  /api/listings        raw candidate set
 *   GET  /api/scan            SSE — audits stream back as each one resolves
 *   POST /api/audit/:id       single property, JSON
 *   GET  /api/profile         the buyer's live preference profile
 *   PATCH /api/profile        adjust weights / hard constraints, re-ranks free
 *   POST /api/feedback        free-text critique -> interpreted weight change
 */
// Must come before anything that emits spans.
import { initTelemetry, tracingEnabled, flushTraces } from './telemetry.js';
initTelemetry();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { ASSETS_DIR } from './paths.js';
import {
  rateLimit, budgetStatus, recordModelCalls, DAILY_MODEL_CALL_BUDGET,
} from './middleware/rateLimit.js';

import { mockListings, listingById } from './data/mockListings.js';
import type { PropertyListing } from './types/listing.js';
import { TRADITIONS } from './data/traditions.js';
import { incomingListings, incomingById } from './data/incomingListings.js';
import { runWatchCycle } from './services/watchAgent.js';
import { listBriefs, resetWatch, listSeenIds } from './services/briefStore.js';
import { analyzeUploadedPlan } from './services/adhocAnalyzer.js';
import { planTour } from './services/tourPlanner.js';
import { auditProperty, clearPerceptionCache, cacheStats } from './services/auditService.js';
import { MODEL } from './services/geminiEvaluator.js';
import { interpretFeedback } from './services/feedbackInterpreter.js';
import {
  initMemory, memoryBackend, getProfile, updateProfile, applyFeedback, resetProfile,
} from './services/memoryManager.js';

const app = express();

// Cloud Run terminates TLS upstream; trust its X-Forwarded-For for rate limiting.
app.set('trust proxy', true);
/**
 * CORS.
 *
 * Cloud Run gives every service TWO hostnames — the legacy
 * `<service>-<hash>-<region>.a.run.app` and the newer
 * `<service>-<projectNumber>.<region>.run.app` — and both serve the same
 * container. Pinning CORS to whichever one `gcloud describe` happened to report
 * blocks the browser on the other, which looks exactly like the backend being
 * down. Accept every hostname belonging to the configured UI service.
 */
const ALLOWED_ORIGINS = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin || !ALLOWED_ORIGINS?.length) return true; // unconfigured = permissive (local dev)
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Same Cloud Run service, other hostname format.
  const service = (o: string) => o.replace(/^https?:\/\//, '').split('.')[0]?.split('-').slice(0, -1).join('-');
  return ALLOWED_ORIGINS.some(
    (a) => a.endsWith('run.app') && origin.endsWith('run.app') && service(a) === service(origin),
  );
}

app.use(cors({
  origin: (origin, cb) =>
    isAllowedOrigin(origin ?? undefined)
      ? cb(null, true)
      : cb(new Error(`Origin ${origin} is not allowed`)),
}));
// Uploaded floor plans arrive base64-encoded in the body.
app.use(express.json({ limit: '12mb' }));

// Spans are flushed on the way out of every request, because Cloud Run's CPU
// throttling means nothing else will do it. Fire-and-forget: never delay a
// response for telemetry.
app.use((_req, res, next) => {
  res.on('finish', flushTraces);
  next();
});

// Property imagery is served from the API so the vision agent and the browser
// are provably looking at the exact same bytes.
app.use('/assets', express.static(ASSETS_DIR, {
  maxAge: '1h',
  immutable: false,
}));

const PORT = Number(process.env.PORT ?? 8080);

/**
 * How many scans are streaming right now.
 *
 * Exposed on /api/health so tooling can tell whether the perception cache is
 * settled. Clearing the cache while a scan is in flight looks like it worked and
 * then silently refills — which is exactly the way to walk into a demo believing
 * the analysis will be live when it will not.
 */
let activeScans = 0;
const userIdOf = (req: Request) =>
  (req.query.userId as string) || (req.body?.userId as string) || 'demo_buyer_1';

/** Shortlist + anything the overnight agent has already surfaced. */
async function scannableFor(userId: string): Promise<PropertyListing[]> {
  const seen = new Set(await listSeenIds(userId));
  return [...mockListings, ...incomingListings.filter((l) => seen.has(l.id))];
}

/** Express 5 does not forward async rejections; this keeps every route honest. */
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

/* ------------------------------ health ------------------------------ */

app.get('/api/health', wrap(async (_req, res) => {
  const stats = await cacheStats();
  res.json({
    status: 'ok',
    service: 'vastunest-agent',
    model: MODEL,
    memoryBackend: memoryBackend(),
    perceptionCache: stats,
    activeScans,
    modelBudget: budgetStatus(),
    tracing: tracingEnabled() ? 'cloud-trace' : 'disabled',
    listings: mockListings.length,
    pendingMarketListings: incomingListings.length,
    revision: process.env.K_REVISION ?? 'local',
    region: process.env.CLOUD_RUN_REGION ?? 'local',
    uptimeSeconds: Math.round(process.uptime()),
  });
}));

app.get('/', (_req, res) => res.redirect('/api/health'));

/* ----------------------------- listings ----------------------------- */

/**
 * Your shortlist.
 *
 * Anything the overnight agent has already surfaced joins the browsable set —
 * once it has told you about a house, that house is one of your candidates, and
 * the brief needs somewhere to link to.
 */
app.get('/api/listings', wrap(async (req, res) => {
  const seen = new Set(await listSeenIds(userIdOf(req)));
  const surfaced = incomingListings.filter((l) => seen.has(l.id));
  res.json({ listings: [...mockListings, ...surfaced] });
}));

/** Rule sets the compass dimension can be scored against. */
app.get('/api/traditions', (_req, res) => res.json({ traditions: Object.values(TRADITIONS) }));

/* ------------------------------ profile ----------------------------- */

app.get('/api/profile', wrap(async (req, res) => {
  res.json({ profile: await getProfile(userIdOf(req)), backend: memoryBackend() });
}));

app.patch('/api/profile', wrap(async (req, res) => {
  const { weights, hardConstraints, tradition } = req.body ?? {};
  const profile = await updateProfile(userIdOf(req), { weights, hardConstraints, tradition });
  res.json({ profile, backend: memoryBackend() });
}));

app.post('/api/profile/reset', wrap(async (req, res) => {
  res.json({ profile: await resetProfile(userIdOf(req)) });
}));

/* ------------------------------- scan ------------------------------- */

/**
 * Server-sent events. The old build did Promise.all and blocked the UI on the
 * slowest property (measured: 29.8s while the median was 4.9s). Streaming means
 * the first card lands in about a second and the grid fills in as work finishes.
 */
/* A full scan is up to one vision call per property; a re-score is free.
   The limiter sits in front of both because the cheap one is still a stream. */
app.get('/api/scan', rateLimit({ max: 12, windowMs: 60_000, modelCost: 10 }), wrap(async (req, res) => {
  const userId = userIdOf(req);
  const force = req.query.force === 'true';
  // A re-rank only re-does the arithmetic. Never vision.
  const cachedOnly = req.query.cachedOnly === 'true';
  const profile = await getProfile(userId);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const send = (event: string, data: unknown) =>
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  let closed = false;
  req.on('close', () => { closed = true; });

  const scannable = await scannableFor(userId);
  const startedAt = Date.now();
  activeScans += 1;
  // A leaked counter would permanently 409 every future cache clear, so the
  // decrement has to survive any failure in the worker pool.
  try {
    send('start', {
      total: scannable.length,
      profileVersion: profile.version,
      model: MODEL,
      memoryBackend: memoryBackend(),
    });

    /* Firing all eight vision calls at once was provoking 503s from the model.
       A small pool keeps the stream flowing without self-inflicted rate limits;
       cached properties fall through instantly and never occupy a slot for long. */
    const CONCURRENCY = Number(process.env.SCAN_CONCURRENCY ?? 4);
    const queue = [...scannable];
    let done = 0;
    let liveCalls = 0;

    const worker = async () => {
      for (let listing = queue.shift(); listing; listing = queue.shift()) {
        if (closed) return;
        try {
          const audit = await auditProperty(listing, profile, { force, cachedOnly });
          if (audit && !audit.cached) liveCalls += 1;
          if (!closed) {
            if (audit) send('audit', audit);
            else send('audit_skipped', { propertyId: listing.id, reason: 'not analysed yet' });
          }
        } catch (err) {
          console.error(`[scan] ${listing.id} failed:`, err);
          if (!closed) send('audit_error', { propertyId: listing.id, error: (err as Error).message });
        } finally {
          done += 1;
          if (!closed) send('progress', { done, total: scannable.length });
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    recordModelCalls(liveCalls);
  } finally {
    activeScans = Math.max(0, activeScans - 1);
  }

  if (!closed) {
    send('complete', { totalMs: Date.now() - startedAt, profileVersion: profile.version });
    res.end();
  }
}));

app.post('/api/audit/:id', wrap(async (req, res) => {
  const id = String(req.params.id);
  const listing = listingById(id) ?? incomingById(id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  const profile = await getProfile(userIdOf(req));
  const audit = await auditProperty(listing, profile, { force: req.query.force === 'true' });
  if (!audit) return res.status(409).json({ error: 'Not analysed yet' });
  res.json(audit);
}));

app.post('/api/cache/clear', wrap(async (req, res) => {
  // Refuse rather than clear into a moving target.
  if (activeScans > 0 && req.query.force !== 'true') {
    return res.status(409).json({
      error: `${activeScans} scan(s) still streaming — clearing now would refill the cache immediately.`,
      activeScans,
    });
  }
  await clearPerceptionCache();
  res.json({ cleared: true });
}));

/* -------------------- autonomous background agent -------------------- */

/**
 * The endpoint Cloud Scheduler hits. Nobody is watching when this runs — the
 * agent pulls what is new, reads the floor plans, and decides for itself
 * whether anything justifies a notification.
 */
app.post('/api/agent/run',
  rateLimit({ max: 4, windowMs: 300_000, modelCost: 4 }),
  wrap(async (req, res) => {
  const trigger = req.query.trigger === 'manual' ? 'manual' : 'schedule';
  const replay = req.query.replay === 'true';
  const brief = await runWatchCycle(userIdOf(req), trigger, { replay });
  recordModelCalls(brief.analysed);
  res.json({ brief });
}));

app.get('/api/agent/briefs', wrap(async (req, res) => {
  res.json({ briefs: await listBriefs(userIdOf(req), Number(req.query.limit ?? 10)) });
}));

/** What the agent has not looked at yet — the queue behind the next run. */
app.get('/api/agent/pending', (_req, res) =>
  res.json({ pending: incomingListings.length }));

app.post('/api/agent/reset', wrap(async (req, res) => {
  await resetWatch(userIdOf(req));
  res.json({ reset: true });
}));

/* ------------------- analyse an unseen floor plan -------------------- */

app.post('/api/analyze/plan',
  rateLimit({ max: 6, windowMs: 60_000, modelCost: 1 }),
  wrap(async (req, res) => {
  const { imageBase64, mimeType, tradition } = req.body ?? {};
  if (!imageBase64 || !mimeType)
    return res.status(400).json({ error: 'imageBase64 and mimeType are required' });

  const profile = await getProfile(userIdOf(req));
  try {
    const result = await analyzeUploadedPlan(
      String(imageBase64).replace(/^data:[^,]+,/, ''),
      String(mimeType),
      tradition ?? profile.tradition,
    );
    recordModelCalls(1);
    res.json(result);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    res.status(status).json({ error: (err as Error).message });
  }
}));

/* ------------------------------- tour -------------------------------- */

/**
 * Turn a shortlist into a drivable route.
 *
 * The agent orders the stops, allocates time, says what to verify at each door
 * given what it already found in the plans, and returns a Google Maps link with
 * every stop as a waypoint.
 */
app.post('/api/tour/plan',
  rateLimit({ max: 10, windowMs: 60_000, modelCost: 1 }),
  wrap(async (req, res) => {
    const { propertyIds, startAddress, startTime } = req.body ?? {};
    if (!Array.isArray(propertyIds) || propertyIds.length === 0)
      return res.status(400).json({ error: 'propertyIds must be a non-empty array' });
    if (propertyIds.length > 8)
      return res.status(400).json({ error: 'Eight stops is already a long day; pick fewer.' });

    const userId = userIdOf(req);
    const profile = await getProfile(userId);

    const listings = propertyIds
      .map((id: string) => listingById(id) ?? incomingById(id))
      .filter(Boolean) as PropertyListing[];
    if (!listings.length) return res.status(404).json({ error: 'No matching listings' });

    // Re-score from cache so the plan can reference real findings without
    // triggering vision calls the user did not ask for.
    const audits: Record<string, Awaited<ReturnType<typeof auditProperty>>> = {};
    await Promise.all(listings.map(async (l) => {
      audits[l.id] = await auditProperty(l, profile, { cachedOnly: true });
    }));

    const plan = await planTour(
      listings,
      audits as never,
      profile,
      { startAddress, startTime },
    );
    recordModelCalls(plan.degraded ? 0 : 1);
    res.json({ plan });
  }));

/* ----------------------------- feedback ----------------------------- */

app.post('/api/feedback',
  rateLimit({ max: 15, windowMs: 60_000, modelCost: 1 }),
  wrap(async (req, res) => {
  const { propertyId, action, critique } = req.body ?? {};
  const userId = userIdOf(req);

  if (!propertyId || !action || !critique?.trim())
    return res.status(400).json({ error: 'propertyId, action and critique are required' });
  if (action !== 'thumbs_up' && action !== 'thumbs_down')
    return res.status(400).json({ error: 'action must be thumbs_up or thumbs_down' });

  const listing = listingById(propertyId);
  const context = listing
    ? `${listing.address}, $${listing.price.toLocaleString()}, built ${listing.yearBuilt}`
    : propertyId;

  const { adjustments, note, degraded } = await interpretFeedback(action, critique, context);
  if (!degraded) recordModelCalls(1);
  const applied = await applyFeedback(userId, propertyId, action, critique, adjustments, note);

  res.json({
    success: true,
    note: applied.note,
    changes: applied.changes,
    profile: applied.profile,
    backend: memoryBackend(),
    degraded,
  });
}));

/* ---------------------------- error trap ---------------------------- */

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return res.end();
  res.status(500).json({ error: 'Internal Server Error', detail: err.message });
});

initMemory().then((backend) => {
  app.listen(PORT, () => {
    console.log(`VastuNest agent listening on :${PORT}`);
    console.log(`  model:  ${MODEL}`);
    console.log(`  memory: ${backend}`);
    console.log(`  budget: ${DAILY_MODEL_CALL_BUDGET} model calls/day per instance`);
    console.log(`  cors:   ${ALLOWED_ORIGINS?.join(', ') ?? 'any origin (unconfigured)'}`);
  });
});
