import { inToCm, lbToKg } from '../units';
import {
  adaptiveMaintenance,
  computeTargets,
  dailyCalories,
  macroTargets,
  navyBodyFat,
  recommendPhase,
  startingMaintenance,
  weeklyRatePct,
  weeklyUpdate,
  type WeekLog,
} from './nutrition';

// Spreadsheet fixture (docs/product.md): 205 lb, 32% body fat, male, beginner, lose fat.
const FIXTURE = {
  sex: 'male',
  experience: 'beginner',
  goal: 'lose_fat',
  weightKg: lbToKg(205),
  bodyFatPct: 32,
} as const;

describe('spreadsheet fixture', () => {
  const t = computeTargets(FIXTURE);

  it('recommends a cut at -0.7% per week', () => {
    expect(t.phase).toBe('cut');
    expect(t.weeklyRatePct).toBe(-0.7);
  });

  it('matches maintenance 2,604 (AN22)', () => {
    expect(t.raw.maintenanceKcal).toBeCloseTo(2604.18, 2);
    expect(t.maintenanceKcal).toBe(2604);
  });

  it('matches calories 1,887 in 1,800–2,000 (AW24, Q28)', () => {
    expect(t.raw.kcalTarget).toBeCloseTo(1886.68, 2);
    expect(t.kcalTarget).toBe(1887);
    expect(t.kcalLow).toBe(1800);
    expect(t.kcalHigh).toBe(2000);
    expect(t.floored).toBe(false);
  });

  it('matches macros 150 g protein, 52 g fat, 204 g carbs (Q29–Q31)', () => {
    expect(t.raw.proteinG).toBeCloseTo(149.65, 2);
    expect(t.raw.fatG).toBeCloseTo(52.4078, 3);
    expect(t.raw.carbsG).toBeCloseTo(204.1025, 3);
    expect([t.proteinG, t.fatG, t.carbsG]).toEqual([150, 52, 204]);
  });
});

describe('navyBodyFat', () => {
  it('matches the sheet for 75 in / 46 in waist / 16 in neck (AL6 → 32)', () => {
    expect(
      navyBodyFat({ sex: 'male', heightCm: inToCm(75), waistCm: inToCm(46), neckCm: inToCm(16) }),
    ).toBe(32);
  });

  it('uses hip for women', () => {
    const bf = navyBodyFat({
      sex: 'female',
      heightCm: 165,
      waistCm: 80,
      neckCm: 33,
      hipCm: 100,
    });
    expect(bf).toBe(32); // 31.89 before rounding
  });

  it('requires hip for women', () => {
    expect(() => navyBodyFat({ sex: 'female', heightCm: 165, waistCm: 80, neckCm: 33 })).toThrow();
  });
});

describe('recommendPhase', () => {
  it('tells men at 25%+ and women at 30%+ to cut, whatever the goal', () => {
    expect(recommendPhase({ sex: 'male', bodyFatPct: 25, goal: 'build_muscle' })).toBe('cut');
    expect(recommendPhase({ sex: 'female', bodyFatPct: 30, goal: 'build_muscle' })).toBe('cut');
  });

  it('follows the goal below the threshold', () => {
    expect(recommendPhase({ sex: 'male', bodyFatPct: 18, goal: 'build_muscle' })).toBe('lean_bulk');
    expect(recommendPhase({ sex: 'male', bodyFatPct: 18, goal: 'lose_fat' })).toBe('cut');
    expect(recommendPhase({ sex: 'female', bodyFatPct: 29, goal: 'build_muscle' })).toBe(
      'lean_bulk',
    );
  });

  it('keeps maintain as maintain, as the sheet does (AW10 = 0)', () => {
    expect(recommendPhase({ sex: 'male', bodyFatPct: 30, goal: 'maintain' })).toBe('maintain');
  });
});

