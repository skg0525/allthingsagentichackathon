/**
 * Free text in, weight deltas out.
 *
 * "I don't want anything backing onto a main road" has to become an actual
 * change to the yard weight, or the feedback loop is theatre. Gemini does the
 * interpretation; memoryManager does the clamping and persistence.
 */
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { DimensionKey, DIMENSION_LABELS } from '../types/preferences.js';
import { MODEL } from './geminiEvaluator.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' });

const KEYS: DimensionKey[] = [
  'vastu', 'mainFloorSuite', 'yard', 'commute',
  'walkability', 'maintenance', 'community',
];

export interface Interpretation {
  adjustments: { dimension: DimensionKey; delta: number }[];
  note: string;
  degraded: boolean;
}

const SYSTEM = `
You tune a home-buyer's preference model from their own words.

The seven dimensions you may adjust:
${KEYS.map((k) => `  ${k} — ${DIMENSION_LABELS[k]}`).join('\n')}

Given a thumbs up or down on a property plus the buyer's free-text critique,
return the weight adjustments that best capture what they just told you.

Rules:
- delta is between -0.25 and +0.25. Most feedback should move ONE or TWO
  dimensions. Do not touch dimensions the critique says nothing about.
- A thumbs DOWN on a specific flaw RAISES the weight of that dimension —
  they are telling you it matters more than you assumed.
- A thumbs UP on a specific strength also RAISES that dimension's weight.
- Vague praise or complaint with no specific cause returns an empty list.
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
    note: { type: Type.STRING },
  },
  required: ['adjustments', 'note'],
};

export async function interpretFeedback(
  action: 'thumbs_up' | 'thumbs_down',
  critique: string,
  propertyContext: string,
): Promise<Interpretation> {
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
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
        maxOutputTokens: 1024,
      },
    });

    const parsed = JSON.parse(res.text ?? '{}');
    const adjustments = (parsed.adjustments ?? [])
      .filter((a: any) => KEYS.includes(a.dimension) && typeof a.delta === 'number')
      .map((a: any) => ({
        dimension: a.dimension as DimensionKey,
        delta: Math.max(-0.25, Math.min(0.25, a.delta)),
      }));

    return {
      adjustments,
      note: parsed.note || 'Noted for future scans.',
      degraded: false,
    };
  } catch (err) {
    console.warn('[feedback] interpretation failed:', (err as Error).message);
    // Still record the critique verbatim — losing the buyer's words is worse
    // than losing the weight change.
    return { adjustments: [], note: critique.slice(0, 200), degraded: true };
  }
}
