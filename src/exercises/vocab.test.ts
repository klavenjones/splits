import {
  EQUIPMENT,
  MUSCLE_GROUPS,
  MOVEMENT_PATTERNS,
  MOVEMENT_PATTERN_GROUPS,
  MUSCLES,
  isEquipment,
  isMovementPattern,
  isMuscle,
  movementPatternGroup,
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

describe('movement patterns', () => {
  it('has 28 unique slots, each in exactly one group', () => {
    expect(MOVEMENT_PATTERNS).toHaveLength(28);
    expect(new Set(MOVEMENT_PATTERNS).size).toBe(MOVEMENT_PATTERNS.length);
    for (const p of MOVEMENT_PATTERNS)
      expect(MOVEMENT_PATTERN_GROUPS).toContain(movementPatternGroup(p));
  });

  it('maps slots to groups', () => {
    expect(movementPatternGroup('horizontal press')).toBe('upper push');
    expect(movementPatternGroup('hinge')).toBe('lower');
    expect(movementPatternGroup('carry')).toBe('full body / other');
    expect(movementPatternGroup('bench')).toBeNull();
    expect(movementPatternGroup(null)).toBeNull();
  });

  it('checks membership', () => {
    expect(isMovementPattern('vertical pull')).toBe(true);
    expect(isMovementPattern('upper push')).toBe(false);
    expect(isMovementPattern(undefined)).toBe(false);
  });
});
