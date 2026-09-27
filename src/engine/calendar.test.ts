import { fromLocalDate, mondayOf, toLocalDate } from './calendar';

describe('calendar', () => {
  it('formats the local date, not the UTC date', () => {
    // 23:30 local on Sep 27 stays Sep 27 whatever the UTC offset.
    expect(toLocalDate(new Date(2026, 8, 27, 23, 30))).toBe('2026-09-27');
    expect(toLocalDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01');
  });

  it('round-trips YYYY-MM-DD', () => {
    expect(toLocalDate(fromLocalDate('2026-02-28'))).toBe('2026-02-28');
  });

  it('finds the Monday of the week', () => {
    expect(mondayOf('2026-09-28')).toBe('2026-09-28'); // Monday
    expect(mondayOf('2026-10-01')).toBe('2026-09-28'); // Thursday
    expect(mondayOf('2026-09-27')).toBe('2026-09-21'); // Sunday → previous Monday
    expect(mondayOf('2026-01-03')).toBe('2025-12-29'); // across a year boundary
  });
});
