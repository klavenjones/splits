import { inToCm, lbToKg } from '@/units';

import { buildStartingTargets, dailyDelta } from './buildStartingTargets';
import { EMPTY_DRAFT, isComplete, type CompleteDraft } from './types';

// The engine fixture, entered the way the About you screen stores it (metric).
const FIXTURE: CompleteDraft = {
  ...EMPTY_DRAFT,
  unitSystem: 'imperial',
  sex: 'male',
  heightCm: inToCm(75),
  weightKg: lbToKg(205),
  bodyFatPct: 32,
  focus: 'balanced',
  experience: 'beginner',
  goal: 'lose_fat',
};
const CTX = { today: '2026-09-27', timezone: 'America/New_York' }; // a Sunday

describe('buildStartingTargets', () => {
  const { targets, args } = buildStartingTargets(FIXTURE, CTX);

  it('produces the spreadsheet fixture targets', () => {
    expect(args.p_maintenance_kcal).toBe(2604);
    expect(args.p_kcal_target).toBe(1887);
    expect([args.p_kcal_low, args.p_kcal_high]).toEqual([1800, 2000]);
    expect([args.p_protein_g, args.p_fat_g, args.p_carbs_g]).toEqual([150, 52, 204]);
    expect(dailyDelta(targets)).toBe(-718);
  });

  it('records the profile: auto cut at -0.7%', () => {
    expect(args.p_phase).toBe('cut');
    expect(args.p_rate_mode).toBe('auto');
    expect(args.p_weekly_rate_pct).toBe(-0.7);
    expect(args.p_start_weight_kg).toBeCloseTo(92.986, 3);
    expect(args.p_start_body_fat_pct).toBe(32);
  });

  it('dates the first week from the Monday of the local week', () => {
    expect(args.p_start_date).toBe('2026-09-27');
    expect(args.p_week_start).toBe('2026-09-21');
    expect(args.p_timezone).toBe('America/New_York');
  });

  it('converts a manual lb/week rate into % of bodyweight', () => {
    const manual = buildStartingTargets(
      { ...FIXTURE, rateManual: true, manualRateKgPerWeek: lbToKg(-1) },
      CTX,
    );
    expect(manual.args.p_rate_mode).toBe('manual');
    expect(manual.args.p_weekly_rate_pct).toBeCloseTo((-1 / 205) * 100, 10);
    // 2604.18 − 1 lb × 3500 / 7 = 2104.18
    expect(manual.args.p_kcal_target).toBe(2104);
  });
});

describe('isComplete', () => {
  it('needs every targets input', () => {
    expect(isComplete(FIXTURE)).toBe(true);
    expect(isComplete({ ...FIXTURE, goal: null })).toBe(false);
    expect(isComplete({ ...FIXTURE, rateManual: true, manualRateKgPerWeek: null })).toBe(false);
  });
});
