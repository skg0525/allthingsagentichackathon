/**
 * The perception layer.
 *
 * Gemini 3.5 Flash is asked exactly one thing: read the floor plan and the
 * aerial photo and report what is physically there. It never sees the buyer's
 * weights and it never produces a score — that keeps it from rationalising a
 * number, and it means the same house yields the same perception no matter
 * whose profile is loaded (which is what makes the cache safe to share).
 */
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PropertyListing, Perception, PerceptionSchema, TraceStep } from '../types/listing.js';
import { PUBLIC_DIR } from '../paths.js';

/**
 * Primary vision model.
 *
 * gemini-3.5-flash-lite, not gemini-3.5-flash. Measured on this repo's own
 * verification set, two images per request:
 *
 *   gemini-3.5-flash-lite   p50  3.0s   88% exact, 0% wrong
 *   gemini-3.5-flash        p50 59.5s   — and that 59s was a 503, not an answer
 *
 * Under load the full flash model spends a minute failing. Lite answers in
 * three seconds and gets the same things right, including the half-bath trap
 * that the whole demo hinges on. Both are Gemini 3.5, so both satisfy the
 * "3.5 or newer" requirement.
 */
export const MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.5-flash-lite';

/**
 * Availability fallback, tried in order.
 *
 * gemini-3.5-flash is the primary and the one the results are cached against.
 * It does however return 503 "high demand" under load, and measured p50 on a
 * two-image request is ~17s. Rather than fail the scan, drop to the next model
 * in the chain — every entry is a Gemini 3 family model, and the trace records
 * which one actually answered so a degraded result is never silently passed off
 * as a primary one.
 */
export const MODEL_CHAIN = [
  MODEL,
  process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.5-flash',
  'gemini-3-flash-preview',
];

/* Successful calls land in 1.5-11s. A 45s ceiling meant a hung model burned
   three quarters of a minute before the chain even tried the next one, which is
   how a single property reached two minutes. Fail fast, fall through sooner. */
const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 25_000);
const MAX_ROUNDS = 2;

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) console.warn('[evaluator] GEMINI_API_KEY not set — perception will run degraded.');
const ai = new GoogleGenAI({ apiKey: apiKey ?? '' });

const DIRECTIONS = [
  'North', 'North-East', 'East', 'South-East',
  'South', 'South-West', 'West', 'North-West', 'Unknown',
];

