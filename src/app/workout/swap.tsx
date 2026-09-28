import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Chip, EmptyState, ExerciseRow, GroupedItem, MicroLabel, Toggle } from '@/components';
import { useExercises } from '@/db/queries/exercises';
import type { TemplateDetail } from '@/db/queries/templates';
import { rowSubtitle } from '@/exercises/describe';
import { useWorkout } from '@/store/workout';
import { formatSet, weightUnit } from '@/units';
import { swapCandidates, yourEquipment } from '@/workout/suggest';

/** Swap an exercise for one that trains the same muscles (mockup 04/B1). */
export default function SwapSheet() {
  const { ex } = useLocalSearchParams<{ ex: string }>();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const w = useWorkout((s) => s.active);
  const units = useWorkout((s) => s.units);
  const previous = useWorkout((s) => s.previous);
  const lastDone = useWorkout((s) => s.lastDone);
  const library = useExercises(userId).data ?? [];
  const target = w?.exercises.find((e) => e.id === ex);
  const [any, setAny] = useState(false);
  const [alsoTemplate, setAlsoTemplate] = useState(false);

  if (!w || !target)
    return (
      <View className="flex-1 justify-center bg-surface-card p-6">
        <EmptyState
          icon="swap"
          title="nothing to swap"
          body="This exercise isn’t in the workout."
        />
      </View>
    );

  // "Your equipment": what your templates and past workouts use.
  const used = new Set<string>([...lastDone.keys(), ...w.exercises.map((e) => e.exercise_id)]);
  for (const [, t] of qc.getQueriesData<TemplateDetail>({ queryKey: ['template'] }))
    for (const e of t?.exercises ?? []) used.add(e.exercise_id);
  const mine = yourEquipment(library, used);
  const full = library.find((e) => e.id === target.exercise_id);
  const muscles = [target.primary_muscle, ...(full?.secondary_muscles ?? [])].filter(Boolean);
  const exclude = new Set(w.exercises.map((e) => e.exercise_id));
  const opts = { exclude, history: lastDone };
  const list = swapCandidates(
    {
      id: target.exercise_id,
      name: target.name,
      primary_muscle: target.primary_muscle,
      equipment: target.equipment,
    },
    library,
    { ...opts, equipment: any || mine.size === 0 ? null : mine },
  );

  const lastLine = (id: string) => {
    const p = previous.get(id)?.find((x) => x.set_type !== 'warmup');
    return p
      ? formatSet(p.weight_kg, p.reps, units).replace(' × ', ` ${weightUnit(units)} × `)
      : null;
  };

  return (
    <View className="flex-1 bg-surface-card">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerClassName="gap-5 px-5 pt-5 pb-12"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          hitSlop={12}
          className="self-start active:opacity-60"
        >
          <Text className="type-label text-text">cancel</Text>
        </Pressable>
        <View className="gap-1">
          <Text className="type-title text-text" accessibilityRole="header">
            swap {target.name}
          </Text>
          <Text className="type-subhead text-text-muted">Same muscles: {muscles.join(', ')}.</Text>
        </View>
        <View className="flex-row gap-2.5" accessibilityRole="radiogroup">
          <Chip label="your equipment" selected={!any} onPress={() => setAny(false)} />
          <Chip label="any equipment" selected={any} onPress={() => setAny(true)} />
        </View>

        {list.length === 0 ? (
          <EmptyState
            icon="swap"
            title="no close matches"
            body={any ? 'Nothing else trains this muscle.' : 'Try any equipment.'}
          />
        ) : (
          <View className="gap-2">
            <MicroLabel className="px-1">best matches</MicroLabel>
            <View>
              {list.map((e, i) => (
                <GroupedItem key={e.id} index={i} count={list.length}>
                  <ExerciseRow
                    name={e.name}
                    primaryMuscle={e.primary_muscle}
                    subtitle={rowSubtitle(e)}
                    last={lastLine(e.id)}
                    custom={e.owner_id !== null}
                    divider={i < list.length - 1}
                    onPress={() => {
                      useWorkout.getState().swap(
                        target.id,
                        {
                          id: e.id,
                          name: e.name,
                          primary_muscle: e.primary_muscle,
                          equipment: e.equipment,
                        },
                        alsoTemplate,
                      );
                      router.back();
                    }}
                  />
                </GroupedItem>
              ))}
            </View>
          </View>
        )}

        {w.template_id && target.from_template ? (
          <View className="flex-row items-center gap-4 rounded-card bg-surface-inset px-5 py-4">
            <View className="flex-1 gap-0.5">
              <Text className="type-headline text-text">also update {w.name}</Text>
              <Text className="type-subhead text-text-muted">
                Otherwise the swap is just for today.
              </Text>
            </View>
            <Toggle
              value={alsoTemplate}
              onValueChange={setAlsoTemplate}
              accessibilityLabel={`Also update ${w.name}`}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
