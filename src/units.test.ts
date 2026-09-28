import {
  formatSet,
  formatWeight,
  parseWeight,
  formatDistance,
  formatDuration,
  formatPace,
  parseDuration,
  parsePace,
  toleranceFromSecPerKm,
  toleranceToSecPerKm,
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

describe('running formats', () => {
  it('formats and parses durations', () => {
    expect(formatDuration(150)).toBe('2:30');
    expect(formatDuration(3900)).toBe('1:05:00');
    expect(formatDuration(59.6)).toBe('1:00');
    expect(parseDuration('2:30')).toBe(150);
    expect(parseDuration('1:05:00')).toBe(3900);
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('1:75')).toBeNull();
    expect(parseDuration('abc')).toBeNull();
  });

  it('formats and parses paces in both unit systems', () => {
    expect(parsePace('7:00', 'imperial')).toBe(261);
    expect(formatPace(261, 'imperial')).toBe('7:00 /mi');
    expect(parsePace('9:30', 'imperial')).toBe(354);
    expect(formatPace(300, 'metric')).toBe('5:00 /km');
    expect(parsePace('5:00', 'metric')).toBe(300);
    expect(parsePace('7', 'imperial')).toBeNull();
    expect(parsePace('0:00', 'metric')).toBeNull();
  });

  it('converts pace tolerance', () => {
    expect(toleranceToSecPerKm(10, 'imperial')).toBe(6);
    expect(toleranceFromSecPerKm(6, 'imperial')).toBe(10);
    expect(toleranceToSecPerKm(5, 'metric')).toBe(5);
  });

  it('formats distances race-style', () => {
    expect(formatDistance(800, 'imperial')).toBe('800 m');
    expect(formatDistance(1609, 'imperial')).toBe('1 mi');
    expect(formatDistance(10018, 'imperial')).toBe('6.2 mi');
    expect(formatDistance(5000, 'metric')).toBe('5 km');
    expect(formatDistance(400, 'metric')).toBe('400 m');
  });
});

describe('lifting weights', () => {
  it('formats and parses in the user units, to the nearest 0.5', () => {
    expect(formatWeight(lbToKg(185), 'imperial')).toBe('185');
    expect(formatWeight(83.9, 'metric')).toBe('84');
    expect(formatWeight(82.4, 'metric')).toBe('82.5');
    expect(parseWeight('185', 'imperial')).toBeCloseTo(83.915, 3);
    expect(parseWeight('82,5', 'metric')).toBe(82.5);
    expect(parseWeight('', 'metric')).toBeNull();
    expect(parseWeight('-5', 'metric')).toBeNull();
    expect(formatSet(lbToKg(185), 8, 'imperial')).toBe('185 × 8');
    expect(formatSet(null, 20, 'imperial')).toBe('bw × 20');
    expect(formatSet(80, null, 'metric')).toBe('–');
  });
});