describe('weeklyRatePct', () => {
  it('scales the cut with body fat (AX13 / AY13)', () => {
    const cut = (sex: 'male' | 'female', bodyFatPct: number) =>
      weeklyRatePct({ sex, experience: 'beginner', bodyFatPct, phase: 'cut' });
    expect(cut('male', 16)).toBe(-0.7);
    expect(cut('male', 15)).toBe(-0.5);
    expect(cut('male', 12)).toBe(-0.3);
    expect(cut('female', 26)).toBe(-0.7);
    expect(cut('female', 25)).toBe(-0.5);
    expect(cut('female', 22)).toBe(-0.3);
  });

  it('uses +0.375 (beginner) and +0.25 (intermediate) for a lean bulk', () => {
    const bulk = (experience: 'beginner' | 'intermediate') =>
      weeklyRatePct({ sex: 'male', experience, bodyFatPct: 14, phase: 'lean_bulk' });
    expect(bulk('beginner')).toBe(0.375);
    expect(bulk('intermediate')).toBe(0.25);
  });

  it('is zero for maintain', () => {
    expect(
      weeklyRatePct({ sex: 'male', experience: 'beginner', bodyFatPct: 14, phase: 'maintain' }),
    ).toBe(0);
  });

  it('takes a manual override in computeTargets', () => {
    const t = computeTargets({ ...FIXTURE, rateOverridePct: -0.5 });
    expect(t.weeklyRatePct).toBe(-0.5);
    // 2604.18 + (-0.005 × 205 × 3500 / 7)
    expect(t.raw.kcalTarget).toBeCloseTo(2091.68, 2);
  });
});

describe('startingMaintenance', () => {
  it('uses 1.55 for women', () => {
    // (370 + 9.8 × 150 × 0.7) × 1.55
    expect(
      startingMaintenance({ sex: 'female', weightKg: lbToKg(150), bodyFatPct: 30 }),
    ).toBeCloseTo(2168.45, 2);
  });
});

describe('dailyCalories', () => {
  it('applies the 1,500 floor for men and narrows the range to the top side', () => {
    const c = dailyCalories({
      sex: 'male',
      maintenanceKcal: 1900,
      weightKg: lbToKg(200),
      weeklyRatePct: -0.7,
    });
    expect(c.kcal).toBe(1500);
    expect(c.floored).toBe(true);
    expect([c.low, c.high]).toEqual([1500, 1600]);
  });

  it('applies the 1,200 floor for women', () => {
    const c = dailyCalories({
      sex: 'female',
      maintenanceKcal: 1500,
      weightKg: lbToKg(160),
      weeklyRatePct: -0.7,
    });
    expect(c.kcal).toBe(1200);
    expect([c.low, c.high]).toEqual([1200, 1300]);
  });

  it('adds a surplus for a lean bulk', () => {
    const c = dailyCalories({
      sex: 'male',
      maintenanceKcal: 2800,
      weightKg: lbToKg(170),
      weeklyRatePct: 0.375,
    });
    // 2800 + 0.00375 × 170 × 500
    expect(c.kcal).toBeCloseTo(3118.75, 2);
    expect([c.low, c.high]).toEqual([3000, 3200]);
  });
});

describe('macroTargets', () => {
  it('uses men’s protein tiers and 22% fat under 25% body fat', () => {
    const lean = macroTargets({ sex: 'male', kcal: 2500, weightKg: lbToKg(180), bodyFatPct: 15 });
    expect(lean.proteinG).toBeCloseTo(180, 6);
    expect(lean.fatG).toBeCloseTo((0.22 * 2500) / 9, 6);
    const mid = macroTargets({ sex: 'male', kcal: 2500, weightKg: lbToKg(180), bodyFatPct: 22 });
    expect(mid.proteinG).toBeCloseTo(144, 6);
  });

  it('uses women’s protein tiers and 30% fat', () => {
    const lower = macroTargets({
      sex: 'female',
      kcal: 2000,
      weightKg: lbToKg(140),
      bodyFatPct: 25,
    });
    expect(lower.proteinG).toBeCloseTo(140, 6);
    expect(lower.fatG).toBeCloseTo((0.3 * 2000) / 9, 6);
    const higher = macroTargets({
      sex: 'female',
      kcal: 2000,
      weightKg: lbToKg(140),
      bodyFatPct: 26,
    });
    expect(higher.proteinG).toBeCloseTo(112, 6);
    expect(higher.carbsG).toBeCloseTo((2000 - 112 * 4 - 600) / 4, 6);
  });
});

