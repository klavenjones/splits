import type { Experience, Goal, Sex } from '@/engine/nutrition';
import type { Focus } from '@/engine/focus';

import type { UnitSystem } from '@/units';

export type { UnitSystem };

/** Everything onboarding collects, in metric. `null` = not answered yet. */
export type OnboardingDraft = {
  unitSystem: UnitSystem;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  focus: Focus;
  experience: Experience | null;
  goal: Goal | null;
  /** "set manually" on the main-goal screen. */
  rateManual: boolean;
  /** Manual weekly change in kg (negative = loss); used only when `rateManual`. */
  manualRateKgPerWeek: number | null;
};

export const EMPTY_DRAFT: OnboardingDraft = {
  unitSystem: 'imperial',
  sex: null,
  heightCm: null,
  weightKg: null,
  bodyFatPct: null,
  focus: 'balanced',
  experience: null,
  goal: null,
  rateManual: false,
  manualRateKgPerWeek: null,
};

/** A draft with every field the targets need. */
export type CompleteDraft = OnboardingDraft & {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  bodyFatPct: number;
  experience: Experience;
  goal: Goal;
};

export function isComplete(d: OnboardingDraft): d is CompleteDraft {
  return (
    d.sex !== null &&
    d.heightCm !== null &&
    d.weightKg !== null &&
    d.bodyFatPct !== null &&
    d.experience !== null &&
    d.goal !== null &&
    (!d.rateManual || d.manualRateKgPerWeek !== null)
  );
}
