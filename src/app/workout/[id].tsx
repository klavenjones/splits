import { router, useLocalSearchParams } from 'expo-router';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  LoggerExerciseCard,
  MicroLabel,
  RestTimer,
  SafeAreaView,
  SetRow,
  SupersetBlock,
  SyncBadge,
  WorkoutStats,
} from '@/components';
import { useExercises, type ExerciseListItem } from '@/db/queries/exercises';
import { useSessions } from '@/db/queries/sessions';
import { volume } from '@/engine/metrics';
import { toLocalDate } from '@/engine/calendar';
import { pickExercises } from '@/exercises/picker';
import { showMenu } from '@/lib/menu';
import { exitWorkout } from '@/lib/nav';
import { useWorkout } from '@/store/workout';
import { repsText } from '@/templates/liftTemplate';
import { size, useTheme } from '@/theme';
import { formatSet, formatWeight, parseWeight, toDisplayWeight, weightUnit } from '@/units';
import * as M from '@/workout/model';
import { suggestForWorkout } from '@/workout/suggest';
import { formatElapsed, useNow } from '@/workout/useNow';
import { useSyncStatus } from '@/workout/useSyncStatus';
import { useTopInset } from '@/workout/useTopInset';

const minimize = exitWorkout;

/** The lift logger (mockup 01-core/lift-logger). Works entirely offline. */
export default function LoggerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const w = useWorkout((s) => s.active);
  const summary = useWorkout((s) => s.summary);

  if (!w || w.id !== id) {
    return (
      <View className="flex-1 justify-center bg-bg px-4">
        <EmptyState
          icon="lift"
          title={summary?.workout.id === id ? 'workout finished' : 'no workout in progress'}
          body="This workout isn’t running on this phone."
        >
          <Button variant="secondary" size="md" onPress={exitWorkout}>
            back to today
          </Button>
        </EmptyState>
      </View>
    );
  }
  return <Logger w={w} />;
}