/*
 * Weekly adaptive update. Five synthetic weeks from the fixture's start (205 lb, 32%),
 * with missed weigh-ins (including a Monday) and missed food days (including week 1's Monday).
 * Expected values come from a separate transcription of the sheet's cells
 * (AP–AW fill and averages, AZ weekly change, BD/BE estimates, U history, Q23 maintenance):
 *
 * | week | avg lb (fill) | avg kcal | days | Δ lb    | estimate  | running (BD) |
 * |------|---------------|----------|------|---------|-----------|--------------|
 * | 1    | 203.6         | 2050.00  | 6    | -1.4    | 2866.667  | 2866.667     |
 * | 2    | 202.057143    | 2002.86  | 7    | -1.5429 | 2774.286  | 2774.286     |
 * | 3    | 200.685714    | 1987.14  | 7    | -1.3714 | 2672.857  | 2723.571     |
 * | 4    | 199.057143    | 1988.57  | 7    | -1.6286 | 2802.857  | 2750.000     |
 * | 5    | 197.685714    | 1994.29  | 7    | -1.3714 | 2680.000  | 2732.500     |
 *
 * Maintenance stays at the starting value until 4 weeks have weigh-ins, then uses the
 * previous week's running value: after week 4 → 2723.571, after week 5 → 2750.000.
 */
const N = null;
const LB: (number | null)[][] = [
  [204.2, N, 203.8, 203.6, N, 203.0, 202.8],
  [202.6, 202.4, N, 201.8, 201.6, 201.8, N],
  [N, 201.0, 200.8, N, 200.2, 200.4, 199.8],
  [199.6, N, 199.2, 199.0, 198.8, N, 198.4],
  [198.2, 198.0, N, 197.6, 197.4, 197.6, 197.0],
];
const KCAL: (number | null)[][] = [
  [N, 1900, 1850, 2000, 1950, 2200, 2400],
  [1880, 1900, N, 1920, 1870, 2300, 2250],
  [1850, 1900, 1950, 1880, N, 2100, 2350],
  [1900, 1870, 1910, 1860, 1880, 2200, 2300],
  [1890, N, 1880, 1900, 1870, 2250, 2280],
];
const WEEKS: WeekLog[] = LB.map((week, w) =>
  week.map((lb, d) => ({ weightKg: lb === null ? null : lbToKg(lb), kcal: KCAL[w][d] })),
);
const START = { startWeightKg: lbToKg(205), startingMaintenanceKcal: 2604.18 };

