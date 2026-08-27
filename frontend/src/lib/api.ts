import type {
  AuditResult, PreferenceProfile, PropertyListing, HealthPayload, DimensionKey,
  Tradition, TraditionId, DailyBrief, AdhocResult,
} from '@/types/listing';

/**
 * Where the agent lives.
 *
 * Resolved at runtime from /api/config rather than inlined at build time — see
 * that route for why. Falls back to the build-time value, then to localhost, so
 * local development needs no extra setup.
 */
let apiBase =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ?? 'http://localhost:8080';

let resolved: Promise<string> | null = null;

/** Must be awaited once before any other call in this module. */
export function resolveApiBase(): Promise<string> {
  if (resolved) return resolved;
  resolved = fetch('/api/config')
    .then((r) => (r.ok ? r.json() : null))
    .then((cfg) => {
      if (cfg?.apiBase) apiBase = String(cfg.apiBase).replace(/\/$/, '');
      return apiBase;
    })
    .catch(() => apiBase);
  return resolved;
}

export const getApiBase = () => apiBase;

export const USER_ID = 'demo_buyer_1';

/** Property imagery is served by the API, so the agent and the browser see identical bytes. */
export const assetUrl = (path: string) => `${apiBase}${path}`;

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const getHealth = () => json<HealthPayload>('/api/health');

export const getListings = () =>
  json<{ listings: PropertyListing[] }>('/api/listings').then((r) => r.listings);

export const getTraditions = () =>
  json<{ traditions: Tradition[] }>('/api/traditions').then((r) => r.traditions);

export const getProfile = () =>
  json<{ profile: PreferenceProfile }>(`/api/profile?userId=${USER_ID}`).then((r) => r.profile);

export const patchProfile = (patch: {
  weights?: Partial<Record<DimensionKey, number>>;
  hardConstraints?: Partial<PreferenceProfile['hardConstraints']>;
  tradition?: TraditionId;
}) =>
  json<{ profile: PreferenceProfile }>(`/api/profile?userId=${USER_ID}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  }).then((r) => r.profile);

/* ------------------- autonomous background agent ------------------- */

export const getBriefs = () =>
  json<{ briefs: DailyBrief[] }>(`/api/agent/briefs?userId=${USER_ID}`).then((r) => r.briefs);

/** Fires the same code path Cloud Scheduler hits on a cron. */
export const runAgentNow = (replay = false) =>
  json<{ brief: DailyBrief }>(
    `/api/agent/run?userId=${USER_ID}&trigger=manual${replay ? '&replay=true' : ''}`,
    { method: 'POST' },
  ).then((r) => r.brief);

export const resetAgent = () =>
  json<{ reset: boolean }>(`/api/agent/reset?userId=${USER_ID}`, { method: 'POST' });

/* ------------------- analyse an unseen floor plan ------------------- */

export const analyzeUploadedPlan = (imageBase64: string, mimeType: string) =>
  json<AdhocResult>(`/api/analyze/plan?userId=${USER_ID}`, {
    method: 'POST',
    body: JSON.stringify({ imageBase64, mimeType }),
  });

export interface FeedbackResponse {
  note: string;
  changes: { dimension: DimensionKey; from: number; to: number }[];
  profile: PreferenceProfile;
  degraded: boolean;
}

export const sendFeedback = (
  propertyId: string,
  action: 'thumbs_up' | 'thumbs_down',
  critique: string,
) =>
  json<FeedbackResponse>('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ userId: USER_ID, propertyId, action, critique }),
  });

/**
 * Streaming scan. Audits arrive one at a time as each vision pass resolves,
 * so the grid fills in progressively instead of blocking on the slowest call.
 */
export interface ScanHandlers {
  onStart?: (d: { total: number; model: string; memoryBackend: string }) => void;
  onAudit?: (a: AuditResult) => void;
  onProgress?: (d: { done: number; total: number }) => void;
  onError?: (d: { propertyId: string; error: string }) => void;
  onSkipped?: (d: { propertyId: string; reason: string }) => void;
  onComplete?: (d: { totalMs: number }) => void;
}

export type ScanMode =
  /** Analyse everything, using cached readings where they exist. */
  | 'full'
  /** Discard every cached reading and look at the images again. */
  | 'force'
  /** Re-score from cached readings only. Never makes a model call. */
  | 'rescore';

export function startScan(handlers: ScanHandlers, mode: ScanMode = 'full'): () => void {
  const q = mode === 'force' ? '&force=true' : mode === 'rescore' ? '&cachedOnly=true' : '';
  const url = `${apiBase}/api/scan?userId=${USER_ID}${q}`;
  const es = new EventSource(url);

  const on = <T,>(name: string, fn?: (d: T) => void) =>
    es.addEventListener(name, (e) => fn?.(JSON.parse((e as MessageEvent).data)));

  on('start', handlers.onStart);
  on('audit', handlers.onAudit);
  on('progress', handlers.onProgress);
  on('audit_error', handlers.onError);
  on('audit_skipped', handlers.onSkipped);
  es.addEventListener('complete', (e) => {
    handlers.onComplete?.(JSON.parse((e as MessageEvent).data));
    es.close();
  });
  es.onerror = () => { es.close(); handlers.onComplete?.({ totalMs: 0 }); };

  return () => es.close();
}
