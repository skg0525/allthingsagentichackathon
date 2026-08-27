'use client';

import { useCallback, useRef, useState } from 'react';
import {
  Upload, Loader2, X, Compass, Check, AlertTriangle, FileImage,
} from 'lucide-react';
import { analyzeUploadedPlan } from '@/lib/api';
import type { AdhocResult } from '@/types/listing';

const ACCEPT = 'image/jpeg,image/png,image/webp';

/**
 * Drop in any floor plan.
 *
 * This exists to settle the obvious objection — that the agent only works on
 * imagery we generated. The uploaded file goes through the same prompt, the
 * same response schema and the same directional tables as the curated set;
 * nothing is special-cased. Yard and site fields come back "Unknown" because a
 * plan cannot tell you about a backyard, and inventing them would be worse than
 * admitting it.
 */
export function PlanDropzone({ onClose }: { onClose: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AdhocResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    if (!ACCEPT.split(',').includes(file.type)) {
      setError(`${file.type || 'That file'} is not a JPEG, PNG or WebP image.`);
      return;
    }
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error('Could not read that file'));
      r.readAsDataURL(file);
    });
    setPreview(dataUrl);
    setBusy(true);
    try {
      setResult(await analyzeUploadedPlan(dataUrl.split(',')[1]!, file.type));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

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
          <FileImage size={16} className="text-brand-400" />
          <h2 className="text-[15px] font-semibold text-white">Analyse any floor plan</h2>
          <button onClick={onClose} aria-label="Close"
                  className="ml-auto rounded p-1 text-ink-400 hover:text-ink-200">
            <X size={16} />
          </button>
        </header>
        <p className="mb-5 text-[12.5px] text-ink-400">
          Drop in a real floor plan the agent has never seen — from a listing, a
          brochure, anywhere. Same model, same prompt, same rules as the curated set.
        </p>

        {!preview && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3
                        rounded-xl border-2 border-dashed py-14 transition-colors
              ${dragging
                ? 'border-brand-500 bg-brand-500/10'
                : 'border-ink-700 hover:border-ink-600'}`}
          >
            <Upload size={26} className="text-ink-400" />
            <p className="text-[13px] text-ink-200">Drop a floor plan here, or click to choose</p>
            <p className="font-mono text-[11px] text-ink-400">JPEG, PNG or WebP · up to 8MB</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {preview && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              {/* Local preview of the exact bytes that were sent to the model. */}
              <img src={preview} alt="Uploaded floor plan"
                   className="w-full rounded-xl border border-ink-700 bg-white object-contain" />
              <button
                onClick={() => { setPreview(null); setResult(null); setError(null); }}
                className="mt-2 text-[11.5px] text-ink-400 hover:text-ink-200"
              >
                ← try a different plan
              </button>
            </div>

            <div>
              {busy && (
                <div className="flex items-center gap-2 rounded-xl border border-ink-700
                                bg-ink-850 px-4 py-5 text-[13px] text-ink-300">
                  <Loader2 size={16} className="animate-spin text-brand-400" />
                  Gemini is reading a plan it has never seen…
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-bad-500/30
                                bg-bad-500/[0.07] px-4 py-3">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-bad-400" />
                  <p className="text-[12.5px] text-ink-200">{error}</p>
                </div>
              )}

              {result && (
                <div className="animate-rise space-y-3">
                  {!result.isFloorPlan && (
                    <div className="flex items-start gap-2 rounded-xl border border-warn-400/30
                                    bg-warn-400/[0.07] px-3 py-2.5">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn-400" />
                      <p className="text-[12px] text-ink-200">
                        This doesn&apos;t look like a floor plan. {result.whatISee}
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Compass size={14} className="text-saffron-400" />
                      <span className="text-[12px] font-semibold text-ink-200">
                        {result.directional.tradition}
                      </span>
                      <span className="ml-auto font-mono text-lg font-bold text-saffron-400">
                        {result.directional.score}
                        <span className="text-[11px] text-ink-400">/100</span>
                      </span>
                    </div>
                    <p className="font-mono text-[11px] leading-snug text-ink-400">
                      {result.directional.reason}
                    </p>
                  </div>

                  <dl className="space-y-2.5 rounded-xl border border-ink-700 bg-ink-850 p-4">
                    {([
                      ['Main entrance', result.perception.entranceDirection, result.perception.entranceEvidence],
                      ['Kitchen', result.perception.kitchenQuadrant, result.perception.kitchenEvidence],
                      ['Primary bedroom', result.perception.masterBedQuadrant, result.perception.masterBedEvidence],
                      ['Main-floor bed + full bath',
                        result.perception.mainFloorBedroom
                          ? result.perception.mainFloorFullBath ? 'Yes — bedroom + full bath' : 'Bedroom, half bath only'
                          : 'No bedroom on this floor',
                        result.perception.mainFloorSuiteEvidence],
                    ] as const).map(([label, value, evidence]) => (
                      <div key={label}>
                        <div className="flex items-baseline justify-between gap-2">
                          <dt className="text-[11.5px] text-ink-400">{label}</dt>
                          <dd className="text-[12px] font-semibold text-ink-200">{value}</dd>
                        </div>
                        <p className="mt-0.5 text-[10.5px] italic leading-snug text-ink-400">
                          &ldquo;{evidence}&rdquo;
                        </p>
                      </div>
                    ))}
                  </dl>

                  <p className="flex items-center gap-1.5 font-mono text-[10.5px] text-ink-400">
                    <Check size={10} className="text-good-400" />
                    {result.trace[0]?.detail} · {result.trace[0]?.ms}ms
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
