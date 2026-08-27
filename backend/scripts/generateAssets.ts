/**
 * One-shot asset generator.
 *
 * Produces a coherent 3-image set per property (exterior / floor plan / aerial)
 * using Gemini's image model, then writes them under backend/public/assets/<id>/.
 *
 * These files are committed. The demo never generates images at request time —
 * that keeps the scan fast and the visuals identical on every run.
 *
 *   npm run assets            # only generates what's missing
 *   npm run assets -- --force # regenerate everything
 *
 * The "hidden truth" in each scene brief (entrance direction, kitchen quadrant,
 * yard grade) is deliberately NOT written into mockListings.ts. The vision agent
 * has to read it back out of the pixels. scripts/verifyAssets.ts checks it did.
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { ASSETS_DIR as OUT } from '../src/paths.js';
// The image models get busy. Fall through the chain rather than abort a run.
const IMAGE_MODELS = [
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
  'gemini-3-pro-image',
];
const MAX_ROUNDS = 6;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY is required to generate assets.');
const ai = new GoogleGenAI({ apiKey });

interface SceneBrief {
  id: string;
  house: string;        // shared description so all 3 views match
  floorPlan: string;    // the ground truth the agent must recover
  aerial: string;
}

const BRIEFS: SceneBrief[] = [
  {
    id: 'prop_101',
    house:
      'a 2016-built two-story craftsman with warm grey board-and-batten siding, ' +
      'white trim, a stone-columned front porch, and a dark shingle roof',
    floorPlan:
      'MAIN FLOOR. Front door and covered porch on the EAST side (right edge of the page). ' +
      'KITCHEN in the SOUTH-EAST corner (bottom right). PRIMARY BEDROOM in the SOUTH-WEST ' +
      'corner (bottom left) labeled "PRIMARY BEDROOM". A second bedroom labeled ' +
      '"GUEST BEDROOM" on this same main floor, with an adjoining room clearly labeled ' +
      '"FULL BATH" containing both a tub and a shower. Also label FOYER, GREAT ROOM, ' +
      'DINING, LAUNDRY, 2-CAR GARAGE.',
    aerial:
      'a level, completely flat rectangular back yard fully enclosed by a wooden privacy ' +
      'fence, mowed lawn, a rear patio, backing directly onto dense mature woodland with ' +
      'no road behind it. The house sits at the bulb of a quiet cul-de-sac.',
  },
  {
    id: 'prop_102',
    house:
      'a 1978 two-story colonial with red brick on the lower level, cream vinyl siding ' +
      'above, black shutters, and a weathered grey roof',
    floorPlan:
      'MAIN FLOOR of a two-story home. Front door on the SOUTH side (bottom edge of the page). ' +
      'KITCHEN in the NORTH-EAST corner (top right). NO bedrooms at all on this floor — ' +
      'label a note "ALL BEDROOMS UPPER LEVEL". Show only FOYER, LIVING, FORMAL DINING, ' +
      'KITCHEN, FAMILY ROOM, HALF BATH (toilet and sink only, no tub), and GARAGE.',
    aerial:
      'a modest back yard with patchy grass and only a low chain-link fence on two sides, ' +
      'the third side open to the neighbour. The front of the property faces a busy ' +
      'four-lane divided road with visible lane markings and traffic.',
  },
  {
    id: 'prop_103',
    house:
      'a 2009 large stucco-and-stone executive home, three-car side-entry garage, ' +
      'tall arched entry, beige stucco with stone accents',
    floorPlan:
      'MAIN FLOOR. Front door on the NORTH side (top edge of the page). KITCHEN in the ' +
      'SOUTH-EAST corner (bottom right). NO bedroom on this floor — label a note ' +
      '"BEDROOMS: UPPER LEVEL". Show FOYER, TWO-STORY GREAT ROOM, KITCHEN, KEEPING ROOM, ' +
      'DINING, STUDY, POWDER ROOM, 3-CAR GARAGE, and stairs down to a WALK-OUT BASEMENT.',
    aerial:
      'a back yard on a severe downhill slope, showing a steep grassy embankment dropping ' +
      'sharply away from the rear of the house, a retaining wall, and an exposed walk-out ' +
      'basement level below the deck. Clearly sloped terrain, not flat. No fence.',
  },
  {
    id: 'prop_104',
    house:
      'a 2004 traditional two-story with tan brick front, beige siding on the sides, ' +
      'a small front stoop, and a front-entry two-car garage',
    floorPlan:
      'MAIN FLOOR. Front door on the WEST side (left edge of the page). KITCHEN in the ' +
      'NORTH-WEST corner (top left). One bedroom on this main floor labeled ' +
      '"FLEX ROOM / BEDROOM 4". The only bathroom on this floor is labeled ' +
      '"HALF BATH" and contains a toilet and sink ONLY — no tub, no shower. ' +
      'Also label FOYER, FAMILY ROOM, BREAKFAST, DINING, GARAGE.',
    aerial:
      'a flat, level back yard enclosed by a tall wooden privacy fence on all sides, with ' +
      'several large mature shade trees and a small shed. Quiet residential street in front.',
  },
  {
    id: 'prop_105',
    house:
      'a 1969 single-story mid-century ranch, low-pitched roof, painted white brick, ' +
      'a long horizontal front elevation and a carport',
    floorPlan:
      'SINGLE-STORY RANCH, one floor only. Front door on the NORTH-EAST side (top right). ' +
      'KITCHEN in the SOUTH-EAST corner (bottom right). PRIMARY BEDROOM in the NORTH-EAST ' +
      'corner (top right) labeled "PRIMARY BEDROOM". A "FULL BATH" with tub and shower ' +
      'on this floor. Also label LIVING, DINING, BEDROOM 2, BEDROOM 3, CARPORT.',
    aerial:
      'a very small, compact back yard with no fence, directly overlooked by close ' +
      'neighbouring houses on both sides and behind. Dense walkable neighbourhood with ' +
      'sidewalks, a park and a rail line visible a few blocks away.',
  },
  {
    id: 'prop_106',
    house:
      'a 2019-built modern farmhouse with white vertical siding, black window ' +
      'frames, a standing-seam metal porch roof and a dark grey shingle roof',
    floorPlan:
      'MAIN FLOOR. Front door and covered entry porch on the SOUTH side (bottom edge ' +
      'of the page). KITCHEN in the EAST portion (right side, centre of the right edge). ' +
      'PRIMARY BEDROOM in the NORTH-WEST corner (top left) labeled "PRIMARY BEDROOM". ' +
      'A second bedroom labeled "GUEST BEDROOM" on this same main floor with an ' +
      'adjoining room clearly labeled "FULL BATH" containing a tub and a shower. ' +
      'Also label ENTRY, GREAT ROOM, DINING, PANTRY, MUDROOM, 2-CAR GARAGE.',
    aerial:
      'a flat, level rectangular back yard fully enclosed by a black aluminium fence, ' +
      'a large lawn, a rear deck and a small vegetable garden, backing onto a quiet ' +
      'greenbelt walking trail. No major roads adjacent.',
  },
  {
    id: 'prop_107',
    house:
      'a 2021 three-story brick-and-stucco townhouse in a row of attached ' +
      'townhomes, with a two-car tandem garage on the lowest level',
    floorPlan:
      'MAIN LIVING FLOOR of a three-story townhouse. Stair entry on the WEST side ' +
      '(left edge). KITCHEN in the NORTH-EAST corner (top right) with a large island. ' +
      'NO bedroom on this floor - label a note "BEDROOMS: UPPER LEVEL". Show ' +
      'STAIR HALL, GREAT ROOM, DINING, KITCHEN, PANTRY, POWDER ROOM (toilet and ' +
      'sink only, no tub), and a small BALCONY.',
    aerial:
      'a dense row of attached townhouses with almost no private yard - just a tiny ' +
      'paved courtyard barely larger than the balcony, no fence, shared driveways. ' +
      'Sidewalks, a light-rail line and a park are clearly visible within two blocks.',
  },
  {
    id: 'prop_108',
    house:
      'a 2022 large new-construction transitional home with a light grey brick ' +
      'facade, board-and-batten gables, oversized windows and a three-car garage',
    floorPlan:
      'MAIN FLOOR. Front door on the NORTH side (top edge of the page). KITCHEN in ' +
      'the SOUTH-EAST corner (bottom right). A bedroom on this main floor labeled ' +
      '"GUEST SUITE" with an adjoining "FULL BATH" containing a tub and shower. ' +
      'Also label FOYER, TWO-STORY GREAT ROOM, DINING, SCULLERY, DROP ZONE, ' +
      '3-CAR GARAGE, and a note "PRIMARY SUITE: UPPER LEVEL".',
    aerial:
      'a back yard that ends abruptly at a tall concrete sound-barrier wall, directly ' +
      'behind which runs a wide multi-lane divided highway with clearly visible lane ' +
      'markings and heavy traffic. The yard itself is flat but narrow, with a new thin ' +
      'lawn and no mature trees.',
  },

  /* --- new to market: these arrive via the autonomous overnight run --- */
  {
    id: 'prop_109',
    house:
      'a 2020 craftsman-style two-story with sage-green fiber-cement siding, ' +
      'white trim, a deep covered front porch with tapered columns, and a dark roof',
    floorPlan:
      'MAIN FLOOR. Front door and deep covered porch on the EAST side (right edge of ' +
      'the page). KITCHEN in the SOUTH-EAST corner (bottom right). PRIMARY BEDROOM in ' +
      'the SOUTH-WEST corner (bottom left) labeled "PRIMARY BEDROOM". A second bedroom ' +
      'labeled "IN-LAW SUITE" on this same main floor with an adjoining room clearly ' +
      'labeled "FULL BATH" containing both a tub and a shower. Also label FOYER, ' +
      'GREAT ROOM, DINING, STUDY, LAUNDRY, 2-CAR GARAGE.',
    aerial:
      'a large, completely flat back yard fully enclosed by a tall wooden privacy ' +
      'fence, mature shade trees along the rear line, a paved patio, and a quiet ' +
      'cul-de-sac in front. Backs onto woodland, no roads behind.',
  },
  {
    id: 'prop_110',
    house:
      'a 1985 split-level home with brown wood siding, a stone chimney, ' +
      'small windows and an attached one-car garage under the upper level',
    floorPlan:
      'MAIN LEVEL of a split-level home. Front door on the SOUTH-WEST side (bottom ' +
      'left). KITCHEN in the NORTH-EAST corner (top right). NO bedroom on this level ' +
      '- label a note "BEDROOMS: UPPER SPLIT LEVEL". Show ENTRY, LIVING, DINING, ' +
      'KITCHEN, HALF BATH (toilet and sink only, no tub), stairs UP and stairs DOWN, ' +
      'and a 1-CAR GARAGE.',
    aerial:
      'a back yard on a noticeable downhill slope with a railway line running along ' +
      'the rear boundary, patchy grass, and a sagging chain-link fence on one side only.',
  },
];

