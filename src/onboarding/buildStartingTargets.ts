import { mondayOf } from '@/engine/calendar';
import { computeTargets, type Targets } from '@/engine/nutrition';

import type { CompleteDraft } from './types';

/** Arguments for the `save_starting_targets` RPC (supabase/migrations/*_auth_onboarding.sql). */
export type SaveStartingTargetsArgs = {
  p_unit_system: CompleteDraft['unitSystem'];
  p_focus: CompleteDraft['focus'];
  p_timezone: string;
  p_sex: CompleteDraft['sex'];
  p_height_cm: number;
  p_experience: CompleteDraft['experience'];
  p_goal: CompleteDraft['goal'];
  p_phase: Targets['phase'];
  p_rate_mode: 'auto' | 'manual';
  p_weekly_rate_pct: number;
  p_start_date: string;
  p_start_weight_kg: number;
  p_start_body_fat_pct: number;
  p_week_start: string;
  p_maintenance_kcal: number;
  p_kcal_target: number;
  p_kcal_low: number;
  p_kcal_high: number;
  p_protein_g: number;
  p_fat_g: number;
  p_carbs_g: number;
};

/**
 * Turns a finished onboarding draft into the starting targets (for the screen) and the RPC
 * payload (for the save). Pure: `today` is the local calendar date, passed in.
 */
export function buildStartingTargets(
  draft: CompleteDraft,
  ctx: { today: string; timezone: string },
): { targets: Targets; args: SaveStartingTargetsArgs } {
  const manualRatePct =
    draft.rateManual && draft.manualRateKgPerWeek !== null
      ? (draft.manualRateKgPerWeek / draft.weightKg) * 100
      : undefined;

  const targets = computeTargets({
    sex: draft.sex,
    experience: draft.experience,
    goal: draft.goal,
    weightKg: draft.weightKg,
    bodyFatPct: draft.bodyFatPct,
    rateOverridePct: manualRatePct,
  });

  return {
    targets,
    args: {
      p_unit_system: draft.unitSystem,
      p_focus: draft.focus,
      p_timezone: ctx.timezone,
      p_sex: draft.sex,
      p_height_cm: draft.heightCm,
      p_experience: draft.experience,
      p_goal: draft.goal,
      p_phase: targets.phase,
      p_rate_mode: manualRatePct === undefined ? 'auto' : 'manual',
      p_weekly_rate_pct: targets.weeklyRatePct,
      p_start_date: ctx.today,
      p_start_weight_kg: draft.weightKg,
      p_start_body_fat_pct: draft.bodyFatPct,
      p_week_start: mondayOf(ctx.today),
      p_maintenance_kcal: targets.maintenanceKcal,
      p_kcal_target: targets.kcalTarget,
      p_kcal_low: targets.kcalLow,
      p_kcal_high: targets.kcalHigh,
      p_protein_g: targets.proteinG,
      p_fat_g: targets.fatG,
      p_carbs_g: targets.carbsG,
    },
  };
}

/** Daily deficit (negative) or surplus, rounded half away from zero: −717.5 → −718. */
export function dailyDelta(targets: Targets): number {
  const raw = targets.raw.kcalTarget - targets.raw.maintenanceKcal;
  return Math.sign(raw) * Math.round(Math.abs(raw));
}
