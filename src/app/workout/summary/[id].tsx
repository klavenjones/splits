import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Text, View } from 'react-native';

import {
  AnchorCard,
  Button,
  Chip,
  ChipGroup,
  EmptyState,
  IconButton,
  PRCard,
  SummaryHero,
  SyncBadge,
  TextField,
} from '@/components';
import { longDay } from '@/plan/week';
import { exitWorkout } from '@/lib/nav';
import { useWorkout, type Summary } from '@/store/workout';
import { formatSet, toDisplayWeight, weightUnit, type UnitSystem } from '@/units';
import type { Workout } from '@/workout/model';
import { useSyncStatus } from '@/workout/useSyncStatus';
import { useTopInset } from '@/workout/useTopInset';

const FEELS: { value: NonNullable<Workout['feel']>; label: string }[] = [
  { value: 'easy', label: 'easy' },
  { value: 'solid', label: 'solid' },
  { value: 'hard', label: 'hard' },
  { value: 'all_out', label: 'all out' },
];

/** Workout summary (mockup 04/B2): volume, sets, PRs, template update, feel, notes, save. */
export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const summary = useWorkout((s) => s.summary);
  const units = useWorkout((s) => s.units);
  if (!summary || summary.workout.id !== id)
    return (
      <View className="flex-1 justify-center bg-bg px-4">
        <EmptyState icon="check" title="workout saved" body="It’s on your plan as done.">
          <Button variant="secondary" size="md" onPress={exitWorkout}>
            back to today
          </Button>
        </EmptyState>
      </View>
    );
  return <SummaryView summary={summary} units={units} />;
}

function SummaryView({ summary, units }: { summary: Summary; units: UnitSystem }) {
  const { workout: w, prs, changes } = summary;
  const [feel, setFeel] = useState<Workout['feel']>(w.feel);
  const [notes, setNotes] = useState(w.notes ?? '');
  const [update, setUpdate] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const sync = useSyncStatus(w.id);
  const unit = weightUnit(units);
  const top = useTopInset();
  const minutes = Math.max(
    1,
    Math.round((Date.parse(w.ended_at ?? w.started_at) - Date.parse(w.started_at)) / 60_000),
  );
  const line = `${w.name} · ${longDay(w.scheduled_date)} · ${minutes} min`;
  const askTemplate =
    !!w.template_id &&
    w.update_template !== 'pending' &&
    (changes.added.length > 0 || changes.swapped.length > 0);
  const weight = (kg: number) => `${formatSet(kg, 1, units).replace(' × 1', '')} ${unit}`;

  const save = () => {
    useWorkout.getState().saveSummary({ feel, notes, updateTemplate: update === true });
    setSaved(true);
  };
  const done = () => {
    if (!saved) save();
    exitWorkout();
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-1" style={{ paddingTop: top }}>
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-5 px-4 pt-2 pb-16"
          >
            <IconButton icon="x" label="Close" onPress={done} />
            <View className="gap-1">
              <Text className="type-display text-text" accessibilityRole="header">
                workout complete
              </Text>
              <Text className="type-subhead text-text-muted">{line}</Text>
            </View>

            <SummaryHero
              volume={Math.round(toDisplayWeight(summary.volume_kg, units)).toLocaleString('en-US')}
              unit={unit}
              sets={summary.sets}
              prs={prs.length}
              footer={line}
            />

            {prs.length ? (
              <View className="gap-3">
                <Text className="px-1 type-headline text-text" accessibilityRole="header">
                  personal records
                </Text>
                {prs.map((p) => (
                  <PRCard
                    key={p.exercise_id}
                    name={p.name}
                    best={`${weight(p.weight_kg)} × ${p.reps}`}
                    was={`${weight(p.was.weight_kg)} × ${p.was.reps}`}
                    e1rm={weight(p.e1rm_kg)}
                  />
                ))}
              </View>
            ) : null}

            {askTemplate ? (
              <AnchorCard title={`update ${w.name}?`} icon="swap">
                <Text className="mt-2 mb-4 type-body text-on-anchor-muted">
                  {[
                    ...changes.swapped.map((s) => `You swapped ${s.from} for ${s.to}`),
                    ...(changes.added.length ? [`You added ${changes.added.join(', ')}`] : []),
                  ].join('. ')}
                  {' today.'}
                </Text>
                <View className="gap-2.5">
                  <Button
                    block
                    variant="inverse"
                    icon={update === true ? 'check' : undefined}
                    onPress={() => setUpdate(true)}
                  >
                    update template
                  </Button>
                  <Button
                    block
                    variant="inverse"
                    icon={update === false ? 'check' : undefined}
                    onPress={() => setUpdate(false)}
                  >
                    just this time
                  </Button>
                </View>
              </AnchorCard>
            ) : null}

            <View className="gap-3">
              <Text className="px-1 type-headline text-text" accessibilityRole="header">
                how did it feel?
              </Text>
              <ChipGroup label="how did it feel">
                {FEELS.map((f) => (
                  <Chip
                    key={f.value}
                    label={f.label}
                    selected={feel === f.value}
                    onPress={() => setFeel(feel === f.value ? null : f.value)}
                  />
                ))}
              </ChipGroup>
            </View>
            <TextField
              label="note"
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything to remember for next time?"
              multiline
            />

            {saved ? (
              <View className="gap-3">
                <View className="items-center">
                  <SyncBadge
                    status={sync.status}
                    detail={
                      sync.status === 'local' && !sync.online
                        ? 'syncs when you’re back online'
                        : undefined
                    }
                  />
                </View>
                <Button block onPress={done}>
                  done
                </Button>
              </View>
            ) : (
              <Button block icon="check" onPress={save}>
                save workout
              </Button>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}
