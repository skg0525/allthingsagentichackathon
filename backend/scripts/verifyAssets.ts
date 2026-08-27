/**
 * Perception accuracy harness.
 *
 * Each generated floor plan and aerial was drawn to a written brief, so we know
 * the ground truth for every property. This replays the vision pass against
 * that truth and reports per-field accuracy.
 *
 * It is the check that keeps the demo honest: if the agent stops reading plans
 * correctly, this fails loudly instead of quietly inventing plausible answers.
 *
 *   npm run verify        # live — re-reads every plan through the model
 *   npm run verify:seed   # offline — scores the readings that ship in the repo
 *
 * The live run is the honest end-to-end check, but its wall time is at the mercy
 * of Google's capacity. verify:seed applies identical scoring to the committed
 * perception in milliseconds, so the accuracy claim stays reproducible.
 */
import 'dotenv/config';
import { mockListings } from '../src/data/mockListings.js';
import { perceiveProperty } from '../src/services/geminiEvaluator.js';
// Ground truth lives in one place so the live harness and the offline seed
// check can never disagree about what "correct" means.
import { GROUND_TRUTH, ADJACENT, type Truth } from '../src/data/groundTruth.js';

const GREEN = '\x1b[32m', YELLOW = '\x1b[33m', RED = '\x1b[31m', DIM = '\x1b[2m', OFF = '\x1b[0m';

async function main() {
  let exact = 0, near = 0, wrong = 0, total = 0;
  const latencies: number[] = [];

  for (const listing of mockListings) {
    const truth = GROUND_TRUTH[listing.id];
    if (!truth) continue;

    const started = Date.now();
    const { perception, trace, degraded } = await perceiveProperty(listing);
    const ms = Date.now() - started;
    latencies.push(ms);

    const model = trace.find((t) => t.step.includes('vision pass'))?.detail.split(' ')[0] ?? 'none';
    console.log(`\n${listing.id}  ${DIM}${ms}ms · ${model}${degraded ? ' · DEGRADED' : ''}${OFF}`);

    for (const [field, want] of Object.entries(truth)) {
      const got = (perception as Record<string, unknown>)[field];
      total += 1;

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

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length / 2)] ?? 0;
  const pct = (n: number) => `${((n / total) * 100).toFixed(0)}%`;

  console.log(`\n${'─'.repeat(58)}`);
  console.log(`  exact    ${GREEN}${exact}/${total}${OFF}  ${pct(exact)}`);
  console.log(`  adjacent ${YELLOW}${near}/${total}${OFF}  ${pct(near)}`);
  console.log(`  wrong    ${RED}${wrong}/${total}${OFF}  ${pct(wrong)}`);
  console.log(`  p50 latency ${p50}ms`);
  console.log(`${'─'.repeat(58)}\n`);

  // Adjacent quadrant calls are acceptable; outright wrong answers are not.
  if (wrong / total > 0.15) {
    console.error('FAIL: more than 15% of fields are outright wrong.');
    process.exit(1);
  }
  console.log('PASS');
}

main().catch((e) => { console.error(e); process.exit(1); });
