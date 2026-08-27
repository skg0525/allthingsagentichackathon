'use client';

import { Compass, BedDouble, Trees, Car, Footprints, Wrench, Users } from 'lucide-react';
import type { DimensionScore, DimensionKey, Verdict } from '@/types/listing';

const ICONS: Record<DimensionKey, typeof Compass> = {
  vastu: Compass,
  mainFloorSuite: BedDouble,
  yard: Trees,
  commute: Car,
  walkability: Footprints,
  maintenance: Wrench,
  community: Users,
};

const TONE: Record<Verdict, { bar: string; text: string }> = {
  ideal: { bar: 'var(--color-good-400)', text: 'text-good-400' },
  acceptable: { bar: 'var(--color-brand-400)', text: 'text-brand-400' },
  concern: { bar: 'var(--color-warn-400)', text: 'text-warn-400' },
  dealbreaker: { bar: 'var(--color-bad-400)', text: 'text-bad-400' },
};

/**
 * The score breakdown. Every bar shows both the raw dimension score and the
 * weight the buyer's profile puts on it, because a 40/100 on something they
 * barely care about is a very different fact from a 40 on a must-have.
 */
export function DimensionBars({ dimensions }: { dimensions: DimensionScore[] }) {
  const ordered = [...dimensions].sort((a, b) => b.weight - a.weight);

  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
      <header className="mb-4 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
          Score breakdown
        </h3>
        <span className="font-mono text-[11px] text-ink-400">score × your weight</span>
      </header>

      <div className="space-y-3.5">
        {ordered.map((d) => {
          const Icon = ICONS[d.key];
          const tone = TONE[d.verdict];
          return (
            <div key={d.key}>
              <div className="flex items-center gap-2">
                <Icon size={14} className={tone.text} />
                <span className="text-[13px] font-medium text-ink-200">{d.label}</span>
                <span className="ml-auto flex items-baseline gap-2 font-mono text-[12px]">
                  <span className={`font-bold ${tone.text}`}>{d.score}</span>
                  <span className="text-ink-400">×{d.weight.toFixed(2)}</span>
                </span>
              </div>

              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${d.score}%`,
                    background: tone.bar,
                    // Weight fades the bar: low-priority dimensions recede visually.
                    opacity: 0.35 + d.weight * 0.65,
                  }}
                />
              </div>

              <p className="mt-1 text-[11.5px] leading-snug text-ink-400">{d.reason}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
