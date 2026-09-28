import { newItem, type LiftBlock } from './liftTemplate';
import { newRepeatBlock, newSegment } from './runSegments';
import { segmentError, validateTemplate } from './validate';

const lift = (patch = {}): LiftBlock[] => [
  {
    kind: 'single',
    key: 'a',
    item: {
      ...newItem({ id: 'x', name: 'squat', primary_muscle: 'quads', equipment: 'barbell' }),
      ...patch,
    },
  },
];

describe('segmentError', () => {
  it('needs exactly one measure and a matching target', () => {
    expect(segmentError(newSegment('warmup'))).toBeNull();
    expect(segmentError(newSegment('warmup', { distance_m: null }))).toMatch(/distance or a time/);
    expect(segmentError(newSegment('warmup', { duration_s: 600 }))).toMatch(/distance or a time/);
    expect(segmentError(newSegment('interval', { target_type: 'pace' }))).toMatch(/pace/);
    expect(
      segmentError(newSegment('interval', { target_type: 'heart_rate_zone', target_hr_zone: 6 })),
    ).toMatch(/zone/);
    expect(
      segmentError(newSegment('steady', { target_type: 'none', target_effort: null })),
    ).toBeNull();
  });
});

describe('validateTemplate', () => {
  it('accepts complete templates', () => {
    expect(validateTemplate({ name: 'upper A', kind: 'lift', lift: lift() })).toEqual({});
    expect(validateTemplate({ name: '6 × 800 m', kind: 'run', run: [newRepeatBlock()] })).toEqual(
      {},
    );
  });

  it('requires a name and content', () => {
    expect(validateTemplate({ name: ' ', kind: 'lift', lift: [] })).toEqual({
      name: 'Give it a name.',
      items: 'Add at least one exercise.',
    });
    expect(validateTemplate({ name: 'x', kind: 'run', run: [] }).items).toMatch(/segment/);
  });

  it('checks rep ranges and segments', () => {
    expect(
      validateTemplate({ name: 'x', kind: 'lift', lift: lift({ rep_min: 12, rep_max: 8 }) }).items,
    ).toMatch(/low to high/);
    expect(
      validateTemplate({
        name: 'x',
        kind: 'run',
        run: [{ kind: 'single', key: 'a', segment: newSegment('steady', { distance_m: null }) }],
      }).items,
    ).toMatch(/highlighted/);
  });
});
