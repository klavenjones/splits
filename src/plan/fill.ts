/**
 * "Fill week from focus": the focus split laid over a week, each training day pre-filled by
 * rotating through the user's templates of that kind. Pure.
 */
import { defaultSplit, type Focus } from '@/engine/focus';

import { weekDays, type PlanSession, type WorkoutKind } from './week';

export type FillTemplate = { id: string; name: string; kind: WorkoutKind };

export type FillSlot = {
  date: string;
  /** What the split asks for on this day. */
  plan: WorkoutKind | 'rest';
  /** Why the day won't be filled, if it won't. */
  blocked: 'past' | 'planned' | 'no_templates' | null;
  /** The template to add, or null for none (rest, blocked, or cleared by the user). */
  template: FillTemplate | null;
};

/** The split is stored Sunday first; weeks here run Monday first. */
const mondayFirst = <T>(sundayFirst: readonly T[]): T[] => [
  ...sundayFirst.slice(1),
  sundayFirst[0],
];

export function fillSlots(
  focus: Focus,
  monday: string,
  today: string,
  sessions: readonly Pick<PlanSession, 'scheduled_date' | 'status'>[],
  templates: readonly FillTemplate[],
): FillSlot[] {
  const split = mondayFirst(defaultSplit(focus));
  const byKind = (kind: WorkoutKind) =>
    templates.filter((t) => t.kind === kind).sort((a, b) => a.name.localeCompare(b.name));
  const pools = { lift: byKind('lift'), run: byKind('run') };
  const next = { lift: 0, run: 0 };
  const taken = new Set(
    sessions.filter((s) => s.status !== 'skipped').map((s) => s.scheduled_date),
  );

  return weekDays(monday).map((date, i) => {
    const plan = split[i];
    if (plan === 'rest') return { date, plan, blocked: null, template: null };
    const blocked =
      date < today
        ? 'past'
        : taken.has(date)
          ? 'planned'
          : pools[plan].length === 0
            ? 'no_templates'
            : null;
    if (blocked) return { date, plan, blocked, template: null };
    const pool = pools[plan];
    const template = pool[next[plan]++ % pool.length];
    return { date, plan, blocked, template };
  });
}

/** The sessions to create from the slots. */
export const fillItems = (slots: readonly FillSlot[]) =>
  slots.flatMap((s) =>
    s.template && !s.blocked ? [{ template_id: s.template.id, scheduled_date: s.date }] : [],
  );
