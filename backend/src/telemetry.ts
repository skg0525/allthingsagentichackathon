/**
 * OpenTelemetry tracing, exported to Google Cloud Trace.
 *
 * The point is not that spans exist — it is that the agent's reasoning chain is
 * auditable *outside* this application. The trace panel in the UI is our own
 * rendering of our own data; a judge has to take it on faith. Cloud Trace is
 * Google's, and it shows the same chain: which property, which model answered,
 * whether perception was cached, how long the vision call actually took.
 *
 * Must be imported before anything that emits spans. Degrades to a no-op when
 * credentials are absent, so local development needs no setup.
 */
/* Only the API is imported eagerly. The SDK and the Cloud Trace exporter pull in
   google-gax, which probes the GCP metadata server and then throws an UNCAUGHT
   exception when no Application Default Credential exists — killing the process
   at startup on any dev machine. Loading them lazily, only once we have decided
   tracing is safe to enable, keeps that failure mode out of local development
   entirely. */
import { trace, SpanStatusCode, type Span } from '@opentelemetry/api';

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SERVICE = 'vastunest-agent';
let enabled = false;
let provider: { forceFlush: () => Promise<void> } | null = null;

export function initTelemetry(): boolean {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT;
  if (!projectId) {
    console.log('[trace] no GOOGLE_CLOUD_PROJECT — tracing disabled');
    return false;
  }

  /* Only trace where credentials are certain.
   *
   * The exporter authenticates lazily, on the first flush — so a missing
   * Application Default Credential surfaces as an unhandled rejection minutes
   * after startup and takes the process down. A developer with
   * GOOGLE_CLOUD_PROJECT set in .env but no `gcloud auth` would find the server
   * dying for no visible reason. Require an unambiguous signal: K_SERVICE (set
   * by Cloud Run), an explicit credentials file, or an explicit opt-in. */
  const onManagedRuntime = Boolean(process.env.K_SERVICE);
  const hasExplicitCreds = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const forced = process.env.ENABLE_CLOUD_TRACE === 'true';
  if (!onManagedRuntime && !hasExplicitCreds && !forced) {
    console.log('[trace] not on Cloud Run and no credentials — tracing disabled');
    console.log('[trace] set ENABLE_CLOUD_TRACE=true to force it locally');
    return false;
  }

  /* Even then, an export failure must never be fatal. The exporter rejects
     asynchronously, well outside any try/catch around start(). */
  process.on('unhandledRejection', (reason) => {
    const msg = String((reason as Error)?.message ?? reason);
    if (/credential|trace|grpc|GoogleAuth/i.test(msg)) {
      console.warn('[trace] export failed, continuing without tracing:', msg.slice(0, 120));
      enabled = false;
      return;
    }
    throw reason;
  });

  try {
    // Deliberately synchronous requires, after the safety checks above.
    const { NodeTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
    const { TraceExporter } = require('@google-cloud/opentelemetry-cloud-trace-exporter');
    const { resourceFromAttributes } = require('@opentelemetry/resources');
    const {
      ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION,
    } = require('@opentelemetry/semantic-conventions');

    /* SimpleSpanProcessor, not the usual BatchSpanProcessor.
     *
     * Batching relies on a background timer, and Cloud Run throttles CPU to
     * near zero between requests — so the timer never fires and buffered spans
     * die with the container. Exporting each span as it ends costs a little
     * more per request and is the only thing that reliably works on a service
     * that scales to zero. */
    const tp = new NodeTracerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: SERVICE,
        [ATTR_SERVICE_VERSION]: process.env.K_REVISION ?? 'local',
      }),
      spanProcessors: [new SimpleSpanProcessor(new TraceExporter({ projectId }))],
    });
    tp.register();
    provider = tp;
    enabled = true;
    console.log(`[trace] exporting to Cloud Trace in ${projectId} (per-span)`);

    process.once('SIGTERM', () => { void tp.shutdown().catch(() => {}); });
  } catch (err) {
    console.warn('[trace] disabled:', (err as Error).message);
  }
  return enabled;
}

export const tracingEnabled = () => enabled;

/**
 * Push buffered spans now.
 *
 * Safe to call often — the exporter no-ops when there is nothing pending — and
 * deliberately not awaited by request handlers, so a slow trace export can
 * never delay a response.
 */
export function flushTraces(): void {
  if (!enabled || !provider?.forceFlush) return;
  void provider.forceFlush().catch((err) => {
    console.warn('[trace] flush failed:', (err as Error).message.slice(0, 100));
  });
}

const tracer = () => trace.getTracer(SERVICE);

/**
 * Run `fn` inside a span, recording attributes and marking failures.
 * A tracing problem must never take down the thing being traced.
 */
export async function traced<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  if (!enabled) return fn({ setAttribute: () => {}, setAttributes: () => {} } as unknown as Span);

  return tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}
