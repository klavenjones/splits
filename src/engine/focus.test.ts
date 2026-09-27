import { defaultSplit, splitSummary } from './focus';

describe('focus', () => {
  it('summarizes each split', () => {
    expect(splitSummary('balanced')).toBe('3 runs · 3 lifts · 1 rest day');
    expect(splitSummary('run_first')).toBe('4 runs · 2 lifts · 1 rest day');
    expect(splitSummary('lift_first')).toBe('2 runs · 4 lifts · 1 rest day');
  });

  it('always plans 7 days starting with Sunday rest', () => {
    for (const f of ['run_first', 'balanced', 'lift_first'] as const) {
      expect(defaultSplit(f)).toHaveLength(7);
      expect(defaultSplit(f)[0]).toBe('rest');
    }
  });
});
