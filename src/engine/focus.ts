/**
 * Training focus → default weekly split (docs/flows.md: the focus slider sets the default split
 * only). Pure.
 */
export type Focus = 'run_first' | 'balanced' | 'lift_first';
export type DayPlan = 'run' | 'lift' | 'rest';

export const FOCUS_LABEL: Record<Focus, string> = {
  run_first: 'run-first',
  balanced: 'balanced',
  lift_first: 'lift-first',
};

/** Default week, Sunday first (matches the onboarding preview). */
const SPLITS: Record<Focus, DayPlan[]> = {
  run_first: ['rest', 'run', 'lift', 'run', 'run', 'lift', 'run'],
  balanced: ['rest', 'lift', 'run', 'lift', 'run', 'lift', 'run'],
  lift_first: ['rest', 'lift', 'run', 'lift', 'lift', 'run', 'lift'],
};

export function defaultSplit(focus: Focus): DayPlan[] {
  return SPLITS[focus];
}

/** "3 runs · 3 lifts · 1 rest day" */
export function splitSummary(focus: Focus): string {
  const days = SPLITS[focus];
  const n = (kind: DayPlan) => days.filter((d) => d === kind).length;
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  return `${plural(n('run'), 'run')} · ${plural(n('lift'), 'lift')} · ${plural(n('rest'), 'rest day')}`;
}
