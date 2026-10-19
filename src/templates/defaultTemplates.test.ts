import exercises from '../../supabase/seed-data/exercises.json';
import defaults from '../../supabase/seed-data/default-templates.json';
import { estimateDuration, type LiftBlock } from './liftTemplate';
import { validateTemplate } from './validate';

type DefaultRow = {
  exercise: string;
  target_sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rest_sec: number;
  notes: string | null;
};
type DefaultTemplate = {
  name: string;
  notes: string;
  est_duration_s: number;
  exercises: DefaultRow[];
};
const templates = defaults as DefaultTemplate[];

const builtIns = new Set((exercises as { name: string }[]).map((e) => e.name.toLowerCase()));

const blocks = (t: DefaultTemplate): LiftBlock[] =>
  t.exercises.map((e, i) => ({
    kind: 'single',
    key: `b${i}`,
    item: {
      key: `e${i}`,
      exercise_id: e.exercise,
      name: e.exercise,
      primary_muscle: null,
      equipment: null,
      target_sets: e.target_sets,
      rep_min: e.rep_min,
      rep_max: e.rep_max,
      rest_sec: e.rest_sec,
      notes: e.notes,
    },
  }));

describe('default lift templates', () => {
  it('has the six days from both plans, with unique names', () => {
    expect(templates.map((t) => t.exercises.length)).toEqual([5, 7, 7, 8, 10, 8]);
    expect(new Set(templates.map((t) => t.name.toLowerCase())).size).toBe(templates.length);
  });

  it.each(templates.map((t) => [t.name, t] as const))('%s is valid', (_name, t) => {
    for (const e of t.exercises) expect(builtIns).toContain(e.exercise.toLowerCase());
    expect(validateTemplate({ name: t.name, kind: 'lift', lift: blocks(t) })).toEqual({});
    expect(t.est_duration_s).toBe(estimateDuration(blocks(t)));
    for (const e of t.exercises) {
      expect(e.rest_sec % 15).toBe(0);
      expect((e.rep_min === null) === (e.rep_max === null)).toBe(true);
    }
  });
});
