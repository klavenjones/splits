/** Save-time rules for templates. Pure. */
import { allItems, type LiftBlock } from './liftTemplate';
import { expand, type Block, type Segment } from './runSegments';

export const TEMPLATE_NAME_MAX = 60;

export type TemplateErrors = { name?: string; items?: string };

/** A segment's problem, or null when it can be saved. */
export function segmentError(s: Segment): string | null {
  if ((s.distance_m === null) === (s.duration_s === null)) return 'Set a distance or a time.';
  if ((s.distance_m ?? 1) <= 0 || (s.duration_s ?? 1) <= 0)
    return 'Use a distance or time above zero.';
  switch (s.target_type) {
    case 'pace':
      return s.target_pace_s_per_km ? null : 'Enter a target pace.';
    case 'heart_rate_zone':
      return s.target_hr_zone && s.target_hr_zone >= 1 && s.target_hr_zone <= 5
        ? null
        : 'Pick a heart-rate zone.';
    case 'effort':
      return s.target_effort ? null : 'Pick an effort.';
    default:
      return null;
  }
}

export function validateTemplate(
  t: { name: string } & ({ kind: 'lift'; lift: LiftBlock[] } | { kind: 'run'; run: Block[] }),
): TemplateErrors {
  const errors: TemplateErrors = {};
  const name = t.name.trim();
  if (!name) errors.name = 'Give it a name.';
  else if (name.length > TEMPLATE_NAME_MAX)
    errors.name = `Keep it under ${TEMPLATE_NAME_MAX} characters.`;

  if (t.kind === 'lift') {
    const items = allItems(t.lift);
    if (!items.length) errors.items = 'Add at least one exercise.';
    else if (items.some((i) => i.target_sets < 1))
      errors.items = 'Every exercise needs at least one set.';
    else if (items.some((i) => i.rep_min && i.rep_max && i.rep_min > i.rep_max))
      errors.items = 'A rep range runs low to high.';
  } else {
    if (!expand(t.run).length) errors.items = 'Add at least one segment.';
    else if (t.run.some((b) => (b.kind === 'single' ? [b.segment] : b.members).some(segmentError)))
      errors.items = 'Finish the highlighted segments.';
  }
  return errors;
}
