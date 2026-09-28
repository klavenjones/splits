import { macrosFit, servingText } from './describe';

describe('servingText', () => {
  it('shows the serving times the number of servings', () => {
    expect(servingText({ serving_qty: 1, serving_unit: '1 cup, diced' })).toBe('1 cup, diced');
    expect(servingText({ serving_qty: 1, serving_unit: '1 container' }, 2)).toBe('2 × 1 container');
    expect(servingText({ serving_qty: 100, serving_unit: 'g' }, 1.5)).toBe('150 g');
    expect(servingText({ serving_qty: 1, serving_unit: 'scoop' }, 0.5)).toBe('0.5 scoop');
  });
});

describe('macrosFit', () => {
  it('accepts macros within 15% of the calories', () => {
    expect(macrosFit(400, 30, 10, 40)).toBe(true); // 120 + 90 + 160 = 370
    expect(macrosFit(400, 10, 5, 10)).toBe(false);
    expect(macrosFit(250, 0, 0, 0)).toBe(true);
  });
});
