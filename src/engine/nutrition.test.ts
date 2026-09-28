import { inToCm, kgToLb, lbToKg } from '../units';
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
import { sheetModel } from './sheetModel';

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
 * Weekly adaptive update. Five synthetic weeks from the fixture's start (205 lb, 32%), with
 * missed weigh-ins (including week 3's Monday) and missed food days (including week 1's Monday).
 * Days fill within a week only, from the week's first entry (AP–AV), as the sheet does.
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
const toWeeks = (lb: (number | null)[][], kcal: (number | null)[][], bf: (number | null)[] = []) =>
  lb.map((week, w) =>
    week.map((v, d) => ({
      weightKg: v === null ? null : lbToKg(v),
      kcal: kcal[w][d],
      bodyFatPct: d === 6 ? (bf[w] ?? null) : null,
    })),
  );
const WEEKS: WeekLog[] = toWeeks(LB, KCAL);
const BASE = {
  sex: 'male',
  experience: 'beginner',
  goal: 'lose_fat',
  startWeightKg: lbToKg(205),
  startBodyFatPct: 32,
} as const;
const sheetInputs = (
  lb: (number | null)[][],
  kcal: (number | null)[][],
  bf: (number | null)[] = [],
) =>
  ({
    sex: 'male',
    experience: 'beginner',
    goal: 'lose_fat',
    startLb: 205,
    startBf: 32,
    weeks: lb.map((w, i) => ({ lb: w, kcal: kcal[i], bf: bf[i] ?? null })),
  }) as const;

describe('adaptiveMaintenance', () => {
  const a = adaptiveMaintenance({ ...BASE, startingMaintenanceKcal: 2604.18, weeks: WEEKS });

  it('fills days within a week only, from the first entry (AP–AV)', () => {
    // Week 1: Monday calories are missing, so 6 intake days; weights fill Tue and Fri.
    expect(a.weeks[0].daysLogged).toBe(6);
    expect(a.weeks[0].avgKcal).toBeCloseTo((1900 + 1850 + 2000 + 1950 + 2200 + 2400) / 6, 6);
    expect(kgToLb(a.weeks[0].avgWeightKg)).toBeCloseTo(
      (204.2 + 204.2 + 203.8 + 203.6 + 203.6 + 203.0 + 202.8) / 7,
      5,
    );
    // Week 3: Monday's weigh-in is missing and is NOT filled from week 2's Sunday.
    expect(a.weeks[2].weightDays).toBe(6);
    expect(kgToLb(a.weeks[2].avgWeightKg)).toBeCloseTo(
      (201.0 + 200.8 + 200.8 + 200.2 + 200.4 + 199.8) / 6,
      5,
    );
    // Week 2's Wednesday calories take Tuesday's value.
    expect(a.weeks[1].avgKcal).toBeCloseTo((1880 + 1900 + 1900 + 1920 + 1870 + 2300 + 2250) / 7, 6);
  });

  it('estimates each week from intake and weight change, and averages from week 2 (BE, BD)', () => {
    const w1 = a.weeks[0];
    const d1 = kgToLb(w1.avgWeightKg) - 205;
    expect(w1.estimateKcal).toBeCloseTo(w1.avgKcal! + (-d1 * 3500) / 6, 6);
    expect(a.weeks[1].runningKcal).toBeCloseTo(a.weeks[1].estimateKcal, 6);
    expect(a.weeks[2].runningKcal).toBeCloseTo(
      (a.weeks[1].estimateKcal + a.weeks[2].estimateKcal) / 2,
      6,
    );
    expect(a.weeks[4].runningKcal).toBeCloseTo(
      (a.weeks[1].estimateKcal +
        a.weeks[2].estimateKcal +
        a.weeks[3].estimateKcal +
        a.weeks[4].estimateKcal) /
        4,
      6,
    );
  });

  it('keeps the starting maintenance until 4 weeks have weigh-ins, then uses the previous week', () => {
    const three = adaptiveMaintenance({
      ...BASE,
      startingMaintenanceKcal: 2604.18,
      weeks: WEEKS.slice(0, 3),
    });
    expect(three.adaptive).toBe(false);
    expect(three.maintenanceKcal).toBeCloseTo(2604.18, 2);
    const four = adaptiveMaintenance({
      ...BASE,
      startingMaintenanceKcal: 2604.18,
      weeks: WEEKS.slice(0, 4),
    });
    expect(four.adaptive).toBe(true);
    expect(four.maintenanceKcal).toBeCloseTo(four.weeks[2].runningKcal, 6);
    expect(a.maintenanceKcal).toBeCloseTo(a.weeks[3].runningKcal, 6);
  });

  it('repeats the previous estimate for a week without food logs, and fills nothing across weeks', () => {
    const noFood: WeekLog = Array.from({ length: 7 }, () => ({
      weightKg: lbToKg(200),
      kcal: null,
    }));
    const b = adaptiveMaintenance({
      ...BASE,
      startingMaintenanceKcal: 2604.18,
      weeks: [...WEEKS.slice(0, 2), noFood],
    });
    expect(b.weeks[2].daysLogged).toBe(0);
    expect(b.weeks[2].estimateKcal).toBeCloseTo(b.weeks[1].estimateKcal, 6);
    expect(b.weeks[2].runningKcal).toBeCloseTo(b.weeks[1].runningKcal, 6);
  });

  it('keeps the starting maintenance when nothing has been logged yet', () => {
    const empty: WeekLog = Array.from({ length: 7 }, () => ({ weightKg: null, kcal: null }));
    const b = adaptiveMaintenance({ ...BASE, startingMaintenanceKcal: 2604.18, weeks: [empty] });
    expect(b.weeks[0].daysLogged).toBe(0);
    expect(b.weeks[0].avgKcal).toBeNull();
    expect(b.maintenanceKcal).toBeCloseTo(2604.18, 2);
  });
});

