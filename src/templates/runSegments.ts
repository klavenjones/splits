/**
 * Run template segments. Stored flat (docs/data-model.md → template_run_segments): one row per
 * segment in `position` order; a repeat block's members share `repeat_group` and each carries the
 * block's `repeats`. The builder works with blocks; totals and the shape strip use the expanded
 * sequence a watch would run. Pure.
 */
import { formatDistance, formatDuration, formatPace, type UnitSystem } from '../units';

export type SegmentType = 'warmup' | 'interval' | 'recovery' | 'steady' | 'cooldown';
export type TargetType = 'pace' | 'heart_rate_zone' | 'effort' | 'none';
export type Effort = 'easy' | 'moderate' | 'hard';
export type VoiceCue = 'halfway' | 'every_200m' | 'pace_alerts';

export const SEGMENT_TYPES: readonly SegmentType[] = [
  'warmup',
  'interval',
  'recovery',
  'steady',
  'cooldown',
];
export const EFFORTS: readonly Effort[] = ['easy', 'moderate', 'hard'];
export const VOICE_CUES: readonly VoiceCue[] = ['halfway', 'every_200m', 'pace_alerts'];
export const VOICE_CUE_LABEL: Record<VoiceCue, string> = {
  halfway: 'halfway',
  every_200m: 'every 200 m',
  pace_alerts: 'pace alerts',
};
export const HR_ZONE_LABEL: Record<number, string> = {
  1: 'recovery',
  2: 'easy',
  3: 'tempo',
  4: 'threshold',
  5: 'max',
};

/** One segment as the builder edits it. Field names match the table. */
export type Segment = {
  key: string;
  segment_type: SegmentType;
  distance_m: number | null;
  duration_s: number | null;
  target_type: TargetType;
  target_pace_s_per_km: number | null;
  target_pace_tolerance_s: number;
  target_hr_zone: number | null;
  target_effort: Effort | null;
  voice_cues: VoiceCue[];
};

export type Block =
  | { kind: 'single'; key: string; segment: Segment }
  | { kind: 'repeat'; key: string; repeats: number; members: Segment[] };

/** A stored row (without ids and template_id). */
export type SegmentRow = Omit<Segment, 'key'> & {
  position: number;
  repeat_group: number | null;
  repeats: number;
};

let nextKey = 0;
export const newKey = (prefix = 'k') => `${prefix}${++nextKey}`;

/* ---------------- rows ↔ blocks ---------------- */

const stripRow = ({ position: _p, repeat_group: _g, repeats: _r, ...s }: SegmentRow): Segment => ({
  key: newKey('s'),
  ...s,
});

/** Rows (any order) → blocks. Consecutive rows with the same repeat_group form one block. */
export function toBlocks(rows: readonly SegmentRow[]): Block[] {
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const blocks: Block[] = [];
  let openGroup: number | null = null;
  for (const row of sorted) {
    const last = blocks[blocks.length - 1];
    if (row.repeat_group === null) {
      blocks.push({ kind: 'single', key: newKey('b'), segment: stripRow(row) });
      openGroup = null;
    } else if (last?.kind === 'repeat' && openGroup === row.repeat_group) {
      last.members.push(stripRow(row));
    } else {
      blocks.push({
        kind: 'repeat',
        key: newKey('b'),
        repeats: Math.max(1, row.repeats),
        members: [stripRow(row)],
      });
      openGroup = row.repeat_group;
    }
  }
  return blocks;
}

const toRow = (s: Segment, position: number, group: number | null, repeats: number): SegmentRow => {
  const { key: _k, ...rest } = s;
  return { ...rest, position, repeat_group: group, repeats };
};

/** Blocks → rows with positions 0…n and repeat groups renumbered 1, 2, 3… Empty blocks vanish. */
export function toRows(blocks: readonly Block[]): SegmentRow[] {
  const rows: SegmentRow[] = [];
  let group = 0;
  for (const b of blocks) {
    if (b.kind === 'single') rows.push(toRow(b.segment, rows.length, null, 1));
    else if (b.members.length) {
      group += 1;
      for (const m of b.members) rows.push(toRow(m, rows.length, group, b.repeats));
    }
  }
  return rows;
}

/* ---------------- expansion ---------------- */

export type Expanded = { segment: Segment; round: number | null };

/**
 * The sequence a watch runs. Each repeat block plays its members `repeats` times; in the last
 * round, recovery segments after the block's last non-recovery segment are dropped (the final
 * interval flows straight into what follows). A recoveries-only block is played in full.
 */
export function expand(blocks: readonly Block[]): Expanded[] {
  const out: Expanded[] = [];
  for (const b of blocks) {
    if (b.kind === 'single') {
      out.push({ segment: b.segment, round: null });
      continue;
    }
    let lastWork = -1;
    b.members.forEach((m, i) => {
      if (m.segment_type !== 'recovery') lastWork = i;
    });
    for (let round = 1; round <= b.repeats; round++) {
      const members =
        round === b.repeats && lastWork >= 0 ? b.members.slice(0, lastWork + 1) : b.members;
      for (const m of members) out.push({ segment: m, round });
    }
  }
  return out;
}

/* ---------------- estimates ---------------- */

/** Paces used when a segment has no pace target (s/km). Shown as "about". */
export const DEFAULT_PACE: Record<Effort | 'recovery', number> = {
  easy: 375, // 6:15 /km
  moderate: 330, // 5:30 /km
  hard: 285, // 4:45 /km
  recovery: 420, // 7:00 /km
};

