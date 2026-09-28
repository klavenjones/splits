import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  Chip,
  DayRow,
  EmptyState,
  Icon,
  PlannedSessionCard,
  RestDay,
  SafeAreaView,
  SegmentedControl,
  SummaryTile,
  TemplateCard,
  WeekBoard,
  WeekSwitcher,
  type BoardScroller,
} from '@/components';
import { useMoveSession, useSessions } from '@/db/queries/sessions';
import {
  useDeleteTemplate,
  useDuplicateTemplate,
  useTemplates,
  type TemplateListItem,
} from '@/db/queries/templates';
import { mondayOf, toLocalDate } from '@/engine/calendar';
import { FOCUS_LABEL, splitSummary } from '@/engine/focus';
import { showMenu } from '@/lib/menu';
import { sessionMeta, templateMeta } from '@/plan/describe';
import {
  addDays,
  byDay,
  relativeWeek,
  weekDays,
  weekdayCode,
  weekLabel,
  weekTotals,
  type PlanSession,
} from '@/plan/week';
import { size, useTheme } from '@/theme';
import { M_PER_MI } from '@/units';

type Filter = 'all' | 'lift' | 'run';

/** Plan tab: the week planner (mockup 08/01) and the template library (08/02). */
export default function PlanScreen() {
  const { c } = useTheme();
  const [view, setView] = useState<'week' | 'templates'>('week');
  const scroll = useRef<ScrollView>(null);
  const frame = useRef<View>(null);
  const pos = useRef({ y: 0, content: 0, height: 0, top: 0 });

  const scroller: BoardScroller = {
    y: () => pos.current.y,
    by: (dy) => {
      const p = pos.current;
      const y = Math.max(0, Math.min(p.content - p.height, p.y + dy));
      if (y === p.y) return;
      p.y = y;
      scroll.current?.scrollTo({ y, animated: false });
    },
    viewport: () => ({ top: pos.current.top, bottom: pos.current.top + pos.current.height }),
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    pos.current.y = e.nativeEvent.contentOffset.y;
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <View
          ref={frame}
          className="flex-1"
          onLayout={(e) => {
            pos.current.height = e.nativeEvent.layout.height;
            frame.current?.measureInWindow((_x, y) => {
              pos.current.top = y;
            });
          }}
        >
          <ScrollView
            ref={scroll}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onContentSizeChange={(_w, h) => {
              pos.current.content = h;
            }}
            contentContainerClassName="gap-5 px-4 pt-4 pb-32"
          >
            <Text className="type-display text-text" accessibilityRole="header">
              plan
            </Text>
            <SegmentedControl
              accessibilityLabel="plan view"
              segments={[
                { value: 'week', label: 'week' },
                { value: 'templates', label: 'templates' },
              ]}
              value={view}
              onChange={setView}
            />

            {view === 'week' ? <WeekView scroller={scroller} /> : <TemplatesView />}

            <Pressable
              onPress={() => router.push('/exercises')}
              accessibilityRole="link"
              className="flex-row items-center justify-center gap-2 py-2 active:opacity-60"
            >
              <Icon name="search" size={size.iconSm} color={c.textMuted} />
              <Text className="type-label text-text-muted">exercise library</Text>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** The week: switcher, RUN / LIFT / FOCUS tiles, and day rows you can drag sessions between. */
function WeekView({ scroller }: { scroller: BoardScroller }) {
  const { c } = useTheme();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const focus = profile?.focus ?? 'balanced';
  const today = toLocalDate(new Date());
  const [monday, setMonday] = useState(() => mondayOf(today));
  const sunday = addDays(monday, 6);
  const sessions = useSessions(userId, monday, sunday);
  const moveSession = useMoveSession(userId);

  const list = sessions.data ?? [];
  const days = byDay(list);
  const totals = weekTotals(list);
  const miles = totals.runMeters / (units === 'imperial' ? M_PER_MI : 1000);

  const add = (date: string) => router.push({ pathname: '/sessions/add', params: { date } });
  const open = (s: PlanSession) =>
    router.push({ pathname: '/sessions/[id]', params: { id: s.id } });
  const fill = () => router.push({ pathname: '/sessions/fill', params: { week: monday } });
  const move = (s: PlanSession, date: string) => moveSession.mutate({ id: s.id, date });

  const focusMenu = () =>
    showMenu(`${FOCUS_LABEL[focus]} · ${splitSummary(focus)}`, [
      { label: 'fill week from focus', onPress: fill },
      { label: 'change focus', onPress: () => router.push('/settings/focus') },
    ]);

  return (
    <>
      <WeekSwitcher
        title={weekLabel(monday)}
        subtitle={relativeWeek(monday, today) || undefined}
        onPrev={() => setMonday(addDays(monday, -7))}
        onNext={() => setMonday(addDays(monday, 7))}
      />
      <View className="flex-row gap-2.5">
        <SummaryTile
          kind="run"
          label="run"
          value={miles >= 10 ? String(Math.round(miles)) : String(Number(miles.toFixed(1)))}
          unit={units === 'imperial' ? 'mi' : 'km'}
          caption="planned"
        />
        <SummaryTile
          kind="lift"
          label="lift"
          value={String(totals.lifts)}
          unit={totals.lifts === 1 ? 'lift' : 'lifts'}
          caption="planned"
        />
        <SummaryTile
          kind="plain"
          label="focus"
          value={FOCUS_LABEL[focus]}
          caption={splitSummary(focus).split(' · ').slice(0, 2).join(' · ')}
          onPress={focusMenu}
        />
      </View>

      {sessions.isPending ? (
        <ActivityIndicator color={c.textMuted} />
      ) : sessions.error ? (
        <EmptyState icon="alert" title="Couldn’t load the week" body={sessions.error.message} />
      ) : (
        <>
          <WeekBoard
            days={weekDays(monday).map((date) => ({
              date,
              sessions: days.get(date) ?? [],
              accepts: date >= today,
            }))}
            keyOf={(s) => s.id}
            canDrag={(s) => s.status === 'planned'}
            onMove={move}
            scroller={scroller}
            renderDay={(day, state, children) => (
              <DayRow
                code={weekdayCode(day.date)}
                date={Number(day.date.slice(8))}
                today={day.date === today}
                highlight={state.highlight}
                dim={state.dim}
                onAdd={day.accepts && day.sessions.length ? () => add(day.date) : undefined}
              >
                {day.sessions.length ? (
                  children
                ) : (
                  <RestDay onAdd={day.accepts ? () => add(day.date) : undefined} />
                )}
              </DayRow>
            )}
            renderCard={(s, day) => (
              <PlannedSessionCard
                kind={s.kind}
                name={s.name}
                meta={sessionMeta(s, units)}
                status={s.status}
                draggable={s.status === 'planned'}
                onPress={() => open(s)}
                onMoveDay={
                  s.status === 'planned'
                    ? (dir) => {
                        const to = addDays(day.date, dir);
                        if (to >= today) move(s, to);
                      }
                    : undefined
                }
              />
            )}
          />
          {moveSession.error ? (
            <Text className="text-center type-caption text-danger-text">
              {moveSession.error.message}
            </Text>
          ) : null}
          {list.length === 0 && sunday >= today ? (
            <Button block icon="sparkle" onPress={fill}>
              fill week from focus
            </Button>
          ) : null}
          <Text className="text-center type-subhead text-text-muted">
            Press and hold a session to move it.
          </Text>
        </>
      )}
    </>
  );
}

/** The template library: all / lift / run chips, a 2-column grid, and "new template". */
function TemplatesView() {
  const { c } = useTheme();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const [filter, setFilter] = useState<Filter>('all');
  const templates = useTemplates(userId);
  const duplicate = useDuplicateTemplate(userId);
  const remove = useDeleteTemplate(userId);

  const list = (templates.data ?? []).filter((t) => filter === 'all' || t.kind === filter);

  const open = (id: string) => router.push({ pathname: '/templates/[id]', params: { id } });
  const create = (kind: 'lift' | 'run') =>
    router.push({ pathname: '/templates/[id]', params: { id: 'new', kind } });

  const newTemplate = () => {
    if (filter !== 'all') return create(filter);
    showMenu('new template', [
      { label: 'lift', onPress: () => create('lift') },
      { label: 'run', onPress: () => create('run') },
    ]);
  };

  const confirmDelete = (t: TemplateListItem) =>
    Alert.alert(`Delete ${t.name}?`, 'Past workouts from this template keep their history.', [
      { text: 'cancel', style: 'cancel' },
      { text: 'delete', style: 'destructive', onPress: () => remove.mutate(t.id) },
    ]);

  const menu = (t: TemplateListItem) =>
    showMenu(t.name, [
      { label: 'edit', onPress: () => open(t.id) },
      { label: 'duplicate', onPress: () => duplicate.mutate(t.id) },
      { label: 'delete', destructive: true, onPress: () => confirmDelete(t) },
    ]);

  const rows: TemplateListItem[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));

  return (
    <>
      <View className="flex-row gap-2.5" accessibilityRole="radiogroup">
        <Chip label="all" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip
          label="lift"
          leadingIcon="lift"
          selected={filter === 'lift'}
          onPress={() => setFilter('lift')}
        />
        <Chip
          label="run"
          leadingIcon="run"
          selected={filter === 'run'}
          onPress={() => setFilter('run')}
        />
      </View>

      {templates.isPending ? (
        <ActivityIndicator color={c.textMuted} />
      ) : templates.error ? (
        <EmptyState icon="alert" title="Couldn’t load templates" body={templates.error.message} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={filter === 'run' ? 'run' : 'lift'}
          title={filter === 'all' ? 'no templates yet' : `no ${filter} templates yet`}
          body="Build a workout once, then reuse it every week."
        />
      ) : (
        <View className="gap-3">
          {rows.map((pair) => (
            <View key={pair[0].id} className="flex-row gap-3">
              {pair.map((t) => (
                <TemplateCard
                  key={t.id}
                  kind={t.kind}
                  name={t.name}
                  meta={templateMeta(t, units)}
                  onPress={() => open(t.id)}
                  onMenu={() => menu(t)}
                />
              ))}
              {pair.length === 1 ? <View className="flex-1" /> : null}
            </View>
          ))}
        </View>
      )}
      {duplicate.error || remove.error ? (
        <Text className="text-center type-caption text-danger-text">
          {(duplicate.error ?? remove.error)?.message}
        </Text>
      ) : null}
      <Button block icon="plus" onPress={newTemplate}>
        new template
      </Button>
    </>
  );
}
