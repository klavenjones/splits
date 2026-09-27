import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  Chip,
  ChipGroup,
  ExerciseRow,
  MediaUploadField,
  MicroLabel,
  SafeAreaView,
  SegmentedControl,
  TextField,
} from '@/components';
import {
  storedMedia,
  useCreateExercise,
  useExercise,
  useExercises,
  useUpdateExercise,
  type Exercise,
  type MediaValue,
} from '@/db/queries/exercises';
import { useSignedMediaUrl } from '@/db/storage/exerciseMedia';
import { rowSubtitle } from '@/exercises/describe';
import {
  findSameName,
  NAME_MAX,
  validateDraft,
  type DraftErrors,
  type ExerciseDraft,
} from '@/exercises/validate';
import {
  COMMON_EQUIPMENT,
  EQUIPMENT,
  MUSCLE_GROUPS,
  MUSCLES,
  MUSCLES_BY_GROUP,
  muscleGroup,
  suggestedSecondary,
  TRACKING_LABEL,
  TRACKING_TYPES,
  type MuscleGroup,
} from '@/exercises/vocab';
import { space, useTheme } from '@/theme';

type Params = { id?: string; name?: string; then?: 'back' };

/**
 * Create custom exercise (mockup 09/02), plus an optional photo or video. `?id=` edits one of
 * yours; `?name=` prefills from search; `?then=back` returns to the caller (the picker).
 */
export default function ExerciseForm() {
  const { c } = useTheme();
  const { id, name, then } = useLocalSearchParams<Params>();
  const existing = useExercise(id);

  if (id && !existing.data) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        {existing.error ? (
          <Text className="type-body text-danger-text">{existing.error.message}</Text>
        ) : (
          <ActivityIndicator color={c.textMuted} />
        )}
      </View>
    );
  }
  return (
    <Form key={id ?? 'new'} existing={existing.data ?? null} initialName={name ?? ''} then={then} />
  );
}

function draftFrom(e: Exercise | null, name: string): ExerciseDraft {
  return {
    name: e?.name ?? name,
    primaryMuscle: e?.primary_muscle ?? null,
    secondaryMuscles: e?.secondary_muscles ?? [],
    equipment: e?.equipment ?? null,
    trackingType: e?.tracking_type ?? 'weight_reps',
    notes: e?.notes ?? '',
  };
}

