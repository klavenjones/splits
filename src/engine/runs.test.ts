import type { SegmentRow } from '../templates/runSegments';
import {
  deltaSentence,
  paceDelta,
  runTarget,
  signedTime,
  splitVsTarget,
  targetState,
} from './runs';

const row = (p: Partial<SegmentRow>, position = 0): SegmentRow => ({
  position,
  repeat_group: null,
  repeats: 1,
  segment_type: 'steady',
  distance_m: 6437,
  duration_s: null,
  target_type: 'none',
  target_pace_s_per_km: null,
  target_pace_tolerance_s: 0,
  target_hr_zone: null,
  target_effort: null,
  voice_cues: [],
  ...p,
});

// 9:30 /mi = 354 s/km
const easy4 = [row({ target_type: 'pace', target_pace_s_per_km: 354, target_pace_tolerance_s: 6 })];

describe('runTarget', () => {
  it('uses the pace target and its tolerance', () => {
    expect(runTarget(easy4, 6437)).toEqual({
      kind: 'pace',
      pace_s_per_km: 354,
      tolerance_s: 6,
      distance_m: 6437,
    });
  });

  it('weights paces by distance across warmup, repeats and cooldown', () => {
    const rows = [
      row(
        { segment_type: 'warmup', distance_m: 1000, target_type: 'effort', target_effort: 'easy' },
        0,
      ),
      row(
        {
          segment_type: 'interval',
          distance_m: 1000,
          target_type: 'pace',
          target_pace_s_per_km: 240,
          repeat_group: 1,
          repeats: 2,
        },
        1,
      ),
      row({ segment_type: 'recovery', distance_m: 1000, repeat_group: 1, repeats: 2 }, 2),
      row(
        {
          segment_type: 'cooldown',
          distance_m: 1000,
          target_type: 'effort',
          target_effort: 'easy',
        },
        3,
      ),
    ];
    // warmup 375 + 240 + recovery 420 + 240 (last recovery dropped) + cooldown 375 over 5 km
    const t = runTarget(rows, null)!;
    expect(t.kind).toBe('pace');
    expect(t.pace_s_per_km).toBe(Math.round((375 + 240 + 420 + 240 + 375) / 5));
    expect(t.tolerance_s).toBe(10);
    expect(t.distance_m).toBe(5000);
  });

  it('estimates effort-only runs loosely, and has no target for zones or nothing', () => {
    const effort = runTarget([row({ target_type: 'effort', target_effort: 'easy' })], null)!;
    expect(effort).toMatchObject({ kind: 'effort', pace_s_per_km: 375, tolerance_s: 30 });
    expect(
      runTarget([row({ target_type: 'heart_rate_zone', target_hr_zone: 2 })], null),
    ).toBeNull();
    expect(runTarget([row({})], null)).toBeNull();
    expect(runTarget([], 5000)).toBeNull();
  });
});

describe('target state and text', () => {
  const t = runTarget(easy4, 6437)!;
  it('is on target inside the tolerance', () => {
    expect(targetState(352, t)).toBe('on_target');
    expect(targetState(340, t)).toBe('faster');
    expect(targetState(370, t)).toBe('slower');
    expect(targetState(null, t)).toBe('none');
    expect(targetState(352, null)).toBe('none');
  });

  it('reads as a signed time in the user unit', () => {
    // 9:26 vs 9:30 /mi
    expect(paceDelta(352, 354, 'imperial')).toBe(-3);
    expect(signedTime(-4)).toBe('−0:04');
    expect(signedTime(11)).toBe('+0:11');
    expect(signedTime(0)).toBe('0:00');
    expect(deltaSentence(-4)).toBe('4 sec faster than target');
    expect(deltaSentence(65)).toBe('1:05 slower than target');
    expect(deltaSentence(0)).toBe('right on target');
  });

  it('labels splits', () => {
    expect(splitVsTarget(361, t, 'imperial')).toEqual({ delta: '+0:11', word: 'slower' });
    expect(splitVsTarget(353, t, 'imperial')).toEqual({ delta: '−0:02', word: 'on pace' });
    expect(splitVsTarget(345, t, 'imperial')).toEqual({ delta: '−0:14', word: 'faster' });
  });
});
