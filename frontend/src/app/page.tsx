'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Radar, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/Header';
import { PreferencePanel } from '@/components/PreferencePanel';
import { ListingCard } from '@/components/ListingCard';
import { PropertyInspector } from '@/components/PropertyInspector';
import { FeedbackDock } from '@/components/FeedbackDock';
import { SetupStage } from '@/components/SetupStage';
import { AgentBrief } from '@/components/AgentBrief';
import { PlanDropzone } from '@/components/PlanDropzone';
import { TourPlanner } from '@/components/TourPlanner';
import {
  getHealth, getListings, getProfile, getTraditions, getBriefs, patchProfile,
  startScan, resolveApiBase, getApiBase, type ScanMode,
} from '@/lib/api';
import type {
  AuditResult, PropertyListing, PreferenceProfile, HealthPayload, Tradition,
  TraditionId, DailyBrief,
} from '@/types/listing';

export default function CommandCenter() {
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [audits, setAudits] = useState<Record<string, AuditResult>>({});
  const [profile, setProfile] = useState<PreferenceProfile | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [traditions, setTraditions] = useState<Tradition[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  /** 'setup' is the centred brief; 'console' is the three-pane working view. */
  const [phase, setPhase] = useState<'setup' | 'console'>('setup');
  const [scanError, setScanError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourPicks, setTourPicks] = useState<string[]>([]);
  const stopScan = useRef<(() => void) | null>(null);

  /* ------------------------------ boot ------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        // The agent's URL comes from the server at runtime, so nothing may talk
        // to it until this resolves.
        await resolveApiBase();
        const [l, p, h, t, b] = await Promise.all([
          getListings(), getProfile(), getHealth(), getTraditions(),
          getBriefs().catch(() => [] as DailyBrief[]),
        ]);
        setListings(l);
        setProfile(p);
        setHealth(h);
        setTraditions(t);
        // Surface the most recent overnight run — the agent may have found
        // something for you before you ever opened the page.
        setBrief(b.find((x) => x.notify) ?? b[0] ?? null);
      } catch (e) {
        setBootError((e as Error).message);
      }
    })();
    return () => stopScan.current?.();
  }, []);

  /* ------------------------------ scan ------------------------------ */
  const scanning = useRef(false);

  const runScan = useCallback((mode: ScanMode = 'full') => {
    /* Starting a second scan while one is in flight means two sets of vision
       calls racing each other into the same rate-limited model. Closing the
       EventSource does not stop the server-side work already queued. */
    if (scanning.current && mode !== 'force') return;

    stopScan.current?.();
    scanning.current = true;
    setIsScanning(true);
    setScanError(null);
    setElapsedMs(null);
    setProgress({ done: 0, total: listings.length });
    // Keep existing audits on screen while the new ones stream in — the old
    // build blanked the whole grid, so the UI was empty for the full 30s.
    if (mode === 'force') setAudits({});

    stopScan.current = startScan({
      onStart: (d) => setProgress({ done: 0, total: d.total }),
      onAudit: (a) => {
        setAudits((prev) => ({ ...prev, [a.propertyId]: a }));
        // The console appears the moment there is something real to put in it.
        setPhase('console');
        setActiveId((cur) => cur ?? a.propertyId);
      },
      onProgress: (d) => setProgress(d),
      onComplete: (d) => {
        scanning.current = false;
        setIsScanning(false);
        if (d.totalMs) setElapsedMs(d.totalMs);
        // A run that produces nothing must say so rather than leaving a dead
        // spinner on the brief screen.
        setAudits((prev) => {
          if (Object.keys(prev).length === 0) {
            setScanError(
              'The agent finished without scoring anything. Check that the backend is '
              + 'running and that backend/public/assets/ has imagery in it.',
            );
          }
          return prev;
        });
        getHealth().then(setHealth).catch(() => {});
      },
    }, mode);
  }, [listings.length]);

  /* Deliberately NO auto-scan. The app opens empty so the first thing anyone
     sees is the agent actually working, not a grid that was already there. */

  /* --------------- preference change -> free re-rank ---------------- */
  /** Preference and tradition changes re-score from cache. No model calls. */
  const rerank = useCallback(() => {
    if (Object.keys(audits).length > 0) runScan('rescore');
  }, [runScan, audits]);

  const onProfileChange = useCallback((p: PreferenceProfile) => {
    setProfile(p);
    rerank();
  }, [rerank]);

  /**
   * Jump from the overnight brief straight into a property.
   *
   * The agent surfaced it, so it is already part of the shortlist — but it has
   * not been scored in this session, so opening it kicks off the scan too.
   */
  const openFromBrief = useCallback((id: string) => {
    setActiveId(id);
    setPhase('console');
    if (!audits[id]) runScan('full');
  }, [audits, runScan]);

  const selectTradition = useCallback(async (id: TraditionId) => {
    const updated = await patchProfile({ tradition: id });
    setProfile(updated);
    // Swapping the rulebook changes only the arithmetic — never re-read images.
    if (Object.keys(audits).length > 0) runScan('rescore');
  }, [audits, runScan]);

  /* ------------------------------ derived --------------------------- */
  const ranked = [...listings].sort((a, b) => {
    const sa = audits[a.id]?.matchScore ?? -1;
    const sb = audits[b.id]?.matchScore ?? -1;
    return sb - sa;
  });

  const active = listings.find((l) => l.id === activeId);
  const activeAudit = activeId ? audits[activeId] : undefined;

  if (bootError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-bad-500/30 bg-bad-500/[0.07] p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 text-bad-400" size={28} />
          <h1 className="text-lg font-semibold text-white">Backend unreachable</h1>
          <p className="mt-2 text-[13px] text-ink-300">{bootError}</p>
          <p className="mt-4 font-mono text-[11.5px] text-ink-400">
            Expected the agent at <span className="text-brand-400">{getApiBase()}</span>
          </p>
          <p className="mt-2 text-[12px] text-ink-400">
            Start it with <code className="text-ink-200">cd backend &amp;&amp; npm run dev</code>
          </p>
        </div>
      </main>
    );
  }

  if (phase === 'setup') {
    return profile ? (
      <>
      {showUpload && <PlanDropzone onClose={() => setShowUpload(false)} />}
      <SetupStage
        listings={listings}
        profile={profile}
        traditions={traditions}
        isScanning={isScanning}
        progress={progress}
        onAnalyze={() => runScan('full')}
        onSelectTradition={selectTradition}
        error={scanError}
        brief={brief}
        onBriefDismiss={() => setBrief(null)}
        onBriefRan={setBrief}
        onOpenUpload={() => setShowUpload(true)}
        onOpenProperty={openFromBrief}
      />
      </>
    ) : (
      <main className="flex min-h-screen items-center justify-center">
        <Radar size={30} className="animate-pulse text-ink-600" />
      </main>
    );
  }

  return (
    <div className="animate-rise relative z-10 flex h-screen flex-col">
      {showUpload && <PlanDropzone onClose={() => setShowUpload(false)} />}
      {showTour && (
        <TourPlanner
          listings={listings}
          audits={audits}
          selected={tourPicks}
          onToggle={(id) => setTourPicks((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
          onClear={() => setTourPicks([])}
          onClose={() => setShowTour(false)}
        />
      )}
      <Header
        onOpenUpload={() => setShowUpload(true)}
        onOpenTour={() => {
          // Pre-select the strongest matches — the ones you'd actually go see.
          if (!tourPicks.length) {
            setTourPicks(
              [...listings]
                .filter((l) => audits[l.id])
                .sort((a, b) => (audits[b.id]?.matchScore ?? 0) - (audits[a.id]?.matchScore ?? 0))
                .slice(0, 3)
                .map((l) => l.id),
            );
          }
          setShowTour(true);
        }}
        tourCount={tourPicks.length}
        onForceRescan={() => runScan('force')}
        onReset={() => { stopScan.current?.(); setAudits({}); setActiveId(null);
                         setElapsedMs(null); setIsScanning(false);
                         scanning.current = false; setPhase('setup'); }}
        isScanning={isScanning}
        progress={progress}
        health={health}
        elapsedMs={elapsedMs}
        analyzedCount={Object.keys(audits).length}
      />

      {/* Below xl the three panes stop fitting side by side; the preference
          rail collapses first, then the inspector stacks under the list. */}
      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[290px_360px_1fr]">
        {/* preferences */}
        <div className="hidden min-h-0 overflow-y-auto border-r border-ink-700 bg-ink-900/40 xl:block">
          {brief && (
            <div className="p-4 pb-0">
              <AgentBrief
                brief={brief}
                onDismiss={() => setBrief(null)}
                onRan={setBrief}
                onOpenProperty={(id) => setActiveId(id)}
              />
            </div>
          )}
          {profile && (
            <PreferencePanel
              profile={profile}
              traditions={traditions}
              onChange={setProfile}
              onRerank={rerank}
              busy={isScanning}
            />
          )}
        </div>

        {/* ranked candidates */}
        <div className="flex min-h-0 flex-col border-r border-ink-700 bg-ink-900/20 max-lg:max-h-[45vh]">
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
              Ranked candidates
            </h2>
            <span className="font-mono text-[11px] text-ink-400">
              {Object.keys(audits).length}/{listings.length} scored
            </span>
          </div>

          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
            {listings.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-400">
                <Radar size={30} className="animate-pulse" />
                <p className="text-[13px]">Loading candidates…</p>
              </div>
            ) : (
              ranked.map((l, i) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  audit={audits[l.id]}
                  isActive={activeId === l.id}
                  isPending={isScanning}
                  rank={audits[l.id] ? i + 1 : undefined}
                  onClick={() => setActiveId(l.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* inspector */}
        <div className="flex min-h-0 flex-col bg-ink-950/40 max-lg:border-t max-lg:border-ink-700">
          {active && profile ? (
            <>
              <div className="min-h-0 flex-1">
                <PropertyInspector
                  key={active.id}
                  listing={active}
                  audit={activeAudit}
                  isPending={isScanning && !activeAudit}
                  profile={profile}
                />
              </div>
              {/* Docked, so the feedback loop is always one click away. */}
              {activeAudit && (
                <FeedbackDock
                  propertyId={active.id}
                  propertyLabel={active.address.split(',')[0]}
                  onProfileChange={onProfileChange}
                />
              )}
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-ink-400">
              <Radar size={26} className="animate-pulse" />
              <p className="text-[13px]">Waiting for the first result…</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
