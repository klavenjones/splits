import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
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
  LiftExerciseCard,
  RepeatBlock,
  SafeAreaView,
  SegmentedControl,
  SegmentRow,
  SortableList,
  SupersetBlock,
  TextField,
  WorkoutShape,
} from '@/components';
import { useExercises } from '@/db/queries/exercises';
import { useSaveTemplate, useTemplate, type TemplateDetail } from '@/db/queries/templates';
import { pickExercises } from '@/exercises/picker';
import {
  clearDraft,
  startDraft,
  updateDraft,
  useDraft,
  type TemplateDraft,
} from '@/templates/draftStore';
import {
  aboutMinutes,
  allItems,
  estimateDuration,
  leaveSuperset,
  move,
  newItem,
  removeItem,
  summary as liftSummary,
  supersetWithNext,
  toBlocks as liftBlocks,
  type LiftBlock,
} from '@/templates/liftTemplate';
import {
  newRepeatBlock,
  newSegment,
  SEGMENT_TYPES,
  shape,
  shapeCaption,
  toBlocks as runBlocks,
  totals,
  type Block,
  type SegmentType,
} from '@/templates/runSegments';
import { segmentError, validateTemplate, type TemplateErrors } from '@/templates/validate';
import { useTheme } from '@/theme';
import { formatDistance } from '@/units';

type Params = { id: string; kind?: 'lift' | 'run' };

/** Lift or run template builder (mockups 08/03, 08/04). `id=new&kind=` creates one. */
export default function TemplateBuilderRoute() {
  const { c } = useTheme();
  const { id, kind } = useLocalSearchParams<Params>();
  const isNew = id === 'new';
  const q = useTemplate(isNew ? undefined : id);

  if (!isNew && !q.data) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        {q.error ? (
          <Text className="type-body text-danger-text">{q.error.message}</Text>
        ) : (
          <ActivityIndicator color={c.textMuted} />
        )}
      </View>
    );
  }
  return <Builder key={id} initial={draftFrom(q.data ?? null, kind ?? 'lift')} />;
}

function draftFrom(t: TemplateDetail | null, kind: 'lift' | 'run'): TemplateDraft {
  return {
    id: t?.id ?? null,
    name: t?.name ?? '',
    notes: t?.notes ?? '',
    kind: t?.kind ?? kind,
    lift: t ? liftBlocks(t.exercises) : [],
    run: t ? runBlocks(t.segments) : [],
  };
}

function actionSheet(
  title: string,
  options: { label: string; destructive?: boolean; run: () => void }[],
) {
  if (Platform.OS === 'ios')
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((o) => o.label), 'cancel'],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: options.findIndex((o) => o.destructive),
      },
      (i) => options[i]?.run(),
    );
  else
    Alert.alert(title, undefined, [
      ...options.map((o) => ({
        text: o.label,
        style: o.destructive ? ('destructive' as const) : ('default' as const),
        onPress: o.run,
      })),
      { text: 'cancel', style: 'cancel' as const },
    ]);
}

/** Back to where the builder was opened from, or the Plan tab when opened by a link. */
const close = () => (router.canGoBack() ? router.back() : router.replace('/plan'));

