import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { useAuth } from '@/auth';
import {
  AnchorCard,
  Avatar,
  Button,
  Card,
  ErrorBoundary,
  displayNameOf,
  EmptyState,
  MatchCard,
  MicroLabel,
  PlateRack,
  RunResultCard,
  SafeAreaView,
  SessionCard,
  Tag,
} from '@/components';
import { useUnmatchedRuns } from '@/db/queries/runs';
import { useSessions } from '@/db/queries/sessions';
import { useTemplate } from '@/db/queries/templates';
import { mondayOf, toLocalDate } from '@/engine/calendar';
import { startRun } from '@/lib/nav';
import { startPlannedSession } from '@/workout/start';
import {
  connectHealth,
  dismissPrompt,
  importNow,
  useHealthConnected,
  usePromptDismissed,
} from '@/health/connection';
import { isAvailable as healthAvailable } from '@/health/healthkit';
import { BodyCard, CheckinPrompt, FuelCard } from '@/nutrition/TodayCards';
import {
  averagePace,
  clockTime,
  distanceNumber,
  liftCounts,
  MATCH_LABEL,
  runState,
  runStats,
  runTitle,
} from '@/plan/describe';
import {
  addDays,
  byDay,
  longDay,
  rackDays,
  weekDays,
  weekdayCode,
  weekTotals,
  type PlanSession,
} from '@/plan/week';
import { aboutMinutes, repsText } from '@/templates/liftTemplate';
import { useTheme } from '@/theme';
import { formatDistance, paceUnit, type UnitSystem } from '@/units';

const open = (s: PlanSession) =>
  s.kind === 'run' && s.run
    ? router.push({ pathname: '/runs/[id]', params: { id: s.id } })
    : router.push({ pathname: '/sessions/[id]', params: { id: s.id } });
const openLink = (s: PlanSession) =>
  router.push({ pathname: '/sheets/link-run', params: { id: s.id } });

