import { detailSubtitle, readCredit, readInstructions, rowSubtitle } from './describe';

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

describe('readCredit', () => {
  const ok = {
    author: 'Everkinetic',
    license: 'CC-BY-SA 3',
    license_url: 'https://creativecommons.org/licenses/by-sa/3.0/deed.en',
    source_url: 'https://wger.de/en/exercise/73/view/',
  };

  it('reads a complete credit', () => {
    expect(readCredit(ok)).toEqual({
      author: 'Everkinetic',
      authorUrl: null,
      license: 'CC-BY-SA 3',
      licenseUrl: ok.license_url,
      sourceUrl: ok.source_url,
    });
    expect(readCredit({ ...ok, author_url: 'https://example.org' })?.authorUrl).toBe(
      'https://example.org',
    );
  });

  it('rejects missing, partial or unsafe credits', () => {
    expect(readCredit(null)).toBeNull();
    expect(readCredit([])).toBeNull();
    expect(readCredit({ ...ok, author: ' ' })).toBeNull();
    expect(readCredit({ ...ok, source_url: 'javascript:alert(1)' })).toBeNull();
    expect(readCredit({ ...ok, author_url: 'ftp://x' })?.authorUrl).toBeNull();
  });
});
