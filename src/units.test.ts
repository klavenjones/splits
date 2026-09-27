import {
  cmToIn,
  fromDisplayLength,
  fromDisplayWeight,
  lengthUnit,
  toDisplayLength,
  toDisplayWeight,
  weightUnit,
  inToCm,
  kgToLb,
  lbToKg,
  miToM,
  mToMi,
  secPerKmToSecPerMi,
  secPerMiToSecPerKm,
} from './units';

describe('units', () => {
  it('converts weight', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462262, 6);
    expect(lbToKg(205)).toBeCloseTo(92.986, 3);
    expect(kgToLb(lbToKg(205))).toBeCloseTo(205, 10);
  });

  it('converts length', () => {
    expect(inToCm(1)).toBe(2.54);
    expect(cmToIn(inToCm(75))).toBeCloseTo(75, 10);
  });

  it('converts distance', () => {
    expect(miToM(1)).toBe(1609.344);
    expect(mToMi(5000)).toBeCloseTo(3.10686, 5);
    expect(mToMi(miToM(26.2))).toBeCloseTo(26.2, 10);
  });

  it('converts pace', () => {
    // 5:00 /km ≈ 8:03 /mi
    expect(secPerKmToSecPerMi(300)).toBeCloseTo(482.8, 1);
    expect(secPerMiToSecPerKm(secPerKmToSecPerMi(300))).toBeCloseTo(300, 10);
  });
});

describe('display units', () => {
  it('shows imperial users lb and in, metric users kg and cm', () => {
    expect(weightUnit('imperial')).toBe('lb');
    expect(lengthUnit('metric')).toBe('cm');
    expect(toDisplayWeight(lbToKg(205), 'imperial')).toBeCloseTo(205, 10);
    expect(toDisplayWeight(90, 'metric')).toBe(90);
    expect(fromDisplayLength(70, 'imperial')).toBeCloseTo(177.8, 10);
    expect(toDisplayLength(fromDisplayLength(70, 'imperial'), 'imperial')).toBeCloseTo(70, 10);
    expect(fromDisplayWeight(90, 'metric')).toBe(90);
  });
});