function Logger({ w }: { w: M.Workout }) {
  const { c } = useTheme();
  const { userId } = useAuth();
  const units = useWorkout((s) => s.units);
  const previous = useWorkout((s) => s.previous);
  const lastDone = useWorkout((s) => s.lastDone);
  const store = useWorkout.getState();
  const library = useExercises(userId).data ?? [];
  const today = toLocalDate(new Date());
  const todays = useSessions(userId, today, today).data ?? [];
  const now = useNow(1000);
  const sync = useSyncStatus(w.id);
  const unit = weightUnit(units);
  const top = useTopInset();

  const current = M.currentSet(w);
  const allSets = w.exercises.flatMap((e) => e.sets);
  const vol = toDisplayWeight(volume(allSets), units);
  const exercisesDone = w.exercises.filter(
    (e) => e.sets.length && e.sets.every((s) => s.completed_at),
  ).length;

  const nextText = () => {
    if (!current) return 'last set done: finish when you’re ready';
    const e = w.exercises.find((x) => x.id === current.exId)!;
    const s = e.sets.find((x) => x.id === current.setId)!;
    return `next · ${e.name} · set ${s.set_number} · ${formatSet(s.weight_kg, s.reps, units)}`;
  };

  const lastLine = (exerciseId: string) => {
    const p = previous.get(exerciseId)?.find((x) => x.set_type !== 'warmup');
    return p ? formatSet(p.weight_kg, p.reps, units).replace(' × ', ` ${unit} × `) : undefined;
  };

  const addExercise = async () => {
    const trained = new Set<string>();
    for (const e of w.exercises)
      if (e.primary_muscle && e.sets.some((s) => s.completed_at)) trained.add(e.primary_muscle);
    for (const s of todays)
      if (s.id !== w.id && s.status === 'completed')
        for (const e of s.template?.exercises ?? [])
          if (e.primary_muscle) trained.add(e.primary_muscle);
    const inWorkout = new Set(w.exercises.map((e) => e.exercise_id));
    const sug = suggestForWorkout(library, {
      trainedMuscles: trained,
      exclude: inWorkout,
      history: lastDone,
    });
    const last: Record<string, string> = {};
    for (const id of previous.keys()) {
      const l = lastLine(id);
      if (l) last[id] = l;
    }
    const ids = await pickExercises({
      title: 'add exercises',
      excludeIds: [...inWorkout],
      suggested: sug.exercises.length
        ? {
            note: `Not trained today: ${sug.muscles.join(', ')}.`,
            ids: sug.exercises.map((e) => e.id),
          }
        : undefined,
      last,
    });
    if (!ids?.length) return;
    const byId = new Map<string, ExerciseListItem>(library.map((e) => [e.id, e]));
    store.addExercises(ids.flatMap((id) => (byId.get(id) ? [byId.get(id)!] : [])));
  };

  const badgeMenu = (e: M.WExercise, s: M.WSet) =>
    showMenu(`${e.name} · set ${s.set_number}`, [
      {
        label: s.set_type === 'warmup' ? 'make it a working set' : 'mark as warm-up',
        onPress: () =>
          store.updateSet(e.id, s.id, {
            set_type: s.set_type === 'warmup' ? 'working' : 'warmup',
          }),
      },
      {
        label: s.rpe ? `RPE ${s.rpe}` : 'add RPE',
        onPress: () =>
          showMenu('RPE (how hard, 10 = nothing left)', [
            ...[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => ({
              label: String(r),
              onPress: () => store.updateSet(e.id, s.id, { rpe: r }),
            })),
            ...(s.rpe
              ? [{ label: 'clear', onPress: () => store.updateSet(e.id, s.id, { rpe: null }) }]
              : []),
          ]),
      },
      {
        label: 'delete set',
        destructive: true,
        onPress: () => store.removeSet(e.id, s.id),
      },
    ]);

  const finish = () => {
    const done = M.completedSetCount(w);
    const open = allSets.length - done;
    const go = () => {
      const nameOf = (id: string) => library.find((x) => x.id === id)?.name;
      const id = store.finish(nameOf);
      if (id) router.replace({ pathname: '/workout/summary/[id]', params: { id } });
    };
    if (!done)
      return Alert.alert(
        'Nothing logged yet',
        'Check off at least one set, or discard the workout.',
        [
          { text: 'keep going', style: 'cancel' },
          { text: 'discard workout', style: 'destructive', onPress: discard },
        ],
      );
    if (open)
      return Alert.alert(
        `Finish with ${open} set${open === 1 ? '' : 's'} not done?`,
        'Sets you didn’t check off aren’t saved.',
        [
          { text: 'keep going', style: 'cancel' },
          { text: 'finish', onPress: go },
        ],
      );
    go();
  };

  const discard = () => {
    store.discard();
    exitWorkout();
  };

  const menu = () =>
    showMenu(w.name, [
      { label: 'add exercise', onPress: () => void addExercise() },
      {
        label: 'discard workout',
        destructive: true,
        onPress: () =>
          Alert.alert(
            'Discard this workout?',
            w.origin === 'planned'
              ? 'Nothing you logged is kept, and the session goes back on your plan.'
              : 'Nothing you logged is kept.',
            [
              { text: 'keep it', style: 'cancel' },
              { text: 'discard', style: 'destructive', onPress: discard },
            ],
          ),
      },
    ]);

  // Supersets render together; everything else on its own.
  const blocks: M.WExercise[][] = [];
  for (const e of w.exercises) {
    const last = blocks[blocks.length - 1];
    if (e.superset_group != null && last?.[0].superset_group === e.superset_group) last.push(e);
    else blocks.push([e]);
  }

  const card = (e: M.WExercise) => {
    const working = e.sets.filter((s) => s.set_type !== 'warmup');
    const firstWeight = working.find((s) => s.weight_kg != null)?.weight_kg;
    const target = `${working.length} × ${repsText(e)}${firstWeight != null ? ` @ ${formatWeight(firstWeight, units)}` : ''}`;
    const done = working.filter((s) => s.completed_at).length;
    return (
      <LoggerExerciseCard
        key={e.id}
        name={e.name}
        primaryMuscle={e.primary_muscle}
        subtitle={`${target} · ${done}/${working.length} sets`}
        unit={unit}
        onDemo={() =>
          router.push({ pathname: '/workout/demo', params: { exercise: e.exercise_id } })
        }
        onSwap={() => router.push({ pathname: '/workout/swap', params: { ex: e.id } })}
        onAddSet={() => store.addSet(e.id)}
      >
        {e.sets.map((s) => {
          const p = M.previousFor(previous, e.exercise_id, e.sets, s);
          return (
            <SetRow
              key={s.id}
              number={
                s.set_type === 'warmup'
                  ? 0
                  : e.sets.filter((x) => x.set_type !== 'warmup').indexOf(s) + 1
              }
              warmup={s.set_type === 'warmup'}
              previous={p ? formatSet(p.weight_kg, p.reps, units) : undefined}
              weight={s.weight_kg != null ? formatWeight(s.weight_kg, units) : ''}
              reps={s.reps != null ? String(s.reps) : ''}
              rpe={s.rpe}
              unit={unit}
              state={
                s.completed_at ? 'completed' : current?.setId === s.id ? 'current' : 'upcoming'
              }
              onWeight={(t) => store.updateSet(e.id, s.id, { weight_kg: parseWeight(t, units) })}
              onReps={(t) => {
                const r = parseInt(t, 10);
                store.updateSet(e.id, s.id, { reps: Number.isFinite(r) && r > 0 ? r : null });
              }}
              onToggle={() => {
                if (!s.completed_at && !s.reps)
                  return Alert.alert('How many reps?', 'Enter your reps, then check the set off.');
                store.toggleSet(e.id, s.id);
              }}
              onBadge={() => badgeMenu(e, s)}
            />
          );
        })}
      </LoggerExerciseCard>
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-1" style={{ paddingTop: top }}>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerClassName="gap-4 px-4 pt-2"
            contentContainerStyle={{ paddingBottom: w.rest ? 190 : 60 }}
          >
            <View className="flex-row items-center gap-2">
              <IconButton icon="chevron-left" label="Minimize workout" onPress={minimize} />
              <View className="flex-1 items-center">
                <MicroLabel className="text-lift-text">lift · in progress</MicroLabel>
                <Text className="type-headline text-text" numberOfLines={1}>
                  {w.name}
                </Text>
              </View>
              <IconButton icon="more" label="Workout options" variant="plain" onPress={menu} />
              <Button size="sm" onPress={finish}>
                finish
              </Button>
            </View>

            <WorkoutStats
              stats={[
                { value: formatElapsed(now - Date.parse(w.started_at)), label: 'elapsed' },
                { value: Math.round(vol).toLocaleString('en-US'), label: `volume ${unit}` },
                { value: `${exercisesDone}/${w.exercises.length}`, label: 'exercises' },
              ]}
            />
            <View className="px-1">
              <SyncBadge
                status={sync.status}
                detail={
                  sync.status === 'local' && !sync.online
                    ? 'syncs when you’re back online'
                    : undefined
                }
              />
            </View>

            {w.exercises.length === 0 ? (
              <EmptyState
                icon="lift"
                title="empty workout"
                body="Add exercises to start logging."
              />
            ) : null}

            {blocks.map((b) =>
              b.length > 1 ? (
                <SupersetBlock key={b[0].id}>{b.map(card)}</SupersetBlock>
              ) : (
                card(b[0])
              ),
            )}

            <Pressable
              onPress={() => void addExercise()}
              accessibilityRole="button"
              className="flex-row items-center justify-center gap-2 rounded-pill border-[1.5px] border-dashed border-border-control py-4 active:bg-surface-inset"
            >
              <Icon name="plus" size={size.iconMd} color={c.text} />
              <Text className="type-label text-text">add exercise</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      {w.rest ? (
        <SafeAreaView edges={['bottom']} className="absolute right-3 bottom-2 left-3">
          <RestTimer
            endsAt={w.rest.ends_at}
            total={w.rest.total_s}
            next={nextText()}
            onAdjust={store.adjustRest}
            onSkip={store.skipRest}
          />
        </SafeAreaView>
      ) : null}
    </View>
  );
}
