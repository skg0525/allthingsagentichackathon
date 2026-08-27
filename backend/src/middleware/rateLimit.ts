/**
 * Abuse control for a public deployment.
 *
 * Two independent limits, because they fail differently:
 *
 *   1. Per-IP throttle — stops one client hammering the expensive routes.
 *   2. A global daily model-call budget — stops the whole service running up a
 *      bill even if the traffic is spread across many IPs.
 *
 * Both are per-instance and in-memory. That is deliberate: with Cloud Run
 * `--max-instances` capped, per-instance budgets multiply out to a known
 * ceiling, and a shared counter in Firestore would add a round-trip to every
 * request to defend against a threat this deployment does not have.
 */
import { Request, Response, NextFunction } from 'express';

interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>();

let modelCallsToday = 0;
let budgetResetAt = endOfDay();

function endOfDay(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function clientKey(req: Request): string {
  // Cloud Run puts the real client first in X-Forwarded-For.
  const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return fwd || req.ip || 'unknown';
}

export interface LimitOptions {
  /** Requests allowed per window, per client. */
  max: number;
  windowMs: number;
  /** Roughly how many model calls one request can cost. 0 = free. */
  modelCost?: number;
}

/** Ceiling on model calls per instance per day. */
export const DAILY_MODEL_CALL_BUDGET =
  Number(process.env.DAILY_MODEL_CALL_BUDGET ?? 400);

export function budgetStatus() {
  if (Date.now() > budgetResetAt) { modelCallsToday = 0; budgetResetAt = endOfDay(); }
  return {
    used: modelCallsToday,
    limit: DAILY_MODEL_CALL_BUDGET,
    remaining: Math.max(0, DAILY_MODEL_CALL_BUDGET - modelCallsToday),
    resetsAt: new Date(budgetResetAt).toISOString(),
  };
}

/** Call after work completes so failed requests do not burn budget. */
export function recordModelCalls(n: number): void {
  if (Date.now() > budgetResetAt) { modelCallsToday = 0; budgetResetAt = endOfDay(); }
  modelCallsToday += n;
}

export function rateLimit(opts: LimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();

    // Sweep expired buckets so the map cannot grow without bound.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
    }

    const key = `${req.path}:${clientKey(req)}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    } else if (bucket.count >= opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `Too many requests. ${opts.max} allowed per ${Math.round(opts.windowMs / 1000)}s.`,
        retryAfterSeconds: retryAfter,
      });
    } else {
      bucket.count += 1;
    }

    const cost = opts.modelCost ?? 0;
    if (cost > 0) {
      const { remaining, resetsAt } = budgetStatus();
      if (remaining < cost) {
        return res.status(429).json({
          error:
            'This demo instance has reached its daily model-call budget. ' +
            'The agent is fine — it is a deliberate spend cap.',
          resetsAt,
        });
      }
    }

    next();
  };
}