function effortOf(s: Segment): Effort | 'recovery' {
  // A recovery is a jog whatever its effort label says.
  if (s.segment_type === 'recovery') return 'recovery';
  if (s.target_type === 'effort' && s.target_effort) return s.target_effort;
  if (s.target_type === 'heart_rate_zone' && s.target_hr_zone)
    return s.target_hr_zone <= 2 ? 'easy' : s.target_hr_zone === 3 ? 'moderate' : 'hard';
  switch (s.segment_type) {
    case 'interval':
      return 'hard';
    case 'steady':
      return 'moderate';
    default:
      return 'easy';
  }
}

/** The pace a segment is expected to run at, s/km. */
export function expectedPace(s: Segment): number {
  if (s.target_type === 'pace' && s.target_pace_s_per_km) return s.target_pace_s_per_km;
  return DEFAULT_PACE[effortOf(s)];
}

export function segmentDistance(s: Segment): number {
  if (s.distance_m !== null) return s.distance_m;
  return ((s.duration_s ?? 0) / expectedPace(s)) * 1000;
}

export function segmentDuration(s: Segment): number {
  if (s.duration_s !== null) return s.duration_s;
  return ((s.distance_m ?? 0) / 1000) * expectedPace(s);
}

export function totals(blocks: readonly Block[]): { distance_m: number; duration_s: number } {
  let distance = 0;
  let duration = 0;
  for (const { segment } of expand(blocks)) {
    distance += segmentDistance(segment);
    duration += segmentDuration(segment);
  }
  return { distance_m: Math.round(distance), duration_s: Math.round(duration) };
}

/* ---------------- shape strip ---------------- */

export type ShapeBar = {
  key: string;
  /** Share of total duration, 0–1. */
  width: number;
  /** 0–1. */
  intensity: number;
  segment_type: SegmentType;
};

const TYPE_INTENSITY: Record<SegmentType, number> = {
  warmup: 0.35,
  cooldown: 0.35,
  recovery: 0.12,
  steady: 0.55,
  interval: 0.9,
};
const EFFORT_INTENSITY: Record<Effort, number> = { easy: 0.3, moderate: 0.6, hard: 1 };

/** One bar per expanded segment: width by estimated time, height by target intensity. */
export function shape(blocks: readonly Block[]): ShapeBar[] {
  const seq = expand(blocks);
  const paces = seq
    .map(({ segment: s }) => (s.target_type === 'pace' ? s.target_pace_s_per_km : null))
    .filter((p): p is number => p !== null);
  const slow = Math.max(...paces);
  const fast = Math.min(...paces);
  const total = seq.reduce((sum, { segment }) => sum + segmentDuration(segment), 0) || 1;

  const intensity = (s: Segment): number => {
    if (s.segment_type === 'recovery') return TYPE_INTENSITY.recovery;
    if (s.target_type === 'pace' && s.target_pace_s_per_km && slow > fast)
      return 0.35 + (0.65 * (slow - s.target_pace_s_per_km)) / (slow - fast);
    if (s.target_type === 'heart_rate_zone' && s.target_hr_zone) return s.target_hr_zone / 5;
    if (s.target_type === 'effort' && s.target_effort) return EFFORT_INTENSITY[s.target_effort];
    return TYPE_INTENSITY[s.segment_type];
  };

  return seq.map(({ segment, round }, i) => ({
    key: `${segment.key}-${round ?? 0}-${i}`,
    width: segmentDuration(segment) / total,
    intensity: Math.max(0.08, Math.min(1, intensity(segment))),
    segment_type: segment.segment_type,
  }));
}

/* ---------------- text ---------------- */

export function measureText(s: Segment, units: UnitSystem): string {
  if (s.distance_m !== null) return formatDistance(s.distance_m, units);
  if (s.duration_s !== null) return formatDuration(s.duration_s);
  return '';
}

export function targetText(s: Segment, units: UnitSystem): string | null {
  switch (s.target_type) {
    case 'pace':
      return s.target_pace_s_per_km ? `at ${formatPace(s.target_pace_s_per_km, units)}` : null;
    case 'heart_rate_zone':
      return s.target_hr_zone
        ? `zone ${s.target_hr_zone} (${HR_ZONE_LABEL[s.target_hr_zone]})`
        : null;
    case 'effort':
      return s.target_effort;
    default:
      return null;
  }
}

/** "800 m at 7:00 /mi", "1 mi · easy", "20:00 · zone 2 (easy)". */
export function segmentSummary(s: Segment, units: UnitSystem): string {
  const measure = measureText(s, units);
  const target = targetText(s, units);
  if (!target) return measure;
  return s.target_type === 'pace' ? `${measure} ${target}` : `${measure} · ${target}`;
}

/** Strip caption: "warmup · 6 × 800 m · cooldown". */
export function shapeCaption(blocks: readonly Block[], units: UnitSystem): string {
  return blocks
    .map((b) => {
      if (b.kind === 'single') return b.segment.segment_type;
      const work = b.members.find((m) => m.segment_type !== 'recovery') ?? b.members[0];
      return work ? `${b.repeats} × ${measureText(work, units)}` : null;
    })
    .filter(Boolean)
    .join(' · ');
}

/* ---------------- factories ---------------- */

export function newSegment(type: SegmentType, patch: Partial<Segment> = {}): Segment {
  return {
    key: newKey('s'),
    segment_type: type,
    distance_m: type === 'recovery' ? 200 : type === 'interval' ? 400 : 1609,
    duration_s: null,
    target_type: 'effort',
    target_pace_s_per_km: null,
    target_pace_tolerance_s: 0,
    target_hr_zone: null,
    target_effort: type === 'interval' ? 'hard' : 'easy',
    voice_cues: [],
    ...patch,
  };
}

/** "add repeat": 4 × (400 m hard + 200 m easy recovery). */
export function newRepeatBlock(): Block {
  return {
    kind: 'repeat',
    key: newKey('b'),
    repeats: 4,
    members: [newSegment('interval'), newSegment('recovery')],
  };
}
