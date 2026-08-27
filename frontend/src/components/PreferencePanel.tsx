'use client';

import { useState } from 'react';
import {
  SlidersHorizontal, Compass, BedDouble, Trees, Car,
  Footprints, Wrench, Users, History, Loader2,
} from 'lucide-react';
import { patchProfile } from '@/lib/api';
import { TraditionPicker } from './TraditionPicker';
import type { PreferenceProfile, DimensionKey, Tradition, TraditionId } from '@/types/listing';

const DIMS: { key: DimensionKey; label: string; icon: typeof Compass }[] = [
  { key: 'mainFloorSuite', label: 'Main-floor bed + bath', icon: BedDouble },
  { key: 'yard', label: 'Backyard & site', icon: Trees },
  { key: 'vastu', label: 'Directional compliance', icon: Compass },
  { key: 'commute', label: 'Commute', icon: Car },
  { key: 'walkability', label: 'Walkability & transit', icon: Footprints },
  { key: 'community', label: 'Community & safety', icon: Users },
  { key: 'maintenance', label: 'Age & maintenance', icon: Wrench },
];

/**
 * Live preference controls.
 *
 * Moving a slider PATCHes the profile and re-scores from cached perception —
 * no vision calls, so the whole list re-ranks in milliseconds. Previously
 * every chip click kicked off a full 30-second market rescan.
 */
export function PreferencePanel({
  profile, traditions, onChange, onRerank, busy,
}: {
  profile: PreferenceProfile;
  traditions: Tradition[];
  onChange: (p: PreferenceProfile) => void;
  onRerank: () => void;
  busy: boolean;
}) {
  const [saving, setSaving] = useState<DimensionKey | null>(null);
  const [draft, setDraft] = useState<Partial<Record<DimensionKey, number>>>({});

  const commit = async (key: DimensionKey, value: number) => {
    setSaving(key);
    try {
      const updated = await patchProfile({ weights: { [key]: value } });
      onChange(updated);
      onRerank();
    } finally {
      setSaving(null);
      setDraft((d) => { const n = { ...d }; delete n[key]; return n; });
    }
  };

  const toggleConstraint = async (
    key: keyof PreferenceProfile['hardConstraints'],
    value: boolean | number,
  ) => {
    const updated = await patchProfile({ hardConstraints: { [key]: value } });
    onChange(updated);
    onRerank();
  };

  const selectTradition = async (id: TraditionId) => {
    const updated = await patchProfile({ tradition: id });
    onChange(updated);
    onRerank();
  };

  const hc = profile.hardConstraints;
  const tradition = traditions.find((t) => t.id === profile.tradition);

  return (
    <aside className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {traditions.length > 0 && (
        <TraditionPicker
          traditions={traditions}
          active={profile.tradition}
          onSelect={selectTradition}
          busy={busy}
        />
      )}

      <section className="rounded-2xl border border-ink-700 bg-ink-850 p-4">
        <header className="mb-3 flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-brand-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-300">
            What matters to you
          </h3>
          <span className="ml-auto font-mono text-[10px] text-ink-400">
            v{profile.version}
          </span>
        </header>

        <div className="space-y-3">
          {DIMS.map(({ key, label, icon: Icon }) => {
            const value = draft[key] ?? profile.weights[key];
            return (
              <div key={key}>
                <div className="flex items-center gap-2">
                  <Icon size={13} className="text-ink-400" />
                  <label htmlFor={`w-${key}`} className="text-[12px] text-ink-200">
                    {key === 'vastu' && tradition ? tradition.name : label}
                  </label>
                  <span className="ml-auto font-mono text-[11px] text-ink-300">
                    {saving === key
                      ? <Loader2 size={11} className="animate-spin text-brand-400" />
                      : value.toFixed(2)}
                  </span>
                </div>
                <input
                  id={`w-${key}`}
                  type="range"
                  min={0.05} max={1} step={0.05}
                  value={value}
                  disabled={busy}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                  onPointerUp={(e) => commit(key, Number((e.target as HTMLInputElement).value))}
                  onKeyUp={(e) => commit(key, Number((e.target as HTMLInputElement).value))}
                  className="mt-1.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-ink-700
                             accent-[var(--color-brand-500)]"
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-ink-700 bg-ink-850 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-300">
          Non-negotiables
        </h3>
        <div className="space-y-2.5">
          {([
            ['mainFloorBedroomRequired', 'Bedroom on the main floor'],
            ['mainFloorFullBathRequired', 'Full bath on that floor'],
            ['strictEntrance', tradition
              ? `No ${tradition.flaggedEntrances.join('/')}-facing entrance`
              : 'No south-facing entrance'],
            ['flatYardRequired', 'Flat backyard only'],
          ] as [keyof PreferenceProfile['hardConstraints'], string][]).map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5 text-[12px] text-ink-200">
              <input
                type="checkbox"
                checked={hc[key] as boolean}
                disabled={busy}
                onChange={(e) => toggleConstraint(key, e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 bg-ink-900 accent-[var(--color-brand-500)]"
              />
              {label}
            </label>
          ))}

          <div className="pt-1">
            <div className="flex items-center justify-between text-[12px] text-ink-200">
              <span>Max commute</span>
              <span className="font-mono text-ink-300">{hc.maxCommuteMinutes} min</span>
            </div>
            <input
              type="range" min={15} max={60} step={5}
              value={hc.maxCommuteMinutes}
              disabled={busy}
              onChange={(e) =>
                onChange({ ...profile, hardConstraints: { ...hc, maxCommuteMinutes: Number(e.target.value) } })
              }
              onPointerUp={(e) => toggleConstraint('maxCommuteMinutes', Number((e.target as HTMLInputElement).value))}
              className="mt-1.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-ink-700
                         accent-[var(--color-brand-500)]"
            />
          </div>
        </div>
      </section>

      {profile.learnedNotes.length > 0 && (
        <section className="rounded-2xl border border-saffron-500/25 bg-saffron-500/[0.05] p-4">
          <header className="mb-2.5 flex items-center gap-2">
            <History size={14} className="text-saffron-400" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-saffron-400">
              Agent memory
            </h3>
            <span className="ml-auto font-mono text-[10px] text-ink-400">
              {profile.learnedNotes.length}
            </span>
          </header>
          <ul className="space-y-2">
            {profile.learnedNotes.slice(0, 6).map((n, i) => (
              <li key={i} className="text-[11.5px] leading-snug text-ink-300">{n}</li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}