/** Today (v1): the week's plate rack, the day's sessions, and weekly totals. */
export default function TodayScreen() {
  const { c } = useTheme();
  const { userId, session, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const name = displayNameOf(profile?.display_name, session?.user.email);
  const today = toLocalDate(new Date());
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  // This week for the rack and totals, plus the coming 7 days for "next up" on a rest day.
  const horizon = addDays(today, 7) > sunday ? addDays(today, 7) : sunday;
  const week = useSessions(userId, monday, horizon);
  const days = weekDays(monday);
  const todayIndex = days.indexOf(today);
  const [selected, setSelected] = useState(today);

  const all = week.data ?? [];
  const list = all.filter((s) => s.scheduled_date <= sunday);
  const onDay = (byDay(list).get(selected) ?? []).filter((s) => s.status !== 'skipped');
  const isToday = selected === today;
  const next = isToday
    ? (onDay.find((s) => s.status === 'in_progress') ?? onDay.find((s) => s.status === 'planned'))
    : undefined;
  const rest = onDay.filter((s) => s !== next);
  const upcoming = all.find((s) => s.status === 'planned' && s.scheduled_date > selected);
  // Runs from the past week still waiting for a match (today's are in the day's list).
  const unmatched = useUnmatchedRuns(userId, addDays(today, -6));
  const earlierUnmatched = isToday
    ? (unmatched.data ?? []).filter((s) => s.scheduled_date !== today)
    : [];
  const [refreshing, setRefreshing] = useState(false);
  const refresh = async () => {
    setRefreshing(true);
    try {
      if (userId) await importNow(userId, units).catch(() => null);
      await Promise.all([week.refetch(), unmatched.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView
          contentContainerClassName="gap-4 px-4 pb-32 pt-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          <View className="flex-row items-end justify-between px-1">
            <View>
              <MicroLabel>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </MicroLabel>
              <Text className="mt-1 type-display text-text" accessibilityRole="header">
                today
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              className="active:opacity-70"
            >
              <Avatar name={name} />
            </Pressable>
          </View>

          <ErrorBoundary name="today.checkin" title="couldn’t show your check-in">
            <CheckinPrompt userId={userId} />
          </ErrorBoundary>

          <PlateRack
            days={rackDays(monday, list)}
            today={todayIndex}
            onSelect={(i) => setSelected(days[i])}
          />

          <Text className="px-1 pt-2 type-headline text-text" accessibilityRole="header">
            {isToday ? 'today’s plan' : `${weekdayCode(selected).toLowerCase()}’s plan`}
          </Text>

          <ErrorBoundary name="today.plan" title="couldn’t show today’s sessions and runs">
            <View className="gap-4">
              {week.isPending ? (
                <ActivityIndicator color={c.textMuted} />
              ) : week.error ? (
                <EmptyState
                  icon="alert"
                  title="Couldn’t load your plan"
                  body={week.error.message}
                />
              ) : onDay.length === 0 && upcoming ? (
                <View className="gap-2">
                  <Text className="px-1 type-subhead text-text-muted">
                    rest day · next up{' '}
                    {upcoming.scheduled_date === addDays(selected, 1)
                      ? 'tomorrow'
                      : longDay(upcoming.scheduled_date)}
                  </Text>
                  <SessionTile session={upcoming} units={units} />
                </View>
              ) : onDay.length === 0 ? (
                <EmptyState
                  icon="today"
                  title="rest day"
                  body={
                    list.length ? 'Nothing planned for this day.' : 'Nothing planned this week yet.'
                  }
                >
                  <Button variant="secondary" size="md" onPress={() => router.navigate('/plan')}>
                    plan the week
                  </Button>
                </EmptyState>
              ) : (
                <>
                  {next ? <UpNext session={next} units={units} /> : null}
                  {rest.map((s) => (
                    <SessionTile key={s.id} session={s} units={units} />
                  ))}
                </>
              )}

              {earlierUnmatched.map((s) => (
                <SessionTile key={s.id} session={s} units={units} />
              ))}
            </View>
          </ErrorBoundary>

          {isToday ? (
            <>
              <ErrorBoundary name="today.fuel" title="couldn’t show today’s fuel">
                <FuelCard userId={userId} today={today} />
              </ErrorBoundary>
              <ErrorBoundary name="today.body" title="couldn’t show your weigh-in">
                <BodyCard userId={userId} today={today} units={units} />
              </ErrorBoundary>
            </>
          ) : null}

          <ConnectHealthCard userId={userId} />

          {week.data ? <WeekTotalsCard sessions={list} units={units} /> : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** The "up next" anchor card: big estimated minutes, what it is, the first target, start. */
function UpNext({ session: s, units }: { session: PlanSession; units: UnitSystem }) {
  const qc = useQueryClient();
  const resume = s.status === 'in_progress';
  const template = useTemplate(s.template_id ?? undefined);
  const t = s.template;
  const first = template.data?.exercises[0];
  return (
    <Pressable onPress={() => open(s)} accessibilityRole="button" className="active:opacity-95">
      <AnchorCard title={resume ? 'in progress' : 'up next'} icon={s.kind}>
        <View className="mt-3 mb-5 gap-2">
          {t?.est_duration_s ? (
            <View className="flex-row items-baseline">
              <Text className="type-hero text-on-anchor">{aboutMinutes(t.est_duration_s)}</Text>
              <Text className="ml-1 type-body-strong text-on-anchor-muted">min</Text>
            </View>
          ) : null}
          <Text className="type-subhead text-on-anchor-muted">
            {s.name}
            {t
              ? ` · ${t.kind === 'lift' ? liftCounts(t) : t.est_distance_m ? formatDistance(t.est_distance_m, units) : 'run'}`
              : ''}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <Tag kind={s.kind} solid size="sm" />
            {first ? (
              <Text className="type-subhead text-on-anchor">
                {first.name} {first.target_sets} × {repsText(first)} is first
              </Text>
            ) : null}
          </View>
        </View>
        <Button
          variant="inverse"
          icon="play"
          block
          onPress={() =>
            resume
              ? router.push({ pathname: '/workout/[id]', params: { id: s.id } })
              : s.kind === 'lift'
                ? void startPlannedSession(s, qc)
                : startRun(s.name)
          }
        >
          {resume ? 'resume workout' : s.kind === 'lift' ? 'start workout' : 'start run'}
        </Button>
      </AnchorCard>
    </Pressable>
  );
}

function SessionTile({ session: s, units }: { session: PlanSession; units: UnitSystem }) {
  if (s.kind === 'run' && s.run?.match === 'needs_match')
    return (
      <MatchCard
        title={runTitle(s.run, units)}
        source={`from Apple Health · ${longDay(s.scheduled_date)}`}
        onLink={() => openLink(s)}
        onPress={() => open(s)}
      />
    );
  if (s.kind === 'run' && s.run)
    return (
      <RunResultCard
        title={s.template_id ? s.name : runTitle(s.run, units)}
        matchLabel={MATCH_LABEL[s.run.match]}
        stats={runStats(s.run, units)}
        source={`Imported from Apple Health · ${clockTime(s.run.started_at)}`}
        state={runState(s)}
        onPress={() => open(s)}
      />
    );
  const t = s.template;
  const minutes = t?.est_duration_s ? String(aboutMinutes(t.est_duration_s)) : '–';
  const status =
    s.status === 'completed' ? 'done' : s.status === 'in_progress' ? 'current' : 'planned';
  return (
    <SessionCard
      kind={s.kind}
      title={s.name}
      subtitle={!t ? 'template deleted' : t.kind === 'lift' ? liftCounts(t) : undefined}
      status={status}
      meta={
        t?.kind === 'run'
          ? [
              {
                value: t.est_distance_m ? distanceNumber(t.est_distance_m, units) : '–',
                label: units === 'imperial' ? 'mi' : 'km',
              },
              { value: averagePace(t, units) ?? '–', label: paceUnit(units) },
              { value: minutes, label: 'min' },
            ]
          : t
            ? [{ value: minutes, label: 'min' }]
            : undefined
      }
      onPress={() => open(s)}
    />
  );
}

function WeekTotalsCard({ sessions, units }: { sessions: PlanSession[]; units: UnitSystem }) {
  const t = weekTotals(sessions);
  const unit = units === 'imperial' ? 'mi' : 'km';
  const stats = [
    { value: `${t.runsDone}/${t.runs}`, label: 'runs' },
    {
      value: `${distanceNumber(t.runMetersDone, units)}/${distanceNumber(t.runMeters, units)}`,
      label: unit,
    },
    { value: `${t.liftsDone}/${t.lifts}`, label: 'lifts' },
  ];
  return (
    <Card className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="type-headline text-text" accessibilityRole="header">
          this week
        </Text>
        <Text className="type-caption text-text-muted">done / planned</Text>
      </View>
      <View className="flex-row">
        {stats.map((m) => (
          <View
            key={m.label}
            className="flex-1 gap-0.5"
            accessible
            accessibilityLabel={`${m.label}: ${m.value.replace('/', ' of ')}`}
          >
            <Text className="font-display text-[22px] leading-[26px] text-text tabular-nums">
              {m.value}
            </Text>
            <MicroLabel>{m.label}</MicroLabel>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Once, until connected or dismissed: import runs from the watch. iPhone only. */
function ConnectHealthCard({ userId }: { userId: string | undefined }) {
  const connected = useHealthConnected(userId);
  const dismissed = usePromptDismissed(userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!userId || connected || dismissed || Platform.OS !== 'ios' || !healthAvailable()) return null;
  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      await connectHealth(userId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Tag kind="run" size="sm" />
        <Text className="type-caption text-text-muted">Apple Health</Text>
      </View>
      <Text className="type-headline text-text">bring in your watch runs</Text>
      <Text className="type-body text-text-muted">
        Runs you record on your Apple Watch show up here with splits and match your plan. Your
        weight comes in too.
      </Text>
      <View className="flex-row gap-3">
        <Button variant="run" size="md" className="flex-1" loading={busy} onPress={connect}>
          connect
        </Button>
        <Button variant="secondary" size="md" onPress={() => dismissPrompt(userId)}>
          not now
        </Button>
      </View>
      {error ? <Text className="type-caption text-danger-text">{error}</Text> : null}
    </Card>
  );
}
