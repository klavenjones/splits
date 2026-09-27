/**
 * Calendar-day helpers. Pure: callers pass the date in. Calendar days are local `YYYY-MM-DD`
 * strings; weeks start on Monday.
 */

/** A local calendar date as `YYYY-MM-DD` (the device's timezone, not UTC). */
export function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parses `YYYY-MM-DD` as a local date at midnight. */
export function fromLocalDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The Monday of the week containing `day` (`YYYY-MM-DD`). Sunday belongs to the week before. */
export function mondayOf(day: string): string {
  const date = fromLocalDate(day);
  const offset = (date.getDay() + 6) % 7; // Mon = 0 … Sun = 6
  date.setDate(date.getDate() - offset);
  return toLocalDate(date);
}
