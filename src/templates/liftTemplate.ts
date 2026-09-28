/**
 * Lift template exercises. Stored flat (template_exercises): one row per exercise in `position`
 * order; superset members share `superset_group` and are contiguous. In a superset you alternate
 * sets and rest after the round, so only the last member stores `rest_sec`; the others store 0
 * ("none"). The builder works with blocks. Pure.
 */
import { newKey } from './runSegments';

export type LiftItem = {
  key: string;
  exercise_id: string;
  /** Display only (from exercises). */
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  target_sets: number;
  rep_min: number | null;
  rep_max: number | null;
  rest_sec: number | null;
  notes: string | null;
};

export type LiftBlock =
  | { kind: 'single'; key: string; item: LiftItem }
  | { kind: 'superset'; key: string; items: LiftItem[]; rest_sec: number | null };

export type LiftRow = Omit<LiftItem, 'key' | 'name' | 'primary_muscle' | 'equipment'> & {
  position: number;
  superset_group: number | null;
};

export const DEFAULT_TARGETS = { target_sets: 3, rep_min: 8, rep_max: 12, rest_sec: 90 };

export function newItem(e: {
  id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
}): LiftItem {
  return {
    key: newKey('e'),
    exercise_id: e.id,
    name: e.name,
    primary_muscle: e.primary_muscle,
    equipment: e.equipment,
    ...DEFAULT_TARGETS,
    notes: null,
  };
}

const single = (item: LiftItem): LiftBlock => ({ kind: 'single', key: newKey('b'), item });

/** A superset of one is just an exercise; it keeps the group's rest. */
function normalize(b: LiftBlock): LiftBlock {
  if (b.kind === 'superset' && b.items.length === 1)
    return { kind: 'single', key: b.key, item: { ...b.items[0], rest_sec: b.rest_sec } };
  return b;
}

/* ---------------- rows ↔ blocks ---------------- */

type RowWithDisplay = LiftRow & Pick<LiftItem, 'name' | 'primary_muscle' | 'equipment'>;

export function toBlocks(rows: readonly RowWithDisplay[]): LiftBlock[] {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const blocks: LiftBlock[] = [];
  let openGroup: number | null = null;
  for (const { position: _p, superset_group, ...rest } of sorted) {
    const item: LiftItem = { key: newKey('e'), ...rest };
    const last = blocks[blocks.length - 1];
    if (superset_group === null) {
      blocks.push(single(item));
      openGroup = null;
    } else if (last?.kind === 'superset' && openGroup === superset_group) {
      last.items.push(item);
      last.rest_sec = item.rest_sec;
    } else {
      blocks.push({ kind: 'superset', key: newKey('b'), items: [item], rest_sec: item.rest_sec });
      openGroup = superset_group;
    }
  }
  return blocks.map(normalize);
}

const row = (
  i: LiftItem,
  position: number,
  group: number | null,
  rest: number | null,
): LiftRow => ({
  exercise_id: i.exercise_id,
  target_sets: i.target_sets,
  rep_min: i.rep_min,
  rep_max: i.rep_max,
  rest_sec: rest,
  notes: i.notes,
  position,
  superset_group: group,
});

export function toRows(blocks: readonly LiftBlock[]): LiftRow[] {
  const rows: LiftRow[] = [];
  let group = 0;
  for (const raw of blocks) {
    const b = normalize(raw);
    if (b.kind === 'single') rows.push(row(b.item, rows.length, null, b.item.rest_sec));
    else if (b.items.length) {
      group += 1;
      b.items.forEach((i, n) =>
        rows.push(row(i, rows.length, group, n === b.items.length - 1 ? b.rest_sec : 0)),
      );
    }
  }
  return rows;
}

/* ---------------- edits ---------------- */

export function move<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  const [x] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, x);
  return next;
}