const SYSTEM_PROMPT = `
You are a licensed architectural plan reader. You are given a 2D floor plan and a
top-down aerial photograph of one residential property. Report ONLY what you can
actually see. This is a perception task, not an opinion task.

ORIENTATION
Both images are drawn with NORTH AT THE TOP. Therefore:
  top of image    = North
  bottom of image = South
  right of image  = East
  left of image   = West
Locate the north arrow to confirm before you answer. Read each room's position
relative to the CENTRE of the building footprint to assign its quadrant.

WHAT TO REPORT
1. entranceDirection - which side of the building the FRONT DOOR / main entry sits on.
   Look for a labelled FOYER, ENTRY, or PORCH and the door symbol on the exterior wall.
2. kitchenQuadrant - which quadrant the room labelled KITCHEN occupies.
3. masterBedQuadrant - the quadrant of the largest bedroom, usually labelled
   PRIMARY BEDROOM, MASTER, or OWNER'S SUITE. If no bedroom is drawn on this
   floor, answer "Unknown".
4. mainFloorBedroom - true ONLY if a room on THIS drawn floor is labelled as a
   bedroom (GUEST BEDROOM, BEDROOM n, PRIMARY BEDROOM, or a FLEX ROOM explicitly
   labelled as a bedroom). A study, office or den is NOT a bedroom.
5. mainFloorFullBath - true ONLY if a bathroom on this floor contains a BATHTUB
   or a SHOWER. A room labelled HALF BATH or POWDER ROOM, or one drawn with only
   a toilet and sink, is NOT a full bath. This distinction matters — be strict.
6. yardGrade - from the aerial: "Flat" if the rear lot is level; "Steep Slope" if
   you see embankments, retaining walls, a walk-out basement below deck level, or
   obvious terrain drop; "Gentle Slope" for mild grade.
7. yardPrivacy / yardFenced - is the rear yard enclosed, and how exposed is it to
   neighbours?
8. backsOntoMajorRoad - true if a multi-lane road with visible lane markings
   abuts the front or rear of the lot.

For every finding, cite the specific visual evidence you used, in one sentence.
If an image is missing or unreadable, answer "Unknown" and say so in the evidence.
Never guess from the street address.
`.trim();

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    entranceDirection: { type: Type.STRING, enum: DIRECTIONS },
    entranceEvidence: { type: Type.STRING },
    kitchenQuadrant: { type: Type.STRING, enum: DIRECTIONS },
    kitchenEvidence: { type: Type.STRING },
    masterBedQuadrant: { type: Type.STRING, enum: DIRECTIONS },
    masterBedEvidence: { type: Type.STRING },
    mainFloorBedroom: { type: Type.BOOLEAN },
    mainFloorFullBath: { type: Type.BOOLEAN },
    mainFloorSuiteEvidence: { type: Type.STRING },
    yardGrade: { type: Type.STRING, enum: ['Flat', 'Gentle Slope', 'Steep Slope', 'Unknown'] },
    yardPrivacy: { type: Type.STRING, enum: ['High', 'Medium', 'Low', 'Unknown'] },
    yardFenced: { type: Type.BOOLEAN },
    yardEvidence: { type: Type.STRING },
    backsOntoMajorRoad: { type: Type.BOOLEAN },
    siteEvidence: { type: Type.STRING },
  },
  required: [
    'entranceDirection', 'entranceEvidence', 'kitchenQuadrant', 'kitchenEvidence',
    'masterBedQuadrant', 'masterBedEvidence', 'mainFloorBedroom', 'mainFloorFullBath',
    'mainFloorSuiteEvidence', 'yardGrade', 'yardPrivacy', 'yardFenced', 'yardEvidence',
    'backsOntoMajorRoad', 'siteEvidence',
  ],
};

/** Perception used when the model is unreachable, so the UI degrades instead of dying. */
export const UNKNOWN_PERCEPTION: Perception = {
  entranceDirection: 'Unknown', entranceEvidence: 'Vision unavailable.',
  kitchenQuadrant: 'Unknown', kitchenEvidence: 'Vision unavailable.',
  masterBedQuadrant: 'Unknown', masterBedEvidence: 'Vision unavailable.',
  mainFloorBedroom: false, mainFloorFullBath: false,
  mainFloorSuiteEvidence: 'Vision unavailable.',
  yardGrade: 'Unknown', yardPrivacy: 'Unknown', yardFenced: false,
  yardEvidence: 'Vision unavailable.',
  backsOntoMajorRoad: false, siteEvidence: 'Vision unavailable.',
};

async function loadImage(publicPath: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const buf = await readFile(join(PUBLIC_DIR, publicPath));
    const mimeType = publicPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return { data: buf.toString('base64'), mimeType };
  } catch {
    return null;
  }
}

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Gemini call exceeded ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); },
           (e) => { clearTimeout(t); reject(e); });
  });
}

/**
 * Run one generateContent call through the availability chain.
 *
 * Every model call in the app goes through here. The image and text models both
 * return 503 "high demand" under load often enough that a single-shot call is
 * not safe for anything a user is watching.
 */
export async function callWithFallback(
  buildRequest: (model: string) => Parameters<typeof ai.models.generateContent>[0],
  opts: { rounds?: number; timeoutMs?: number } = {},
): Promise<{ text: string; model: string; ms: number }> {
  const rounds = opts.rounds ?? MAX_ROUNDS;
  const timeout = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  let lastError: Error | null = null;

  for (let round = 1; round <= rounds; round++) {
    for (const model of MODEL_CHAIN) {
      const started = Date.now();
      try {
        const res = await withTimeout(ai.models.generateContent(buildRequest(model)), timeout);
        const text = res.text;
        if (!text) throw new Error('empty response body');
        return { text, model, ms: Date.now() - started };
      } catch (err) {
        lastError = err as Error;
      }
    }
    if (round < rounds) await new Promise((r) => setTimeout(r, 1200 * round));
  }
  throw lastError ?? new Error('all models failed');
}

