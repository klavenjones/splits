import { bestSet, e1rm, findPRs, mergeBests, volume, type LoggedSet } from './metrics';

const done = (
  weight_kg: number,
  reps: number,
  set_type: LoggedSet['set_type'] = 'working',
): LoggedSet => ({
  set_type,
  weight_kg,
  reps,
  completed_at: '2026-10-05T17:00:00Z',
});

describe('metrics', () => {
  it('estimates 1RM with Epley', () => {
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 2);
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(0, 10)).toBe(0);
  });

  it('counts volume over completed working sets only', () => {
    expect(
      volume([
        done(40, 10, 'warmup'),
        done(80, 8),
        done(80, 8),
        { ...done(80, 8), completed_at: null },
      ]),
    ).toBe(1280);
  });

  it('picks the best set by e1RM', () => {
    expect(bestSet([done(80, 8), done(85, 5), done(75, 12)])).toEqual(done(75, 12));
    expect(bestSet([done(40, 10, 'warmup')])).toBeNull();
  });

  it('finds PRs against previous bests, but not first-timers', () => {
    const bests = new Map([['bench', { e1rm_kg: e1rm(80, 8), weight_kg: 80, reps: 8 }]]);
    const prs = findPRs(
      [
        { exercise_id: 'bench', name: 'bench press', sets: [done(80, 8), done(82.5, 8)] },
        { exercise_id: 'row', name: 'row', sets: [done(70, 10)] },
      ],
      bests,
    );
    expect(prs).toHaveLength(1);
    expect(prs[0]).toMatchObject({
      exercise_id: 'bench',
      weight_kg: 82.5,
      reps: 8,
      was: { weight_kg: 80, reps: 8 },
    });
    expect(findPRs([{ exercise_id: 'bench', name: 'b', sets: [done(80, 8)] }], bests)).toEqual([]);
  });

  it('merges a workout into bests', () => {
    const next = mergeBests(new Map(), [{ exercise_id: 'row', sets: [done(70, 10)] }]);
    expect(next.get('row')).toEqual({ e1rm_kg: e1rm(70, 10), weight_kg: 70, reps: 10 });
  });
});
