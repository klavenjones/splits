import type { ExerciseLike } from './filter';
import { cleanSecondary, findSameName, validateDraft, type ExerciseDraft } from './validate';

const ex = (id: string, name: string, owner: string | null = null): ExerciseLike => ({
  id,
  name,
  owner_id: owner,
  primary_muscle: 'shoulders',
  secondary_muscles: [],
  equipment: 'landmine',
  movement_pattern: null,
});
const LIST = [ex('1', 'landmine press', 'me'), ex('2', 'bench press')];

const draft = (p: Partial<ExerciseDraft> = {}): ExerciseDraft => ({
  name: 'Z press',
  primaryMuscle: 'front delts',
  secondaryMuscles: [],
  equipment: 'barbell',
  movementPattern: 'vertical press',
  trackingType: 'weight_reps',
  notes: '',
  ...p,
});

describe('findSameName', () => {
  it('matches ignoring case, spacing and punctuation', () => {
    expect(findSameName(LIST, '  Landmine-Press ')?.id).toBe('1');
    expect(findSameName(LIST, 'BENCH press')?.id).toBe('2');
    expect(findSameName(LIST, 'landmine')).toBeNull();
    expect(findSameName(LIST, '   ')).toBeNull();
  });

  it('skips the exercise being edited', () => {
    expect(findSameName(LIST, 'landmine press', '1')).toBeNull();
  });
});

describe('validateDraft', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(draft(), LIST)).toEqual({});
    expect(validateDraft(draft({ equipment: null }), LIST)).toEqual({});
  });

  it('requires a unique name within 60 characters', () => {
    expect(validateDraft(draft({ name: '  ' }), LIST).name).toBeDefined();
    expect(validateDraft(draft({ name: 'x'.repeat(61) }), LIST).name).toBeDefined();
    expect(validateDraft(draft({ name: 'bench press' }), LIST).name).toMatch(/already/);
    expect(validateDraft(draft({ name: 'landmine press' }), LIST, '1')).toEqual({});
  });

  it('requires a known primary muscle and equipment', () => {
    expect(validateDraft(draft({ primaryMuscle: null }), LIST).primaryMuscle).toBeDefined();
    expect(validateDraft(draft({ primaryMuscle: 'shoulders' }), LIST).primaryMuscle).toBeDefined();
    expect(validateDraft(draft({ equipment: 'trebuchet' }), LIST).equipment).toBeDefined();
  });

  it('accepts no slot, or a known one', () => {
    expect(validateDraft(draft({ movementPattern: null }), LIST)).toEqual({});
    expect(validateDraft(draft({ movementPattern: 'hinge' }), LIST)).toEqual({});
    expect(
      validateDraft(draft({ movementPattern: 'upper push' }), LIST).movementPattern,
    ).toBeDefined();
  });

  it('limits notes', () => {
    expect(validateDraft(draft({ notes: 'x'.repeat(501) }), LIST).notes).toBeDefined();
  });
});

describe('cleanSecondary', () => {
  it('drops the primary, duplicates and unknown values', () => {
    expect(
      cleanSecondary('triceps', ['triceps', 'upper chest', 'upper chest', 'wings', 'abs']),
    ).toEqual(['upper chest', 'abs']);
  });
});