export interface PerceiveOutcome {
  perception: Perception;
  trace: TraceStep[];
  degraded: boolean;
  /** Which model in the chain actually answered. */
  model?: string;
}

export async function perceiveProperty(listing: PropertyListing): Promise<PerceiveOutcome> {
  const trace: TraceStep[] = [];
  const t0 = Date.now();

  const [floorPlan, aerial] = await Promise.all([
    loadImage(listing.images.floorPlan),
    loadImage(listing.images.aerial),
  ]);

  const loaded = [floorPlan && 'floor plan', aerial && 'aerial'].filter(Boolean);
  trace.push({
    step: 'Load imagery',
    detail: loaded.length
      ? `Attached ${loaded.join(' + ')} to the vision request.`
      : 'No imagery found on disk — run `npm run assets`.',
    ms: Date.now() - t0,
    status: loaded.length === 2 ? 'ok' : loaded.length ? 'degraded' : 'error',
  });

  if (!floorPlan && !aerial) {
    return { perception: { ...UNKNOWN_PERCEPTION }, trace, degraded: true };
  }

  const parts: any[] = [
    { text: `Property: ${listing.address}\nListing remarks: ${listing.listingRemarks}` },
  ];
  if (floorPlan) parts.push({ text: 'IMAGE 1 — 2D FLOOR PLAN:' }, { inlineData: floorPlan });
  if (aerial) parts.push({ text: 'IMAGE 2 — AERIAL SATELLITE VIEW:' }, { inlineData: aerial });

  let lastError: Error | null = null;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    for (const model of MODEL_CHAIN) {
      const started = Date.now();
      try {
        const res = await withTimeout(
          ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: {
              systemInstruction: SYSTEM_PROMPT,
              responseMimeType: 'application/json',
              responseSchema: RESPONSE_SCHEMA,
              // Reading a labelled plan is a lookup task, not a reasoning
              // marathon. Low thinking roughly halves p50 with no measured
              // accuracy loss on the verification set (npm run verify).
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              temperature: 0,
              // Thinking tokens draw from this budget too — 2048 truncated the
              // 15-field response and produced empty bodies.
              maxOutputTokens: 4096,
            },
          }),
          REQUEST_TIMEOUT_MS,
        );

        const text = res.text;
        if (!text) throw new Error('empty response body');
        const perception = PerceptionSchema.parse(JSON.parse(text));

        trace.push({
          step: `Gemini vision pass`,
          detail:
            `${model} read ${loaded.length} image(s) in ${Date.now() - started}ms — ` +
            `entrance=${perception.entranceDirection}, kitchen=${perception.kitchenQuadrant}, ` +
            `main-floor suite=${perception.mainFloorBedroom && perception.mainFloorFullBath}.`,
          ms: Date.now() - started,
          status: model === MODEL ? 'ok' : 'degraded',
        });
        return { perception, trace, degraded: false, model };
      } catch (err) {
        lastError = err as Error;
        trace.push({
          step: `${model} attempt (round ${round})`,
          detail: lastError.message.slice(0, 180),
          ms: Date.now() - started,
          status: 'error',
        });
      }
    }
    if (round < MAX_ROUNDS) await new Promise((r) => setTimeout(r, 1500 * round));
  }

  trace.push({
    step: 'Vision degraded',
    detail:
      `Every model in the chain failed (${lastError?.message?.slice(0, 120)}). ` +
      `Scoring on listing facts only — spatial dimensions will read "Unknown".`,
    ms: 0,
    status: 'degraded',
  });
  return { perception: { ...UNKNOWN_PERCEPTION }, trace, degraded: true };
}