describe('weeklyUpdate', () => {
  it('uses start weight and body fat for protein in weeks 1–4, then the latest weigh-ins', () => {
    const four = weeklyUpdate({ ...BASE, weeks: WEEKS.slice(0, 4) });
    expect(four.raw.proteinG).toBeCloseTo(205 * 0.73, 6);
    const five = weeklyUpdate({ ...BASE, weeks: WEEKS });
    // Week 5's weigh-ins average 197.63 lb → 144.27 g: more than 5 g below 149.65, so it moves.
    const wk5 = (198.2 + 198.0 + 197.6 + 197.4 + 197.6 + 197.0) / 6;
    expect(five.raw.proteinG).toBeCloseTo(wk5 * 0.73, 6);
  });

  it('only moves protein by 5 g or more (BW)', () => {
    const lb = [...LB, [196.8, N, N, N, N, N, N], [N, N, N, N, 196.0, N, N]];
    const kcal = [...KCAL, [1900, N, N, N, N, N, N], [N, N, N, N, 1900, N, N]];
    const t = weeklyUpdate({ ...BASE, weeks: toWeeks(lb, kcal) });
    const wk5 = (198.2 + 198.0 + 197.6 + 197.4 + 197.6 + 197.0) / 6;
    // 196.0 × 0.73 = 143.08 is within 5 g of week 5's 144.27, so protein stays.
    expect(t.raw.proteinG).toBeCloseTo(wk5 * 0.73, 6);
  });

  it('ignores body-fat measurements in weeks 1–4 and uses them from week 5', () => {
    const early = weeklyUpdate({ ...BASE, weeks: toWeeks(LB, KCAL, [N, 24]) });
    expect(early.week.bodyFatPct).toBe(32);
    const late = weeklyUpdate({ ...BASE, weeks: toWeeks(LB, KCAL, [N, N, N, N, 24]) });
    expect(late.week.bodyFatPct).toBe(24);
    expect(late.raw.fatG).toBeCloseTo((0.22 * late.raw.kcalTarget) / 9, 6);
  });

  it('keeps the starting maintenance at the start weight before week 4', () => {
    const t = weeklyUpdate({ ...BASE, weeks: WEEKS.slice(0, 3) });
    expect(t.adaptive).toBe(false);
    expect(t.maintenanceKcal).toBe(2604);
  });

  it('bases a manual rate on the start weight (a fixed amount per week, P16)', () => {
    const t = weeklyUpdate({ ...BASE, rateOverridePct: (-1.2 / 205) * 100, weeks: WEEKS });
    expect(t.raw.kcalTarget).toBeCloseTo(t.raw.maintenanceKcal + (-1.2 * 3500) / 7, 6);
  });
});

/* ---------------- Parity with the spreadsheet ---------------- */

/** Deterministic PRNG so failures reproduce. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('matches the spreadsheet (sheetModel)', () => {
  const compare = (
    lb: (number | null)[][],
    kcal: (number | null)[][],
    bf: (number | null)[],
    manual?: number,
  ) => {
    const sheet = sheetModel({ ...sheetInputs(lb, kcal, bf), manualRateLbPerWeek: manual });
    const app = weeklyUpdate({
      ...BASE,
      rateOverridePct: manual === undefined ? undefined : (manual / 205) * 100,
      weeks: toWeeks(lb, kcal, bf),
    });
    expect(app.raw.maintenanceKcal).toBeCloseTo(sheet.maintenance, 6);
    expect(app.raw.kcalTarget).toBeCloseTo(sheet.kcal, 6);
    expect([app.kcalLow, app.kcalHigh]).toEqual([sheet.low, sheet.high]);
    expect(app.raw.proteinG).toBeCloseTo(sheet.protein, 6);
    expect(app.raw.fatG).toBeCloseTo(sheet.fat, 6);
    expect(app.raw.carbsG).toBeCloseTo(sheet.carbs, 6);
    app.weeks.forEach((w, k) => {
      const s = sheet.weeks[k];
      expect(kgToLb(w.avgWeightKg)).toBeCloseTo(s.AW, 6);
      expect(w.daysLogged).toBe(s.ALc);
      expect(w.estimateKcal).toBeCloseTo(s.BE, 6);
      expect(w.runningKcal).toBeCloseTo(s.BD, 6);
    });
  };

  it('for the five-week example, week by week', () => {
    for (let n = 1; n <= 5; n++) compare(LB.slice(0, n), KCAL.slice(0, n), []);
  });

  it('for 500 random logs with gaps, empty weeks, measurements and manual rates', () => {
    const r = rng(42);
    for (let run = 0; run < 500; run++) {
      const weeks = 1 + Math.floor(r() * 12);
      let lb = 150 + r() * 120;
      const LBs: (number | null)[][] = [];
      const Ks: (number | null)[][] = [];
      const BFs: (number | null)[] = [];
      const gap = r() * 0.5;
      for (let w = 0; w < weeks; w++) {
        const emptyW = r() < 0.08;
        const emptyK = r() < 0.08;
        LBs.push(
          Array.from({ length: 7 }, () => {
            lb += (r() - 0.6) * 0.8;
            return emptyW || r() < gap ? null : Math.round(lb * 10) / 10;
          }),
        );
        Ks.push(
          Array.from({ length: 7 }, () =>
            emptyK || r() < gap ? null : Math.round(1400 + r() * 1800),
          ),
        );
        BFs.push(r() < 0.15 ? Math.round(10 + r() * 25) : null);
      }
      const manual = r() < 0.2 ? -Math.round(r() * 20) / 10 : undefined;
      compare(LBs, Ks, BFs, manual);
    }
  });
});
