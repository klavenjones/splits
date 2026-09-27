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
