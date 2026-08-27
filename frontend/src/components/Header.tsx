'use client';

import { Loader2, Cloud, Database, Cpu, RefreshCw, RotateCcw, Radar, FileImage } from 'lucide-react';
import type { HealthPayload } from '@/types/listing';

/**
 * Top bar. The right-hand cluster is deliberate demo evidence — model id,
 * memory backend and Cloud Run revision are read live from /api/health, so
 * the judges can see which infrastructure actually served the request.
 */
export function Header({
  onForceRescan, onReset, onOpenUpload, isScanning, progress, health, elapsedMs, analyzedCount,
}: {
  onForceRescan: () => void;
  onReset: () => void;
  onOpenUpload: () => void;
  isScanning: boolean;
  progress: { done: number; total: number };
  health: HealthPayload | null;
  elapsedMs: number | null;
  analyzedCount: number;
}) {
  return (
    <header className="relative z-20 border-b border-ink-700 bg-ink-900/80 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-4 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg
                           bg-gradient-to-br from-brand-500 to-saffron-500">
            <Radar size={17} className="text-ink-950" />
          </span>
          <div>
            <h1 className="text-[15px] font-semibold leading-tight text-white">VastuNest</h1>
            <p className="text-[10.5px] leading-tight text-ink-400">
              {analyzedCount} propert{analyzedCount === 1 ? 'y' : 'ies'} analysed
            </p>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {health && (
            <div className="hidden items-center gap-1.5 lg:flex">
              <Badge icon={Cpu} label={health.model} tone="brand" />
              <Badge
                icon={Database}
                label={health.memoryBackend === 'firestore' ? 'Firestore' : 'local store'}
                tone={health.memoryBackend === 'firestore' ? 'good' : 'muted'}
              />
              <Badge
                icon={Cloud}
                label={health.revision === 'local' ? 'local' : `Cloud Run · ${health.revision}`}
                tone={health.revision === 'local' ? 'muted' : 'good'}
              />
            </div>
          )}

          {elapsedMs !== null && !isScanning && (
            <span
              className="font-mono text-[11px] text-ink-400"
              title={elapsedMs < 1000
                ? 'Re-scored from cached readings — no model call needed'
                : 'Gemini read every floor plan and aerial live'}
            >
              {elapsedMs < 1000
                ? `re-scored in ${elapsedMs}ms`
                : `analyzed live in ${(elapsedMs / 1000).toFixed(1)}s`}
            </span>
          )}

          <button
            onClick={onOpenUpload}
            title="Analyse a floor plan the agent has never seen"
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-2
                       text-[12px] text-ink-300 hover:border-ink-600 hover:text-white"
          >
            <FileImage size={13} />
            <span className="hidden sm:inline">Analyse a plan</span>
          </button>

          <button
            onClick={onReset}
            disabled={isScanning}
            title="Go back to the brief and start a fresh run"
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-2
                       text-[12px] text-ink-300 hover:border-ink-600 hover:text-white
                       disabled:opacity-40"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Start over</span>
          </button>

          {/* One action, and it is the only one a user has a reason to press:
              make the agent look at the drawings again rather than trusting
              what it read last time. Everything else re-ranks on its own. */}
          <button
            onClick={onForceRescan}
            disabled={isScanning}
            title="Discard every cached reading and make Gemini look at all the floor plans and aerials again. Takes about a minute."
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2
                       text-[13px] font-semibold text-ink-950 transition-colors
                       hover:bg-brand-500 disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Reading {progress.done}/{progress.total}
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                Re-read the plans
              </>
            )}
          </button>
        </div>
      </div>

      {isScanning && progress.total > 0 && (
        <div className="h-0.5 w-full bg-ink-800">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}
    </header>
  );
}

function Badge({ icon: Icon, label, tone }: {
  icon: typeof Cpu; label: string; tone: 'brand' | 'good' | 'muted';
}) {
  const cls = {
    brand: 'text-brand-400 ring-brand-500/25 bg-brand-500/10',
    good: 'text-good-400 ring-good-500/25 bg-good-500/10',
    muted: 'text-ink-400 ring-ink-700 bg-ink-850',
  }[tone];
  return (
    <span className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10.5px] ring-1 ${cls}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}
