'use client';

import { useState } from 'react';
import { Home, Map, Layers, X, Compass } from 'lucide-react';
import { SmartImage } from './SmartImage';
import type { PropertyListing, Perception, CardinalDirection } from '@/types/listing';

type Tab = 'exterior' | 'floorPlan' | 'aerial';

const TABS: { key: Tab; label: string; icon: typeof Home }[] = [
  { key: 'exterior', label: 'Street View', icon: Home },
  { key: 'floorPlan', label: '2D Floor Plan', icon: Layers },
  { key: 'aerial', label: 'Aerial / Lot', icon: Map },
];

/** Where on the plan the agent says each feature sits. North is up in every asset. */
const POS: Record<CardinalDirection, { top: string; left: string } | null> = {
  'North': { top: '8%', left: '50%' },
  'North-East': { top: '14%', left: '82%' },
  'East': { top: '50%', left: '90%' },
  'South-East': { top: '82%', left: '82%' },
  'South': { top: '90%', left: '50%' },
  'South-West': { top: '82%', left: '18%' },
  'West': { top: '50%', left: '10%' },
  'North-West': { top: '14%', left: '18%' },
  'Unknown': null,
};

function Pin({ dir, label, tone }: { dir: CardinalDirection; label: string; tone: string }) {
  const p = POS[dir];
  if (!p) return null;
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none animate-rise"
      style={{ top: p.top, left: p.left }}
    >
      <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold
                        shadow-lg backdrop-blur-sm ring-1 ${tone}`}>
        {label}
      </span>
    </div>
  );
}

export function MediaViewer({
  listing, perception,
}: { listing: PropertyListing; perception?: Perception }) {
  const [tab, setTab] = useState<Tab>('floorPlan');
  const [zoom, setZoom] = useState(false);
  const [overlay, setOverlay] = useState(true);

  const path = listing.images[tab];
  const showPins = overlay && perception && tab === 'floorPlan';

  return (
    <section className="rounded-2xl border border-ink-700 bg-ink-850 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-ink-700 px-3 py-2">
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
                ${tab === key ? 'bg-ink-700 text-white' : 'text-ink-400 hover:text-ink-200'}`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'floorPlan' && perception && (
          <button
            onClick={() => setOverlay((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ring-1 transition-colors
              ${overlay
                ? 'bg-brand-500/15 text-brand-400 ring-brand-500/30'
                : 'text-ink-400 ring-ink-700 hover:text-ink-200'}`}
          >
            <Compass size={13} />
            Agent overlay
          </button>
        )}
      </div>

      <div
        className="relative aspect-[16/10] cursor-zoom-in bg-ink-900"
        onClick={() => setZoom(true)}
      >
        <SmartImage
          key={`${listing.id}-${tab}`}
          path={path}
          alt={`${TABS.find((t) => t.key === tab)!.label} of ${listing.address}`}
          className="absolute inset-0"
          imgClassName="object-contain"
          priority
        />

        {/* North indicator — every asset is generated north-up, and the agent
            is told so. Showing it makes the orientation claim auditable. */}
        {tab !== 'exterior' && (
          <div className="absolute right-3 top-3 flex flex-col items-center rounded-lg
                          bg-ink-950/80 px-2 py-1.5 ring-1 ring-ink-600 backdrop-blur-sm">
            <span className="text-[9px] font-bold leading-none text-bad-400">▲</span>
            <span className="font-mono text-[10px] font-bold text-white">N</span>
          </div>
        )}

        {showPins && (
          <>
            <Pin dir={perception.entranceDirection} label={`🚪 Entrance · ${perception.entranceDirection}`}
                 tone="bg-brand-500/85 text-ink-950 ring-brand-400" />
            <Pin dir={perception.kitchenQuadrant} label={`🔥 Kitchen · ${perception.kitchenQuadrant}`}
                 tone="bg-saffron-500/85 text-ink-950 ring-saffron-400" />
            <Pin dir={perception.masterBedQuadrant} label={`🛏 Primary · ${perception.masterBedQuadrant}`}
                 tone="bg-good-500/85 text-ink-950 ring-good-400" />
          </>
        )}
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95 p-6 backdrop-blur-sm"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute right-6 top-6 rounded-full bg-ink-800 p-2 text-ink-200 hover:bg-ink-700"
            onClick={() => setZoom(false)}
            aria-label="Close"
          >
            <X size={20} />
          </button>
          {/* Same source path as the thumbnail above — one asset set per property,
              so what you zoom into is always the image you clicked. */}
          <SmartImage
            path={path}
            alt={`${TABS.find((t) => t.key === tab)!.label}, enlarged`}
            className="max-h-full max-w-6xl w-full rounded-xl bg-transparent"
            imgClassName="object-contain"
            priority
          />
        </div>
      )}
    </section>
  );
}
