/**
 * Persistent preference memory.
 *
 * Firestore is the system of record on Cloud Run. Locally — and in any
 * environment without Application Default Credentials — this transparently
 * falls back to a JSON file so the demo never dies on a missing credential.
 * The fallback is announced in the health payload, never silently swapped,
 * so you always know which store answered.
 */
import { Firestore } from '@google-cloud/firestore';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { PreferenceProfile, DimensionKey, defaultProfile } from '../types/preferences.js';
import { TraditionId, TRADITIONS } from '../data/traditions.js';
import { STORE_DIR } from '../paths.js';

const LOCAL_STORE = join(STORE_DIR, 'memory.json');
const COLLECTION = 'buyerProfiles';

export type MemoryBackend = 'firestore' | 'local-json';

let firestore: Firestore | null = null;
let backend: MemoryBackend = 'local-json';
let probed = false;

/**
 * Are Google credentials actually available?
 *
 * The Firestore client's gRPC layer resolves credentials lazily and, when none
 * exist, throws an UNCAUGHT exception from a deferred stub creation — outside
 * any try/catch around the call that triggered it. The process dies. So the
 * question has to be answered before a client is ever constructed, or a
 * developer who clones this repo without `gcloud auth` gets a server that
 * exits seconds after boot for no visible reason.
 */
function credentialsAvailable(): boolean {
  if (process.env.K_SERVICE) return true;                       // Cloud Run
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return true;  // explicit key file
  const adc = join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  return existsSync(adc);
}

/** One probe at boot decides the backend; per-request failures fall back too. */
export async function initMemory(): Promise<MemoryBackend> {
  if (probed) return backend;
  probed = true;

  if (!credentialsAvailable()) {
    backend = 'local-json';
    console.log('[memory] no Google credentials found — using the local JSON store');
    console.log('[memory] run `gcloud auth application-default login` to use Firestore');
    return backend;
  }

  try {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT;
    const db = new Firestore(projectId ? { projectId } : {});
    /* Cheap round-trip that fails fast when credentials are absent.
       The id must not match Firestore's reserved __.*__ pattern — using
       "__probe__" here made a perfectly healthy database report itself as
       unavailable, and the service silently ran on local storage in
       production. */
    await db.collection(COLLECTION).doc('connectivity-probe').get();
    firestore = db;
    backend = 'firestore';
    console.log('[memory] Firestore connected');
  } catch (err) {
    backend = 'local-json';
    // On Cloud Run this almost always means the Firestore database has not been
    // created in the project, or the runtime service account is missing
    // roles/datastore.user. Log the whole error, not a truncated head — a
    // silent downgrade to local storage in production is the kind of thing you
    // only notice when the demo says "local store" on camera.
    console.warn('[memory] Firestore unavailable, falling back to the local JSON store.');
    console.warn(`[memory]   project: ${process.env.GOOGLE_CLOUD_PROJECT ?? '(not set)'}`);
    console.warn(`[memory]   reason:  ${(err as Error).message}`);
    console.warn('[memory]   fix:     gcloud firestore databases create --location=nam5');
    console.warn('[memory]            and grant roles/datastore.user to the run service account');
  }
  return backend;
}

export const memoryBackend = () => backend;

/* ------------------------- local JSON fallback ------------------------- */

async function readLocal(): Promise<Record<string, PreferenceProfile>> {
  try { return JSON.parse(await readFile(LOCAL_STORE, 'utf8')); }
  catch { return {}; }
}
async function writeLocal(all: Record<string, PreferenceProfile>) {
  await mkdir(dirname(LOCAL_STORE), { recursive: true });
  await writeFile(LOCAL_STORE, JSON.stringify(all, null, 2));
}

/** Profiles written before a field existed must not crash on read. */
function withDefaults(profile: PreferenceProfile, userId: string): PreferenceProfile {
  const base = defaultProfile(userId);
  return {
    ...base,
    ...profile,
    weights: { ...base.weights, ...(profile.weights ?? {}) },
    hardConstraints: { ...base.hardConstraints, ...(profile.hardConstraints ?? {}) },
    learnedNotes: profile.learnedNotes ?? [],
  };
}

/* ------------------------------- API ---------------------------------- */

