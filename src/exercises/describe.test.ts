import { detailSubtitle, readInstructions, rowSubtitle } from './describe';

describe('describe', () => {
  it('builds row and detail subtitles', () => {
    const e = { primary_muscle: 'chest', secondary_muscles: ['triceps'], equipment: 'barbell' };
    expect(rowSubtitle(e)).toBe('chest · barbell');
    expect(detailSubtitle(e)).toBe('barbell · chest, triceps');
    expect(rowSubtitle({ primary_muscle: 'abs', equipment: null })).toBe('abs');
    expect(detailSubtitle({ primary_muscle: null, secondary_muscles: [], equipment: 'band' })).toBe(
      'band',
    );
  });

  it('reads instructions defensively', () => {
    expect(readInstructions(null)).toEqual({ steps: [], cues: [], mistakes: [] });
    expect(readInstructions({ steps: ['a', 2, ' '], cues: 'x' })).toEqual({
      steps: ['a'],
      cues: [],
      mistakes: [],
    });
  });
});
