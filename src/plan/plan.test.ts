import { classify, notesFor } from './coach';
import { averagePace, distanceNumber, liftCounts, sessionMeta, templateMeta } from './describe';
import { fillItems, fillSlots, type FillTemplate } from './fill';
import {
  addDays,
  byDay,
  longDay,
  rackDays,
  relativeWeek,
  shiftDates,
  shortDay,
  weekDays,
  weekLabel,
  weekTotals,
  type PlanSession,
  type PlanTemplate,
} from './week';

const upperA: PlanTemplate = {
  id: 'tu',
  name: 'upper A',
  kind: 'lift',
  est_duration_s: 2700,
  est_distance_m: null,
  exercises: [
    { target_sets: 4, primary_muscle: 'chest' },
    { target_sets: 3, primary_muscle: 'lats' },
    { target_sets: 3, primary_muscle: 'side delts' },
  ],
  segments: [],
};
const lowerA: PlanTemplate = {
  ...upperA,
  id: 'tl',
  name: 'lower A',
  exercises: [
    { target_sets: 4, primary_muscle: 'quads' },
    { target_sets: 3, primary_muscle: 'hamstrings' },
    { target_sets: 3, primary_muscle: 'abs' },
  ],
};
const intervals: PlanTemplate = {
  id: 'ti',
  name: 'intervals 6 × 800 m',
  kind: 'run',
  est_duration_s: 3300,
  est_distance_m: 10018,
  exercises: [],
  segments: [
    { segment_type: 'warmup', target_type: 'pace', target_effort: null, target_hr_zone: null },
    { segment_type: 'interval', target_type: 'pace', target_effort: null, target_hr_zone: null },
  ],
};
const easy: PlanTemplate = {
  ...intervals,
  id: 'te',
  name: 'easy run',
  est_duration_s: 2280,
  est_distance_m: 6437,
  segments: [
    { segment_type: 'steady', target_type: 'effort', target_effort: 'easy', target_hr_zone: null },
  ],
};
const long: PlanTemplate = {
  ...easy,
  id: 'tlr',
  name: 'long run',
  est_distance_m: 12875,
  est_duration_s: 4680,
};

let n = 0;
const session = (
  t: PlanTemplate,
  date: string,
  status: PlanSession['status'] = 'planned',
): PlanSession => ({
  id: `s${++n}`,
  kind: t.kind,
  name: t.name,
  scheduled_date: date,
  status,
  skip_reason: null,
  template_id: t.id,
  template: t,
});

describe('week', () => {
  it('lists the days and labels the week', () => {
    expect(weekDays('2026-09-28')).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ]);
    expect(weekLabel('2026-09-21')).toBe('Sep 21 to 27');
    expect(weekLabel('2026-09-28')).toBe('Sep 28 to Oct 4');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(shortDay('2026-09-24')).toBe('Thu 24');
    expect(longDay('2026-09-25')).toBe('Fri Sep 25');
  });

  it('names the week relative to today', () => {
    const today = '2026-09-27'; // a Sunday
    expect(relativeWeek('2026-09-21', today)).toBe('this week');
    expect(relativeWeek('2026-09-28', today)).toBe('next week');
    expect(relativeWeek('2026-09-14', today)).toBe('last week');
    expect(relativeWeek('2026-10-05', today)).toBe('');
  });

  it('totals planned and done, ignoring skipped', () => {
    const t = weekTotals([
      session(upperA, '2026-09-21', 'completed'),
      session(intervals, '2026-09-22', 'completed'),
      session(lowerA, '2026-09-23', 'skipped'),
      session(easy, '2026-09-24'),
    ]);
    expect(t).toEqual({
      runs: 2,
      runsDone: 1,
      lifts: 1,
      liftsDone: 1,
      runMeters: 10018 + 6437,
      runMetersDone: 10018,
    });
  });

  it('groups by day, done before planned, lifts before runs', () => {
    const run = session(easy, '2026-09-25');
    const lift = session(upperA, '2026-09-25');
    const done = session(easy, '2026-09-25', 'completed');
    expect(byDay([run, lift, done]).get('2026-09-25')).toEqual([done, lift, run]);
  });

  it('builds rack days Monday first without skipped plates', () => {
    const days = rackDays('2026-09-21', [
      session(upperA, '2026-09-21', 'completed'),
      session(lowerA, '2026-09-23', 'skipped'),
      session(easy, '2026-09-27'),
    ]);
    expect(days.map((d) => d.label[0])).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(days[0]).toEqual({
      label: 'Monday',
      date: 21,
      sessions: [{ kind: 'lift', done: true }],
    });
    expect(days[2].sessions).toEqual([]);
    expect(days[6].sessions).toEqual([{ kind: 'run', done: false }]);
  });

  it('shifts the rest of the week a day, spilling Sunday into Monday', () => {
    const mon = session(upperA, '2026-09-28');
    const tue = session(easy, '2026-09-29');
    const wed = session(lowerA, '2026-09-30', 'skipped');
    const thu = session(easy, '2026-10-01', 'completed');
    const sun = session(long, '2026-10-04');
    const nextTue = session(easy, '2026-10-06');
    const out = shiftDates([mon, tue, wed, thu, sun, nextTue], tue.id);
    expect(out.map((s) => s.scheduled_date)).toEqual([
      '2026-09-28',
      '2026-09-30',
      '2026-09-30',
      '2026-10-01',
      '2026-10-05',
      '2026-10-06',
    ]);
    expect(shiftDates([wed], wed.id)[0].scheduled_date).toBe('2026-09-30');
  });
});

