import {
  cmToIn,
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
