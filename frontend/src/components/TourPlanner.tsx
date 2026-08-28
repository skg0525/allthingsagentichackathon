'use client';

import { useState } from 'react';
import {
  Route, Loader2, X, ExternalLink, Clock, MapPin, Eye, Copy, Check, AlertTriangle,
} from 'lucide-react';
import { planTour } from '@/lib/api';
import type { PropertyListing, AuditResult, TourPlan } from '@/types/listing';

/**
 * Tour planning — the agent doing rather than reporting.
 *
 * Everything else here answers "which of these is worth my time?". This answers
 * "so go and see them", and hands over something you can actually drive: an
 * order chosen by geography, realistic time at each door, the one thing worth
 * verifying in person given what the agent already found in the plans, and a
 * Google Maps route with every stop as a waypoint.
 */
export function TourPlanner({
  listings, audits, selected, onToggle, onClear, onClose,
}: {
  listings: PropertyListing[];
  audits: Record<string, AuditResult>;
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<TourPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [start, setStart] = useState('Midtown Atlanta, GA');
  const [time, setTime] = useState('10:00');

  const build = async () => {
    setBusy(true);
    setError(null);
    try {
      setPlan(await planTour(selected, start, time));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(plan.mapsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the link is visible anyway */ }
  };

  const ranked = [...listings]
    .filter((l) => audits[l.id])
    .sort((a, b) => (audits[b.id]?.matchScore ?? 0) - (audits[a.id]?.matchScore ?? 0));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                 bg-ink-950/90 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="my-auto w-full max-w-3xl rounded-2xl border border-ink-700 bg-ink-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-1 flex items-center gap-2">
          <Route size={16} className="text-good-400" />
          <h2 className="text-[15px] font-semibold text-white">Plan a tour</h2>
          <button onClick={onClose} aria-label="Close"
                  className="ml-auto rounded p-1 text-ink-400 hover:text-ink-200">
            <X size={16} />
          </button>
        </header>
        <p className="mb-5 text-[12.5px] text-ink-400">
          Pick the ones worth seeing. The agent orders them by geography, allocates
          time, and tells you what to verify at each door.
        </p>

        {!plan && (
          <>
            <div className="mb-4 max-h-64 space-y-1.5 overflow-y-auto">
              {ranked.map((l) => {
                const on = selected.includes(l.id);
                const a = audits[l.id]!;
                return (
                  <button
                    key={l.id}
                    onClick={() => onToggle(l.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors
                      ${on
                        ? 'border-good-500/50 bg-good-500/10'
                        : 'border-ink-700 bg-ink-850 hover:border-ink-600'}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border
                      ${on ? 'border-good-400 bg-good-500' : 'border-ink-600'}`}>
                      {on && <Check size={11} strokeWidth={3} className="text-ink-950" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-200">
                      {l.address.split(',')[0]}
                    </span>
                    <span className="shrink-0 font-mono text-[12px] font-bold text-ink-300">
                      {a.matchScore}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_120px]">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-400">
                  Starting from
                </span>
                <input
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2
                             text-[13px] text-ink-200 focus:border-good-500/60 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-400">
                  Start time
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2
                             font-mono text-[13px] text-ink-200 focus:border-good-500/60 focus:outline-none"
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={build}
                disabled={!selected.length || busy}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-good-500
                           py-2.5 text-[13px] font-semibold text-ink-950
                           hover:bg-good-400 disabled:opacity-40"
              >
                {busy
                  ? <><Loader2 size={15} className="animate-spin" /> Planning the route…</>
                  : <><Route size={15} /> Plan {selected.length || ''} stop{selected.length === 1 ? '' : 's'}</>}
              </button>
              {selected.length > 0 && (
                <button onClick={onClear}
                        className="rounded-lg border border-ink-700 px-3 py-2.5 text-[12px] text-ink-400 hover:text-ink-200">
                  Clear
                </button>
              )}
            </div>
          </>
        )}

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-bad-500/10 px-3 py-2
                        text-[12.5px] text-bad-400 ring-1 ring-bad-500/25">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
          </p>
        )}

        {plan && (
          <div className="animate-rise">
            <p className="mb-4 rounded-xl border border-good-500/25 bg-good-500/[0.07] p-4
                          text-[13px] leading-relaxed text-ink-200">
              {plan.summary}
            </p>

            <ol className="mb-5 space-y-2.5">
              {plan.stops.map((s) => (
                <li key={s.propertyId}
                    className="rounded-xl border border-ink-700 bg-ink-850 p-3.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full
                                     bg-good-500/20 font-mono text-[11px] font-bold text-good-400">
                      {s.order}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink-200">
                      {s.address.split(',')[0]}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-400">
                      {s.matchScore}/100
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-7
                                  font-mono text-[11px] text-ink-400">
                    <span className="flex items-center gap-1"><Clock size={10} /> {s.arriveAt}</span>
                    <span>{s.minutesOnSite} min on site</span>
                  </div>
                  <p className="mt-1.5 flex gap-1.5 pl-7 text-[12px] leading-snug text-saffron-400">
                    <Eye size={12} className="mt-0.5 shrink-0" />
                    {s.whatToCheck}
                  </p>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              <a
                href={plan.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600
                           py-2.5 text-[13px] font-semibold text-ink-950 hover:bg-brand-500"
              >
                <MapPin size={15} /> Open the route in Google Maps
                <ExternalLink size={13} />
              </a>
              <button
                onClick={copy}
                title="Copy the link — open it on your phone to navigate"
                className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-2.5
                           text-[12px] text-ink-300 hover:border-ink-600 hover:text-white"
              >
                {copied ? <><Check size={13} className="text-good-400" /> Copied</> : <><Copy size={13} /> Copy link</>}
              </button>
              <button
                onClick={() => setPlan(null)}
                className="rounded-lg border border-ink-700 px-3 py-2.5 text-[12px] text-ink-400 hover:text-ink-200"
              >
                Change stops
              </button>
            </div>

            <p className="mt-3 text-center font-mono text-[10.5px] text-ink-400">
              {plan.stops.length} stops · about {(plan.totalMinutes / 60).toFixed(1)} hours including driving
              {plan.degraded && ' · route optimisation degraded'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