describe('fill', () => {
  const templates: FillTemplate[] = [
    upperA,
    lowerA,
    { id: 'tb', name: 'upper B', kind: 'lift' },
    intervals,
    easy,
  ];

  it('lays Balanced over next week, rotating templates by name', () => {
    const slots = fillSlots('balanced', '2026-09-28', '2026-09-27', [], templates);
    expect(slots.map((s) => [s.date.slice(5), s.plan, s.template?.name ?? null])).toEqual([
      ['09-28', 'lift', 'lower A'],
      ['09-29', 'run', 'easy run'],
      ['09-30', 'lift', 'upper A'],
      ['10-01', 'run', 'intervals 6 × 800 m'],
      ['10-02', 'lift', 'upper B'],
      ['10-03', 'run', 'easy run'],
      ['10-04', 'rest', null],
    ]);
    expect(fillItems(slots)).toHaveLength(6);
  });

  it('skips past days, planned days and kinds without templates', () => {
    const slots = fillSlots(
      'balanced',
      '2026-09-21',
      '2026-09-23',
      [
        { scheduled_date: '2026-09-24', status: 'planned' },
        { scheduled_date: '2026-09-25', status: 'skipped' },
      ],
      [upperA],
    );
    expect(slots.map((s) => s.blocked)).toEqual([
      'past',
      'past',
      null,
      'planned',
      null,
      'no_templates',
      null,
    ]);
    expect(fillItems(slots)).toEqual([
      { template_id: 'tu', scheduled_date: '2026-09-23' },
      { template_id: 'tu', scheduled_date: '2026-09-25' },
    ]);
  });
});

describe('coach', () => {
  it('classifies templates', () => {
    expect(classify(upperA)).toMatchObject({ upper: true, heavyLower: false });
    expect(classify(lowerA)).toMatchObject({ upper: false, heavyLower: true });
    expect(classify(intervals)).toMatchObject({ hardRun: true, longRun: false });
    expect(classify(easy)).toMatchObject({ hardRun: false, longRun: false });
    expect(classify(long)).toMatchObject({ hardRun: false, longRun: true });
    expect(
      classify({
        ...easy,
        segments: [{ ...easy.segments[0], target_type: 'heart_rate_zone', target_hr_zone: 4 }],
      }).hardRun,
    ).toBe(true);
    expect(classify(null)).toMatchObject({ upper: false, hardRun: false });
  });

  it('warns about heavy legs the day before a hard or long run, both ways', () => {
    const lower = session(lowerA, '2026-09-22');
    const run = session(intervals, '2026-09-24');
    // Moving lower A to Wednesday, the day before Thursday's intervals.
    expect(notesFor(lower, '2026-09-23', [lower, run])).toEqual([
      'lower A lands the day before intervals 6 × 800 m. Heavy legs can flatten a hard run; try to leave a day between them.',
    ]);
    // Moving the intervals to Wednesday, the day after Tuesday's lower A.
    expect(notesFor(run, '2026-09-23', [lower, run])[0]).toMatch(
      /^lower A is the day before, on Tue 22/,
    );
    // A lower day after the run, or an easy run, is fine.
    expect(notesFor(lower, '2026-09-25', [lower, run])).toEqual([]);
    const e = session(easy, '2026-09-24');
    expect(notesFor(lower, '2026-09-23', [e])).toEqual([]);
    // A skipped run doesn't count.
    expect(notesFor(lower, '2026-09-23', [{ ...run, status: 'skipped' }])).toEqual([]);
  });

  it('warns about two upper-body days in a row', () => {
    const a = session(upperA, '2026-09-21');
    const b = session({ ...upperA, id: 'tb', name: 'upper B' }, '2026-09-25');
    expect(notesFor(b, '2026-09-22', [a, b])).toEqual([
      "upper A is on Mon 21, so that's two upper-body days in a row. Your shoulders and elbows may not be fresh.",
    ]);
    expect(notesFor(b, '2026-09-23', [a, b])).toEqual([]);
  });
});

describe('describe', () => {
  it('writes session and template meta lines', () => {
    expect(sessionMeta(session(upperA, '2026-09-28'), 'imperial')).toBe('3 exercises · 45 min');
    expect(sessionMeta(session(intervals, '2026-09-29'), 'imperial')).toBe('6.2 mi · 55 min');
    expect(sessionMeta({ template: null }, 'imperial')).toBe('template deleted');
    expect(
      templateMeta(
        { kind: 'lift', exercise_count: 6, est_distance_m: null, est_duration_s: 2700 },
        'metric',
      ),
    ).toBe('6 exercises · 45 min');
    expect(liftCounts(upperA)).toBe('3 exercises · 10 sets');
    expect(averagePace(easy, 'imperial')).toBe('9:30');
    expect(distanceNumber(6437, 'imperial')).toBe('4.0');
  });
});
