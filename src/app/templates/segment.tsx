import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  Chip,
  ChipGroup,
  formatNumber,
  NumericField,
  parseNumber,
  SegmentedControl,
  TextField,
  TipCard,
} from '@/components';
import { updateDraft, useDraft } from '@/templates/draftStore';
import {
  EFFORTS,
  HR_ZONE_LABEL,
  newKey,
  SEGMENT_TYPES,
  VOICE_CUE_LABEL,
  VOICE_CUES,
  type Block,
  type Segment,
  type TargetType,
} from '@/templates/runSegments';
import { segmentError } from '@/templates/validate';
import {
  formatDuration,
  formatPace,
  miToM,
  mToMi,
  paceUnit,
  parseDuration,
  parsePace,
  toleranceFromSecPerKm,
  toleranceToSecPerKm,
  type UnitSystem,
} from '@/units';

type DistUnit = 'm' | 'mi' | 'km';

function find(blocks: readonly Block[], key: string) {
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    if (b.kind === 'single' && b.segment.key === key) return { bi, mi: -1, segment: b.segment };
    if (b.kind === 'repeat') {
      const mi = b.members.findIndex((m) => m.key === key);
      if (mi >= 0) return { bi, mi, segment: b.members[mi] };
    }
  }
  return null;
}

/** Replace, remove or restructure the segment `key` inside the run blocks. */
function edit(
  key: string,
  fn: (blocks: Block[], at: NonNullable<ReturnType<typeof find>>) => Block[],
) {
  updateDraft((d) => {
    const at = find(d.run, key);
    return at ? { ...d, run: fn(d.run, at) } : d;
  });
}

const toDisplay = (m: number, u: DistUnit) => (u === 'm' ? m : u === 'mi' ? mToMi(m) : m / 1000);
const fromDisplay = (v: number, u: DistUnit) =>
  Math.round(u === 'm' ? v : u === 'mi' ? miToM(v) : v * 1000);

/** Edit segment sheet (mockup 08/05). `?new=1` removes the segment if you cancel. */
export default function EditSegmentSheet() {
  const { key, new: isNew } = useLocalSearchParams<{ key: string; new?: string }>();
  const draft = useDraft();
  const at = draft ? find(draft.run, key) : null;
  if (!at) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-card p-6">
        <Text className="type-body text-text-muted">
          This segment is no longer in the template.
        </Text>
      </View>
    );
  }
  return <Form key={key} initial={at.segment} inRepeat={at.mi >= 0} isNew={isNew === '1'} />;
}

