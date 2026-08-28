/**
 * Persistence for the autonomous runs.
 *
 * Kept separate from the preference profile because these have different
 * lifecycles: a profile is a single evolving document, briefs are an append-only
 * log the user reads once. Same Firestore-with-local-fallback contract.
 */
import { Firestore } from '@google-cloud/firestore';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { STORE_DIR } from '../paths.js';
import { memoryBackend } from './memoryManager.js';
import type { DailyBrief } from './watchAgent.js';

const LOCAL = join(STORE_DIR, 'briefs.json');
const BRIEFS = 'agentBriefs';
const SEEN = 'agentSeen';
const MAX_BRIEFS = 30;

interface LocalShape {
  briefs: Record<string, DailyBrief[]>;
  seen: Record<string, string[]>;
}

let db: Firestore | null = null;
function firestore(): Firestore | null {
  // memoryBackend() is only 'firestore' after initMemory verified credentials,
  // so this inherits that guard rather than repeating the check.
  if (memoryBackend() !== 'firestore') return null;
  if (!db) {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT;
    db = new Firestore(projectId ? { projectId } : {});
  }
  return db;
}

async function readLocal(): Promise<LocalShape> {
  try { return JSON.parse(await readFile(LOCAL, 'utf8')); }
  catch { return { briefs: {}, seen: {} }; }
}
async function writeLocal(d: LocalShape) {
  await mkdir(dirname(LOCAL), { recursive: true });
  await writeFile(LOCAL, JSON.stringify(d, null, 2));
}

export async function saveBrief(userId: string, brief: DailyBrief): Promise<void> {
  const fs = firestore();
  if (fs) {
    try {
      await fs.collection(BRIEFS).doc(userId).collection('runs').doc(brief.id).set(brief);
      return;
    } catch (err) {
      console.warn('[briefs] Firestore write failed, using local:', (err as Error).message);
    }
  }
  const d = await readLocal();
  d.briefs[userId] = [brief, ...(d.briefs[userId] ?? [])].slice(0, MAX_BRIEFS);
  await writeLocal(d);
}

export async function listBriefs(userId: string, limit = 10): Promise<DailyBrief[]> {
  const fs = firestore();
  if (fs) {
    try {
      const snap = await fs.collection(BRIEFS).doc(userId).collection('runs')
        .orderBy('runAt', 'desc').limit(limit).get();
      return snap.docs.map((d) => d.data() as DailyBrief);
    } catch (err) {
      console.warn('[briefs] Firestore read failed, using local:', (err as Error).message);
    }
  }
  return (await readLocal()).briefs[userId]?.slice(0, limit) ?? [];
}

/** Listing ids the agent has already reported on, so a re-run stays idempotent. */
export async function listSeenIds(userId: string): Promise<string[]> {
  const fs = firestore();
  if (fs) {
    try {
      const doc = await fs.collection(SEEN).doc(userId).get();
      return (doc.data()?.ids as string[]) ?? [];
    } catch { /* fall through */ }
  }
  return (await readLocal()).seen[userId] ?? [];
}

export async function markSeen(userId: string, listingId: string): Promise<void> {
  const fs = firestore();
  if (fs) {
    try {
      const ref = fs.collection(SEEN).doc(userId);
      const existing = (await ref.get()).data()?.ids as string[] | undefined;
      await ref.set({ ids: [...new Set([...(existing ?? []), listingId])] });
      return;
    } catch { /* fall through */ }
  }
  const d = await readLocal();
  d.seen[userId] = [...new Set([...(d.seen[userId] ?? []), listingId])];
  await writeLocal(d);
}

export async function resetWatch(userId: string): Promise<void> {
  const fs = firestore();
  if (fs) {
    try {
      await fs.collection(SEEN).doc(userId).set({ ids: [] });
      const snap = await fs.collection(BRIEFS).doc(userId).collection('runs').get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
      return;
    } catch { /* fall through */ }
  }
  const d = await readLocal();
  d.seen[userId] = [];
  d.briefs[userId] = [];
  await writeLocal(d);
}