describe('adaptiveMaintenance', () => {
  const a = adaptiveMaintenance({ ...START, weeks: WEEKS });

  it('summarizes each week like the sheet', () => {
    const expected = [
      { avgLb: 203.6, avgKcal: 2050, days: 6, est: 2866.666667, running: 2866.666667 },
      { avgLb: 202.057143, avgKcal: 2002.857143, days: 7, est: 2774.285714, running: 2774.285714 },
      { avgLb: 200.685714, avgKcal: 1987.142857, days: 7, est: 2672.857143, running: 2723.571429 },
      { avgLb: 199.057143, avgKcal: 1988.571429, days: 7, est: 2802.857143, running: 2750.0 },
      { avgLb: 197.685714, avgKcal: 1994.285714, days: 7, est: 2680.0, running: 2732.5 },
    ];
    expected.forEach((e, i) => {
      const w = a.weeks[i];
      expect(w.avgWeightKg).toBeCloseTo(lbToKg(e.avgLb), 5);
      expect(w.avgKcal).toBeCloseTo(e.avgKcal, 5);
      expect(w.daysLogged).toBe(e.days);
      expect(w.estimateKcal).toBeCloseTo(e.est, 4);
      expect(w.runningKcal).toBeCloseTo(e.running, 4);
    });
  });

  it('keeps the starting maintenance for the first three weeks', () => {
    const three = adaptiveMaintenance({ ...START, weeks: WEEKS.slice(0, 3) });
    expect(three.adaptive).toBe(false);
    expect(three.maintenanceKcal).toBeCloseTo(2604.18, 2);
  });

  it('switches to the previous week’s running value from week 4', () => {
    const four = adaptiveMaintenance({ ...START, weeks: WEEKS.slice(0, 4) });
    expect(four.adaptive).toBe(true);
    expect(four.maintenanceKcal).toBeCloseTo(2723.571429, 4);
    expect(a.maintenanceKcal).toBeCloseTo(2750.0, 4);
  });

  it('carries intake forward across weeks when a whole week has no food logs', () => {
    const noFood: WeekLog = Array.from({ length: 7 }, () => ({
      weightKg: lbToKg(200),
      kcal: null,
    }));
    const b = adaptiveMaintenance({ ...START, weeks: [...WEEKS.slice(0, 2), noFood] });
    // Week 2's Sunday (2,250) fills all 7 days: 2250 + 2.057143 lb × 3500 / 7.
    expect(b.weeks[2].daysLogged).toBe(7);
    expect(b.weeks[2].avgKcal).toBe(2250);
    expect(b.weeks[2].estimateKcal).toBeCloseTo(3278.571429, 4);
  });

  it('keeps the starting maintenance when nothing has been logged yet', () => {
    const empty: WeekLog = Array.from({ length: 7 }, () => ({ weightKg: null, kcal: null }));
    const b = adaptiveMaintenance({ ...START, weeks: [empty] });
    expect(b.weeks[0].daysLogged).toBe(0);
    expect(b.weeks[0].avgKcal).toBeNull();
    expect(b.weeks[0].estimateKcal).toBeCloseTo(2604.18, 2);
    expect(b.maintenanceKcal).toBeCloseTo(2604.18, 2);
  });
});

describe('weeklyUpdate', () => {
  const base = { sex: 'male', experience: 'beginner', goal: 'lose_fat', bodyFatPct: 32 } as const;

  it('recalculates all targets after week 4', () => {
    const t = weeklyUpdate({ ...base, ...START, weeks: WEEKS.slice(0, 4) });
    // Latest weight = week 4's average of actual weigh-ins (L column): 199.0 lb.
    expect(t.adaptive).toBe(true);
    expect(t.maintenanceKcal).toBe(2724);
    expect(t.raw.kcalTarget).toBeCloseTo(2027.071429, 4);
    expect(t.kcalTarget).toBe(2027);
    expect([t.kcalLow, t.kcalHigh]).toEqual([1950, 2150]);
    expect([t.proteinG, t.fatG, t.carbsG]).toEqual([145, 56, 235]);
    expect(t.week.daysLogged).toBe(7);
    expect(t.week.weightChangeKg).toBeCloseTo(lbToKg(-1.628571), 5);
  });

  it('recalculates all targets after week 5', () => {
    const t = weeklyUpdate({ ...base, ...START, weeks: WEEKS });
    expect(t.maintenanceKcal).toBe(2750);
    expect(t.raw.kcalTarget).toBeCloseTo(2058.283333, 4);
    expect([t.kcalLow, t.kcalHigh]).toEqual([1950, 2150]);
    expect(t.raw.proteinG).toBeCloseTo(144.272333, 4);
    expect(t.raw.fatG).toBeCloseTo(57.174537, 4);
    expect(t.raw.carbsG).toBeCloseTo(241.655792, 4);
  });

  it('keeps starting maintenance but uses the latest weight before week 4', () => {
    const t = weeklyUpdate({ ...base, ...START, weeks: WEEKS.slice(0, 3) });
    expect(t.adaptive).toBe(false);
    expect(t.maintenanceKcal).toBe(2604);
    expect(t.raw.kcalTarget).toBeCloseTo(1902.64, 2);
    expect(t.raw.proteinG).toBeCloseTo(146.3212, 4);
  });
});
