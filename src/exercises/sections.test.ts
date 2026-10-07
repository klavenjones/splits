import type { ExerciseLike } from './filter';
import { sectionLetter, toSections } from './sections';

const ex = (name: string, owner: string | null = null): ExerciseLike => ({
  id: `${owner}:${name}`,
  name,
  owner_id: owner,
  primary_muscle: 'chest',
  secondary_muscles: [],
  equipment: 'barbell',
  movement_pattern: null,
});

describe('sectionLetter', () => {
  it('uses the first letter, accents dropped, else #', () => {
    expect(sectionLetter('bench press')).toBe('B');
    expect(sectionLetter('Arnold press')).toBe('A');
    expect(sectionLetter('Élévation')).toBe('E');
    expect(sectionLetter('45° hyperextension')).toBe('#');
  });
});

describe('toSections', () => {
  const list = [
    ex('box jump'),
    ex('Arnold press'),
    ex('sled push', 'me'),
    ex('bench press'),
    ex('90/90 hip switch'),
    ex('a custom of someone else', 'other'),
    ex('arm circle', 'me'),
  ];

  it('puts my customs first, then A–Z case-insensitively, then #', () => {
    const { sections } = toSections(list, 'me');
    expect(sections.map((s) => s.key)).toEqual(['custom', 'A', 'B', '#']);
    expect(sections[0].data.map((e) => e.name)).toEqual(['arm circle', 'sled push']);
    expect(sections[1].data.map((e) => e.name)).toEqual([
      'a custom of someone else',
      'Arnold press',
    ]);
    expect(sections[2].data.map((e) => e.name)).toEqual(['bench press', 'box jump']);
  });

  it('reports only A–Z letters that have entries', () => {
    const { letters } = toSections(list, 'me');
    expect([...letters].sort()).toEqual(['#', 'A', 'B']);
  });

  it('has no custom section when signed out or empty', () => {
    expect(toSections(list, null).sections[0].key).toBe('A');
    expect(toSections([], 'me').sections).toEqual([]);
  });
});
