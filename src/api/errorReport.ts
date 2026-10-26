import { auth } from '../firebase/config';
import { APP_PLATFORM, APP_VERSION } from './appInfo';
import { scrubText } from './errorScrub';

/**
 * Reports a failure to the backend error log (POST /api/client-errors) so it shows up in the admin
 * panel with the user, time, page and app version. Never sends tokens, form values, emails or phone
 * numbers. Fire and forget: reporting must never break the vendor app.
 */

const MAX_REPORTS_PER_LOAD = 5;
const seen = new Set<string>();
let sent = 0;

export interface ErrorReportInput {
  message: string;
  name?: string;
  stack?: string;
  level?: 'warning' | 'error' | 'critical';
  payload?: Record<string, string | number | boolean | undefined>;
}

/** /api/orders/123abc/items -> /api/orders/:id/items, so reports group by endpoint rather than by id. */
export function pathGroup(path: string): string {
  return path
    .split('?')[0]
    .split('/')
    .map((part) => (/\d/.test(part) || part.length > 20 || part.startsWith('-') ? ':id' : part))
    .join('/')
    .slice(0, 100);
}

export function reportError(input: ErrorReportInput): void {
  try {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (import.meta.env.DEV || !base || sent >= MAX_REPORTS_PER_LOAD) return;

    const message = scrubText(input.message, 500);
    const screen = pathGroup(window.location.pathname);
    const key = `${input.name ?? ''}|${message}|${screen}`;
    if (!message || message === 'Script error.' || seen.has(key)) return;
    seen.add(key);
    sent += 1;

    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input.payload ?? {})) {
      if (v !== undefined) payload[k] = v;
    }

    void fetch(`${String(base).replace(/\/+$/, '')}/api/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Platform': APP_PLATFORM, 'X-App-Version': APP_VERSION },
      body: JSON.stringify({
        message,
        class: input.name,
        stack: input.stack ? scrubText(input.stack, 4000) : undefined,
        screen,
        platform: APP_PLATFORM,
        app_version: APP_VERSION,
        user_id: auth.currentUser?.uid,
        level: input.level ?? 'error',
        payload: Object.keys(payload).length > 0 ? payload : undefined,
      }),
      credentials: 'omit',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // reporting must never break the app
  }
}

/** Global handlers for uncaught errors and unhandled promise rejections. */
export function watchCrashes(): void {
  const report = (kind: string, raw: unknown) => {
    const err = raw as { name?: unknown; message?: unknown; stack?: unknown } | null;
    reportError({
      message: String(err?.message ?? raw ?? ''),
      name: typeof err?.name === 'string' ? err.name : kind,
      stack: typeof err?.stack === 'string' ? err.stack : undefined,
      payload: { kind },
    });
  };
  window.addEventListener('error', (event) => report('error', event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => report('promise', event.reason));
}
