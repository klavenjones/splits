import { addDays } from './calendar';
import { buildWeeks, dueWeek, localTime, proposeTargets, type NutritionProfile } from './checkin';

const at = (iso: string) => new Date(iso);

describe('localTime', () => {
  it('works in zones with whole, half and quarter-hour offsets', () => {
    // Monday 2026-10-05 00:30 UTC
    const t = at('2026-10-05T00:30:00Z');
    expect(localTime(t, 'America/New_York')).toEqual({
      date: '2026-10-04',
      weekday: 7,
      minutes: 20 * 60 + 30,
    });
    expect(localTime(t, 'Asia/Kolkata')).toEqual({
      date: '2026-10-05',
      weekday: 1,
      minutes: 6 * 60,
    });
    expect(localTime(t, 'Asia/Kathmandu')).toEqual({
      date: '2026-10-05',
      weekday: 1,
      minutes: 6 * 60 + 15,
    });
    expect(localTime(t, 'Not/AZone')).toEqual({ date: '2026-10-05', weekday: 1, minutes: 30 });
  });

  it('follows daylight saving', () => {
    // US clocks go back on Sunday 2026-11-01: 08:00 UTC is 03:00 EST that Monday… and EDT before.
    expect(localTime(at('2026-11-02T08:00:00Z'), 'America/New_York').minutes).toBe(3 * 60);
    expect(localTime(at('2026-10-26T08:00:00Z'), 'America/New_York').minutes).toBe(4 * 60);
  });
});

describe('dueWeek', () => {
  const base = { checkinWeekday: 1, startDate: '2026-09-21', hasRow: () => false };

  it('is due on the check-in day from 04:00 local', () => {
    expect(
      dueWeek({ ...base, now: { date: '2026-10-05', weekday: 1, minutes: 3 * 60 + 59 } }),
    ).toBeNull();
    expect(dueWeek({ ...base, now: { date: '2026-10-05', weekday: 1, minutes: 4 * 60 } })).toBe(
      '2026-10-05',
    );
  });

  it('catches up later in the same week, but not once the row exists', () => {
    expect(dueWeek({ ...base, now: { date: '2026-10-07', weekday: 3, minutes: 60 } })).toBe(
      '2026-10-05',
    );
    expect(
      dueWeek({
        ...base,
        hasRow: (w) => w === '2026-10-05',
        now: { date: '2026-10-07', weekday: 3, minutes: 60 },
      }),
    ).toBeNull();
  });

  it('waits for a later check-in day, and never in the start week', () => {
    const wed = { ...base, checkinWeekday: 3 };
    expect(dueWeek({ ...wed, now: { date: '2026-10-06', weekday: 2, minutes: 600 } })).toBeNull();
    expect(dueWeek({ ...wed, now: { date: '2026-10-07', weekday: 3, minutes: 600 } })).toBe(
      '2026-10-05',
    );
    expect(dueWeek({ ...base, now: { date: '2026-09-21', weekday: 1, minutes: 600 } })).toBeNull();
  });
});

describe('buildWeeks and proposeTargets', () => {
  const profile: NutritionProfile = {
    sex: 'male',
    experience: 'beginner',
    goal: 'lose_fat',
    phase: 'cut',
    rate_mode: 'auto',
    weekly_rate_pct: -0.7,
    start_date: '2026-09-23', // a Wednesday
    start_weight_kg: 93,
    start_body_fat_pct: 32,
  };

  it('starts week 1 at the start date’s Monday and leaves days before the start empty', () => {
    const weeks = buildWeeks(profile.start_date, '2026-10-05', [
      { date: '2026-09-22', weightKg: 99, kcal: 9999, bodyFatPct: null },
      { date: '2026-09-23', weightKg: 93, kcal: 2000, bodyFatPct: null },
      { date: '2026-10-04', weightKg: 92.5, kcal: 1900, bodyFatPct: null },
    ]);
    expect(weeks).toHaveLength(2);
    expect(weeks[0][1]).toEqual({ weightKg: null, kcal: null, bodyFatPct: null });
    expect(weeks[0][2]).toEqual({ weightKg: 93, kcal: 2000, bodyFatPct: null });
    expect(weeks[1][6].kcal).toBe(1900);
  });

  it('proposes a row for the check-in week with the last week’s averages', () => {
    const days = Array.from({ length: 12 }, (_, i) => ({
      date: addDays('2026-09-23', i),
      weightKg: 93 - i * 0.1,
      kcal: 2000,
      bodyFatPct: null,
    }));
    const p = proposeTargets(profile, '2026-10-05', days)!;
    expect(p.proposal.week_start).toBe('2026-10-05');
    expect(p.proposal.days_logged).toBe(7);
    expect(p.proposal.avg_kcal).toBe(2000);
    expect(p.proposal.kcal_low).toBeLessThanOrEqual(p.proposal.kcal_target);
    expect(p.result.adaptive).toBe(false);
  });
});
