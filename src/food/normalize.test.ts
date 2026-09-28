import { barcodeVariants, normalizeOff, normalizeUsda } from './normalize';

describe('normalizeUsda', () => {
  it('uses the first portion for Foundation and SR foods (per 100 g values)', () => {
    const f = normalizeUsda({
      fdcId: 171477,
      description: 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
      dataType: 'SR Legacy',
      foodNutrients: [
        { nutrientId: 1008, value: 165 },
        { nutrientId: 1003, value: 31 },
        { nutrientId: 1004, value: 3.57 },
        { nutrientId: 1005, value: 0 },
      ],
      foodMeasures: [{ disseminationText: '1 cup, chopped or diced', gramWeight: 140 }],
    })!;
    expect(f).toMatchObject({
      source: 'usda',
      external_id: '171477',
      serving_qty: 1,
      serving_unit: '1 cup, chopped or diced',
      serving_grams: 140,
      kcal: 231,
      protein_g: 43.4,
      fat_g: 5,
      carbs_g: 0,
      fiber_g: null,
    });
  });

  it('falls back to Atwater energy and 100 g when Foundation foods have no kcal or portions', () => {
    const f = normalizeUsda({
      fdcId: 1,
      description: 'Oats',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrient: { id: 2048 }, amount: 379 },
        { nutrient: { id: 1003 }, amount: 13.2 },
        { nutrient: { id: 1079 }, amount: 10.1 },
      ],
    })!;
    expect(f).toMatchObject({
      serving_qty: 100,
      serving_unit: 'g',
      kcal: 379,
      protein_g: 13.2,
      fiber_g: 10.1,
    });
  });

  it('uses the label serving for Branded foods, preferring label nutrients', () => {
    const f = normalizeUsda({
      fdcId: 2,
      description: 'GREEK NONFAT YOGURT',
      dataType: 'Branded',
      brandName: 'Fage',
      servingSize: 170,
      servingSizeUnit: 'g',
      householdServingFullText: '1 container',
      labelNutrients: { calories: { value: 90 }, protein: { value: 18 } },
      foodNutrients: [
        { nutrientId: 1008, value: 53 },
        { nutrientId: 1003, value: 10.6 },
        { nutrientId: 1004, value: 0 },
        { nutrientId: 1005, value: 3.5 },
      ],
    })!;
    expect(f).toMatchObject({
      name: 'Greek nonfat yogurt',
      brand: 'Fage',
      serving_qty: 1,
      serving_unit: '1 container',
      serving_grams: 170,
      kcal: 90,
      protein_g: 18,
      carbs_g: 6,
    });
  });

  it('skips foods without energy', () => {
    expect(normalizeUsda({ fdcId: 3, description: 'Water', foodNutrients: [] })).toBeNull();
  });
});

describe('normalizeOff', () => {
  it('uses per-serving values when the serving is known', () => {
    const f = normalizeOff(
      {
        product_name: 'Clif Bar Chocolate Chip',
        brands: 'Clif Bar, Clif',
        serving_size: '1 bar (68 g)',
        serving_quantity: 68,
        nutriments: {
          'energy-kcal_serving': 250,
          'energy-kcal_100g': 368,
          proteins_100g: 13.2,
          fat_100g: 7.4,
          carbohydrates_100g: 63,
        },
      },
      '722252100900',
    )!;
    expect(f).toMatchObject({
      source: 'open_food_facts',
      external_id: '722252100900',
      brand: 'Clif Bar',
      serving_qty: 1,
      serving_unit: '1 bar (68 g)',
      serving_grams: 68,
      kcal: 250,
      protein_g: 9,
      carbs_g: 42.8,
    });
  });

  it('falls back to 100 g, and converts kJ when there is no kcal', () => {
    const f = normalizeOff(
      { product_name: 'Oat drink', nutriments: { energy_100g: 200, proteins_100g: '1' } },
      '1234567890123',
    )!;
    expect(f).toMatchObject({
      serving_qty: 100,
      serving_unit: 'g',
      kcal: 47.8,
      protein_g: 1,
      fat_g: 0,
    });
  });

  it('skips products without a name or energy', () => {
    expect(
      normalizeOff({ product_name: '', nutriments: { 'energy-kcal_100g': 100 } }, '1'),
    ).toBeNull();
    expect(normalizeOff({ product_name: 'x', nutriments: {} }, '1')).toBeNull();
  });
});

describe('barcodeVariants', () => {
  it('tries UPC-A and EAN-13 forms', () => {
    expect(barcodeVariants('0737628064502')).toEqual(['0737628064502', '737628064502']);
    expect(barcodeVariants('737628064502')).toEqual(['737628064502', '0737628064502']);
    expect(barcodeVariants('96385074')).toEqual(['96385074']);
  });
});