const NORTH_RULE =
  'CRITICAL ORIENTATION RULE: draw a bold north arrow labelled "N" pointing to the TOP ' +
  'of the image. North is up, South is down, East is RIGHT, West is LEFT.';

function prompts(b: SceneBrief) {
  return {
    exterior:
      `A photorealistic real-estate listing photograph of ${b.house}. ` +
      `Front elevation, shot from the street on a clear day, professional wide-angle ` +
      `real estate photography, well-manicured front lawn. No text, no watermarks, no people.`,
    floorplan:
      `A clean, professional architectural 2D floor plan drawing, top-down orthographic ` +
      `blueprint style, crisp black lines on a white background, with clearly legible ` +
      `room name labels and dimension lines. ${NORTH_RULE} ` +
      `Draw this specific layout: ${b.floorPlan} ` +
      `Every room label must be spelled correctly and easy to read.`,
    aerial:
      `A top-down aerial satellite view of a single suburban residential property lot, ` +
      `shot straight down from directly overhead like Google Earth, high resolution. ` +
      `The house is ${b.house}. ${NORTH_RULE} ` +
      `The lot shows: ${b.aerial} ` +
      `Photorealistic satellite imagery. No text labels, no map UI, no watermarks.`,
  };
}

async function exists(p: string) {
  try { await access(p); return true; } catch { return false; }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Try every model in the chain, then back off and go round again.
 * 503 "high demand" on the image models is common and almost always transient,
 * so a failed asset should never take the whole run down with it.
 */
async function generate(prompt: string, dest: string): Promise<boolean> {
  for (let round = 1; round <= MAX_ROUNDS; round++) {
    for (const model of IMAGE_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { responseModalities: ['IMAGE'] },
        });
        const part = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        if (!part?.inlineData?.data) throw new Error('no image part in response');
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, Buffer.from(part.inlineData.data, 'base64'));
        console.log(`  \u2713 ${dest.replace(OUT, '')}${round > 1 || model !== IMAGE_MODELS[0] ? `  [${model}, round ${round}]` : ''}`);
        return true;
      } catch (err) {
        const msg = (err as Error).message.slice(0, 90);
        console.log(`  \u00b7 ${model} failed: ${msg}`);
      }
    }
    const backoff = Math.min(30_000, 3_000 * 2 ** (round - 1));
    console.log(`  \u2026 all models busy, round ${round}/${MAX_ROUNDS}, waiting ${backoff / 1000}s`);
    await sleep(backoff);
  }
  console.log(`  \u2717 GAVE UP on ${dest.replace(OUT, '')}`);
  return false;
}

async function main() {
  const force = process.argv.includes('--force');
  const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
  const failed: string[] = [];

  for (const brief of BRIEFS) {
    if (only && brief.id !== only) continue;
    console.log(`\n${brief.id}`);
    const p = prompts(brief);
    const jobs: [string, string][] = [
      [p.exterior, join(OUT, brief.id, 'exterior.jpg')],
      [p.floorplan, join(OUT, brief.id, 'floorplan.jpg')],
      [p.aerial, join(OUT, brief.id, 'aerial.jpg')],
    ];
    for (const [prompt, dest] of jobs) {
      if (!force && (await exists(dest))) { console.log(`  \u00b7 skip ${dest.replace(OUT, '')}`); continue; }
      if (!(await generate(prompt, dest))) failed.push(dest.replace(OUT, ''));
      await sleep(1200); // be polite to the quota
    }
  }

  if (failed.length) {
    console.log(`\n${failed.length} asset(s) still missing:`);
    failed.forEach((f) => console.log(`  - ${f}`));
    console.log('Re-run `npm run assets` to pick up only the missing ones.');
    process.exitCode = 1;
  } else {
    console.log('\nAll assets present in backend/public/assets/');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
