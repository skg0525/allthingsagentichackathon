import { NextResponse } from 'next/server';

/**
 * Runtime configuration for the browser.
 *
 * The agent's URL cannot be baked in at build time. `NEXT_PUBLIC_*` is inlined
 * during `next build`, but on Cloud Run the backend URL is not known until the
 * backend has been deployed — and `--set-build-env-vars` does not reach a
 * Dockerfile `ARG` anyway, which is how a production build shipped pointing at
 * localhost.
 *
 * Serving it from the Next server instead means the URL is read from the
 * environment on each request. Repointing the UI at a different backend is then
 * an env var change, not a rebuild.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    apiBase:
      process.env.API_BASE
      ?? process.env.NEXT_PUBLIC_API_BASE
      ?? 'http://localhost:8080',
  });
}
