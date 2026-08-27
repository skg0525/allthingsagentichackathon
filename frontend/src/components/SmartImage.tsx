'use client';

import { useState } from 'react';
import { ImageOff, Loader2 } from 'lucide-react';
import { assetUrl, getApiBase } from '@/lib/api';

/**
 * Every property image goes through here.
 *
 * The previous build rendered a bare <img> straight onto a grey div, so a
 * dead URL (three of five aerials were 404ing) showed as an unexplained
 * empty box. This always resolves to one of three explicit states —
 * loading, loaded, or broken-with-a-reason.
 */
export function SmartImage({
  path,
  alt,
  className = '',
  imgClassName = '',
  priority = false,
}: {
  path: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  // Until the agent URL is known, an <img src> would resolve against the UI's
  // own origin and 404. Hold the skeleton instead of rendering a broken image.
  const baseReady = Boolean(getApiBase());

  return (
    <div className={`relative overflow-hidden bg-ink-800 ${className}`}>
      {(state === 'loading' || !baseReady) && (
        <div className="skeleton absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin text-ink-600" size={22} />
        </div>
      )}

      {!baseReady ? null : state === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-ink-400 p-4 text-center">
          <ImageOff size={26} />
          <span className="text-xs leading-snug">
            Imagery not generated yet.
            <br />
            <code className="font-mono text-[11px] text-ink-300">npm run assets</code>
          </span>
        </div>
      ) : (
        <img
          src={assetUrl(path)}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          className={`h-full w-full object-cover transition-opacity duration-500 ${
            state === 'ok' ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}
