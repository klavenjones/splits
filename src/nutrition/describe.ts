/** Display text for foods and logs. Pure. */

const trim = (n: number) => String(Math.round(n * 100) / 100);

/** "1 cup", "2 × 1 container", "150 g", for `servings` of a food's serving. */
export function servingText(
  f: { serving_qty: number; serving_unit: string },
  servings = 1,
): string {
  const unit = f.serving_unit.trim();
  const qty = Number(f.serving_qty);
  // Units like "1 cup, chopped" already carry their amount.
  if (qty === 1 && /^\d/.test(unit)) return servings === 1 ? unit : `${trim(servings)} × ${unit}`;
  return `${trim(qty * servings)} ${unit}`;
}

/** "1,240" */
export const kcalText = (n: number) => Math.round(n).toLocaleString('en-US');

/** Macros add up to the calories within 15% (4 kcal/g protein and carbs, 9 fat). */
export function macrosFit(kcal: number, p: number, f: number, c: number): boolean {
  const m = p * 4 + c * 4 + f * 9;
  if (m === 0 || kcal === 0) return true;
  return Math.abs(m - kcal) / kcal <= 0.15;
}
