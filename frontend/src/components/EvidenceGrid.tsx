'use client';

import { Eye, Check, X, AlertTriangle } from 'lucide-react';
import type { Perception } from '@/types/listing';

/**
 * The part a listing portal cannot show you.
 *
 * Each row is a claim the vision model made about the property plus the
 * specific thing it saw in the image. Evidence is displayed verbatim so a
 * buyer can open the floor plan and check the agent's work.
 */
export function EvidenceGrid({ perception }: { perception: Perception }) {
  const rows = [
    {
      label: 'Main entrance',
      value: perception.entranceDirection,
      evidence: perception.entranceEvidence,
      ok: ['East', 'North', 'North-East'].includes(perception.entranceDirection),
      warn: perception.entranceDirection === 'Unknown',
    },
    {
      label: 'Kitchen quadrant',
      value: perception.kitchenQuadrant,
      evidence: perception.kitchenEvidence,
      ok: ['South-East', 'North-West'].includes(perception.kitchenQuadrant),
      warn: perception.kitchenQuadrant === 'Unknown',
    },
    {
      label: 'Primary bedroom',
      value: perception.masterBedQuadrant,
      evidence: perception.masterBedEvidence,
      ok: ['South-West', 'West', 'South'].includes(perception.masterBedQuadrant),
      warn: perception.masterBedQuadrant === 'Unknown',
    },
    {
      label: 'Main-floor bed + full bath',
      value: perception.mainFloorBedroom
        ? perception.mainFloorFullBath ? 'Bedroom + full bath' : 'Bedroom, half bath only'
        : 'None on main floor',
      evidence: perception.mainFloorSuiteEvidence,
      ok: perception.mainFloorBedroom && perception.mainFloorFullBath,
      warn: false,
    },
    {
      label: 'Backyard',
      value: `${perception.yardGrade} · ${perception.yardPrivacy} privacy · ${perception.yardFenced ? 'fenced' : 'unfenced'}`,
      evidence: perception.yardEvidence,
      ok: perception.yardGrade === 'Flat' && perception.yardPrivacy !== 'Low',
      warn: perception.yardGrade === 'Unknown',
    },
    {
      label: 'Road exposure',
      value: perception.backsOntoMajorRoad ? 'Abuts a major road' : 'No major road adjacency',
      evidence: perception.siteEvidence,
      ok: !perception.backsOntoMajorRoad,
      warn: false,
    },
  ];

  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
      <header className="mb-4 flex items-center gap-2">
        <Eye size={15} className="text-brand-400" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
          What the agent saw
        </h3>
        <span className="ml-auto font-mono text-[11px] text-ink-400">
          read from floor plan + aerial
        </span>
      </header>

      <div className="divide-y divide-ink-700/60">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span className="mt-0.5 shrink-0">
              {r.warn
                ? <AlertTriangle size={15} className="text-ink-400" />
                : r.ok
                  ? <Check size={15} className="text-good-400" />
                  : <X size={15} className="text-bad-400" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-[13px] text-ink-400">{r.label}</span>
                <span className={`text-[13px] font-semibold ${
                  r.warn ? 'text-ink-300' : r.ok ? 'text-good-400' : 'text-bad-400'}`}>
                  {r.value}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] italic leading-snug text-ink-400">
                &ldquo;{r.evidence}&rdquo;
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
