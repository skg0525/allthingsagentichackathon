'use client';

import { Radar, Loader2, ArrowRight, Check, AlertTriangle, FileImage } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { TraditionPicker } from './TraditionPicker';
import { AgentBrief } from './AgentBrief';
import type {
  PropertyListing, PreferenceProfile, Tradition, TraditionId, DimensionKey, DailyBrief,
} from '@/types/listing';

const PRIORITY_LABEL: Partial<Record<DimensionKey, string>> = {
  mainFloorSuite: 'Main-floor bedroom + full bath',
  yard: 'Backyard & site',
  vastu: 'Directional compliance',
  commute: 'Commute',
  walkability: 'Walkability & transit',
  community: 'Community & safety',
  maintenance: 'Age & maintenance',
};

/**
 * The opening screen.
 *
 * Before this existed the app booted straight into the three-pane console with
 * a property auto-selected — so a floor plan sat in the inspector with no score
 * beside it and no explanation of why it was there. It read as a listing left
 * hanging. Now the brief is centred and the console does not appear until the
 * agent has something to put in it.
 */
export function SetupStage({
  listings, profile, traditions, isScanning, progress, onAnalyze, onSelectTradition,
  error, brief, onBriefDismiss, onBriefRan, onOpenUpload, onOpenProperty,
}: {
  listings: PropertyListing[];
  profile: PreferenceProfile;
  traditions: Tradition[];
  isScanning: boolean;
  progress: { done: number; total: number };
  onAnalyze: () => void;
  onSelectTradition: (id: TraditionId) => void;
  error?: string | null;
  brief: DailyBrief | null;
  onBriefDismiss: () => void;
  onBriefRan: (b: DailyBrief) => void;
  onOpenUpload: () => void;
  /** Clicking a brief row jumps straight into that property. */
  onOpenProperty: (id: string) => void;
}) {
  const tradition = traditions.find((t) => t.id === profile.tradition);

  const topPriorities = (Object.entries(profile.weights) as [DimensionKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => (k === 'vastu' && tradition ? tradition.name : PRIORITY_LABEL[k] ?? k));

  const hc = profile.hardConstraints;
  const nonNegotiables = [
    hc.mainFloorBedroomRequired && 'A bedroom on the main floor',
    hc.mainFloorFullBathRequired && 'A full bath on that floor',
    hc.strictEntrance && tradition &&
      `No ${tradition.flaggedEntrances.join(' or ')}-facing entrance`,
    hc.flatYardRequired && 'A flat backyard',
    `Under ${hc.maxCommuteMinutes} minutes to work`,
  ].filter(Boolean) as string[];

  return (
    <div className="relative z-10 flex min-h-screen flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-12">

        {/* ---------- the pitch ---------- */}
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-700
                           bg-ink-850 px-3 py-1 font-mono text-[11px] text-ink-300">
            <Radar size={12} className="text-brand-400" />
            VastuNest · autonomous home-buying agent
          </span>

          <h1 className="mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            The things that rule out a house
            <br />
            <span className="text-ink-400">aren&apos;t filters on any listing site.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-300">
            Which way the front door faces. Whether the ground-floor bathroom actually
            has a tub. Whether the backyard is flat or drops away. Whether it backs onto
            a four-lane road. None of it is in the listing data — but all of it is in the
            floor plan and the satellite image.
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-[14px] font-medium text-brand-400">
            So the agent reads those instead.
          </p>
        </div>

        {/* ---------- what the agent did while you were away ---------- */}
        {brief && brief.notify && (
          <div className="mx-auto mt-8 max-w-2xl">
            <AgentBrief
              brief={brief}
              onDismiss={onBriefDismiss}
              onRan={onBriefRan}
              onOpenProperty={onOpenProperty}
            />
          </div>
        )}

        {/* ---------- your brief ---------- */}
        <div className="mt-10 grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
              Your brief
            </h2>

            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Top priorities</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {topPriorities.map((p) => (
                  <span key={p} className="rounded-full bg-brand-500/12 px-2.5 py-1
                                           text-[12px] font-medium text-brand-400 ring-1 ring-brand-500/25">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-ink-400">Non-negotiable</p>
              <ul className="mt-2 space-y-1.5">
                {nonNegotiables.map((n) => (
                  <li key={n} className="flex items-start gap-2 text-[13px] text-ink-200">
                    <Check size={14} className="mt-0.5 shrink-0 text-good-400" />
                    {n}
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-4 border-t border-ink-700 pt-3 text-[11.5px] leading-snug text-ink-400">
              You can change any of this at any time — the agent re-ranks instantly, and
              it learns more every time you tell it what you think.
            </p>
          </div>

          {traditions.length > 0 && (
            <TraditionPicker
              traditions={traditions}
              active={profile.tradition}
              onSelect={onSelectTradition}
              busy={isScanning}
            />
          )}
        </div>

        {/* ---------- the candidates, unanalysed ---------- */}
        <div className="mt-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
              {listings.length} candidates
            </h2>
            <span className="font-mono text-[11px] text-ink-400">nothing scored yet</span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-8">
            {listings.map((l) => (
              <div key={l.id} className="group">
                <SmartImage
                  path={l.images.exterior}
                  alt={l.address}
                  className={`aspect-square rounded-lg transition-opacity ${
                    isScanning ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'
                  }`}
                />
                <p className="mt-1.5 truncate font-mono text-[10.5px] text-ink-400">
                  ${(l.price / 1000).toFixed(0)}k
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- the CTA ---------- */}
        <div className="mt-9 flex flex-col items-center">
          <button
            onClick={onAnalyze}
            disabled={isScanning || !listings.length}
            className="pulse-ring flex items-center gap-2.5 rounded-xl bg-brand-600 px-7 py-3.5
                       text-[15px] font-semibold text-ink-950 transition-colors
                       hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isScanning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Reading floor plans… {progress.done}/{progress.total}
              </>
            ) : (
              <>
                <Radar size={18} />
                Analyze {listings.length} properties
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="mt-3 max-w-md text-center text-[12px] leading-snug text-ink-400">
            {isScanning
              ? 'Gemini is reading each floor plan and aerial image. Results appear as they land.'
              : 'Nothing is precomputed. The agent has not looked at any of these yet.'}
          </p>

          <button
            onClick={onOpenUpload}
            className="mt-4 flex items-center gap-1.5 text-[12px] text-ink-400
                       underline-offset-4 hover:text-ink-200 hover:underline"
          >
            <FileImage size={13} />
            …or drop in a floor plan of your own
          </button>

          {error && (
            <div className="mt-4 flex max-w-md items-start gap-2 rounded-xl border
                            border-bad-500/30 bg-bad-500/[0.07] px-4 py-3 text-left">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-bad-400" />
              <p className="text-[12.5px] leading-snug text-ink-200">{error}</p>
            </div>
          )}

          {isScanning && progress.total > 0 && (
            <div className="mt-4 h-1 w-full max-w-md overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full bg-brand-500 transition-all duration-500"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
