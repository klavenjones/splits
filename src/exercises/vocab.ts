/**
 * The exercise vocabulary. `exercises.primary_muscle`, `secondary_muscles` and `equipment` are
 * free text in the schema; these lists are the values the app writes and filters on
 * (docs/data-model.md → "Exercise vocabulary"). Pure.
 */
import type { Enums } from '@/db/types';

export type TrackingType = Enums<'tracking_type'>;

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'full body',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Specific muscles, each in exactly one group. The first muscle of a group is its default. */
export const MUSCLES_BY_GROUP = {
  chest: ['chest', 'upper chest'],
  back: ['lats', 'upper back', 'lower back', 'traps'],
  shoulders: ['front delts', 'side delts', 'rear delts'],
  arms: ['biceps', 'triceps', 'forearms'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  core: ['abs', 'obliques'],
  'full body': ['full body'],
} as const satisfies Record<MuscleGroup, readonly string[]>;

export type Muscle = (typeof MUSCLES_BY_GROUP)[MuscleGroup][number];

export const MUSCLES: readonly Muscle[] = MUSCLE_GROUPS.flatMap((g) => MUSCLES_BY_GROUP[g]);

export const EQUIPMENT = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'bodyweight',
  'band',
  'landmine',
  'ez bar',
  'smith machine',
  'sled',
  'box',
  'rower',
  'bike',
  'other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

/**
 * Movement slots: the job an exercise does in a session, whatever muscle it trains
 * (`exercises.movement_pattern`). One per exercise. Each belongs to exactly one group.
 */
export const MOVEMENT_PATTERN_GROUPS = [
  'upper push',
  'upper pull',
  'lower',
  'core',
  'full body / other',
] as const;
export type MovementPatternGroup = (typeof MOVEMENT_PATTERN_GROUPS)[number];

export const MOVEMENT_PATTERNS_BY_GROUP = {
  'upper push': [
    'horizontal press',
    'incline press',
    'vertical press',
    'chest fly',
    'triceps extension',
    'lateral raise',
  ],
  'upper pull': [
    'horizontal pull',
    'vertical pull',
    'rear delt / upper back',
    'biceps curl',
    'shrug',
  ],
  lower: [
    'squat',
    'hinge',
    'lunge / split squat',
    'hip thrust / bridge',
    'knee extension',
    'knee flexion',
    'calf raise',
    'hip abduction / adduction',
  ],
  core: ['anti-extension', 'flexion', 'rotation / anti-rotation', 'back extension'],
  'full body / other': [
    'carry',
    'olympic / power',
    'plyometric / jump',
    'conditioning / cardio',
    'mobility / other',
  ],
} as const satisfies Record<MovementPatternGroup, readonly string[]>;

export type MovementPattern = (typeof MOVEMENT_PATTERNS_BY_GROUP)[MovementPatternGroup][number];

export const MOVEMENT_PATTERNS: readonly MovementPattern[] = MOVEMENT_PATTERN_GROUPS.flatMap(
  (g) => MOVEMENT_PATTERNS_BY_GROUP[g],
);

/** The six the create form shows first (mockup 09/02); the rest sit behind "more". */
export const COMMON_EQUIPMENT: readonly Equipment[] = [
  'barbell',
  'dumbbell',
  'landmine',
  'cable',
  'machine',
  'bodyweight',
];

/** Secondary muscles worth offering first for a primary group; "more" shows the rest. */
const RELATED: Record<MuscleGroup, readonly Muscle[]> = {
  chest: ['chest', 'upper chest', 'triceps', 'front delts'],
  back: ['lats', 'upper back', 'traps', 'lower back', 'rear delts', 'biceps', 'forearms'],
  shoulders: ['front delts', 'side delts', 'rear delts', 'triceps', 'upper chest', 'traps', 'abs'],
  arms: ['biceps', 'triceps', 'forearms', 'front delts'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'lower back', 'abs'],
  core: ['abs', 'obliques', 'lower back', 'glutes'],
  'full body': ['quads', 'glutes', 'hamstrings', 'calves', 'upper back', 'abs', 'forearms'],
};

export function suggestedSecondary(primary: string | null): readonly Muscle[] {
  const g = muscleGroup(primary);
  return g ? RELATED[g].filter((m) => m !== primary) : [];
}

export const TRACKING_TYPES: readonly TrackingType[] = [
  'weight_reps',
  'reps_only',
  'duration',
  'distance',
];

export const TRACKING_LABEL: Record<TrackingType, string> = {
  weight_reps: 'weight & reps',
  reps_only: 'reps',
  duration: 'time',
  distance: 'distance',
};

const GROUP_OF = new Map<string, MuscleGroup>(
  MUSCLE_GROUPS.flatMap((g) => MUSCLES_BY_GROUP[g].map((m) => [m, g] as const)),
);

export const isMuscle = (v: string | null | undefined): v is Muscle => !!v && GROUP_OF.has(v);
export const isEquipment = (v: string | null | undefined): v is Equipment =>
  !!v && (EQUIPMENT as readonly string[]).includes(v);

/** The group a muscle belongs to, or null for unknown or missing values. */
export function muscleGroup(muscle: string | null | undefined): MuscleGroup | null {
  return (muscle && GROUP_OF.get(muscle)) || null;
}

const PATTERN_GROUP_OF = new Map<string, MovementPatternGroup>(
  MOVEMENT_PATTERN_GROUPS.flatMap((g) => MOVEMENT_PATTERNS_BY_GROUP[g].map((p) => [p, g] as const)),
);

export const isMovementPattern = (v: string | null | undefined): v is MovementPattern =>
  !!v && PATTERN_GROUP_OF.has(v);

/** The group a movement slot belongs to, or null for unknown or missing values. */
export function movementPatternGroup(
  pattern: string | null | undefined,
): MovementPatternGroup | null {
  return (pattern && PATTERN_GROUP_OF.get(pattern)) || null;
}
