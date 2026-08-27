'use client';

import { useState } from 'react';
import {
  Moon, Clock, ArrowRight, BellOff, Bell, Loader2, X, CalendarClock,
} from 'lucide-react';
import { SmartImage } from './SmartImage';
import { runAgentNow } from '@/lib/api';
import type { DailyBrief } from '@/types/listing';

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.round(hrs / 24)}d ago`;
};

/**
 * What the agent did while nobody was watching.
 *
 * This is the part that makes it an agent rather than a tool: the run behind
 * this panel is triggered by Cloud Scheduler, not by a person, and the agent
 * decides on its own whether the result is worth surfacing at all. A quiet
 * night is a real outcome, not a failure — so a brief with nothing in it still
 * gets shown, saying so.
 */
export function AgentBrief({
  brief, onDismiss, onRan, onOpenProperty,
}: {
  brief: DailyBrief | null;
  onDismiss: () => void;
  onRan: (b: DailyBrief) => void;
  onOpenProperty?: (id: string) => void;
}) {
  const [running, setRunning] = useState(false);

  const run = async (replay: boolean) => {
    setRunning(true);
    try { onRan(await runAgentNow(replay)); }
    finally { setRunning(false); }
  };

  if (!brief) {
    return (
      <section className="rounded-2xl border border-ink-700 bg-ink-850 p-4">
        <header className="mb-2 flex items-center gap-2">
          <CalendarClock size={15} className="text-ink-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
            Overnight watch
          </h3>
        </header>
        <p className="text-[11.5px] leading-snug text-ink-400">
          Cloud Scheduler runs this agent every morning at 6am. It reads whatever hit
          the market overnight and only wakes you if something clears your bar.
        </p>
        <button
          onClick={() => run(false)}
          disabled={running}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg
                     border border-ink-700 py-2 text-[12px] font-medium text-ink-200
                     hover:border-ink-600 disabled:opacity-50"
        >
          {running
            ? <><Loader2 size={13} className="animate-spin" /> Agent is reading…</>
            : <><Moon size={13} /> Run the overnight cycle now</>}
        </button>
      </section>
    );
  }

  const worth = brief.findings.filter((f) => f.worthTouring);

  return (
    <section className={`animate-rise overflow-hidden rounded-2xl border ${
      brief.notify
        ? 'border-good-500/35 bg-good-500/[0.06]'
        : 'border-ink-700 bg-ink-850'}`}>
      <header className="flex items-start gap-2.5 px-4 pt-4">
        {brief.notify
          ? <Bell size={15} className="mt-0.5 shrink-0 text-good-400" />
          : <BellOff size={15} className="mt-0.5 shrink-0 text-ink-400" />}
        <div className="min-w-0 flex-1">
          <h3 className={`text-sm font-semibold uppercase tracking-wider ${
            brief.notify ? 'text-good-400' : 'text-ink-300'}`}>
            While you were away
          </h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10.5px] text-ink-400">
            <Clock size={9} />
            {ago(brief.runAt)}
            <span>·</span>
            <span>{brief.trigger === 'schedule' ? 'Cloud Scheduler' : 'manual trigger'}</span>
            <span>·</span>
            <span>{brief.analysed} read in {(brief.durationMs / 1000).toFixed(0)}s</span>
          </p>
        </div>
        <button onClick={onDismiss} aria-label="Dismiss"
                className="shrink-0 rounded p-1 text-ink-400 hover:text-ink-200">
          <X size={14} />
        </button>
      </header>

      <p className="px-4 pt-3 text-[12.5px] leading-snug text-ink-200">{brief.summary}</p>

      {brief.findings.length > 0 && (
        <ul className="mt-3 space-y-2 px-4 pb-4">
          {brief.findings.map((f) => (
            <li key={f.propertyId}>
              <button
                onClick={() => onOpenProperty?.(f.propertyId)}
                className={`flex w-full gap-2.5 rounded-lg border p-2 text-left transition-colors
                  ${f.worthTouring
                    ? 'border-good-500/30 bg-good-500/[0.07] hover:border-good-500/50'
                    : 'border-ink-700 bg-ink-900 hover:border-ink-600'}`}
              >
                <SmartImage path={f.thumbnail} alt={f.address}
                            className="h-12 w-12 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12px] font-medium text-ink-200">
                      {f.address.split(',')[0]}
                    </span>
                    <span className={`shrink-0 font-mono text-[12px] font-bold ${
                      f.worthTouring ? 'text-good-400' : 'text-ink-400'}`}>
                      {f.matchScore}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-snug text-ink-400">
                    {f.headline}
                  </p>
                  {f.worthTouring && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-good-400">
                      Worth a tour <ArrowRight size={9} />
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-ink-700/60 px-4 py-2.5">
        <button
          onClick={() => run(true)}
          disabled={running}
          title="Re-run the same overnight cycle, ignoring what the agent has already seen"
          className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-400
                     hover:text-ink-200 disabled:opacity-50"
        >
          {running
            ? <><Loader2 size={10} className="animate-spin" /> running…</>
            : <><Moon size={10} /> replay the cycle</>}
        </button>
      </div>
    </section>
  );
}
