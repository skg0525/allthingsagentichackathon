/**
 * Score the shipped perception seed against known ground truth. Offline.
 *
 * `npm run verify` re-reads every plan live, which is the honest end-to-end
 * check — but it is hostage to Google's capacity and can take 20 minutes on a
 * bad day. This scores the exact readings that ship in the repo, in
 * milliseconds, with no API calls. Same ground truth, same scoring.
 *
 * Use this in CI and to make the accuracy claim reproducible by anyone.
 *
 *   npm run verify:seed
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_ROOT } from '../src/paths.js';
import { GROUND_TRUTH, ADJACENT, type Truth } from '../src/data/groundTruth.js';

const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', DIM = '\x1b[2m', OFF = '\x1b[0m';

async function main() {
  const seed = JSON.parse(
    await readFile(join(APP_ROOT, 'data', 'perception-seed.json'), 'utf8'),
  ) as Record<string, { perception: Record<string, unknown>; model: string; at: string }>;

  let exact = 0, near = 0, wrong = 0;
  const byModel: Record<string, number> = {};

  for (const [id, truth] of Object.entries(GROUND_TRUTH) as [string, Truth][]) {
    const entry = seed[id];
    if (!entry) {
      console.log(`${RED}✗${OFF} ${id} missing from the seed — run npm run cache:build`);
      wrong += Object.keys(truth).length;
      continue;
    }
    byModel[entry.model] = (byModel[entry.model] ?? 0) + 1;
    console.log(`\n${id}  ${DIM}${entry.model}${OFF}`);

    for (const [field, want] of Object.entries(truth)) {
      const got = entry.perception[field];
      if (got === want) {
        exact += 1;
        console.log(`  ${GREEN}✓${OFF} ${field.padEnd(20)} ${String(got)}`);
      } else if (
        typeof want === 'string' && typeof got === 'string' &&
        ADJACENT[want]?.includes(got)
      ) {
        near += 1;
        console.log(`  ${YELLOW}~${OFF} ${field.padEnd(20)} ${String(got)} ${DIM}(adjacent to ${want})${OFF}`);
      } else {
        wrong += 1;
        console.log(`  ${RED}✗${OFF} ${field.padEnd(20)} ${String(got)} ${DIM}(expected ${String(want)})${OFF}`);
      }
    }
  }

  const total = exact + near + wrong;
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;

  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  exact    ${GREEN}${exact}/${total}${OFF}  ${pct(exact)}`);
  console.log(`  adjacent ${YELLOW}${near}/${total}${OFF}  ${pct(near)}`);
  console.log(`  wrong    ${RED}${wrong}/${total}${OFF}  ${pct(wrong)}`);
  console.log(`  models   ${Object.entries(byModel).map(([m, n]) => `${m}×${n}`).join(', ')}`);
  console.log(`${'─'.repeat(58)}\n`);

  if (wrong / total > 0.15) {
    console.error('FAIL: more than 15% of fields are outright wrong.');
    process.exit(1);
  }
  console.log('PASS');
}

main().catch((e) => { console.error(e); process.exit(1); });
