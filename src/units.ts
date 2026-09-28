/**
 * Unit conversions. The app stores metric (kg, cm, m, s, s/km) and converts only for display.
 */

export const LB_PER_KG = 2.20462262;
export const CM_PER_IN = 2.54;
export const M_PER_MI = 1609.344;

export const kgToLb = (kg: number) => kg * LB_PER_KG;
export const lbToKg = (lb: number) => lb / LB_PER_KG;

export const cmToIn = (cm: number) => cm / CM_PER_IN;
export const inToCm = (inches: number) => inches * CM_PER_IN;

export const mToMi = (m: number) => m / M_PER_MI;
export const miToM = (mi: number) => mi * M_PER_MI;

/** Pace: seconds per km ↔ seconds per mile. */
export const secPerKmToSecPerMi = (sPerKm: number) => (sPerKm * M_PER_MI) / 1000;
export const secPerMiToSecPerKm = (sPerMi: number) => (sPerMi * 1000) / M_PER_MI;

/* ---------------- Display units (users.unit_system) ---------------- */

export type UnitSystem = 'imperial' | 'metric';

export const weightUnit = (s: UnitSystem) => (s === 'imperial' ? 'lb' : 'kg');
export const lengthUnit = (s: UnitSystem) => (s === 'imperial' ? 'in' : 'cm');

export const toDisplayWeight = (kg: number, s: UnitSystem) => (s === 'imperial' ? kgToLb(kg) : kg);
export const fromDisplayWeight = (v: number, s: UnitSystem) => (s === 'imperial' ? lbToKg(v) : v);
export const toDisplayLength = (cm: number, s: UnitSystem) => (s === 'imperial' ? cmToIn(cm) : cm);
export const fromDisplayLength = (v: number, s: UnitSystem) => (s === 'imperial' ? inToCm(v) : v);

/* ---------------- Running: pace, duration, distance ---------------- */

export const paceUnit = (s: UnitSystem) => (s === 'imperial' ? '/mi' : '/km');

/** "2:30", "12:05", "1:05:00". Rounds to whole seconds. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** "2:30" → 150, "1:05:00" → 3900, "90" → 90 (plain seconds). Null when unreadable. */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.slice(1).some((n) => n >= 60)) return null;
  return nums.reduce((acc, n) => acc * 60 + n, 0);
}

/** s/km → "7:00 /mi" in the user's units. */
export function formatPace(sPerKm: number, s: UnitSystem, withUnit = true): string {
  const v = s === 'imperial' ? secPerKmToSecPerMi(sPerKm) : sPerKm;
  return withUnit ? `${formatDuration(v)} ${paceUnit(s)}` : formatDuration(v);
}

/** "7:00" per mi or km (the user's units) → s/km, rounded to whole seconds. */
export function parsePace(text: string, s: UnitSystem): number | null {
  const v = parseDuration(text);
  if (v === null || v <= 0 || !text.includes(':')) return null;
  return Math.round(s === 'imperial' ? secPerMiToSecPerKm(v) : v);
}

/** Pace tolerance: seconds per display unit ↔ s/km. */
export const toleranceToSecPerKm = (sec: number, s: UnitSystem) =>
  Math.round(s === 'imperial' ? secPerMiToSecPerKm(sec) : sec);
export const toleranceFromSecPerKm = (sPerKm: number, s: UnitSystem) =>
  Math.round(s === 'imperial' ? secPerKmToSecPerMi(sPerKm) : sPerKm);

const trim = (n: number, decimals: number) => String(Number(n.toFixed(decimals)));

/**
 * Race-style distances: under 1 mile/km in meters ("800 m", "400 m"); otherwise miles or km
 * to one decimal ("1 mi", "6.2 mi", "5 km").
 */
export function formatDistance(m: number, s: UnitSystem): string {
  if (m < (s === 'imperial' ? M_PER_MI - 1 : 1000)) return `${Math.round(m)} m`;
  return s === 'imperial' ? `${trim(mToMi(m), 1)} mi` : `${trim(m / 1000, 1)} km`;
}

/* ---------------- lifting weights ---------------- */

/** Rounds to the nearest 0.5 of the display unit. */
const half = (v: number) => Math.round(v * 2) / 2;

/** kg → "185" or "82.5" in the user's units (no unit), rounded to 0.5. */
export function formatWeight(kg: number, s: UnitSystem): string {
  return String(half(toDisplayWeight(kg, s)));
}

/** "185" (lb or kg, the user's units) → kg; null when empty or not a number ≥ 0. */
export function parseWeight(text: string, s: UnitSystem): number | null {
  const v = Number(text.replace(',', '.').trim());
  if (!text.trim() || !Number.isFinite(v) || v < 0) return null;
  return fromDisplayWeight(half(v), s);
}

/** "185 × 8", "bw × 20" (no weight), or "–". */
export function formatSet(kg: number | null, reps: number | null, s: UnitSystem): string {
  if (reps == null) return '–';
  return `${kg != null && kg > 0 ? formatWeight(kg, s) : 'bw'} × ${reps}`;
}
