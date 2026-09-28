import { toPayload } from '@/local/sync';
import type { Workout } from '@/workout/model';

import { REDACTED, scrubBreadcrumb, scrubEvent, scrubText, scrubUrl, scrubValue } from './scrub';

/** Every number or string that must never leave the phone, as it appears in the fixtures. */
const SECRETS = ['102.5', '8', '1840', '31.2', '94.8', '84.5', '162', '5:12', 'Greek yogurt'];
const leaks = (x: unknown) => {
  const s = JSON.stringify(x);
  return SECRETS.filter((v) =>
    new RegExp(`(^|[^0-9a-z.])${v.replace('.', '\\.')}($|[^0-9a-z])`, 'i').test(s),
  );
};

const workout: Workout = {
  id: 'w1',
  user_id: 'u1',
  template_id: 't1',
  origin: 'planned',
  kind: 'lift',
  name: 'push',
  scheduled_date: '2026-10-07',
  status: 'completed',
  started_at: '2026-10-07T10:00:00Z',
  ended_at: '2026-10-07T11:00:00Z',
  feel: 'hard',
  notes: 'felt heavy at 102.5',
  rest: null,
  update_template: null,
  exercises: [
    {
      id: 'se1',
      exercise_id: 'e1',
      superset_group: null,
      rest_sec: 120,
      notes: null,
      swapped_from_exercise_id: null,
      sets: [
        {
          id: 's1',
          set_number: 1,
          set_type: 'working',
          weight_kg: 102.5,
          reps: 8,
          rpe: null,
          completed_at: '2026-10-07T10:05:00Z',
        },
      ],
    },
  ] as unknown as Workout['exercises'],
};

describe('scrubEvent', () => {
  it('removes set weights, reps and notes from a sync payload but keeps ids', () => {
    const out = scrubEvent({ extra: { payload: toPayload(workout) } });
    expect(leaks(out)).toEqual([]);
    const p = (out.extra as { payload: { session: object; sets: object[] } }).payload;
    expect(p.session).toMatchObject({ id: 'w1', status: 'completed' });
    expect(p.sets[0]).toMatchObject({ id: 's1', set_number: 1, session_exercise_id: 'se1' });
  });

  it('redacts row values PostgREST echoes into check-violation errors', () => {
    const pg = {
      code: '23514',
      message: 'new row for relation "set_logs" violates check constraint "set_logs_reps_check"',
      details: 'Failing row contains (s1, se1, 1, working, 102.5, 8, null).',
      hint: null,
    };
    const out = scrubEvent({
      exception: {
        values: [
          {
            value:
              'Failing row contains (s1, se1, 1, working, 102.5, 8, null). Key (weight_kg)=(102.5) exists.',
          },
        ],
      },
      contexts: { postgrest: pg },
    });
    expect(leaks(out)).toEqual([]);
    expect(out.exception!.values![0].value).toBe(`${REDACTED}. ${REDACTED} exists.`);
    expect(out.contexts).toEqual({
      postgrest: {
        code: '23514',
        message: pg.message,
        hint: undefined,
      },
    });
  });

  it('drops query strings from fetch breadcrumbs, request urls and http spans', () => {
    const out = scrubEvent({
      breadcrumbs: [
        {
          category: 'fetch',
          data: {
            method: 'GET',
            url: 'https://x.supabase.co/functions/v1/food?q=Greek%20yogurt',
            status_code: 200,
          },
        },
        {
          category: 'xhr',
          data: { url: 'https://x.supabase.co/rest/v1/body_checkins?weight_kg=eq.94.8' },
        },
      ],
      request: { url: 'https://x.supabase.co/rest/v1/food_logs?kcal=gte.1840', data: '{}' },
      spans: [
        {
          description: 'GET https://x.supabase.co/rest/v1/food_logs?kcal=eq.1840',
          data: { 'http.query': '?kcal=eq.1840', 'http.response.status_code': 200 },
        },
      ],
    });
    expect(leaks(out)).toEqual([]);
    expect(out.breadcrumbs![0].data).toEqual({
      method: 'GET',
      url: 'https://x.supabase.co/functions/v1/food',
      status_code: 200,
    });
    expect(out.request).toEqual({ url: 'https://x.supabase.co/rest/v1/food_logs' });
    expect(out.spans![0]).toEqual({
      description: 'GET https://x.supabase.co/rest/v1/food_logs',
      data: { 'http.response.status_code': 200 },
    });
  });

  it('removes HealthKit run and weigh-in values from contexts and span data', () => {
    const out = scrubEvent({
      contexts: {
        run: {
          uuid: 'hk-1',
          distance_m: 5000,
          duration_s: 1840,
          avg_hr_bpm: 162,
          pace_s_per_km: 312,
          splits: [{ index: 1, pace: '5:12', heartRate: 162 }],
        },
      },
      spans: [{ data: { weight_kg: 94.8, waist_cm: 84.5, body_fat_pct: 31.2, days: 7 } }],
    });
    expect(leaks(out)).toEqual([]);
    expect(out.contexts).toEqual({ run: { uuid: 'hk-1', splits: [{ index: 1 }] } });
    expect(out.spans![0].data).toEqual({ days: 7 });
  });

  it('keeps only the user id and drops console breadcrumbs', () => {
    const out = scrubEvent({
      user: { id: 'u1', email: 'a@b.c', ip_address: '1.2.3.4' },
      breadcrumbs: [
        { category: 'console', message: 'saved 102.5\nstack…', data: { arguments: [102.5] } },
      ],
      logentry: { message: 'logged %s', params: ['Greek yogurt'] },
    });
    expect(leaks(out)).toEqual([]);
    expect(out.user).toEqual({ id: 'u1' });
    expect(out.breadcrumbs).toEqual([]);
    expect(out.logentry!.params).toBeUndefined();
  });

  it('keeps sync replay context: ids and counts', () => {
    const sync = {
      session_id: 'w1',
      step: 'sync',
      rev: 4,
      synced_rev: 2,
      pending_sets: 12,
      completed_sets: 9,
    };
    expect(scrubEvent({ contexts: { sync } }).contexts).toEqual({ sync });
  });

  it('drops local variables from stack frames', () => {
    const out = scrubEvent({
      exception: { values: [{ stacktrace: { frames: [{ vars: { weight: 102.5 } }] } }] },
    });
    expect(leaks(out)).toEqual([]);
  });
});

describe('helpers', () => {
  it('scrubText leaves ordinary messages alone', () => {
    expect(scrubText('Network request failed')).toBe('Network request failed');
  });
  it('scrubUrl keeps host and path', () => {
    expect(scrubUrl('https://a.b/c/d?x=1#y')).toBe('https://a.b/c/d');
    expect(scrubUrl('/checkin/2026-09-28')).toBe('/checkin/2026-09-28');
  });
  it('scrubValue survives cycles by capping depth', () => {
    const a: Record<string, unknown> = { id: 'x' };
    a.self = a;
    expect(() => scrubValue(a)).not.toThrow();
  });
  it('scrubBreadcrumb keeps navigation routes', () => {
    expect(
      scrubBreadcrumb({
        category: 'navigation',
        data: { from: '/today', to: '/checkin/2026-09-28' },
      }),
    ).toEqual({ category: 'navigation', data: { from: '/today', to: '/checkin/2026-09-28' } });
  });
});
