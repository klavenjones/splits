import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import {
  Button,
  DemoPlayer,
  ExerciseThumbnail,
  MicroLabel,
  NumberedCueList,
  Tag,
} from '@/components';
import { storedMedia, useExercise } from '@/db/queries/exercises';
import { useSignedMediaUrl } from '@/db/storage/exerciseMedia';
import { readInstructions } from '@/exercises/describe';
import { useWorkout } from '@/store/workout';
import { useTheme } from '@/theme';
import { formatSet, weightUnit } from '@/units';

/** Exercise demo mid-workout: the loop, muscles, 3 cues, your last set, back to the workout. */
export default function DemoSheet() {
  const { c } = useTheme();
  const { exercise } = useLocalSearchParams<{ exercise: string }>();
  const q = useExercise(exercise);
  const units = useWorkout((s) => s.units);
  const last = useWorkout((s) => s.previous.get(exercise ?? ''));
  const e = q.data;
  const media = e ? storedMedia(e) : null;
  const signed = useSignedMediaUrl(media?.source === 'stored' ? media.path : null);

  if (!e)
    return (
      <View className="flex-1 items-center justify-center bg-surface-card p-6">
        {q.isPending ? (
          <ActivityIndicator color={c.textMuted} />
        ) : (
          <Text className="type-body text-text-muted">This exercise isn’t available offline.</Text>
        )}
      </View>
    );

  const cues = readInstructions(e.instructions).cues.slice(0, 3);
  const muscles = [e.primary_muscle, ...e.secondary_muscles].filter((m): m is string => !!m);
  const illustration = e.owner_id === null && media?.source === 'stored' && media.kind === 'photo';
  const lastSets = (last ?? []).filter((s) => s.set_type !== 'warmup');

  return (
    <View className="flex-1 bg-surface-card">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerClassName="gap-5 px-5 pt-6 pb-12"
      >
        <Text className="type-title text-text" accessibilityRole="header">
          {e.name}
        </Text>
        {media?.source === 'stored' && signed.data ? (
          <DemoPlayer kind={media.kind} uri={signed.data} illustration={illustration} />
        ) : (
          <View className="items-center justify-center rounded-card bg-surface-inset py-10">
            <ExerciseThumbnail primaryMuscle={e.primary_muscle} dim={96} />
            {media?.source === 'stored' && !signed.data ? (
              <Text className="mt-3 type-caption text-text-muted">
                {signed.isPending ? 'loading the demo…' : 'The demo needs a connection.'}
              </Text>
            ) : null}
          </View>
        )}
        <View className="flex-row flex-wrap gap-2">
          {muscles.map((m) => (
            <View key={m} className="rounded-pill bg-lift-soft px-3 py-1.5">
              <Text className="type-label text-lift-text">{m}</Text>
            </View>
          ))}
        </View>
        {cues.length ? (
          <View className="gap-3">
            <MicroLabel>cues</MicroLabel>
            <NumberedCueList items={cues} numbered={false} />
          </View>
        ) : null}
        <View className="flex-row items-center gap-3 rounded-card bg-surface-inset px-4 py-3">
          <Tag kind="lift" size="sm">
            last time
          </Tag>
          <Text className="flex-1 type-label text-text" numberOfLines={1}>
            {lastSets.length
              ? lastSets
                  .map((s) => formatSet(s.weight_kg, s.reps, units))
                  .join(' · ')
                  .concat(` ${weightUnit(units)}`)
              : 'no sets yet'}
          </Text>
        </View>
        <Button block icon="chevron-left" onPress={() => router.back()}>
          back to workout
        </Button>
      </ScrollView>
    </View>
  );
}
