/**
 * Crash and error reporting. Imported first by the root layout. Everything sent goes through
 * src/lib/scrub.ts: no set weights, food logs, body weight or health data leave the phone.
 * Sends only from release builds (set EXPO_PUBLIC_SENTRY_DEV=1 to try it from a dev build).
 */
import * as Sentry from '@sentry/react-native';

import { asError } from './errors';
import { scrubBreadcrumb, scrubEvent, type Scrubbable } from './scrub';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** `production` / `preview` from the EAS profile (eas.json), `local` for builds on the Mac. */
export const sentryEnvironment = process.env.EXPO_PUBLIC_APP_ENV || 'local';

export const sentryEnabled = !!dsn && (!__DEV__ || process.env.EXPO_PUBLIC_SENTRY_DEV === '1');

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

Sentry.init({
  dsn,
  enabled: sentryEnabled,
  environment: sentryEnvironment,
  // One user for now: trace everything. Lower this when there are more.
  tracesSampleRate: 1,
  sendDefaultPii: false,
  attachScreenshot: false,
  attachViewHierarchy: false,
  // Request and response bodies stay off (the default); failed-request capture stays off too.
  enableCaptureFailedRequests: false,
  integrations: [navigationIntegration],
  beforeSend: (event) => scrubEvent(event as Scrubbable) as typeof event,
  beforeSendTransaction: (event) => scrubEvent(event as Scrubbable) as typeof event,
  beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
});

/** The signed-in user, by id only (no email or name). */
export function setSentryUser(id: string | null) {
  Sentry.setUser(id ? { id } : null);
}

/** Areas used as the `area` tag, so issues can be filtered by feature. */
export type Area = 'sync' | 'health_import' | 'checkin' | 'render' | 'diagnostics';

/** Reports a handled error with an area tag and optional value-free context. */
export function report(
  error: unknown,
  area: Area,
  context?: { name: string; data: Record<string, unknown> },
  tags?: Record<string, string>,
) {
  Sentry.captureException(asError(error), {
    tags: { area, ...tags },
    ...(context ? { contexts: { [context.name]: context.data } } : {}),
  });
}

type Attr = string | number | boolean;

/** A performance span around `fn` (sync or async). Attributes are ids and counts only. */
export function trace<T>(name: string, attributes: Record<string, Attr>, fn: () => T): T {
  return Sentry.startSpan({ name, op: name.split('.')[0], attributes }, fn);
}

/** Adds counts to the span that's running (e.g. results known only at the end). */
export function setSpanAttributes(attributes: Record<string, Attr>) {
  Sentry.getActiveSpan()?.setAttributes(attributes);
}

export { Sentry };
