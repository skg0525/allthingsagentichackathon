/**
 * Build the committed perception cache.
 *
 * The vision API's latency swings enormously with Google's load — the same
 * request measured 1.5s in one window and 23s (or a 503) in another. That makes
 * a cold first-run a coin flip, which is a terrible first impression and a
 * terrible thing to stake a demo recording on.
 *
 * So perception is computed once here, committed, and shipped. Anyone who clones
 * the repo gets an instant app. Liveness is still provable on demand — "Re-read
 * the plans" discards this and calls the model for real.
 *
 *   npm run cache:build          # fill any gaps, retrying until complete
 *   npm run cache:build -- --force
 */
import 'dotenv/config';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { mockListings } from '../src/data/mockListings.js';
import { incomingListings } from '../src/data/incomingListings.js';
import { perceiveProperty, MODEL } from '../src/services/geminiEvaluator.js';
import { APP_ROOT } from '../src/paths.js';

const SEED = join(APP_ROOT, 'data', 'perception-seed.json');
const MAX_ROUNDS = 8;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const force = process.argv.includes('--force');
  const all = [...mockListings, ...incomingListings];

  let seed: Record<string, unknown> = {};
  if (!force) {
    try { seed = JSON.parse(await readFile(SEED, 'utf8')); } catch { /* first run */ }
  }

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const missing = all.filter((l) => !seed[l.id]);
    if (!missing.length) break;

    console.log(`\nround ${round}: ${missing.length} still to read`);
    for (const listing of missing) {
      const started = Date.now();
      const { perception, degraded, model } = await perceiveProperty(listing);
      if (degraded) {
        console.log(`  · ${listing.id} degraded after ${Date.now() - started}ms — will retry`);
        continue;
      }
      seed[listing.id] = {
        perception,
        model: model ?? MODEL,
        at: new Date().toISOString(),
      };
      await mkdir(dirname(SEED), { recursive: true });
      await writeFile(SEED, JSON.stringify(seed, null, 2));
      console.log(`  ✓ ${listing.id} in ${Date.now() - started}ms via ${model ?? MODEL}`);
    }

    if (all.some((l) => !seed[l.id]) && round < MAX_ROUNDS) {
      const backoff = Math.min(30_000, 4_000 * round);
      console.log(`  … waiting ${backoff / 1000}s before the next round`);
      await sleep(backoff);
    }
  }

  const done = all.filter((l) => seed[l.id]).length;
  console.log(`\n${done}/${all.length} cached → ${SEED.replace(APP_ROOT, '')}`);
  if (done < all.length) {
    console.log('Some are still missing. Re-run to pick them up.');
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
