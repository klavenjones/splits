import {
  aboutMinutes,
  allItems,
  estimateDuration,
  leaveSuperset,
  move,
  newItem,
  removeItem,
  repsText,
  summary,
  supersetWithNext,
  toBlocks,
  toRows,
  type LiftBlock,
  type LiftItem,
} from './liftTemplate';

const ex = (name: string, sets: number, min: number, max: number, rest: number): LiftItem => ({
  ...newItem({ id: `id-${name}`, name, primary_muscle: 'chest', equipment: 'barbell' }),
  target_sets: sets,
  rep_min: min,
  rep_max: max,
  rest_sec: rest,
});

/** Upper A from the mockup, plus two more to make 6 exercises / 22 sets. */
const upperA = (): LiftBlock[] => {
  const blocks: LiftBlock[] = [
    ex('bench press', 4, 6, 8, 150),
    ex('pull-up', 3, 8, 10, 90),
    ex('incline dumbbell press', 3, 10, 12, 90),
    ex('lateral raise', 3, 12, 15, 60),
    ex('barbell row', 4, 8, 10, 120),
    ex('triceps pushdown', 5, 10, 12, 60),
  ].map((item) => ({ kind: 'single', key: item.key, item }));
  return supersetWithNext(blocks, 1);
};

describe('supersets', () => {
  it('merges two exercises and rests after both', () => {
    const blocks = upperA();
    expect(blocks.map((b) => b.kind)).toEqual(['single', 'superset', 'single', 'single', 'single']);
    const rows = toRows(blocks);
    expect(rows.slice(0, 4).map((r) => [r.position, r.superset_group, r.rest_sec])).toEqual([
      [0, null, 150],
      [1, 1, 0],
      [2, 1, 90],
      [3, null, 60],
    ]);
  });

  it('round-trips rows through blocks', () => {
    const rows = toRows(upperA());
    const names = allItems(upperA()).map((i) => ({
      name: i.name,
      primary_muscle: i.primary_muscle,
      equipment: i.equipment,
    }));
    const back = toBlocks(rows.map((r, n) => ({ ...r, ...names[n] })));
    expect(toRows(back)).toEqual(rows);
    expect(back[1].kind).toBe('superset');
  });

  it('extends a superset and leaves it again', () => {
    let blocks = supersetWithNext(upperA(), 1); // pull-up, incline, lateral raise
    expect(blocks[1].kind === 'superset' && blocks[1].items.map((i) => i.name)).toEqual([
      'pull-up',
      'incline dumbbell press',
      'lateral raise',
    ]);
    blocks = leaveSuperset(blocks, 1, 0); // pull-up goes before
    expect(blocks.map((b) => (b.kind === 'single' ? b.item.name : 'SS'))).toEqual([
      'bench press',
      'pull-up',
      'SS',
      'barbell row',
      'triceps pushdown',
    ]);
    blocks = leaveSuperset(blocks, 2, 1); // lateral raise goes after, incline becomes single
    expect(blocks.map((b) => b.kind)).toEqual([
      'single',
      'single',
      'single',
      'single',
      'single',
      'single',
    ]);
    expect(blocks[2].kind === 'single' && blocks[2].item.rest_sec).toBe(60);
  });

  it('removes a member and dissolves a superset of one', () => {
    const blocks = removeItem(upperA(), 1, 0);
    expect(blocks[1]).toMatchObject({ kind: 'single', item: { name: 'incline dumbbell press' } });
    expect(allItems(removeItem(upperA(), 0))).toHaveLength(5);
  });
});

describe('move', () => {
  it('moves a whole superset as one block', () => {
    const blocks = move(upperA(), 2, 1); // lateral raise (block 2) above the superset
    expect(blocks.map((b) => (b.kind === 'single' ? b.item.name : 'SS'))).toEqual([
      'bench press',
      'lateral raise',
      'SS',
      'barbell row',
      'triceps pushdown',
    ]);
    expect(move([1, 2, 3], 0, 9)).toEqual([2, 3, 1]);
  });
});

describe('estimates', () => {
  it('summarises Upper A', () => {
    expect(summary(upperA())).toMatch(/^6 exercises · 22 sets · about \d+ minutes$/);
    expect(summary([])).toBe('no exercises yet');
  });

  it('counts a superset round as both sets plus one rest', () => {
    const blocks = upperA().slice(1, 2);
    // 2 setups + 3 rounds × (2 × 45 s + 90 s)
    expect(estimateDuration(blocks)).toBe(240 + 3 * (90 + 90));
  });

  it('rounds minutes', () => {
    expect(aboutMinutes(44 * 60)).toBe(45);
    expect(aboutMinutes(7 * 60 + 40)).toBe(8);
  });

  it('formats rep ranges', () => {
    expect(repsText({ rep_min: 6, rep_max: 8 })).toBe('6–8');
    expect(repsText({ rep_min: 5, rep_max: 5 })).toBe('5');
    expect(repsText({ rep_min: null, rep_max: null })).toBe('–');
  });
});
