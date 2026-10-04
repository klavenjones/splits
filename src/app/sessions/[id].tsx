import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  Card,
  ExerciseThumbnail,
  Icon,
  MicroLabel,
  SegmentRow,
  SupersetBlock,
  Tag,
  TipCard,
  WorkoutShape,
} from '@/components';
import { useDeleteSession, useRestoreSession, useSession } from '@/db/queries/sessions';
import { useTemplate, type TemplateDetail } from '@/db/queries/templates';
import { confirmRemovePlanned } from '@/lib/confirmRemove';
import { showMenu } from '@/lib/menu';
import { closeOr, startRun } from '@/lib/nav';
import { startPlannedSession } from '@/workout/start';
import { averagePace, distanceNumber } from '@/plan/describe';
import { longDay, type PlanSession } from '@/plan/week';
import {
  aboutMinutes,
  repsText,
  toBlocks as liftBlocks,
  type LiftItem,
} from '@/templates/liftTemplate';
import { shape, shapeCaption, toBlocks as runBlocks } from '@/templates/runSegments';
import { size, useTheme } from '@/theme';
import { formatDuration, paceUnit, type UnitSystem } from '@/units';

const close = () => closeOr('/plan');

const STATUS_TEXT: Record<PlanSession['status'], string> = {
  planned: 'planned',
  in_progress: 'in progress',
  completed: 'done',
  skipped: 'skipped',
};