export async function getProfile(userId: string): Promise<PreferenceProfile> {
  if (backend === 'firestore' && firestore) {
    try {
      const doc = await firestore.collection(COLLECTION).doc(userId).get();
      if (doc.exists) return withDefaults(doc.data() as PreferenceProfile, userId);
      const fresh = defaultProfile(userId);
      await firestore.collection(COLLECTION).doc(userId).set(fresh);
      return fresh;
    } catch (err) {
      console.warn('[memory] Firestore read failed, falling back:', (err as Error).message);
      backend = 'local-json';
    }
  }
  const all = await readLocal();
  if (!all[userId]) {
    all[userId] = defaultProfile(userId);
    await writeLocal(all);
  }
  return withDefaults(all[userId]!, userId);
}

async function saveProfile(profile: PreferenceProfile): Promise<PreferenceProfile> {
  profile.updatedAt = new Date().toISOString();
  profile.version += 1;

  if (backend === 'firestore' && firestore) {
    try {
      await firestore.collection(COLLECTION).doc(profile.userId).set(profile);
      return profile;
    } catch (err) {
      console.warn('[memory] Firestore write failed, falling back:', (err as Error).message);
      backend = 'local-json';
    }
  }
  const all = await readLocal();
  all[profile.userId] = profile;
  await writeLocal(all);
  return profile;
}

/** Direct weight / constraint edits from the UI chips. */
export async function updateProfile(
  userId: string,
  patch: {
    weights?: Partial<Record<DimensionKey, number>>;
    hardConstraints?: Partial<PreferenceProfile['hardConstraints']>;
    tradition?: TraditionId;
  },
): Promise<PreferenceProfile> {
  const profile = await getProfile(userId);
  if (patch.tradition && patch.tradition in TRADITIONS) profile.tradition = patch.tradition;
  if (patch.weights) {
    for (const [k, v] of Object.entries(patch.weights)) {
      if (typeof v === 'number') profile.weights[k as DimensionKey] = Math.max(0, Math.min(1, v));
    }
  }
  if (patch.hardConstraints) Object.assign(profile.hardConstraints, patch.hardConstraints);
  return saveProfile(profile);
}

export interface AppliedFeedback {
  profile: PreferenceProfile;
  changes: { dimension: DimensionKey; from: number; to: number }[];
  /** Constraints this feedback switched on. These cap scores outright. */
  constraintsSet: string[];
  note: string;
}

/**
 * Turn a free-text critique into an actual weight change.
 *
 * The interpretation is done by Gemini (see feedbackInterpreter.ts) — this
 * function is the transactional part: clamp, record, persist, and report
 * exactly what moved so the UI can show the buyer what it learned.
 */
export async function applyFeedback(
  userId: string,
  propertyId: string,
  action: 'thumbs_up' | 'thumbs_down',
  critique: string,
  adjustments: { dimension: DimensionKey; delta: number }[],
  constraints: string[],
  note: string,
): Promise<AppliedFeedback> {
  const profile = await getProfile(userId);
  const changes: AppliedFeedback['changes'] = [];
  const constraintsSet: string[] = [];

  // The verdict on this specific house. This is what makes a thumbs-down
  // actually do something to the house you were looking at.
  if (!profile.propertyFeedback) profile.propertyFeedback = {};
  profile.propertyFeedback[propertyId] =
    action === 'thumbs_down' ? 'rejected' : 'shortlisted';

  /* A weight change moves a weighted average across seven dimensions, so on its
     own it shifts a score by about a point — invisible, and sometimes upward,
     because raising the weight of a dimension a property scores well on raises
     its total. When the buyer says "dealbreaker" they mean the house is
     disqualified, and only a hard constraint expresses that. */
  for (const key of constraints) {
    const hc = profile.hardConstraints as unknown as Record<string, unknown>;
    if (key in hc && hc[key] !== true) {
      hc[key] = true;
      constraintsSet.push(key);
    }
  }

  for (const { dimension, delta } of adjustments) {
    const from = profile.weights[dimension];
    if (from === undefined) continue;
    const to = Math.max(0.05, Math.min(1, Math.round((from + delta) * 100) / 100));
    if (to !== from) {
      profile.weights[dimension] = to;
      changes.push({ dimension, from, to });
    }
  }

  const stamp = new Date().toISOString().slice(0, 10);
  profile.learnedNotes.unshift(`[${stamp}] ${action === 'thumbs_up' ? '👍' : '👎'} ${propertyId}: ${note}`);
  profile.learnedNotes = profile.learnedNotes.slice(0, 25); // keep the doc bounded

  const saved = await saveProfile(profile);
  return { profile: saved, changes, constraintsSet, note };
}

export async function resetProfile(userId: string): Promise<PreferenceProfile> {
  const fresh = defaultProfile(userId);
  fresh.version = 0;
  return saveProfile(fresh);
}
