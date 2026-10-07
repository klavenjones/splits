import seed from '../../supabase/seed-data/exercises.json';
import { normalize } from './filter';
import { NAME_MAX } from './validate';
import {
  isEquipment,
  isMovementPattern,
  isMuscle,
  MOVEMENT_PATTERNS,
  muscleGroup,
  MUSCLE_GROUPS,
  TRACKING_TYPES,
} from './vocab';

type SeedRow = {
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  movement_pattern: string;
  tracking_type: string;
  instructions: { steps: string[]; cues: string[]; mistakes: string[] };
};
const rows = seed as SeedRow[];

describe('built-in exercise seed', () => {
  it('has at least 150 exercises with unique names', () => {
    expect(rows.length).toBeGreaterThanOrEqual(150);
    const names = rows.map((r) => normalize(r.name));
    expect(new Set(names).size).toBe(rows.length);
  });

  it('uses only vocabulary values', () => {
    for (const r of rows) {
      const where = `"${r.name}"`;
      expect([where, isMuscle(r.primary_muscle)]).toEqual([where, true]);
      expect([where, r.secondary_muscles.every(isMuscle)]).toEqual([where, true]);
      expect([where, r.secondary_muscles.includes(r.primary_muscle)]).toEqual([where, false]);
      expect([where, new Set(r.secondary_muscles).size]).toEqual([
        where,
        r.secondary_muscles.length,
      ]);
      expect([where, isEquipment(r.equipment)]).toEqual([where, true]);
      expect([where, TRACKING_TYPES.includes(r.tracking_type as never)]).toEqual([where, true]);
    }
  });

  it('gives every exercise one valid movement slot', () => {
    for (const r of rows) {
      const where = `"${r.name}"`;
      expect([where, isMovementPattern(r.movement_pattern)]).toEqual([where, true]);
    }
  });

  it('uses every movement slot at least once', () => {
    const used = new Set(rows.map((r) => r.movement_pattern));
    for (const p of MOVEMENT_PATTERNS) expect([p, used.has(p)]).toEqual([p, true]);
  });

  it('has short names and how-to text for every exercise', () => {
    for (const r of rows) {
      expect(r.name.trim()).toBe(r.name);
      expect(r.name.length).toBeLessThanOrEqual(NAME_MAX);
      expect(r.instructions.steps.length).toBeGreaterThanOrEqual(3);
      expect(r.instructions.cues.length).toBeGreaterThanOrEqual(2);
      expect(r.instructions.mistakes.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('covers every muscle group', () => {
    const groups = new Set(rows.map((r) => muscleGroup(r.primary_muscle)));
    for (const g of MUSCLE_GROUPS) expect([g, groups.has(g)]).toEqual([g, true]);
  });

  it('has no running (that lives in run plans)', () => {
    expect(
      rows.filter((r) => /\b(run|running|jog|jogging|treadmill|hike|hiking)\b/i.test(r.name)),
    ).toEqual([]);
  });
});
