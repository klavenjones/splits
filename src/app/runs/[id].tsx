import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  Card,
  Icon,
  OnTargetBadge,
  PaceHero,
  SplitTable,
  Tag,
  type SplitRowData,
} from '@/components';
import { movedRun, useRun, type RunLog } from '@/db/queries/runs';
import { useSession } from '@/db/queries/sessions';
import {
  deltaSentence,
  paceDelta,
  paceOf,
  splitVsTarget,
  targetState,
  type RunTarget,
} from '@/engine/runs';
import { showMenu } from '@/lib/menu';
import { closeOr } from '@/lib/nav';
import { clockTime, distanceNumber, MATCH_LABEL } from '@/plan/describe';
import { longDay, type PlanSession } from '@/plan/week';
import { HR_ZONE_LABEL } from '@/templates/runSegments';
import { size, useTheme } from '@/theme';
import {
  formatDistance,
  formatDuration,
  formatPace,
  M_PER_MI,
  paceUnit,
  type UnitSystem,
} from '@/units';

const SOURCE: Record<RunLog['source'], string> = {
  apple_health: 'from Apple Health',
  strava: 'from Strava',
  manual: 'logged by hand',
};

const close = () => closeOr('/today');
const openLink = (id: string) =>
  router.push({ pathname: '/sheets/link-run', params: { id, from: 'detail' } });

/** An imported run: average pace against target, target vs actual, and the splits. */
export default function RunDetail() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const session = useSession(id);
  const run = useRun(id);
  const s = session.data;
  const log = run.data;

  // Linking moves a run onto another session; follow it there.
  useFocusEffect(
    useCallback(() => {
      const to = movedRun(id);
      if (to) router.replace({ pathname: '/runs/[id]', params: { id: to } });
    }, [id]),
  );

  if (!s || !log)
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-bg p-6">
        {session.error || run.error ? (
          <Text className="type-body text-danger-text">
            {(session.error ?? run.error)?.message}
          </Text>
        ) : session.isPending || run.isPending ? (
          <ActivityIndicator color={c.textMuted} />
        ) : (
          <>
            <Text className="type-body text-text-muted">This run isn’t here any more.</Text>
            <Button variant="secondary" size="md" onPress={close}>
              close
            </Button>
          </>
        )}
      </View>
    );

  const planned = !!s.template_id;
  const title = planned ? s.name : log.match === 'extra' ? 'extra run' : 'run';
  const pace = log.avg_pace_s_per_km ?? paceOf(log.distance_m, log.duration_s);
  const target = planned ? (s.target ?? null) : null;
  const delta = pace !== null && target ? paceDelta(pace, target.pace_s_per_km, units) : null;
  const dateLine = `${longDay(s.scheduled_date).replace(/^(\w+) /, '$1, ')} · ${clockTime(log.started_at)} · ${SOURCE[log.source]}`;

  const menu = () =>
    showMenu(title, [
      { label: planned ? 'change link' : 'link to a session', onPress: () => openLink(s.id) },
      ...(planned && s.template_id
        ? [
            {
              label: 'view planned run',
              onPress: () =>
                router.push({ pathname: '/templates/[id]', params: { id: s.template_id! } }),
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
            accessibilityLabel={`${title} options`}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-pill active:bg-surface-control"
          >
            <Icon name="more" size={size.iconMd} color={c.textMuted} strokeWidth={3} />
          </Pressable>
        </View>

        <View className="gap-2">
          <View className="flex-row flex-wrap items-center gap-2">
            <Tag kind="run" size="sm" />
            <Text className="shrink type-caption text-text-muted">{dateLine}</Text>
          </View>
          <Text className="type-display text-text" accessibilityRole="header">
            {title}
          </Text>
          {MATCH_LABEL[log.match] && log.match !== 'extra' ? (
            <Text className="type-caption text-run-text">{MATCH_LABEL[log.match]}</Text>
          ) : null}
        </View>

        <PaceHero
          pace={pace ? formatPace(pace, units, false) : '–'}
          unit={paceUnit(units)}
          caption={delta !== null ? deltaSentence(delta) : null}
          stats={[
            { value: formatDistance(log.distance_m, units), label: 'distance' },
            { value: formatDuration(log.duration_s), label: 'time' },
            { value: log.avg_hr ? String(log.avg_hr) : '–', label: 'avg bpm' },
          ]}
        />

        {planned ? (
          <TargetCard session={s} log={log} target={target} pace={pace} units={units} />
        ) : (
          <Card className="gap-3">
            <Text className="type-headline text-text">
              {log.match === 'extra' ? 'extra run' : 'not on your plan'}
            </Text>
            <Text className="type-body text-text-muted">
              {log.match === 'extra'
                ? 'It counts toward your weekly distance, not your plan.'
                : 'Link it to a planned run to compare it with the target.'}
            </Text>
            <Button variant="run" size="md" icon="plus" block onPress={() => openLink(s.id)}>
              link to a session
            </Button>
          </Card>
        )}

        {log.run_splits.length ? (
          <SplitTable
            unit={units === 'imperial' ? 'mi' : 'km'}
            caption={
              target
                ? `Target ${formatPace(target.pace_s_per_km, units)}. Bars show each ${units === 'imperial' ? 'mile' : 'km'} against it.`
                : null
            }
            rows={splitRows(log, target, units)}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

function TargetCard({
  session: s,
  log,
  target,
  pace,
  units,
}: {
  session: PlanSession;
  log: RunLog;
  target: RunTarget | null;
  pace: number | null;
  units: UnitSystem;
}) {
  const distance = target?.distance_m ?? s.template?.est_distance_m ?? null;
  const zone = s.template?.segments.find(
    (g) => g.target_type === 'heart_rate_zone',
  )?.target_hr_zone;
  const what = target
    ? `${distance ? `${formatDistance(distance, units)} ` : ''}${target.kind === 'pace' ? 'at' : 'easy effort, about'} ${formatPace(target.pace_s_per_km, units)}`
    : zone
      ? `zone ${zone} (${HR_ZONE_LABEL[zone]})`
      : distance
        ? formatDistance(distance, units)
        : 'no target set';
  return (
    <Card className="gap-4">
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Text className="shrink type-headline text-text">target: {what}</Text>
        <OnTargetBadge state={targetState(pace, target)} solid />
      </View>
      <View className="h-px bg-hairline" />
      <Text className="type-body text-text-muted">
        {log.avg_hr ? (
          <>
            Average heart rate <Text className="type-stat text-text">{log.avg_hr}</Text> bpm
            {log.max_hr ? `, max ${log.max_hr}` : ''}
          </>
        ) : (
          'No heart rate recorded.'
        )}
      </Text>
    </Card>
  );
}

function splitRows(log: RunLog, target: RunTarget | null, units: UnitSystem): SplitRowData[] {
  const full = units === 'imperial' ? M_PER_MI : 1000;
  return log.run_splits.map((sp) => {
    const pace = paceOf(sp.distance_m, sp.duration_s);
    const partial = sp.distance_m < Math.round(full) - 1;
    return {
      index: sp.split_index,
      pace: pace ? formatPace(pace, units, false) : '–',
      relative:
        pace && target
          ? Math.max(-1, Math.min(1, (pace - target.pace_s_per_km) / (3 * target.tolerance_s)))
          : null,
      hr: sp.avg_hr ? String(sp.avg_hr) : '–',
      delta: pace && target ? splitVsTarget(pace, target, units) : null,
      partial: partial
        ? `last ${distanceNumber(sp.distance_m, units)} ${units === 'imperial' ? 'mi' : 'km'}`
        : undefined,
    };
  });
}
