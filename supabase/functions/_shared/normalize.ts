// GENERATED from src/food/normalize.ts by scripts/sync-functions.js. Do not edit.
/**
 * USDA FoodData Central and Open Food Facts records → one per-serving food shape (the `foods`
 * columns). Pure; shared with the `food` Edge Function through supabase/functions/_shared.
 */

export type FoodCandidate = {
  source: 'usda' | 'open_food_facts';
  external_id: string;
  name: string;
  brand: string | null;
  serving_qty: number;
  serving_unit: string;
  serving_grams: number | null;
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const KJ_PER_KCAL = 4.184;

/* ---------------- USDA ---------------- */

type UsdaNutrient = {
  nutrientId?: number;
  nutrientNumber?: string;
  value?: number;
  unitName?: string;
  nutrient?: { id?: number; unitName?: string };
  amount?: number;
};
type UsdaPortion = {
  gramWeight?: number;
  amount?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string };
  disseminationText?: string;
};
export type UsdaFood = {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  labelNutrients?: Record<string, { value?: number } | undefined>;
  foodNutrients?: UsdaNutrient[];
  foodPortions?: UsdaPortion[];
  foodMeasures?: UsdaPortion[];
};

/** Per-100 g nutrient values by FDC nutrient id (search and detail formats). */
function per100(food: UsdaFood): Map<number, number> {
  const out = new Map<number, number>();
  for (const n of food.foodNutrients ?? []) {
    const id = n.nutrientId ?? n.nutrient?.id;
    const v = n.value ?? n.amount;
    if (id !== undefined && typeof v === 'number') out.set(id, v);
  }
  return out;
}

function usdaKcal(n: Map<number, number>): number | null {
  // 1008 energy (kcal); Foundation foods often only have Atwater 2048 / 2047; 1062 is kJ.
  for (const id of [1008, 2048, 2047]) if (n.has(id)) return n.get(id)!;
  return n.has(1062) ? n.get(1062)! / KJ_PER_KCAL : null;
}

/** "Chicken breast, grilled" style casing for all-caps branded names. */
function tidyName(s: string): string {
  const t = s.trim();
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
}

function usdaServing(
  food: UsdaFood,
  preferGrams?: number,
): { qty: number; unit: string; grams: number } {
  // Keep the serving the user saw in search (the detail record may list more portions), as long
  // as the source has it: its label serving, one of its portions, or 100 g.
  if (preferGrams === 100) return { qty: 100, unit: 'g', grams: 100 };
  if (
    food.servingSize &&
    food.servingSize > 0 &&
    /^(g|ml|grm|mlt)$/i.test(food.servingSizeUnit ?? 'g')
  ) {
    const unit = (food.servingSizeUnit ?? 'g').toLowerCase().startsWith('m') ? 'ml' : 'g';
    const text = food.householdServingFullText?.trim();
    return text
      ? { qty: 1, unit: text, grams: food.servingSize }
      : { qty: r1(food.servingSize), unit, grams: food.servingSize };
  }
  const portions = [...(food.foodPortions ?? []), ...(food.foodMeasures ?? [])].filter(
    (x) => (x.gramWeight ?? 0) > 0,
  );
  const p =
    (preferGrams !== undefined
      ? portions.find((x) => Math.abs(x.gramWeight! - preferGrams) < 0.05)
      : undefined) ?? portions[0];
  if (p) {
    const unit =
      p.disseminationText?.trim() ||
      p.portionDescription?.trim() ||
      [
        p.modifier,
        p.measureUnit?.name && p.measureUnit.name !== 'undetermined' ? p.measureUnit.name : '',
      ]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'serving';
    const qty = p.disseminationText || p.portionDescription ? 1 : (p.amount ?? 1);
    return { qty, unit, grams: p.gramWeight! };
  }
  return { qty: 100, unit: 'g', grams: 100 };
}

export function normalizeUsda(food: UsdaFood, preferGrams?: number): FoodCandidate | null {
  const n = per100(food);
  const kcal100 = usdaKcal(n);
  if (kcal100 === null || !food.description) return null;
  const s = usdaServing(food, preferGrams);
  const f = s.grams / 100;
  const label = food.labelNutrients;
  const fromLabel = (k: string) =>
    typeof label?.[k]?.value === 'number' ? label[k]!.value! : null;
  const pick = (k: string, id: number) => fromLabel(k) ?? (n.get(id) ?? 0) * f;
  return {
    source: 'usda',
    external_id: String(food.fdcId),
    name: tidyName(food.description),
    brand: food.brandName?.trim() || food.brandOwner?.trim() || null,
    serving_qty: s.qty,
    serving_unit: s.unit,
    serving_grams: r1(s.grams),
    kcal: r1(fromLabel('calories') ?? kcal100 * f),
    protein_g: r1(pick('protein', 1003)),
    fat_g: r1(pick('fat', 1004)),
    carbs_g: r1(pick('carbohydrates', 1005)),
    fiber_g: n.has(1079) || fromLabel('fiber') !== null ? r1(pick('fiber', 1079)) : null,
  };
}

/* ---------------- Open Food Facts ---------------- */

export type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
};

export function normalizeOff(p: OffProduct, barcode: string): FoodCandidate | null {
  const name = (p.product_name_en || p.product_name || '').trim();
  const nm = p.nutriments ?? {};
  const num = (k: string) => {
    const v = nm[k];
    const x = typeof v === 'string' ? Number(v) : v;
    return typeof x === 'number' && Number.isFinite(x) ? x : null;
  };
  const kcalOf = (suffix: string) =>
    num(`energy-kcal_${suffix}`) ??
    (num(`energy_${suffix}`) !== null ? num(`energy_${suffix}`)! / KJ_PER_KCAL : null);
  const q = Number(p.serving_quantity);
  const grams = Number.isFinite(q) && q > 0 ? q : null;
  const kcal100 = kcalOf('100g');
  const kcalServing = kcalOf('serving');
  if (!name || (kcal100 === null && kcalServing === null)) return null;

  const value = (k: string) => {
    if (grams !== null) return num(`${k}_serving`) ?? (num(`${k}_100g`) ?? 0) * (grams / 100);
    return num(`${k}_100g`) ?? 0;
  };
  const kcal =
    grams !== null
      ? (kcalServing ?? (kcal100 ?? 0) * (grams / 100))
      : (kcal100 ?? kcalServing ?? 0);
  return {
    source: 'open_food_facts',
    external_id: barcode,
    name,
    brand: p.brands?.split(',')[0]?.trim() || null,
    serving_qty: grams !== null ? 1 : 100,
    serving_unit: grams !== null ? p.serving_size?.trim() || `${grams} g` : 'g',
    serving_grams: grams !== null ? r1(grams) : 100,
    kcal: r1(kcal),
    protein_g: r1(value('proteins')),
    fat_g: r1(value('fat')),
    carbs_g: r1(value('carbohydrates')),
    fiber_g:
      num('fiber_100g') === null && num('fiber_serving') === null ? null : r1(value('fiber')),
  };
}

/**
 * Codes to try for a scanned barcode: iOS reports UPC-A as a 13-digit EAN with a leading 0, and
 * databases store either form.
 */
export function barcodeVariants(code: string): string[] {
  const digits = code.replace(/\D/g, '');
  const out = new Set([digits]);
  if (digits.length === 13 && digits.startsWith('0')) out.add(digits.slice(1));
  if (digits.length === 12) out.add(`0${digits}`);
  return [...out].filter((c) => c.length >= 8);
}
