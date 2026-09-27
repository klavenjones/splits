import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/auth';
import {
  Card,
  DemoPlayer,
  EmptyState,
  IconButton,
  MicroLabel,
  NumberedCueList,
  SafeAreaView,
  SegmentedControl,
} from '@/components';
import {
  storedMedia,
  useArchiveExercise,
  useExercise,
  type Exercise,
} from '@/db/queries/exercises';
import { useSignedMediaUrl } from '@/db/storage/exerciseMedia';
import { detailSubtitle, readInstructions } from '@/exercises/describe';
import { TRACKING_LABEL } from '@/exercises/vocab';
import { useTheme } from '@/theme';

type Tab = 'history' | 'charts' | 'how';

/** Exercise detail (mockup 09/03). History and charts fill in once sets are logged (steps 5, 7). */
export default function ExerciseDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const q = useExercise(id);
  const archive = useArchiveExercise(userId);
  // No sets exist yet, so open on how to. Once logging lands this becomes "history if any".
  const [tab, setTab] = useState<Tab>('how');

  const e = q.data;
  const mine = !!e && e.owner_id === userId;

  const confirmArchive = () =>
    Alert.alert(
      `Delete ${e?.name}?`,
      'It leaves your library. Past workouts that used it keep their sets.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: () => archive.mutate(e!.id, { onSuccess: () => router.back() }),
        },
      ],
    );

  const openMenu = () => {
    const edit = () => router.push({ pathname: '/exercises/new', params: { id: e!.id } });
    if (Platform.OS === 'ios')
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['edit', 'delete', 'cancel'], destructiveButtonIndex: 1, cancelButtonIndex: 2 },
        (i) => (i === 0 ? edit() : i === 1 ? confirmArchive() : undefined),
      );
    else
      Alert.alert(e!.name, undefined, [
        { text: 'edit', onPress: edit },
        { text: 'delete', style: 'destructive', onPress: confirmArchive },
        { text: 'cancel', style: 'cancel' },
      ]);
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <IconButton icon="chevron-left" label="Back" onPress={() => router.back()} />
          {mine ? <IconButton icon="more" label="Exercise options" onPress={openMenu} /> : null}
        </View>

        {!e ? (
          <View className="flex-1 items-center justify-center px-6">
            {q.error ? (
              <Text className="text-center type-body text-danger-text">{q.error.message}</Text>
            ) : (
              <ActivityIndicator color={c.textMuted} />
            )}
          </View>
        ) : (
          <ScrollView contentContainerClassName="gap-5 px-4 pt-4 pb-16">
            <View className="gap-1">
              <Text className="type-display text-text" accessibilityRole="header">
                {e.name}
              </Text>
              <Text className="type-subhead text-text-muted">{detailSubtitle(e)}</Text>
            </View>

            <SegmentedControl
              accessibilityLabel="exercise sections"
              segments={[
                { value: 'history', label: 'history' },
                { value: 'charts', label: 'charts' },
                { value: 'how', label: 'how to' },
              ]}
              value={tab}
              onChange={setTab}
            />

            {tab === 'history' ? (
              <EmptyState
                icon="plan"
                title="no sets yet"
                body={`Log ${e.name} in a workout and every session shows up here.`}
              />
            ) : tab === 'charts' ? (
              <EmptyState
                icon="progress"
                title="no chart yet"
                body="Your estimated 1RM, best set and best volume appear after your first session."
              />
            ) : (
              <HowTo exercise={e} />
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function HowTo({ exercise: e }: { exercise: Exercise }) {
  const media = storedMedia(e);
  const signed = useSignedMediaUrl(media?.source === 'stored' ? media.path : null);
  const { steps, cues, mistakes } = readInstructions(e.instructions);
  const muscles = [e.primary_muscle, ...e.secondary_muscles].filter((m): m is string => !!m);

  return (
    <View className="gap-5">
      {media?.source === 'stored' ? (
        signed.data ? (
          <DemoPlayer kind={media.kind} uri={signed.data} />
        ) : (
          <View
            className="items-center justify-center rounded-card bg-surface-inset"
            style={{ aspectRatio: 4 / 5 }}
          >
            {signed.error ? (
              <Text className="type-caption text-danger-text">Couldn’t load the demo.</Text>
            ) : (
              <ActivityIndicator />
            )}
          </View>
        )
      ) : null}

      <Card className="gap-3">
        <MicroLabel>muscles</MicroLabel>
        <View className="flex-row flex-wrap gap-2">
          {muscles.map((m, i) => (
            <View
              key={m}
              className={
                i === 0
                  ? 'rounded-pill bg-lift-soft px-3 py-1.5'
                  : 'rounded-pill bg-surface-inset px-3 py-1.5'
              }
            >
              <Text className={i === 0 ? 'type-label text-lift-text' : 'type-label text-text'}>
                {m}
              </Text>
            </View>
          ))}
        </View>
        <Text className="type-subhead text-text-muted">
          tracked by {TRACKING_LABEL[e.tracking_type]}
        </Text>
      </Card>

      {steps.length ? (
        <Card className="gap-4">
          <MicroLabel>steps</MicroLabel>
          <NumberedCueList items={steps} />
        </Card>
      ) : null}
      {cues.length ? (
        <Card className="gap-4">
          <MicroLabel>cues</MicroLabel>
          <NumberedCueList items={cues} numbered={false} />
        </Card>
      ) : null}
      {mistakes.length ? (
        <Card className="gap-4">
          <MicroLabel>common mistakes</MicroLabel>
          <NumberedCueList items={mistakes} numbered={false} tone="warning" />
        </Card>
      ) : null}
      {e.notes ? (
        <Card className="gap-2">
          <MicroLabel>your notes</MicroLabel>
          <Text className="type-body text-text">{e.notes}</Text>
        </Card>
      ) : null}
      {!steps.length && !e.notes && !media ? (
        <EmptyState
          icon="info"
          title="no how-to yet"
          body="Edit this exercise to add notes or a demo video."
        />
      ) : null}
    </View>
  );
}
