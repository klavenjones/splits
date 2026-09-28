/**
 * Keeps training, food, body and health values out of everything sent to Sentry. Pure; applied
 * to every event, transaction and breadcrumb in src/lib/sentry.ts. Ids, counts, codes and route
 * names survive; values are removed.
 */

/** Keys whose values are never sent (matched anywhere in the key, case-insensitive). */
export const SENSITIVE_KEY =
  /weight|(^|_)(kg|lb|lbs)($|_)|reps|rpe|e1rm|volume|kcal|calorie|protein|(^|_)fat|carbs|fiber|serving|name_snapshot|food|meal|body_fat|waist|neck|(^|_)hip|bmi|heart|(^|_)hr($|_)|pace|distance|duration|samples|health|notes|feel|email|display_name|password|token|authorization|cookie|query|fragment|energy|bpm|moving_time|elapsed/i;

export const REDACTED = '[redacted]';

/** Postgres echoes row and key values into error text. */
const PG_VALUES = [/Failing row contains \(.*?\)(?=\.|$)/gs, /Key \(.*?\)=\(.*?\)/gs];

export function scrubText(s: string): string {
  return PG_VALUES.reduce((t, re) => t.replace(re, REDACTED), s);
}

/** Host and path only: PostgREST filters and search terms live in the query string. */
export function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** PostgREST error fields that carry row values. */
const DROP_KEYS = new Set(['details', 'hint', 'body', 'request_body', 'response_body']);

/** Removes sensitive keys at any depth, scrubs strings, and caps depth against cycles. */
export function scrubValue(v: unknown, depth = 0): unknown {
  if (depth > 12) return REDACTED;
  if (typeof v === 'string') return scrubText(v);
  if (Array.isArray(v)) return v.map((x) => scrubValue(x, depth + 1));
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (SENSITIVE_KEY.test(k) || DROP_KEYS.has(k)) continue;
      out[k] = k === 'url' && typeof x === 'string' ? scrubUrl(x) : scrubValue(x, depth + 1);
    }
    return out;
  }
  return v;
}

type Frameish = { vars?: unknown };
type ExceptionValue = { value?: string; stacktrace?: { frames?: Frameish[] } };
type Crumb = { category?: string; message?: string; data?: Record<string, unknown> };
type Spanish = { data?: Record<string, unknown>; description?: string };

/** The parts of a Sentry event this touches (kept structural so tests don't need the SDK). */
export type Scrubbable = {
  message?: string;
  logentry?: { message?: string; params?: unknown[] };
  exception?: { values?: ExceptionValue[] };
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  breadcrumbs?: Crumb[];
  request?: { url?: string; data?: unknown; query_string?: unknown; cookies?: unknown };
  spans?: Spanish[];
  user?: { id?: string; [k: string]: unknown };
};

/** Console breadcrumbs are dropped: logged text can carry anything. */
export function scrubBreadcrumb<T extends Crumb>(c: T): T | null {
  if (c.category === 'console') return null;
  const out: T = { ...c };
  if (out.message !== undefined) out.message = scrubText(out.message);
  if (out.data) {
    const data = scrubValue(out.data) as Record<string, unknown>;
    for (const k of ['url', 'from', 'to'])
      if (typeof data[k] === 'string') data[k] = scrubUrl(data[k] as string);
    out.data = data;
  }
  return out;
}

const scrubSpan = <T extends Spanish>(s: T): T => ({
  ...s,
  ...(s.data ? { data: scrubValue(s.data) as Record<string, unknown> } : {}),
  ...(s.description !== undefined ? { description: scrubUrl(scrubText(s.description)) } : {}),
});

export function scrubEvent<T extends Scrubbable>(e: T): T {
  const out: T = { ...e };
  if (out.message !== undefined) out.message = scrubText(out.message);
  if (out.logentry)
    out.logentry = {
      ...out.logentry,
      message: out.logentry.message && scrubText(out.logentry.message),
      params: undefined,
    };
  if (out.exception?.values)
    out.exception = {
      ...out.exception,
      values: out.exception.values.map((x) => ({
        ...x,
        ...(x.value !== undefined ? { value: scrubText(x.value) } : {}),
        ...(x.stacktrace?.frames
          ? {
              stacktrace: {
                ...x.stacktrace,
                frames: x.stacktrace.frames.map(({ vars: _vars, ...f }) => f),
              },
            }
          : {}),
      })),
    };
  if (out.extra) out.extra = scrubValue(out.extra) as Record<string, unknown>;
  if (out.contexts) out.contexts = scrubValue(out.contexts) as Record<string, unknown>;
  if (out.tags) out.tags = scrubValue(out.tags) as Record<string, unknown>;
  if (out.breadcrumbs)
    out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb).filter((c): c is Crumb => c !== null);
  if (out.spans) out.spans = out.spans.map(scrubSpan);
  if (out.request)
    out.request = {
      ...(out.request.url ? { url: scrubUrl(out.request.url) } : {}),
    };
  if (out.user) out.user = out.user.id ? { id: out.user.id } : undefined;
  return out;
}