function Form({
  initial,
  inRepeat,
  isNew,
}: {
  initial: Segment;
  inRepeat: boolean;
  isNew: boolean;
}) {
  const { profile } = useAuth();
  const units: UnitSystem = profile?.unit_system ?? 'imperial';
  const [s, setS] = useState<Segment>(initial);
  const set = (patch: Partial<Segment>) => setS((x) => ({ ...x, ...patch }));
  const [tried, setTried] = useState(false);

  const bigUnit: DistUnit = units === 'imperial' ? 'mi' : 'km';
  const [distUnit, setDistUnit] = useState<DistUnit>(
    initial.distance_m !== null && initial.distance_m < 1000 ? 'm' : bigUnit,
  );
  const [distText, setDistText] = useState(
    initial.distance_m !== null ? formatNumber(toDisplay(initial.distance_m, distUnit), 2) : '',
  );
  const [timeText, setTimeText] = useState(
    initial.duration_s !== null ? formatDuration(initial.duration_s) : '',
  );
  const [paceText, setPaceText] = useState(
    initial.target_pace_s_per_km ? formatPace(initial.target_pace_s_per_km, units, false) : '',
  );
  const [tolText, setTolText] = useState(
    initial.target_pace_tolerance_s
      ? String(toleranceFromSecPerKm(initial.target_pace_tolerance_s, units))
      : '',
  );

  const measure =
    s.duration_s !== null || (s.distance_m === null && timeText) ? 'time' : 'distance';
  const error = segmentError(s);

  const close = () => router.back();
  const cancel = () => {
    if (isNew) edit(initial.key, (b, at) => removeAt(b, at));
    close();
  };
  const saveSegment = () => {
    setTried(true);
    if (error) return;
    edit(initial.key, (blocks, at) => replaceAt(blocks, at, s));
    close();
  };

  const pace = s.target_pace_s_per_km;
  const tol = s.target_pace_tolerance_s;

  return (
    <View className="flex-1 bg-surface-card">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-5 px-5 pb-12"
      >
        <View className="flex-row items-center justify-between pt-5">
          <Pressable
            onPress={cancel}
            accessibilityRole="button"
            hitSlop={12}
            className="active:opacity-60"
          >
            <Text className="type-label text-text">cancel</Text>
          </Pressable>
          <Pressable
            onPress={saveSegment}
            accessibilityRole="button"
            hitSlop={12}
            className="active:opacity-60"
          >
            <Text className="type-label text-run-text">done</Text>
          </Pressable>
        </View>
        <Text className="type-display text-text" accessibilityRole="header">
          {s.segment_type}
        </Text>

        <ChipGroup label="segment type">
          {SEGMENT_TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={s.segment_type === t}
              onPress={() => set({ segment_type: t })}
            />
          ))}
        </ChipGroup>

        <View className="gap-3">
          <Text className="px-1 type-subhead text-text-muted">measure by</Text>
          <SegmentedControl
            accessibilityLabel="measure by"
            segments={[
              { value: 'distance', label: 'distance' },
              { value: 'time', label: 'time' },
            ]}
            value={measure}
            onChange={(m) => {
              if (m === 'distance') {
                const v = parseNumber(distText);
                set({ duration_s: null, distance_m: v && v > 0 ? fromDisplay(v, distUnit) : 400 });
                if (!(v && v > 0)) {
                  setDistUnit('m');
                  setDistText('400');
                }
              } else {
                const v = parseDuration(timeText);
                set({ distance_m: null, duration_s: v && v > 0 ? v : 120 });
                if (!(v && v > 0)) setTimeText('2:00');
              }
            }}
          />
          {measure === 'distance' ? (
            <View className="flex-row items-end gap-2">
              <NumericField
                className="flex-1"
                label="distance"
                selectTextOnFocus
                unit={distUnit}
                value={distText}
                onChangeText={(t) => {
                  setDistText(t);
                  const v = parseNumber(t);
                  set({ distance_m: v && v > 0 ? fromDisplay(v, distUnit) : null });
                }}
              />
              {(['m', bigUnit] as DistUnit[]).map((u) => (
                <Chip
                  key={u}
                  label={u}
                  selected={distUnit === u}
                  onPress={() => {
                    setDistUnit(u);
                    if (s.distance_m) setDistText(formatNumber(toDisplay(s.distance_m, u), 2));
                  }}
                />
              ))}
            </View>
          ) : (
            <TextField
              large
              label="time"
              selectTextOnFocus
              unit="min:sec"
              value={timeText}
              placeholder="2:00"
              keyboardType="numbers-and-punctuation"
              onChangeText={(t) => {
                setTimeText(t);
                const v = parseDuration(t);
                set({ duration_s: v && v > 0 ? v : null });
              }}
            />
          )}
        </View>

        <View className="gap-3">
          <Text className="px-1 type-subhead text-text-muted">target</Text>
          <SegmentedControl<TargetType>
            accessibilityLabel="target"
            segments={[
              { value: 'pace', label: 'pace' },
              { value: 'heart_rate_zone', label: 'heart rate' },
              { value: 'effort', label: 'effort' },
              { value: 'none', label: 'none' },
            ]}
            value={s.target_type}
            onChange={(target_type) =>
              set({
                target_type,
                target_effort:
                  target_type === 'effort' ? (s.target_effort ?? 'easy') : s.target_effort,
                target_hr_zone:
                  target_type === 'heart_rate_zone' ? (s.target_hr_zone ?? 2) : s.target_hr_zone,
              })
            }
          />
          {s.target_type === 'pace' ? (
            <>
              <View className="flex-row gap-3">
                <TextField
                  className="flex-1"
                  large
                  label="pace"
                  selectTextOnFocus
                  unit={paceUnit(units)}
                  value={paceText}
                  placeholder="7:00"
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(t) => {
                    setPaceText(t);
                    set({ target_pace_s_per_km: parsePace(t, units) });
                  }}
                />
                <NumericField
                  className="w-28"
                  label="± sec"
                  selectTextOnFocus
                  value={tolText}
                  placeholder="10"
                  onChangeText={(t) => {
                    setTolText(t);
                    const v = parseNumber(t);
                    set({
                      target_pace_tolerance_s: v && v > 0 ? toleranceToSecPerKm(v, units) : 0,
                    });
                  }}
                />
              </View>
              {pace ? (
                <Text className="px-1 type-caption text-text-muted">
                  {tol
                    ? `Allowed range: ${formatPace(pace - tol, units, false)} to ${formatPace(pace + tol, units)}`
                    : `Target ${formatPace(pace, units)}`}
                </Text>
              ) : null}
            </>
          ) : s.target_type === 'heart_rate_zone' ? (
            <ChipGroup label="heart-rate zone">
              {[1, 2, 3, 4, 5].map((z) => (
                <Chip
                  key={z}
                  label={`Z${z} ${HR_ZONE_LABEL[z]}`}
                  selected={s.target_hr_zone === z}
                  onPress={() => set({ target_hr_zone: z })}
                />
              ))}
            </ChipGroup>
          ) : s.target_type === 'effort' ? (
            <ChipGroup label="effort">
              {EFFORTS.map((e) => (
                <Chip
                  key={e}
                  label={e}
                  selected={s.target_effort === e}
                  onPress={() => set({ target_effort: e })}
                />
              ))}
            </ChipGroup>
          ) : null}
        </View>

        <View className="gap-3">
          <Text className="px-1 type-subhead text-text-muted">voice cues</Text>
          <ChipGroup label="voice cues" multi>
            {VOICE_CUES.map((v) => (
              <Chip
                key={v}
                multi
                label={VOICE_CUE_LABEL[v]}
                selected={s.voice_cues.includes(v)}
                onPress={() =>
                  set({
                    voice_cues: s.voice_cues.includes(v)
                      ? s.voice_cues.filter((x) => x !== v)
                      : [...s.voice_cues, v],
                  })
                }
              />
            ))}
          </ChipGroup>
        </View>

        <TipCard tone="info" title="your watch runs this workout">
          After the run imports, Splits compares each split to these targets.
        </TipCard>

        {tried && error ? (
          <Text className="text-center type-caption text-danger-text">{error}</Text>
        ) : null}
        <Button block icon="check" onPress={saveSegment}>
          save segment
        </Button>

        <View className="flex-row flex-wrap justify-center gap-2">
          <Chip
            role="button"
            label="duplicate"
            onPress={() => {
              edit(initial.key, (b, at) => insertAfter(b, at, { ...s, key: newKey('s') }));
              close();
            }}
          />
          <Chip
            role="button"
            label={inRepeat ? 'move out of repeat' : 'make it a repeat'}
            onPress={() => {
              edit(initial.key, (b, at) => (inRepeat ? moveOut(b, at, s) : wrapInRepeat(b, at, s)));
              close();
            }}
          />
          <Chip
            role="button"
            label="delete"
            onPress={() => {
              edit(initial.key, (b, at) => removeAt(b, at));
              close();
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/* ---- block edits (pure) ---- */

type At = NonNullable<ReturnType<typeof find>>;

function replaceAt(blocks: Block[], at: At, s: Segment): Block[] {
  return blocks.map((b, n) => {
    if (n !== at.bi) return b;
    if (b.kind === 'single') return { ...b, segment: s };
    return { ...b, members: b.members.map((m, i) => (i === at.mi ? s : m)) };
  });
}

function removeAt(blocks: Block[], at: At): Block[] {
  const b = blocks[at.bi];
  if (b.kind === 'single' || b.members.length === 1) return blocks.filter((_, n) => n !== at.bi);
  return blocks.map((x, n) =>
    n === at.bi && x.kind === 'repeat'
      ? { ...x, members: x.members.filter((_, i) => i !== at.mi) }
      : x,
  );
}

function insertAfter(blocks: Block[], at: At, s: Segment): Block[] {
  const b = blocks[at.bi];
  if (b.kind === 'single') {
    const next = [...blocks];
    next.splice(at.bi + 1, 0, { kind: 'single', key: newKey('b'), segment: s });
    return next;
  }
  return blocks.map((x, n) => {
    if (n !== at.bi || x.kind !== 'repeat') return x;
    const members = [...x.members];
    members.splice(at.mi + 1, 0, s);
    return { ...x, members };
  });
}

function moveOut(blocks: Block[], at: At, s: Segment): Block[] {
  const next = removeAt(blocks, at);
  const stillThere = next.length === blocks.length;
  next.splice(stillThere ? at.bi + 1 : at.bi, 0, { kind: 'single', key: newKey('b'), segment: s });
  return next;
}

function wrapInRepeat(blocks: Block[], at: At, s: Segment): Block[] {
  return blocks.map((b, n) =>
    n === at.bi ? { kind: 'repeat', key: b.key, repeats: 4, members: [s] } : b,
  );
}
