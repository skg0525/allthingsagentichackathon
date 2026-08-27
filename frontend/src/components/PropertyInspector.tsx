'use client';

import {
  Bed, Bath, Ruler, Calendar, Trees, Car, Train, GraduationCap,
  ShieldCheck, AlertTriangle, Check, Compass, Loader2,
} from 'lucide-react';
import { MediaViewer } from './MediaViewer';
import { ScoreRing } from './ScoreRing';
import { DimensionBars } from './DimensionBars';
import { EvidenceGrid } from './EvidenceGrid';
import { AgentTrace } from './AgentTrace';
import type { AuditResult, PropertyListing, PreferenceProfile } from '@/types/listing';

function Fact({ icon: Icon, label, value }: {
  icon: typeof Bed; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2">
      <Icon size={14} className="text-ink-400 shrink-0" />
      <div className="min-w-0">
        <div className="truncate font-mono text-[12.5px] font-semibold text-ink-200">{value}</div>
        <div className="truncate text-[10px] uppercase tracking-wide text-ink-400">{label}</div>
      </div>
    </div>
  );
}

export function PropertyInspector({
  listing, audit, isPending, profile,
}: {
  listing: PropertyListing;
  audit?: AuditResult;
  isPending: boolean;
  profile: PreferenceProfile;
}) {
  const n = listing.neighborhood;
  // The trip they make most days is the one worth putting in the fact strip.
  const primaryCommute = listing.commutes.reduce((a, b) => (a.daysPerWeek > b.daysPerWeek ? a : b));

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-6 pb-8">

        {/* ---------- header ---------- */}
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              {listing.address.split(',')[0]}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-400">
              {listing.address.split(',').slice(1).join(',').trim()}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-2xl font-bold text-brand-400">
                ${listing.price.toLocaleString()}
              </span>
              <span className="font-mono text-[12px] text-ink-400">
                ${Math.round(listing.price / listing.sqft)}/sqft
                {listing.hoaMonthly > 0 && ` · $${listing.hoaMonthly}/mo HOA`}
              </span>
            </div>
          </div>

          {audit ? (
            <ScoreRing score={audit.matchScore} />
          ) : (
            <div className="flex h-[108px] w-[108px] items-center justify-center rounded-full
                            border-8 border-ink-700">
              {isPending
                ? <Loader2 size={26} className="animate-spin text-brand-400" />
                : <Compass size={26} className="text-ink-600" />}
            </div>
          )}
        </header>

        {/* ---------- hard facts (from the listing, never invented) ---------- */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-6">
          <Fact icon={Bed} label="beds" value={`${listing.beds}`} />
          <Fact icon={Bath} label="baths" value={`${listing.baths}${listing.halfBaths ? `.${listing.halfBaths}` : ''}`} />
          <Fact icon={Ruler} label="sqft" value={listing.sqft.toLocaleString()} />
          <Fact icon={Calendar} label="built" value={`${listing.yearBuilt}`} />
          <Fact icon={Trees} label="lot" value={`${listing.lotSizeAcres} ac`} />
          <Fact icon={Car} label="daily commute" value={`${primaryCommute.minutes} min`} />
        </div>

        {/* ---------- agent summary ---------- */}
        {audit && (
          <div className="animate-rise rounded-2xl border border-brand-500/25 bg-brand-500/[0.06] p-5">
            <p className="text-[14px] leading-relaxed text-ink-200">{audit.summary}</p>
          </div>
        )}

        {audit && audit.redFlags.length > 0 && (
          <div className="animate-rise rounded-2xl border border-bad-500/30 bg-bad-500/[0.07] p-5">
            <header className="mb-2.5 flex items-center gap-2">
              <AlertTriangle size={15} className="text-bad-400" />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-bad-400">
                Hard-constraint flags
              </h3>
            </header>
            <ul className="space-y-1.5">
              {audit.redFlags.map((f, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-ink-200">
                  <span className="text-bad-400">•</span>{f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ---------- imagery ---------- */}
        <MediaViewer listing={listing} perception={audit?.perception} />

        {isPending && !audit && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-ink-700
                          bg-ink-850 py-8 text-[13px] text-ink-400">
            <Loader2 size={16} className="animate-spin text-brand-400" />
            Gemini is reading the floor plan and the aerial…
          </div>
        )}

        {audit && (
          <>
            <EvidenceGrid perception={audit.perception} />

            <div className="grid gap-5 lg:grid-cols-2">
              <DimensionBars dimensions={audit.dimensions} />

              <div className="space-y-5">
                {/* neighbourhood facts */}
                <section className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-300">
                    Neighbourhood
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Fact icon={Train} label={n.nearestRailStation.replace(' MARTA', '')}
                          value={`${n.nearestRailMinutesWalk} min walk`} />
                    <Fact icon={GraduationCap} label="schools" value={`${n.schoolRating}/10`} />
                    <Fact icon={ShieldCheck} label="vs metro crime"
                          value={`${Math.round(n.crimeIndexVsMetro * 100)}%`} />
                    <Fact icon={Compass} label="walk score" value={`${n.walkScore}`} />
                  </div>
                  <div className="mt-3 rounded-lg bg-ink-900 px-3 py-2.5">
                    <div className="flex justify-between text-[11.5px]">
                      <span className="text-ink-400">Diversity index</span>
                      <span className="font-mono text-ink-200">{n.diversityIndex.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[11.5px]">
                      <span className="text-ink-400">South Asian population</span>
                      <span className="font-mono text-ink-200">{n.southAsianPopulationPct}%</span>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {listing.commutes.map((c) => (
                      <div key={c.label} className="flex justify-between text-[11.5px]">
                        <span className="text-ink-400">
                          {c.label} <span className="text-ink-600">{c.daysPerWeek}×/wk</span>
                        </span>
                        <span className={`font-mono ${
                          c.minutes > profile.hardConstraints.maxCommuteMinutes
                            ? 'text-bad-400' : 'text-good-400'}`}>
                          {c.minutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* pros / cons */}
                <section className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-300">
                    Trade-offs
                  </h3>
                  <ul className="space-y-2">
                    {audit.pros.map((p, i) => (
                      <li key={`p${i}`} className="flex gap-2 text-[12.5px] leading-snug text-ink-200">
                        <Check size={14} className="mt-0.5 shrink-0 text-good-400" />
                        <span>{p}</span>
                      </li>
                    ))}
                    {audit.cons.map((c, i) => (
                      <li key={`c${i}`} className="flex gap-2 text-[12.5px] leading-snug text-ink-300">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn-400" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <AgentTrace trace={audit.trace} totalMs={audit.totalMs} cached={audit.cached} />

            <p className="pt-2 text-center text-[11px] text-ink-400">
              Listing remarks: {listing.listingRemarks}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