/** Planned session detail: targets from the template, then start / reschedule / skip. */
export default function SessionDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, profile } = useAuth();
  const qc = useQueryClient();
  const units = profile?.unit_system ?? 'imperial';
  const q = useSession(id);
  const s = q.data;
  const template = useTemplate(s?.template_id ?? undefined);
  const remove = useDeleteSession(userId);
  const restore = useRestoreSession(userId);

  if (!s)
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6">
        {q.error ? (
          <Text className="type-body text-danger-text">{q.error.message}</Text>
        ) : (
          <ActivityIndicator color={c.textMuted} />
        )}
      </View>
    );

  const planned = s.status === 'planned';
  const t = template.data;

  const menu = () =>
    showMenu(s.name, [
      ...(s.template_id
        ? [
            {
              label: 'edit template',
              onPress: () =>
                router.push({ pathname: '/templates/[id]', params: { id: s.template_id! } }),
            },
          ]
        : []),
      ...(planned
        ? [
            {
              label: 'remove from plan',
              destructive: true,
              onPress: () =>
                confirmRemovePlanned(s.name, `It comes off ${longDay(s.scheduled_date)}.`, () =>
                  remove.mutate(s.id, { onSuccess: close }),
                ),
            },
          ]
        : []),
    ]);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-5 px-4 pt-5 pb-12">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={close}
            accessibilityRole="button"
            hitSlop={12}
            className="active:opacity-60"
          >
            <Text className="type-label text-text">close</Text>
          </Pressable>
          <Pressable
            onPress={menu}
            accessibilityRole="button"
            accessibilityLabel={`${s.name} options`}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-pill active:bg-surface-control"
          >
            <Icon name="more" size={size.iconMd} color={c.textMuted} strokeWidth={3} />
          </Pressable>
        </View>

        <View className="gap-2">
          <Tag kind={s.kind} size="sm" />
          <Text className="type-title text-text" accessibilityRole="header">
            {s.name}
          </Text>
          <Text className="type-subhead text-text-muted">
            {STATUS_TEXT[s.status]} · {longDay(s.scheduled_date)}
            {s.status === 'skipped' && s.skip_reason ? ` · ${s.skip_reason}` : ''}
          </Text>
        </View>

        {!s.template_id ? (
          <TipCard title="template deleted">
            This session’s template was deleted, so there are no targets to show.
          </TipCard>
        ) : !t ? (
          template.error ? (
            <Text className="type-body text-danger-text">{template.error.message}</Text>
          ) : (
            <ActivityIndicator color={c.textMuted} />
          )
        ) : (
          <>
            <Stats t={t} units={units} />
            {t.kind === 'lift' ? <LiftTargets t={t} /> : <RunTargets t={t} units={units} />}
            {t.notes ? <Text className="px-1 type-body text-text-muted">{t.notes}</Text> : null}
          </>
        )}

        {planned ? (
          <View className="gap-3">
            <Button
              block
              icon="play"
              onPress={() =>
                s.kind === 'lift' ? void startPlannedSession(s, qc) : startRun(s.name)
              }
            >
              start
            </Button>
            <View className="flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() =>
                  router.push({ pathname: '/sessions/reschedule', params: { id: s.id } })
                }
              >
                reschedule
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => router.push({ pathname: '/sessions/skip', params: { id: s.id } })}
              >
                skip
              </Button>
            </View>
          </View>
        ) : s.status === 'in_progress' ? (
          <Button
            block
            icon="play"
            onPress={() => router.push({ pathname: '/workout/[id]', params: { id: s.id } })}
          >
            resume workout
          </Button>
        ) : s.kind === 'run' && s.run ? (
          <Button
            block
            variant="run"
            icon="chevron-right"
            onPress={() => router.push({ pathname: '/runs/[id]', params: { id: s.id } })}
          >
            view run
          </Button>
        ) : s.status === 'skipped' ? (
          <Button
            block
            variant="secondary"
            icon="undo"
            loading={restore.isPending}
            onPress={() => restore.mutate(s.id)}
          >
            restore
          </Button>
        ) : null}
        {remove.error || restore.error ? (
          <Text className="text-center type-caption text-danger-text">
            {(remove.error ?? restore.error)?.message}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stats({ t, units }: { t: TemplateDetail; units: UnitSystem }) {
  const minutes = t.est_duration_s ? String(aboutMinutes(t.est_duration_s)) : '–';
  const stats =
    t.kind === 'lift'
      ? [
          { value: String(t.exercises.length), label: 'exercises' },
          { value: String(t.exercises.reduce((n, e) => n + e.target_sets, 0)), label: 'sets' },
          { value: minutes, label: 'min' },
        ]
      : [
          {
            value: t.est_distance_m ? distanceNumber(t.est_distance_m, units) : '–',
            label: units === 'imperial' ? 'mi' : 'km',
          },
          { value: averagePace(t, units) ?? '–', label: paceUnit(units) },
          { value: minutes, label: 'min' },
        ];
  return (
    <Card padding="px-5 py-4" className="flex-row">
      {stats.map((m) => (
        <View key={m.label} className="flex-1 gap-0.5">
          <Text className="font-display text-[26px] leading-[30px] text-text tabular-nums">
            {m.value}
          </Text>
          <MicroLabel>{m.label}</MicroLabel>
        </View>
      ))}
    </Card>
  );
}

function ExerciseLine({ item, rest }: { item: LiftItem; rest: number | null }) {
  return (
    <View className="flex-row items-center gap-3">
      <ExerciseThumbnail primaryMuscle={item.primary_muscle} dim={size.touchMin} />
      <View className="flex-1">
        <Text className="type-headline text-text" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="type-subhead text-text-muted">
          {item.target_sets} × {repsText(item)}
          {rest ? ` · rest ${formatDuration(rest)}` : ''}
        </Text>
      </View>
    </View>
  );
}

function LiftTargets({ t }: { t: TemplateDetail }) {
  const blocks = liftBlocks(t.exercises);
  return (
    <View className="gap-3">
      {blocks.map((b) =>
        b.kind === 'single' ? (
          <Card key={b.key} padding="p-4">
            <ExerciseLine item={b.item} rest={b.item.rest_sec} />
          </Card>
        ) : (
          <SupersetBlock key={b.key}>
            <Card padding="p-4" className="gap-4">
              {b.items.map((i, j) => (
                <ExerciseLine
                  key={i.key}
                  item={i}
                  rest={j === b.items.length - 1 ? b.rest_sec : null}
                />
              ))}
            </Card>
          </SupersetBlock>
        ),
      )}
    </View>
  );
}

function RunTargets({ t, units }: { t: TemplateDetail; units: UnitSystem }) {
  const { c } = useTheme();
  const blocks = runBlocks(t.segments);
  return (
    <View className="gap-3">
      <WorkoutShape bars={shape(blocks)} caption={shapeCaption(blocks, units)} />
      {blocks.map((b) =>
        b.kind === 'single' ? (
          <SegmentRow key={b.segment.key} segment={b.segment} units={units} />
        ) : (
          <View key={b.key} className="gap-3 rounded-card bg-run-soft p-3">
            <View className="flex-row items-center gap-2 px-1">
              <Icon name="repeat" size={size.iconMd} color={c.runText} />
              <Text className="type-headline text-run-text">repeat × {b.repeats}</Text>
            </View>
            {b.members.map((m) => (
              <SegmentRow key={m.key} segment={m} units={units} nested />
            ))}
          </View>
        ),
      )}
    </View>
  );
}
