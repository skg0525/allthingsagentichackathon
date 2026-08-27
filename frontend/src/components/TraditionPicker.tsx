'use client';

import { useState } from 'react';
import { Compass, Info } from 'lucide-react';
import type { Tradition, TraditionId } from '@/types/listing';

/**
 * Tradition switcher.
 *
 * The two rule sets genuinely disagree — Vastu treats a south-facing entrance
 * as a flaw, classical Feng Shui treats it as the ideal — so switching visibly
 * re-orders the list. The blurb is not decoration: most viewers have never
 * heard of either system, and an unexplained compass rule reads as arbitrary.
 */
export function TraditionPicker({
  traditions, active, onSelect, busy,
}: {
  traditions: Tradition[];
  active: TraditionId;
  onSelect: (id: TraditionId) => void;
  busy: boolean;
}) {
  const [showInfo, setShowInfo] = useState(false);
  const current = traditions.find((t) => t.id === active);

  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-850 p-4">
      <header className="mb-3 flex items-center gap-2">
        <Compass size={15} className="text-saffron-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
          Directional tradition
        </h3>
        <button
          onClick={() => setShowInfo((v) => !v)}
          aria-label="What is this?"
          className={`ml-auto rounded-md p-1 transition-colors ${
            showInfo ? 'bg-saffron-500/15 text-saffron-400' : 'text-ink-400 hover:text-ink-200'
          }`}
        >
          <Info size={14} />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-2">
        {traditions.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            disabled={busy}
            className={`rounded-lg border px-3 py-2 text-left transition-colors disabled:opacity-50
              ${active === t.id
                ? 'border-saffron-500/50 bg-saffron-500/15'
                : 'border-ink-700 bg-ink-900 hover:border-ink-600'}`}
          >
            <div className={`text-[12.5px] font-semibold ${
              active === t.id ? 'text-saffron-400' : 'text-ink-200'}`}>
              {t.name}
            </div>
            <div className="mt-0.5 text-[10px] leading-tight text-ink-400">{t.origin}</div>
          </button>
        ))}
      </div>

      {showInfo && current && (
        <div className="mt-3 animate-rise space-y-2.5 rounded-lg bg-ink-900 p-3">
          <p className="text-[11.5px] leading-snug text-ink-300">{current.blurb}</p>
          <dl className="space-y-1.5 border-t border-ink-700 pt-2.5">
            {([
              ['entrance', current.elementLabels.entrance],
              ['kitchen', current.elementLabels.kitchen],
              ['master', current.elementLabels.master],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-saffron-400">
                  {label}
                </dt>
                <dd className="text-[11px] leading-snug text-ink-400">{current.notes[key]}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!showInfo && current && (
        <p className="mt-2.5 text-[11px] leading-snug text-ink-400">
          Scoring the compass dimension against{' '}
          <span className="text-ink-200">{current.name}</span>. Switching re-ranks
          every property — the two systems disagree.
        </p>
      )}
    </section>
  );
}
