import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Chip, ChipGroup, Stepper, TextField } from '@/components';
import { rowSubtitle } from '@/exercises/describe';
import { updateDraft, useDraft } from '@/templates/draftStore';
import { updateItem, type LiftBlock, type LiftItem } from '@/templates/liftTemplate';
import { formatDuration } from '@/units';

const REST_PRESETS = [0, 30, 60, 90, 120, 150, 180, 240];

function find(blocks: readonly LiftBlock[], key: string) {
  for (const b of blocks) {
    if (b.kind === 'single' && b.item.key === key) return { item: b.item, block: b, last: true };
    if (b.kind === 'superset') {
      const i = b.items.findIndex((x) => x.key === key);
      if (i >= 0) return { item: b.items[i], block: b, last: i === b.items.length - 1 };
    }
  }
  return null;
}

/** Sets, rep range, rest and notes for one exercise in a lift template. */
export default function EditExerciseTargetsSheet() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const draft = useDraft();
  const at = draft ? find(draft.lift, key) : null;
  if (!at) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-card p-6">
        <Text className="type-body text-text-muted">
          This exercise is no longer in the template.
        </Text>
      </View>
    );
  }
  const superset = at.block.kind === 'superset';
  return (
    <Form
      key={key}
      item={at.item}
      superset={superset}
      rest={superset && at.block.kind === 'superset' ? at.block.rest_sec : at.item.rest_sec}
    />
  );
}

function Form({
  item,
  superset,
  rest: initialRest,
}: {
  item: LiftItem;
  superset: boolean;
  rest: number | null;
}) {
  const [sets, setSets] = useState(item.target_sets);
  const [min, setMin] = useState(item.rep_min ?? 8);
  const [max, setMax] = useState(item.rep_max ?? item.rep_min ?? 12);
  const [rest, setRest] = useState(initialRest ?? 0);
  const [notes, setNotes] = useState(item.notes ?? '');

  const save = () => {
    updateDraft((d) => {
      let lift = updateItem(d.lift, item.key, {
        target_sets: sets,
        rep_min: min,
        rep_max: Math.max(min, max),
        notes: notes.trim() || null,
        ...(superset ? {} : { rest_sec: rest }),
      });
      // In a superset the rest belongs to the round, so it's set on the group.
      if (superset)
        lift = lift.map((b) =>
          b.kind === 'superset' && b.items.some((i) => i.key === item.key)
            ? { ...b, rest_sec: rest }
            : b,
        );
      return { ...d, lift };
    });
    router.back();
  };

  return (
    <View className="flex-1 bg-surface-card">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-6 px-5 pb-12"
      >
        <View className="flex-row items-center justify-between pt-5">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            hitSlop={12}
            className="active:opacity-60"
          >
            <Text className="type-label text-text">cancel</Text>
          </Pressable>
          <Pressable
            onPress={save}
            accessibilityRole="button"
            hitSlop={12}
            className="active:opacity-60"
          >
            <Text className="type-label text-lift-text">done</Text>
          </Pressable>
        </View>
        <View className="gap-1">
          <Text className="type-title text-text" accessibilityRole="header">
            {item.name}
          </Text>
          <Text className="type-subhead text-text-muted">{rowSubtitle(item)}</Text>
        </View>

        <Row label="sets">
          <Stepper value={sets} onChange={setSets} min={1} max={20} label="Sets" />
        </Row>
        <Row label="reps, low">
          <Stepper
            value={min}
            onChange={(v) => {
              setMin(v);
              if (v > max) setMax(v);
            }}
            min={1}
            max={100}
            label="Fewest reps"
          />
        </Row>
        <Row label="reps, high">
          <Stepper
            value={max}
            onChange={(v) => {
              setMax(v);
              if (v < min) setMin(v);
            }}
            min={1}
            max={100}
            label="Most reps"
          />
        </Row>

        <View className="gap-3">
          <Text className="px-1 type-subhead text-text-muted">
            {superset ? 'rest after each round of the superset' : 'rest between sets'}
          </Text>
          <ChipGroup label="rest">
            {REST_PRESETS.map((r) => (
              <Chip
                key={r}
                label={r ? formatDuration(r) : 'none'}
                selected={rest === r}
                onPress={() => setRest(r)}
              />
            ))}
          </ChipGroup>
          {!REST_PRESETS.includes(rest) ? (
            <Text className="px-1 type-caption text-text-muted">
              custom: {formatDuration(rest)}
            </Text>
          ) : null}
          <View className="self-start">
            <Stepper
              value={rest}
              onChange={setRest}
              min={0}
              max={600}
              step={15}
              format={(v) => (v ? formatDuration(v) : 'none')}
              label="Rest"
            />
          </View>
        </View>

        <TextField
          label="notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Tempo, grip, setup"
          multiline
        />

        <Button block onPress={save}>
          save
        </Button>
      </ScrollView>
    </View>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="type-headline text-text">{label}</Text>
      {children}
    </View>
  );
}
