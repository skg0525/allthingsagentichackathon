'use client';

import { AlertTriangle, Bed, Bath, Ruler, Loader2, Zap, ThumbsDown, Star } from 'lucide-react';
import { SmartImage } from './SmartImage';
import type { AuditResult, PropertyListing } from '@/types/listing';

const band = (s: number) =>
  s >= 85 ? { chip: 'bg-good-500/15 text-good-400 ring-good-500/30', word: 'Strong fit' }
  : s >= 70 ? { chip: 'bg-brand-500/15 text-brand-400 ring-brand-500/30', word: 'Worth a look' }
  : s >= 55 ? { chip: 'bg-warn-400/15 text-warn-400 ring-warn-400/30', word: 'Compromised' }
  : { chip: 'bg-bad-500/15 text-bad-400 ring-bad-500/30', word: 'Skip' };

export function ListingCard({
  listing, audit, isActive, isPending, rank, onClick,
}: {
  listing: PropertyListing;
  audit?: AuditResult;
  isActive: boolean;
  isPending: boolean;
  rank?: number;
  onClick: () => void;
}) {
  const b = audit ? band(audit.matchScore) : null;
  const rejected = audit?.verdict === 'rejected';

  return (
    <button
      onClick={onClick}
      aria-current={isActive}
      className={`group w-full text-left rounded-xl border transition-all duration-200 overflow-hidden
        ${isActive
          ? 'border-brand-500/60 bg-brand-500/[0.07] ring-1 ring-brand-500/40'
          : 'border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800'}
        ${rejected ? 'opacity-55' : ''}`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative shrink-0">
          <SmartImage
            path={listing.images.exterior}
            alt={`Exterior of ${listing.address}`}
            className="h-24 w-24 rounded-lg"
            imgClassName="group-hover:scale-105 transition-transform duration-500"
          />
          {rank !== undefined && audit && (
            <span className="absolute -left-1.5 -top-1.5 flex h-6 w-6 items-center justify-center
                             rounded-full bg-ink-950 text-[11px] font-bold text-ink-200
                             ring-1 ring-ink-600 font-mono">
              {rank}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-lg font-semibold text-white">
              ${(listing.price / 1000).toFixed(0)}k
            </span>
            {audit && (
              <span className="font-mono text-sm font-bold text-ink-200">
                {audit.matchScore}
                <span className="text-ink-400 text-xs">/100</span>
              </span>
            )}
          </div>

          <p className="truncate text-[13px] text-ink-300 mt-0.5">
            {listing.address.split(',')[0]}
          </p>

          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-400 font-mono">
            <span className="flex items-center gap-1"><Bed size={12} />{listing.beds}</span>
            <span className="flex items-center gap-1"><Bath size={12} />{listing.baths}</span>
            <span className="flex items-center gap-1"><Ruler size={12} />{listing.sqft.toLocaleString()}</span>
            <span>{listing.yearBuilt}</span>
          </div>

          <div className="mt-2 min-h-[22px]">
            {isPending && !audit ? (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-400">
                <Loader2 size={12} className="animate-spin" />
                Reading floor plan…
              </span>
            ) : audit && b ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {audit.verdict === 'rejected' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-bad-500/15
                                   px-2 py-0.5 text-[11px] font-semibold text-bad-400
                                   ring-1 ring-bad-500/30">
                    <ThumbsDown size={11} /> You passed on this
                  </span>
                ) : audit.verdict === 'shortlisted' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-good-500/15
                                   px-2 py-0.5 text-[11px] font-semibold text-good-400
                                   ring-1 ring-good-500/30">
                    <Star size={11} /> Shortlisted
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5
                                    text-[11px] font-semibold ring-1 ${b.chip}`}>
                    {b.word}
                  </span>
                )}
                {audit.redFlags.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-bad-500/10
                                   px-2 py-0.5 text-[11px] font-medium text-bad-400 ring-1 ring-bad-500/25">
                    <AlertTriangle size={11} />
                    {audit.redFlags.length}
                  </span>
                )}
                {audit.cached && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-ink-400" title="Perception served from cache">
                    <Zap size={10} /> cached
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-ink-400">Not yet analysed</span>
            )}
          </div>
        </div>
      </div>

      {audit && (
        <div className="h-0.5 w-full bg-ink-800">
          <div
            className="h-full transition-all duration-700"
            style={{
              width: `${audit.matchScore}%`,
              background:
                audit.matchScore >= 85 ? 'var(--color-good-400)'
                : audit.matchScore >= 70 ? 'var(--color-brand-400)'
                : audit.matchScore >= 55 ? 'var(--color-warn-400)'
                : 'var(--color-bad-400)',
            }}
          />
        </div>
      )}
    </button>
  );
}
