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
