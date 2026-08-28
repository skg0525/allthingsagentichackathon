/**
 * Free text in, weight deltas out.
 *
 * "I don't want anything backing onto a main road" has to become an actual
 * change to the yard weight, or the feedback loop is theatre. Gemini does the
 * interpretation; memoryManager does the clamping and persistence.
 */
import { Type, ThinkingLevel } from '@google/genai';
import { DimensionKey, DIMENSION_LABELS } from '../types/preferences.js';
import { callWithFallback } from './geminiEvaluator.js';

const KEYS: DimensionKey[] = [
  'vastu', 'mainFloorSuite', 'yard', 'commute',
  'walkability', 'maintenance', 'community',
];

/** Constraints feedback is allowed to switch on. Each one caps a score outright. */
export type ConstraintKey =
  | 'mainFloorBedroomRequired' | 'mainFloorFullBathRequired'
  | 'flatYardRequired' | 'noMajorRoadAdjacency' | 'strictEntrance';

const CONSTRAINTS: ConstraintKey[] = [
  'mainFloorBedroomRequired', 'mainFloorFullBathRequired',
  'flatYardRequired', 'noMajorRoadAdjacency', 'strictEntrance',
];

export interface Interpretation {
  adjustments: { dimension: DimensionKey; delta: number }[];
  constraints: ConstraintKey[];
  note: string;
  degraded: boolean;
}

const SYSTEM = `
You tune a home-buyer's preference model from their own words.

The seven dimensions you may adjust:
${KEYS.map((k) => `  ${k} — ${DIMENSION_LABELS[k]}`).join('\n')}

You must decide between two different things the buyer might be saying.

**A preference** — "this matters more to me than you thought". Return a weight
adjustment. delta between -0.4 and +0.4. Most feedback moves ONE or TWO
dimensions; leave the rest alone.

**A dealbreaker** — "a house with this is disqualified, full stop". Return the
matching constraint in the constraints list. Only do this when the language is
genuinely absolute: "dealbreaker", "non-negotiable", "never", "absolutely not",
"won't even look at", "rules it out". A constraint caps the score of every
property with that flaw, so do not set one for ordinary dislike.

Available constraints:
  noMajorRoadAdjacency      — fronting or backing onto a busy road
  flatYardRequired          — a sloped yard is unacceptable
  mainFloorBedroomRequired  — must have a bedroom on the main floor
  mainFloorFullBathRequired — that floor must have a full bath
  strictEntrance            — entrance direction the tradition flags is unacceptable

Rules:
- A thumbs DOWN on a specific flaw RAISES the weight of that dimension — they
  are telling you it matters more than you assumed.
- A thumbs UP on a specific strength also RAISES that dimension's weight.
- Vague praise or complaint with no specific cause returns empty lists.
- Set a constraint AND a weight adjustment when the critique warrants both.
- "note" is one short sentence, written back to the buyer in second person,
  stating what you learned. e.g. "Backyard privacy now weighs more heavily
  than commute time in your ranking."
`.trim();

const SCHEMA = {
  type: Type.OBJECT,
  properties: {
    adjustments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          dimension: { type: Type.STRING, enum: KEYS },
          delta: { type: Type.NUMBER },
        },
        required: ['dimension', 'delta'],
      },
    },
    constraints: { type: Type.ARRAY, items: { type: Type.STRING, enum: CONSTRAINTS } },
    note: { type: Type.STRING },
  },
  required: ['adjustments', 'constraints', 'note'],
};

export async function interpretFeedback(
  action: 'thumbs_up' | 'thumbs_down',
  critique: string,
  propertyContext: string,
): Promise<Interpretation> {
  try {
    // The last raw call in the codebase used to live here, so a 503 silently
    // turned the feedback loop into a no-op that echoed the critique back.
    const { text } = await callWithFallback((model) => ({
      model,
      contents: [{
        role: 'user',
        parts: [{
          text: `Property under review: ${propertyContext}\n` +
                `Buyer reaction: ${action === 'thumbs_up' ? 'THUMBS UP' : 'THUMBS DOWN'}\n` +
                `Buyer's words: "${critique}"`,
        }],
      }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: 'application/json',
        responseSchema: SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    }));

    const parsed = JSON.parse(text);
    const adjustments = (parsed.adjustments ?? [])
      .filter((a: any) => KEYS.includes(a.dimension) && typeof a.delta === 'number')
      .map((a: any) => ({
        dimension: a.dimension as DimensionKey,
        delta: Math.max(-0.4, Math.min(0.4, a.delta)),
      }));

    const constraints = (parsed.constraints ?? [])
      .filter((c: string) => CONSTRAINTS.includes(c as ConstraintKey)) as ConstraintKey[];

    return {
      adjustments,
      constraints,
      note: parsed.note || 'Noted for future scans.',
      degraded: false,
    };
  } catch (err) {
    console.warn('[feedback] interpretation failed:', (err as Error).message);
    // Still record the critique verbatim — losing the buyer's words is worse
    // than losing the weight change.
    return { adjustments: [], constraints: [], note: critique.slice(0, 200), degraded: true };
  }
}