/** Merge block i with the block after it into one superset. The later block's rest wins. */
export function supersetWithNext(blocks: readonly LiftBlock[], i: number): LiftBlock[] {
  const a = blocks[i];
  const b = blocks[i + 1];
  if (!a || !b) return [...blocks];
  const items = (x: LiftBlock) => (x.kind === 'single' ? [x.item] : x.items);
  const rest = (x: LiftBlock) => (x.kind === 'single' ? x.item.rest_sec : x.rest_sec);
  const merged: LiftBlock = {
    kind: 'superset',
    key: a.key,
    items: [...items(a), ...items(b)],
    rest_sec: rest(b) ?? rest(a),
  };
  return [...blocks.slice(0, i), merged, ...blocks.slice(i + 2)];
}

/** Take item j out of superset i. It lands just before the superset if it was first, else after. */
export function leaveSuperset(blocks: readonly LiftBlock[], i: number, j: number): LiftBlock[] {
  const b = blocks[i];
  if (b?.kind !== 'superset') return [...blocks];
  const item = { ...b.items[j], rest_sec: b.rest_sec };
  const rest = normalize({ ...b, items: b.items.filter((_, n) => n !== j) });
  const pair = j === 0 ? [single(item), rest] : [rest, single(item)];
  return [...blocks.slice(0, i), ...pair, ...blocks.slice(i + 1)];
}

/** Remove exercise j of block i (j ignored for singles). */
export function removeItem(blocks: readonly LiftBlock[], i: number, j = 0): LiftBlock[] {
  const b = blocks[i];
  if (!b) return [...blocks];
  if (b.kind === 'single') return blocks.filter((_, n) => n !== i);
  const items = b.items.filter((_, n) => n !== j);
  if (!items.length) return blocks.filter((_, n) => n !== i);
  return blocks.map((x, n) => (n === i ? normalize({ ...b, items }) : x));
}

export function updateItem(
  blocks: readonly LiftBlock[],
  key: string,
  patch: Partial<LiftItem>,
): LiftBlock[] {
  return blocks.map((b) =>
    b.kind === 'single'
      ? b.item.key === key
        ? { ...b, item: { ...b.item, ...patch } }
        : b
      : { ...b, items: b.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) },
  );
}

export const allItems = (blocks: readonly LiftBlock[]): LiftItem[] =>
  blocks.flatMap((b) => (b.kind === 'single' ? [b.item] : b.items));

/* ---------------- estimates ---------------- */

export const WORK_SEC_PER_SET = 45;
export const SETUP_SEC_PER_EXERCISE = 120;

/** Seconds: each set's work plus its rest; a superset round is its members' work plus one rest. */
export function estimateDuration(blocks: readonly LiftBlock[]): number {
  let total = 0;
  for (const b of blocks) {
    if (b.kind === 'single') {
      total +=
        SETUP_SEC_PER_EXERCISE + b.item.target_sets * (WORK_SEC_PER_SET + (b.item.rest_sec ?? 0));
    } else {
      const rounds = Math.max(...b.items.map((i) => i.target_sets));
      total += SETUP_SEC_PER_EXERCISE * b.items.length;
      for (let r = 1; r <= rounds; r++) {
        const working = b.items.filter((i) => i.target_sets >= r).length;
        total += working * WORK_SEC_PER_SET + (b.rest_sec ?? 0);
      }
    }
  }
  return total;
}

/** "about 45 minutes": nearest 5 from 10 minutes up. */
export function aboutMinutes(seconds: number): number {
  const m = seconds / 60;
  return m >= 10 ? Math.round(m / 5) * 5 : Math.max(1, Math.round(m));
}

/** "6 exercises · 22 sets · about 45 minutes" */
export function summary(blocks: readonly LiftBlock[]): string {
  const items = allItems(blocks);
  if (!items.length) return 'no exercises yet';
  const sets = items.reduce((s, i) => s + i.target_sets, 0);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
  return `${plural(items.length, 'exercise')} · ${plural(sets, 'set')} · about ${aboutMinutes(estimateDuration(blocks))} minutes`;
}

/** "6–8", "10", "–" */
export function repsText(i: Pick<LiftItem, 'rep_min' | 'rep_max'>): string {
  if (i.rep_min && i.rep_max)
    return i.rep_min === i.rep_max ? `${i.rep_min}` : `${i.rep_min}–${i.rep_max}`;
  return String(i.rep_min ?? i.rep_max ?? '–');
}
