'use client';

import { useEffect, useState } from 'react';
import {
  ThumbsUp, ThumbsDown, Send, Loader2, BrainCircuit,
  ArrowRight, ChevronUp, X,
} from 'lucide-react';
import { sendFeedback, type FeedbackResponse } from '@/lib/api';
import type { PreferenceProfile } from '@/types/listing';

const SUGGESTIONS = [
  'It fronts a four-lane road. With a toddler that\'s an absolute dealbreaker, and the yard has no real fence.',
  'The backyard slope makes it unusable for our kid.',
  'I care more about walking to the train than shaving minutes off the drive.',
  'This ground-floor suite is exactly what we need for my parents.',
];

/**
 * Always-reachable feedback.
 *
 * This used to live at the bottom of the inspector — about 3,200px down a pane
 * that shows ~330px at a time. The single most important interaction in the
 * product was ten screens below the fold. Docking it means it is on screen for
 * every property, and it never scrolls away mid-demo.
 */
export function FeedbackDock({
  propertyId, propertyLabel, onProfileChange,
}: {
  propertyId: string;
  propertyLabel: string;
  onProfileChange: (p: PreferenceProfile) => void;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [critique, setCritique] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Switching property resets the form but keeps the last thing it learned
  // visible, so the re-rank and its cause stay on screen together.
  useEffect(() => {
    setAction(null);
    setCritique('');
    setError(null);
  }, [propertyId]);

  const submit = async () => {
    if (!action || !critique.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await sendFeedback(propertyId, action, critique.trim());
      setResult(res);
      onProfileChange(res.profile);
      setCritique('');
      setAction(null);
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticky bottom-0 z-30 border-t border-ink-700 bg-ink-900/95 backdrop-blur-md">
      {/* what it last learned — stays visible after the panel closes */}
      {result && (
        <div className="animate-rise border-b border-saffron-500/20 bg-saffron-500/[0.07] px-5 py-3">
          <div className="mx-auto flex max-w-5xl items-start gap-3">
            <BrainCircuit size={15} className="mt-0.5 shrink-0 text-saffron-400" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-saffron-400">{result.note}</p>
              {result.changes.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {result.changes.map((c) => (
                    <span key={c.dimension} className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-ink-300">{c.dimension}</span>
                      <span className="text-ink-400">{c.from.toFixed(2)}</span>
                      <ArrowRight size={10} className="text-saffron-400" />
                      <span className={`font-bold ${c.to > c.from ? 'text-good-400' : 'text-bad-400'}`}>
                        {c.to.toFixed(2)}
                      </span>
                    </span>
                  ))}
                  <span className="font-mono text-[10.5px] text-ink-400">
                    profile v{result.profile.version} · all properties re-ranked
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setResult(null)}
              className="shrink-0 rounded p-1 text-ink-400 hover:text-ink-200"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-ink-800/60"
        >
          <BrainCircuit size={16} className="shrink-0 text-saffron-400" />
          <span className="text-[13px] font-medium text-ink-200">Teach the agent</span>
          <span className="truncate text-[12px] text-ink-400">
            — tell it what you think of {propertyLabel}, in your own words
          </span>
          <ChevronUp size={15} className="ml-auto shrink-0 text-ink-400" />
        </button>
      ) : (
        <div className="animate-rise mx-auto max-w-5xl px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <BrainCircuit size={15} className="text-saffron-400" />
            <span className="text-[13px] font-medium text-ink-200">
              What do you think of {propertyLabel}?
            </span>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto rounded p-1 text-ink-400 hover:text-ink-200"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          <div className="flex gap-3">
            <div className="flex shrink-0 flex-col gap-2">
              {(['thumbs_up', 'thumbs_down'] as const).map((a) => {
                const Icon = a === 'thumbs_up' ? ThumbsUp : ThumbsDown;
                const on = action === a;
                return (
                  <button
                    key={a}
                    onClick={() => setAction(on ? null : a)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition-colors
                      ${on
                        ? a === 'thumbs_up'
                          ? 'border-good-500/50 bg-good-500/15 text-good-400'
                          : 'border-bad-500/50 bg-bad-500/15 text-bad-400'
                        : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600'}`}
                  >
                    <Icon size={14} />
                    {a === 'thumbs_up' ? 'Works' : 'Not for us'}
                  </button>
                );
              })}
            </div>

            <div className="min-w-0 flex-1">
              <textarea
                rows={3}
                value={critique}
                onChange={(e) => setCritique(e.target.value)}
                placeholder="e.g. it fronts a four-lane road — with a toddler that's a dealbreaker"
                className="w-full resize-none rounded-lg border border-ink-700 bg-ink-950 p-3
                           text-[13px] text-ink-200 placeholder:text-ink-400
                           focus:border-saffron-500/60 focus:outline-none focus:ring-1 focus:ring-saffron-500/40"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => setCritique(sug)}
                    title={sug}
                    className="max-w-[280px] truncate rounded-full border border-ink-700 px-2.5 py-1
                               text-[11px] text-ink-400 hover:border-ink-600 hover:text-ink-200"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={submit}
              disabled={!action || !critique.trim() || busy}
              className="flex shrink-0 items-center gap-2 self-start rounded-lg bg-saffron-500
                         px-4 py-2.5 text-[13px] font-semibold text-ink-950
                         hover:bg-saffron-400 disabled:opacity-40"
            >
              {busy
                ? <><Loader2 size={15} className="animate-spin" /> Learning…</>
                : <><Send size={15} /> Teach</>}
            </button>
          </div>

          {!action && critique.trim() && (
            <p className="mt-2 text-[11.5px] text-warn-400">
              Pick 👍 or 👎 first — the agent needs to know which way to move.
            </p>
          )}
          {error && (
            <p className="mt-2 text-[11.5px] text-bad-400">Could not save feedback: {error}</p>
          )}
        </div>
      )}
    </div>
  );
}
