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