function Form({
  existing,
  initialName,
  then,
}: {
  existing: Exercise | null;
  initialName: string;
  then?: 'back';
}) {
  const { userId } = useAuth();
  const list = useExercises(userId);
  const create = useCreateExercise(userId);
  const update = useUpdateExercise(userId);
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;

  const [draft, setDraft] = useState<ExerciseDraft>(() => draftFrom(existing, initialName));
  const [media, setMedia] = useState<MediaValue>(() => (existing ? storedMedia(existing) : null));
  const [group, setGroup] = useState<MuscleGroup | null>(muscleGroup(draft.primaryMuscle));
  const [moreMuscles, setMoreMuscles] = useState(false);
  const [moreEquipment, setMoreEquipment] = useState(
    !!draft.equipment && !COMMON_EQUIPMENT.includes(draft.equipment as never),
  );
  const [errors, setErrors] = useState<DraftErrors>({});
  const set = (patch: Partial<ExerciseDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const signed = useSignedMediaUrl(media?.source === 'stored' ? media.path : null);
  const preview =
    media?.source === 'local'
      ? { kind: media.media.kind, uri: media.media.uri }
      : media?.source === 'stored' && signed.data
        ? { kind: media.kind, uri: signed.data }
        : null;

  const match = findSameName(list.data ?? [], draft.name, existing?.id);

  const chooseGroup = (g: MuscleGroup) => {
    setGroup(g);
    const primary = MUSCLES_BY_GROUP[g][0];
    set({
      primaryMuscle: primary,
      secondaryMuscles: draft.secondaryMuscles.filter((m) => m !== primary),
    });
    setErrors((e) => ({ ...e, primaryMuscle: undefined }));
  };

  const secondaryOptions = moreMuscles
    ? MUSCLES.filter((m) => m !== draft.primaryMuscle)
    : [
        ...suggestedSecondary(draft.primaryMuscle),
        // Keep anything already chosen visible.
        ...draft.secondaryMuscles.filter(
          (m) => !suggestedSecondary(draft.primaryMuscle).includes(m as never),
        ),
      ];
  const equipmentOptions = moreEquipment ? EQUIPMENT : COMMON_EQUIPMENT;

  const close = (savedId?: string) => {
    router.back();
    if (savedId && !existing && then !== 'back')
      router.push({ pathname: '/exercises/[id]', params: { id: savedId } });
  };

  const save = () => {
    const e = validateDraft(draft, list.data ?? [], existing?.id);
    setErrors(e);
    if (Object.keys(e).length) return;
    if (existing)
      update.mutate(
        { id: existing.id, draft, media, previous: existing },
        { onSuccess: () => close() },
      );
    else create.mutate({ draft, media }, { onSuccess: (row) => close(row.id) });
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <Pressable
            onPress={() => router.back()}
            disabled={saving}
            accessibilityRole="button"
            hitSlop={12}
            className="min-w-16 active:opacity-60"
          >
            <Text className="type-label text-text">cancel</Text>
          </Pressable>
          <Text className="type-headline text-text" accessibilityRole="header">
            {existing ? 'edit exercise' : 'new exercise'}
          </Text>
          <Button size="sm" loading={saving} onPress={save} className="min-w-16">
            save
          </Button>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-6 px-4 pt-3 pb-12"
          >
            <TextField
              label="name"
              value={draft.name}
              onChangeText={(t) => {
                set({ name: t });
                if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
              }}
              placeholder="landmine press"
              autoCapitalize="none"
              maxLength={NAME_MAX + 10}
              error={errors.name}
              autoFocus={!existing && !draft.name}
            />

            {match ? (
              <View className="gap-2">
                <MicroLabel className="px-1">in your library</MicroLabel>
                <View className="overflow-hidden rounded-card bg-surface-card shadow-card">
                  <ExerciseRow
                    name={match.name}
                    primaryMuscle={match.primary_muscle}
                    subtitle={rowSubtitle(match)}
                    last={null}
                    custom={match.owner_id !== null}
                    onPress={() => {
                      router.back();
                      router.push({ pathname: '/exercises/[id]', params: { id: match.id } });
                    }}
                  />
                </View>
              </View>
            ) : null}

            <Section title="primary muscle" error={errors.primaryMuscle}>
              <ChipGroup label="primary muscle group">
                {MUSCLE_GROUPS.map((g) => (
                  <Chip key={g} label={g} selected={group === g} onPress={() => chooseGroup(g)} />
                ))}
              </ChipGroup>
              {group && MUSCLES_BY_GROUP[group].length > 1 ? (
                <ChipGroup label="primary muscle">
                  {MUSCLES_BY_GROUP[group].map((m) => (
                    <Chip
                      key={m}
                      label={m}
                      selected={draft.primaryMuscle === m}
                      onPress={() =>
                        set({
                          primaryMuscle: m,
                          secondaryMuscles: draft.secondaryMuscles.filter((s) => s !== m),
                        })
                      }
                    />
                  ))}
                </ChipGroup>
              ) : null}
            </Section>

            <Section title="secondary muscles">
              {!draft.primaryMuscle && !moreMuscles ? (
                <Text className="px-1 type-caption text-text-subtle">
                  Pick the primary muscle first for suggestions.
                </Text>
              ) : null}
              <ChipGroup label="secondary muscles" multi>
                {secondaryOptions.map((m) => (
                  <Chip
                    key={m}
                    multi
                    label={m}
                    selected={draft.secondaryMuscles.includes(m)}
                    onPress={() =>
                      set({
                        secondaryMuscles: draft.secondaryMuscles.includes(m)
                          ? draft.secondaryMuscles.filter((s) => s !== m)
                          : [...draft.secondaryMuscles, m],
                      })
                    }
                  />
                ))}
                {!moreMuscles ? (
                  <Chip
                    role="button"
                    leadingIcon="plus"
                    label="more"
                    onPress={() => setMoreMuscles(true)}
                  />
                ) : null}
              </ChipGroup>
            </Section>

            <Section title="equipment" error={errors.equipment}>
              <ChipGroup label="equipment">
                {equipmentOptions.map((e) => (
                  <Chip
                    key={e}
                    label={e}
                    selected={draft.equipment === e}
                    onPress={() => set({ equipment: draft.equipment === e ? null : e })}
                  />
                ))}
                {!moreEquipment ? (
                  <Chip
                    role="button"
                    leadingIcon="plus"
                    label="more"
                    onPress={() => setMoreEquipment(true)}
                  />
                ) : null}
              </ChipGroup>
            </Section>

            <Section title="how you track it">
              <SegmentedControl
                accessibilityLabel="how you track it"
                segments={TRACKING_TYPES.map((t) => ({ value: t, label: TRACKING_LABEL[t] }))}
                value={draft.trackingType}
                onChange={(t) => set({ trackingType: t })}
              />
            </Section>

            <TextField
              label="notes"
              value={draft.notes}
              onChangeText={(t) => set({ notes: t })}
              placeholder="Setup cues, grip, stance"
              multiline
              error={errors.notes}
              style={{
                minHeight: space[16] + space[6],
                paddingVertical: space[3],
                textAlignVertical: 'top',
              }}
            />

            <Section title="photo or video">
              <MediaUploadField
                preview={preview}
                disabled={saving}
                onPick={(m) => setMedia({ source: 'local', media: m })}
                onRemove={() => setMedia(null)}
              />
            </Section>

            {saveError ? (
              <Text className="text-center type-caption text-danger-text">
                Couldn’t save: {saveError.message}
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Section({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="px-1 type-subhead text-text-muted">{title}</Text>
      {children}
      {error ? <Text className="px-1 type-caption text-danger-text">{error}</Text> : null}
    </View>
  );
}