function Builder({ initial }: { initial: TemplateDraft }) {
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const exercises = useExercises(userId);
  const save = useSaveTemplate(userId);
  // The builder owns the draft its sheets edit; start it before the first render reads it.
  useState(() => startDraft(initial));
  useEffect(() => () => clearDraft(), []);
  const draft = useDraft() ?? initial;
  const [errors, setErrors] = useState<TemplateErrors>({});
  const [showErrors, setShowErrors] = useState(false);

  const setLift = (fn: (b: LiftBlock[]) => LiftBlock[]) =>
    updateDraft((d) => ({ ...d, lift: fn(d.lift) }));
  const setRun = (fn: (b: Block[]) => Block[]) => updateDraft((d) => ({ ...d, run: fn(d.run) }));
  const empty = draft.kind === 'lift' ? draft.lift.length === 0 : draft.run.length === 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const run = totals(draft.run);
  const summaryText =
    draft.kind === 'lift'
      ? liftSummary(draft.lift)
      : draft.run.length
        ? `${formatDistance(run.distance_m, units)} · about ${aboutMinutes(run.duration_s)} minutes`
        : 'no segments yet';

  const cancel = () => {
    if (!dirty) return close();
    Alert.alert('Discard changes?', undefined, [
      { text: 'keep editing', style: 'cancel' },
      { text: 'discard', style: 'destructive', onPress: () => close() },
    ]);
  };

  const onSave = () => {
    const e = validateTemplate(
      draft.kind === 'lift'
        ? { name: draft.name, kind: 'lift', lift: draft.lift }
        : { name: draft.name, kind: 'run', run: draft.run },
    );
    setErrors(e);
    setShowErrors(true);
    if (Object.keys(e).length) return;
    save.mutate(
      {
        id: draft.id,
        name: draft.name,
        notes: draft.notes,
        ...(draft.kind === 'lift'
          ? {
              kind: 'lift' as const,
              lift: draft.lift,
              est_duration_s: estimateDuration(draft.lift),
              est_distance_m: null,
            }
          : {
              kind: 'run' as const,
              run: draft.run,
              est_duration_s: run.duration_s,
              est_distance_m: run.distance_m,
            }),
      },
      { onSuccess: () => close() },
    );
  };

  /* ---- lift ---- */

  const addExercises = async () => {
    const have = allItems(draft.lift).map((i) => i.exercise_id);
    const ids = await pickExercises({ title: 'add exercises', excludeIds: have });
    if (!ids?.length) return;
    const byId = new Map((exercises.data ?? []).map((e) => [e.id, e]));
    const items = ids
      .map((id) => byId.get(id))
      .filter((e) => !!e)
      .map((e) => newItem(e));
    setLift((b) => [
      ...b,
      ...items.map((item) => ({ kind: 'single' as const, key: item.key, item })),
    ]);
    if (errors.items) setErrors((x) => ({ ...x, items: undefined }));
  };

  const itemMenu = (bi: number, j: number, name: string) => {
    const block = draft.lift[bi];
    actionSheet(name, [
      ...(bi < draft.lift.length - 1
        ? [{ label: 'superset with next', run: () => setLift((b) => supersetWithNext(b, bi)) }]
        : []),
      ...(block?.kind === 'superset'
        ? [{ label: 'leave superset', run: () => setLift((b) => leaveSuperset(b, bi, j)) }]
        : []),
      { label: 'remove', destructive: true, run: () => setLift((b) => removeItem(b, bi, j)) },
    ]);
  };

  const editItem = (key: string) =>
    router.push({ pathname: '/templates/exercise', params: { key } });

  /* ---- run ---- */

  const editSegment = (key: string, isNew = false) =>
    router.push({
      pathname: '/templates/segment',
      params: { key, ...(isNew ? { new: '1' } : {}) },
    });

  const addSegment = () =>
    actionSheet(
      'add segment',
      SEGMENT_TYPES.map((t: SegmentType) => ({
        label: t,
        run: () => {
          const s = newSegment(t);
          setRun((b) => [...b, { kind: 'single', key: s.key, segment: s }]);
          editSegment(s.key, true);
        },
      })),
    );

  const addToRepeat = (bi: number) => {
    const s = newSegment('recovery');
    setRun((b) =>
      b.map((x, n) => (n === bi && x.kind === 'repeat' ? { ...x, members: [...x.members, s] } : x)),
    );
    editSegment(s.key, true);
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
          <Pressable
            onPress={cancel}
            disabled={save.isPending}
            accessibilityRole="button"
            hitSlop={12}
            className="min-w-16 active:opacity-60"
          >
            <Text className="type-label text-text">cancel</Text>
          </Pressable>
          <Text className="type-headline text-text" accessibilityRole="header">
            {draft.id ? 'edit template' : 'new template'}
          </Text>
          <Button size="sm" loading={save.isPending} onPress={onSave} className="min-w-16">
            save
          </Button>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-5 px-4 pt-3 pb-16"
          >
            <TextField
              label="name"
              value={draft.name}
              onChangeText={(name) => {
                updateDraft((d) => ({ ...d, name }));
                if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
              }}
              placeholder={draft.kind === 'lift' ? 'upper A' : 'intervals 6 × 800 m'}
              autoCapitalize="none"
              error={errors.name}
              autoFocus={!draft.id}
            />
            {!draft.id && empty ? (
              <SegmentedControl
                accessibilityLabel="template kind"
                segments={[
                  { value: 'lift', label: 'lift' },
                  { value: 'run', label: 'run' },
                ]}
                value={draft.kind}
                onChange={(kind) => updateDraft((d) => ({ ...d, kind }))}
              />
            ) : null}
            <Text className="type-subhead text-text-muted">{summaryText}</Text>

            {draft.kind === 'lift' ? (
              <>
                <SortableList
                  items={draft.lift}
                  keyOf={(b) => b.key}
                  onReorder={(from, to) => setLift((b) => move(b, from, to))}
                  renderItem={(block, bi) =>
                    block.kind === 'single' ? (
                      <LiftExerciseCard
                        item={block.item}
                        rest={block.item.rest_sec}
                        onEdit={() => editItem(block.item.key)}
                        onMenu={() => itemMenu(bi, 0, block.item.name)}
                      />
                    ) : (
                      <SupersetBlock>
                        <SortableList
                          items={block.items}
                          keyOf={(i) => i.key}
                          onReorder={(from, to) =>
                            setLift((b) =>
                              b.map((x, n) =>
                                n === bi && x.kind === 'superset'
                                  ? { ...x, items: move(x.items, from, to) }
                                  : x,
                              ),
                            )
                          }
                          renderItem={(item, j) => (
                            <LiftExerciseCard
                              item={item}
                              rest={j === block.items.length - 1 ? block.rest_sec : null}
                              onEdit={() => editItem(item.key)}
                              onMenu={() => itemMenu(bi, j, item.name)}
                            />
                          )}
                        />
                      </SupersetBlock>
                    )
                  }
                />
                <Button variant="secondary" icon="plus" block onPress={addExercises}>
                  add exercise
                </Button>
              </>
            ) : (
              <>
                {draft.run.length ? (
                  <WorkoutShape bars={shape(draft.run)} caption={shapeCaption(draft.run, units)} />
                ) : null}
                <SortableList
                  items={draft.run}
                  keyOf={(b) => b.key}
                  onReorder={(from, to) => setRun((b) => move(b, from, to))}
                  renderItem={(block, bi) =>
                    block.kind === 'single' ? (
                      <SegmentRow
                        segment={block.segment}
                        units={units}
                        invalid={showErrors && segmentError(block.segment) !== null}
                        onPress={() => editSegment(block.segment.key)}
                      />
                    ) : (
                      <RepeatBlock
                        repeats={block.repeats}
                        onRepeats={(repeats) =>
                          setRun((b) =>
                            b.map((x, n) =>
                              n === bi && x.kind === 'repeat' ? { ...x, repeats } : x,
                            ),
                          )
                        }
                        onAdd={() => addToRepeat(bi)}
                      >
                        <SortableList
                          items={block.members}
                          keyOf={(s) => s.key}
                          onReorder={(from, to) =>
                            setRun((b) =>
                              b.map((x, n) =>
                                n === bi && x.kind === 'repeat'
                                  ? { ...x, members: move(x.members, from, to) }
                                  : x,
                              ),
                            )
                          }
                          renderItem={(s) => (
                            <SegmentRow
                              segment={s}
                              units={units}
                              nested
                              invalid={showErrors && segmentError(s) !== null}
                              onPress={() => editSegment(s.key)}
                            />
                          )}
                        />
                      </RepeatBlock>
                    )
                  }
                />
                <View className="flex-row gap-3">
                  <Button variant="secondary" icon="plus" className="flex-1" onPress={addSegment}>
                    add segment
                  </Button>
                  <Button
                    variant="secondary"
                    icon="repeat"
                    className="flex-1"
                    onPress={() => setRun((b) => [...b, newRepeatBlock()])}
                  >
                    add repeat
                  </Button>
                </View>
              </>
            )}

            {errors.items ? (
              <Text className="text-center type-caption text-danger-text">{errors.items}</Text>
            ) : null}
            {save.error ? (
              <Text className="text-center type-caption text-danger-text">
                Couldn’t save: {save.error.message}
              </Text>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
