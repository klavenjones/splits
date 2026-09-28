import {
  expand,
  newRepeatBlock,
  newSegment,
  segmentSummary,
  shape,
  shapeCaption,
  toBlocks,
  toRows,
  totals,
  type Block,
  type SegmentRow,
} from './runSegments';

const base = {
  duration_s: null,
  target_pace_s_per_km: null,
  target_pace_tolerance_s: 0,
  target_hr_zone: null,
  target_effort: null,
  voice_cues: [] as SegmentRow['voice_cues'],
};

/** 6 × 800 m as stored (docs example): warmup, repeat(interval, recovery) × 6, cooldown. */
const SIX_BY_800: SegmentRow[] = [
  {
    ...base,
    position: 0,
    segment_type: 'warmup',
    repeat_group: null,
    repeats: 1,
    distance_m: 1609,
    target_type: 'pace',
    target_pace_s_per_km: 354,
  },
  {
    ...base,
    position: 1,
    segment_type: 'interval',
    repeat_group: 1,
    repeats: 6,
    distance_m: 800,
    target_type: 'pace',
    target_pace_s_per_km: 261,
    target_pace_tolerance_s: 6,
    voice_cues: ['halfway', 'pace_alerts'],
  },
  {
    ...base,
    position: 2,
    segment_type: 'recovery',
    repeat_group: 1,
    repeats: 6,
    distance_m: 400,
    target_type: 'effort',
    target_effort: 'easy',
  },
  {
    ...base,
    position: 3,
    segment_type: 'cooldown',
    repeat_group: null,
    repeats: 1,
    distance_m: 1609,
    target_type: 'effort',
    target_effort: 'easy',
  },
];

describe('rows ↔ blocks', () => {
  it('groups a repeat block and round-trips exactly', () => {
    const blocks = toBlocks([...SIX_BY_800].reverse());
    expect(blocks.map((b) => b.kind)).toEqual(['single', 'repeat', 'single']);
    const rep = blocks[1] as Extract<Block, { kind: 'repeat' }>;
    expect(rep.repeats).toBe(6);
    expect(rep.members.map((m) => m.segment_type)).toEqual(['interval', 'recovery']);
    expect(toRows(blocks)).toEqual(SIX_BY_800);
  });

  it('keeps separate blocks apart and renumbers groups', () => {
    const rows: SegmentRow[] = [
      { ...SIX_BY_800[1], position: 0, repeat_group: 7, repeats: 3 },
      { ...SIX_BY_800[2], position: 1, repeat_group: 7, repeats: 3 },
      { ...SIX_BY_800[1], position: 2, repeat_group: 9, repeats: 2 },
    ];
    const blocks = toBlocks(rows);
    expect(blocks).toHaveLength(2);
    expect(toRows(blocks).map((r) => [r.position, r.repeat_group, r.repeats])).toEqual([
      [0, 1, 3],
      [1, 1, 3],
      [2, 2, 2],
    ]);
  });

  it('drops empty repeat blocks', () => {
    expect(toRows([{ kind: 'repeat', key: 'x', repeats: 3, members: [] }])).toEqual([]);
  });
});

describe('expand', () => {
  it('skips the recovery after the final interval', () => {
    const seq = expand(toBlocks(SIX_BY_800)).map((e) => e.segment.segment_type[0]);
    expect(seq.join('')).toBe('wiririririric');
    expect(seq.filter((t) => t === 'i')).toHaveLength(6);
    expect(seq.filter((t) => t === 'r')).toHaveLength(5);
    expect(seq[seq.length - 2]).toBe('i');
  });

  it('plays a recoveries-only block in full', () => {
    const block: Block = {
      kind: 'repeat',
      key: 'r',
      repeats: 3,
      members: [newSegment('recovery')],
    };
    expect(expand([block])).toHaveLength(3);
  });

  it('keeps a trailing work segment after a mid-block recovery', () => {
    const block: Block = {
      kind: 'repeat',
      key: 'r',
      repeats: 2,
      members: [newSegment('recovery'), newSegment('interval'), newSegment('recovery')],
    };
    expect(expand([block]).map((e) => e.segment.segment_type)).toEqual([
      'recovery',
      'interval',
      'recovery',
      'recovery',
      'interval',
    ]);
  });
});

describe('totals', () => {
  it('adds 6 × 800 m + 5 × 400 m + warmup and cooldown', () => {
    const t = totals(toBlocks(SIX_BY_800));
    expect(t.distance_m).toBe(1609 + 6 * 800 + 5 * 400 + 1609);
    // warmup 1.609 × 354 + 6 × 0.8 × 261 + 5 × 0.4 × 420 (recovery default) + 1.609 × 375 (easy)
    expect(t.duration_s).toBe(Math.round(1.609 * 354 + 4.8 * 261 + 2 * 420 + 1.609 * 375));
  });

  it('estimates distance for time-based segments from the target', () => {
    const s = newSegment('steady', {
      distance_m: null,
      duration_s: 1200,
      target_type: 'pace',
      target_pace_s_per_km: 300,
    });
    expect(totals([{ kind: 'single', key: 'a', segment: s }])).toEqual({
      distance_m: 4000,
      duration_s: 1200,
    });
  });
});

describe('shape', () => {
  it('draws intervals tallest, recoveries lowest, widths summing to 1', () => {
    const bars = shape(toBlocks(SIX_BY_800));
    expect(bars).toHaveLength(13);
    const interval = bars.find((b) => b.segment_type === 'interval')!;
    const recovery = bars.find((b) => b.segment_type === 'recovery')!;
    const warmup = bars[0];
    expect(interval.intensity).toBe(1);
    expect(recovery.intensity).toBeLessThan(warmup.intensity);
    expect(warmup.intensity).toBeLessThan(interval.intensity);
    expect(bars.reduce((s, b) => s + b.width, 0)).toBeCloseTo(1);
  });

  it('uses zone and effort targets when there are no paces', () => {
    const z4 = newSegment('steady', { target_type: 'heart_rate_zone', target_hr_zone: 4 });
    const easy = newSegment('steady', { target_type: 'effort', target_effort: 'easy' });
    const bars = shape([
      { kind: 'single', key: 'a', segment: z4 },
      { kind: 'single', key: 'b', segment: easy },
    ]);
    expect(bars.map((b) => b.intensity)).toEqual([0.8, 0.3]);
  });
});

describe('text', () => {
  it('summarises segments and the workout', () => {
    const blocks = toBlocks(SIX_BY_800);
    const rep = blocks[1] as Extract<Block, { kind: 'repeat' }>;
    expect(segmentSummary(rep.members[0], 'imperial')).toBe('800 m at 7:00 /mi');
    expect(segmentSummary(rep.members[1], 'imperial')).toBe('400 m · easy');
    expect(
      segmentSummary(
        newSegment('steady', {
          distance_m: null,
          duration_s: 1200,
          target_type: 'heart_rate_zone',
          target_hr_zone: 2,
          target_effort: null,
        }),
        'metric',
      ),
    ).toBe('20:00 · zone 2 (easy)');
    expect(shapeCaption(blocks, 'imperial')).toBe('warmup · 6 × 800 m · cooldown');
  });

  it('starts a new repeat as 4 × (400 m hard + 200 m recovery)', () => {
    const b = newRepeatBlock() as Extract<Block, { kind: 'repeat' }>;
    expect(b.repeats).toBe(4);
    expect(b.members.map((m) => [m.segment_type, m.distance_m, m.target_effort])).toEqual([
      ['interval', 400, 'hard'],
      ['recovery', 200, 'easy'],
    ]);
  });
});
