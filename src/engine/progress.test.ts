import { isEasyRun } from './runs';
import {
  currentE1rm,
  dayFromNumber,
  dayNumber,
  e1rmSeries,
  easyPaceByWeek,
  keyLifts,
  measurements,
  monthMeters,
  niceDomain,
  paceChange,
  percentChange,
  rangeStart,
  recentPRs,
  relativeDay,
  rollingAverage,
  weekStarts,
  weeklyAverage,
  weeklyMeters,
  weeklyVolume,
  type Checkin,
  type RunEntry,
  type SessionBest,
} from './progress';

const TODAY = '2026-09-27'; // a Sunday

const best = (p: Partial<SessionBest> & { performed_on: string }): SessionBest => ({
  session_id: `s-${p.performed_on}-${p.exercise_id ?? 'ex1'}`,
  exercise_id: 'ex1',
  session_name: 'upper A',
  best_weight_kg: 80,
  best_reps: 8,
  best_e1rm_kg: 101.33,
  volume_kg: 1000,
  working_sets: 3,
  total_reps: 24,
  prev_best_e1rm_kg: null,
  ...p,
});

describe('weeks', () => {
  it('lists Mondays oldest first, crossing a year end', () => {
    expect(weekStarts(TODAY, 3)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21']);
    expect(weekStarts('2027-01-06', 3)).toEqual(['2026-12-21', '2026-12-28', '2027-01-04']);
  });

  it('labels days relative to today', () => {
    expect(relativeDay(TODAY, TODAY)).toBe('today');
    expect(relativeDay('2026-09-26', TODAY)).toBe('yesterday');
    expect(relativeDay('2026-09-21', TODAY)).toBe('Mon');
    expect(relativeDay('2026-09-07', TODAY)).toBe('Sep 7');
  });

  it('round-trips chart day numbers', () => {
    expect(dayFromNumber(dayNumber('2026-03-29'))).toBe('2026-03-29');
    expect(dayNumber('2026-09-28') - dayNumber('2026-09-27')).toBe(1);
  });
});

describe('strength', () => {
  const rows = [
    best({ performed_on: '2026-08-03', volume_kg: 500 }),
    best({ performed_on: '2026-09-21', volume_kg: 700 }),
    best({ performed_on: '2026-09-24', volume_kg: 300, exercise_id: 'ex2' }),
  ];

  it('sums volume by week, with empty weeks at 0', () => {
    expect(weeklyVolume(rows, weekStarts(TODAY, 3))).toEqual([
      { week: '2026-09-07', kg: 0 },
      { week: '2026-09-14', kg: 0 },
      { week: '2026-09-21', kg: 1000 },
    ]);
    expect(percentChange(800, 1000)).toBe(25);
    expect(percentChange(0, 1000)).toBeNull();
  });

  it('finds PRs (a first session is only a baseline), newest first', () => {
    const prs = recentPRs(
      [
        best({ performed_on: '2026-09-01', best_e1rm_kg: 100 }),
        best({ performed_on: '2026-09-08', best_e1rm_kg: 105, prev_best_e1rm_kg: 100 }),
        best({ performed_on: '2026-09-15', best_e1rm_kg: 104, prev_best_e1rm_kg: 105 }),
        best({ performed_on: '2026-09-22', best_e1rm_kg: 110, prev_best_e1rm_kg: 105 }),
      ],
      5,
    );
    expect(prs.map((r) => r.performed_on)).toEqual(['2026-09-22', '2026-09-08']);
  });

  it('picks key lifts by session count, then e1RM, with the 4-week change', () => {
    const lifts = keyLifts(
      [
        best({ exercise_id: 'bench', performed_on: '2026-08-20', best_e1rm_kg: 100 }),
        best({ exercise_id: 'bench', performed_on: '2026-09-10', best_e1rm_kg: 104 }),
        best({
          exercise_id: 'bench',
          performed_on: '2026-09-24',
          best_e1rm_kg: 106,
          best_weight_kg: 85,
        }),
        best({ exercise_id: 'squat', performed_on: '2026-09-01', best_e1rm_kg: 140 }),
        best({ exercise_id: 'squat', performed_on: '2026-09-22', best_e1rm_kg: 150 }),
        best({ exercise_id: 'row', performed_on: '2026-09-02', best_e1rm_kg: 90 }),
        best({ exercise_id: 'row', performed_on: '2026-09-23', best_e1rm_kg: 92 }),
        best({ exercise_id: 'pushup', performed_on: '2026-09-23', best_e1rm_kg: 0 }),
        best({ exercise_id: 'curl', performed_on: '2026-09-23', best_e1rm_kg: 40 }),
      ],
      TODAY,
    );
    expect(lifts.map((l) => l.exercise_id)).toEqual(['bench', 'squat', 'row']);
    expect(lifts[0]).toMatchObject({ e1rm_kg: 106, change_kg: 6, sessions: 3 });
    expect(lifts[0].from).toEqual({ weight_kg: 85, reps: 8, performed_on: '2026-09-24' });
    // Squat's only earlier session is 26 days back: still inside the current 4 weeks.
    expect(lifts[1]).toMatchObject({ e1rm_kg: 150, change_kg: null });
  });

  it('falls back to the latest session when nothing is in the last 4 weeks', () => {
    expect(
      currentE1rm([best({ performed_on: '2026-06-01', best_e1rm_kg: 90 })], TODAY),
    ).toMatchObject({
      e1rm_kg: 90,
      change_kg: null,
    });
    expect(currentE1rm([best({ performed_on: TODAY, best_e1rm_kg: 0 })], TODAY)).toBeNull();
  });

  it('charts session dots and a weekly-best line', () => {
    const { dots, line } = e1rmSeries([
      best({ performed_on: '2026-09-21', best_e1rm_kg: 100 }),
      best({ performed_on: '2026-09-24', best_e1rm_kg: 104 }),
      best({ performed_on: '2026-09-14', best_e1rm_kg: 98 }),
      best({ performed_on: '2026-09-15', best_e1rm_kg: 0 }),
    ]);
    expect(dots.map((d) => d.y)).toEqual([98, 100, 104]);
    expect(line.map((d) => d.y)).toEqual([98, 104]);
  });
});

describe('running', () => {
  const run = (date: string, km: number, pace: number, easy = true): RunEntry => ({
    id: date,
    name: 'easy run',
    date,
    distance_m: km * 1000,
    duration_s: km * pace,
    easy,
  });
  const runs = [
    run('2026-08-31', 5, 360),
    run('2026-09-01', 5, 380),
    run('2026-09-03', 6, 280, false),
    run('2026-09-22', 8, 350),
    run('2026-09-26', 2, 340),
  ];
  const weeks = weekStarts(TODAY, 4);

  it('totals weeks and the month, and averages full weeks', () => {
    expect(weeklyMeters(runs, weeks).map((w) => w.m)).toEqual([16000, 0, 0, 10000]);
    expect(monthMeters(runs, TODAY)).toBe(21000);
    expect(weeklyAverage(runs, weeks.slice(0, 3))).toBeCloseTo(16000 / 3);
  });

  it('weights easy pace by distance and skips hard runs', () => {
    const series = easyPaceByWeek(runs, weeks);
    expect(series.map((s) => s.pace)).toEqual([370, null, null, 348]);
    expect(paceChange(series)).toBe(-22);
    expect(paceChange([{ pace: null }, { pace: 350 }])).toBeNull();
  });

  it('knows an easy template', () => {
    const seg = (p: object) => ({
      segment_type: 'steady',
      target_type: 'effort',
      target_effort: 'easy',
      target_hr_zone: null,
      ...p,
    });
    const t = (segments: object[], km = 6) => ({
      est_distance_m: km * 1000,
      est_duration_s: km * 375,
      segments: segments as never,
    });
    expect(isEasyRun(t([seg({})]))).toBe(true);
    expect(
      isEasyRun(t([seg({ target_type: 'pace', target_pace_s_per_km: 354, target_effort: null })])),
    ).toBe(true);
    expect(
      isEasyRun(t([seg({ target_type: 'pace', target_pace_s_per_km: 300, target_effort: null })])),
    ).toBe(false);
    expect(isEasyRun(t([seg({ segment_type: 'warmup' }), seg({ segment_type: 'interval' })]))).toBe(
      false,
    );
    expect(isEasyRun(t([seg({ target_effort: 'moderate' })]))).toBe(false);
    expect(isEasyRun(t([seg({ target_type: 'heart_rate_zone', target_hr_zone: 3 })]))).toBe(false);
    expect(isEasyRun(t([seg({})], 16))).toBe(false);
    expect(isEasyRun(null)).toBe(false);
  });
});

describe('body', () => {
  const c = (
    checkin_date: string,
    weight_kg: number | null,
    more: Partial<Checkin> = {},
  ): Checkin => ({
    checkin_date,
    weight_kg,
    waist_cm: null,
    neck_cm: null,
    hip_cm: null,
    body_fat_pct: null,
    ...more,
  });

  it('averages the trailing 7 days, skipping missing days', () => {
    const avg = rollingAverage([
      c('2026-09-10', 94),
      c('2026-09-01', 96),
      c('2026-09-12', 92),
      c('2026-09-18', 90),
      c('2026-09-13', null),
    ]);
    expect(avg).toEqual([
      { date: '2026-09-01', kg: 96 },
      { date: '2026-09-10', kg: 94 },
      { date: '2026-09-12', kg: 93 },
      { date: '2026-09-18', kg: 91 },
    ]);
  });

  it('gives each measurement against its first reading, body fat against the start', () => {
    const list = measurements(
      [
        c('2026-09-01', 95, { waist_cm: 116, neck_cm: 41, body_fat_pct: 32 }),
        c('2026-09-25', 94, { waist_cm: 115, body_fat_pct: 31 }),
      ],
      { body_fat_pct: 33 },
    );
    expect(list).toEqual([
      { key: 'waist_cm', value: 115, date: '2026-09-25', change: -1 },
      { key: 'neck_cm', value: 41, date: '2026-09-01', change: null },
      { key: 'body_fat_pct', value: 31, date: '2026-09-25', change: -2 },
    ]);
  });

  it('turns range chips into start days', () => {
    expect(rangeStart('1M', TODAY)).toBe('2026-08-29');
    expect(rangeStart('All', TODAY)).toBeNull();
  });

  it('pads chart domains, including a flat line', () => {
    expect(niceDomain([100, 110])).toEqual([98.5, 111.5]);
    const [lo, hi] = niceDomain([90, 90]);
    expect(lo).toBeLessThan(90);
    expect(hi).toBeGreaterThan(90);
  });
});
