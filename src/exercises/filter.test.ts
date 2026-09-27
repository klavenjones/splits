import { filterExercises, matchesQuery, normalize, queryTerms, type ExerciseLike } from './filter';

const ex = (
  name: string,
  primary: string,
  equipment: string,
  owner: string | null = null,
): ExerciseLike => ({
  id: name,
  name,
  owner_id: owner,
  primary_muscle: primary,
  secondary_muscles: [],
  equipment,
});

const LIST = [
  ex('bench press', 'chest', 'barbell'),
  ex('dumbbell bench press', 'chest', 'dumbbell'),
  ex('pull-up', 'lats', 'bodyweight'),
  ex('Romanian deadlift', 'hamstrings', 'barbell'),
  ex('sled push', 'full body', 'sled'),
  ex('leg press', 'quads', 'machine'),
  ex('Crème curl', 'biceps', 'dumbbell', 'u1'),
];
const names = (l: ExerciseLike[]) => l.map((e) => e.name);

describe('normalize', () => {
  it('drops case, accents and punctuation', () => {
    expect(normalize('  Crème-Brûlée  Curl! ')).toBe('creme brulee curl');
  });
});

describe('queryTerms', () => {
  it('expands gym shorthand', () => {
    expect(queryTerms('press DB')).toEqual(['press', 'dumbbell']);
    expect(queryTerms('rdl')).toEqual(['romanian', 'deadlift']);
    expect(queryTerms('   ')).toEqual([]);
  });
});

describe('filterExercises', () => {
  it('returns everything with no filters', () => {
    expect(filterExercises(LIST, {})).toHaveLength(LIST.length);
  });

  it('matches every word in any order', () => {
    expect(names(filterExercises(LIST, { query: 'press db' }))).toEqual(['dumbbell bench press']);
    expect(names(filterExercises(LIST, { query: 'press bench' }))).toEqual([
      'bench press',
      'dumbbell bench press',
    ]);
  });

  it('ignores punctuation and spacing', () => {
    expect(names(filterExercises(LIST, { query: 'pullup' }))).toEqual(['pull-up']);
    expect(names(filterExercises(LIST, { query: 'PULL UP' }))).toEqual(['pull-up']);
    expect(names(filterExercises(LIST, { query: 'creme' }))).toEqual(['Crème curl']);
  });

  it('also searches equipment and primary muscle', () => {
    expect(names(filterExercises(LIST, { query: 'sled' }))).toEqual(['sled push']);
    expect(names(filterExercises(LIST, { query: 'hamstrings' }))).toEqual(['Romanian deadlift']);
  });

  it('filters by muscle group via the primary muscle', () => {
    expect(names(filterExercises(LIST, { groups: ['legs'] }))).toEqual([
      'Romanian deadlift',
      'leg press',
    ]);
    expect(names(filterExercises(LIST, { groups: ['back', 'full body'] }))).toEqual([
      'pull-up',
      'sled push',
    ]);
  });

  it('filters by equipment and combines with the rest', () => {
    expect(names(filterExercises(LIST, { equipment: ['barbell'] }))).toEqual([
      'bench press',
      'Romanian deadlift',
    ]);
    expect(
      names(filterExercises(LIST, { groups: ['legs'], equipment: ['barbell'], query: 'dead' })),
    ).toEqual(['Romanian deadlift']);
    expect(filterExercises(LIST, { groups: ['legs'], equipment: ['sled'] })).toEqual([]);
  });

  it('treats unknown muscles as matching no group', () => {
    const odd = { ...ex('mystery', 'spleen', 'other') };
    expect(filterExercises([odd], { groups: ['core'] })).toEqual([]);
    expect(matchesQuery(odd, [])).toBe(true);
  });
});
