import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  MUSCLES,
  isEquipment,
  isMuscle,
  muscleGroup,
  suggestedSecondary,
} from './vocab';

describe('vocab', () => {
  it('has unique muscles, each in one group', () => {
    expect(new Set(MUSCLES).size).toBe(MUSCLES.length);
    expect(MUSCLES).toHaveLength(21);
    for (const m of MUSCLES) expect(MUSCLE_GROUPS).toContain(muscleGroup(m));
  });

  it('maps muscles to groups', () => {
    expect(muscleGroup('rear delts')).toBe('shoulders');
    expect(muscleGroup('upper chest')).toBe('chest');
    expect(muscleGroup('full body')).toBe('full body');
    expect(muscleGroup('shoulders')).toBeNull();
    expect(muscleGroup(null)).toBeNull();
  });

  it('checks membership', () => {
    expect(isMuscle('glutes')).toBe(true);
    expect(isMuscle('legs')).toBe(false);
    expect(isEquipment('ez bar')).toBe(true);
    expect(isEquipment('body only')).toBe(false);
    expect(new Set(EQUIPMENT).size).toBe(EQUIPMENT.length);
  });
});

describe('suggestedSecondary', () => {
  it('offers related muscles without the primary', () => {
    expect(suggestedSecondary('front delts')).toEqual([
      'side delts',
      'rear delts',
      'triceps',
      'upper chest',
      'traps',
      'abs',
    ]);
    expect(suggestedSecondary(null)).toEqual([]);
    for (const m of suggestedSecondary('quads')) expect(isMuscle(m)).toBe(true);
  });
});
