import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, Icon, TipCard, cn } from '@/components';
import { useMoveSession, useSession, useSessions } from '@/db/queries/sessions';
import { mondayOf, toLocalDate } from '@/engine/calendar';
import { closeOr } from '@/lib/nav';
import { notesFor } from '@/plan/coach';
import { addDays, byDay, longDay, shortDay, type PlanSession } from '@/plan/week';
import { size, useTheme } from '@/theme';

/** Reschedule: pick a day from today through next week; coach notes flag hard-day conflicts. */
export default function RescheduleSheet() {
  const { c } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const today = toLocalDate(new Date());
  const last = addDays(mondayOf(today), 13);
  const session = useSession(id);
  // One day either side, so the coach can see neighbours of the first and last choices.
  const nearby = useSessions(userId, addDays(today, -1), addDays(last, 1));

  if (!session.data || !nearby.data)
    return (
      <View className="flex-1 items-center justify-center bg-surface-card p-6">
        {session.error || nearby.error ? (
          <Text className="type-body text-danger-text">
            {(session.error ?? nearby.error)?.message}
          </Text>
        ) : (
          <ActivityIndicator color={c.textMuted} />
        )}
      </View>
    );

  return <Picker session={session.data} nearby={nearby.data} today={today} last={last} />;
}

function Picker({
  session,
  nearby,
  today,
  last,
}: {
  session: PlanSession;
  nearby: PlanSession[];
  today: string;
  last: string;
}) {
  const { c } = useTheme();
  const { userId } = useAuth();
  const move = useMoveSession(userId);
  const [date, setDate] = useState<string | null>(null);
  const days: string[] = [];
  for (let d = today; d <= last; d = addDays(d, 1)) days.push(d);
  const onDay = byDay(nearby.filter((s) => s.id !== session.id && s.status !== 'skipped'));
  const notes = date ? notesFor(session, date, nearby) : [];

  const confirm = () =>
    date && move.mutate({ id: session.id, date }, { onSuccess: () => closeOr('/plan') });

  return (
    <View className="flex-1 bg-surface-card">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        contentContainerClassName="gap-5 px-5 pt-5 pb-12"
      >
        <Pressable
          onPress={() => closeOr('/plan')}
          accessibilityRole="button"
          hitSlop={12}
          className="self-start active:opacity-60"
        >
          <Text className="type-label text-text">cancel</Text>
        </Pressable>
        <View className="gap-1">
          <Text className="type-title text-text" accessibilityRole="header">
            reschedule {session.name}
          </Text>
          <Text className="type-subhead text-text-muted">
            now on {longDay(session.scheduled_date)}
          </Text>
        </View>

        <View className="gap-2" accessibilityRole="radiogroup">
          {days.map((d) => {
            const current = d === session.scheduled_date;
            const selected = d === date;
            const there = onDay.get(d) ?? [];
            return (
              <Pressable
                key={d}
                onPress={() => setDate(d)}
                disabled={current}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: current }}
                accessibilityLabel={`${longDay(d)}${there.length ? `: ${there.map((s) => s.name).join(', ')}` : ', nothing planned'}${current ? ', current day' : ''}`}
                className={cn(
                  'min-h-14 flex-row items-center gap-3 rounded-md px-4 py-2.5',
                  selected ? 'bg-primary-fill' : 'bg-surface-inset active:bg-surface-control',
                  current && 'opacity-50',
                )}
              >
                <Text
                  className={cn('w-20 type-headline', selected ? 'text-on-primary' : 'text-text')}
                >
                  {d === today ? 'today' : shortDay(d)}
                </Text>
                <Text
                  className={cn(
                    'flex-1 type-subhead',
                    selected ? 'text-on-primary' : 'text-text-muted',
                  )}
                  numberOfLines={1}
                >
                  {current
                    ? 'current day'
                    : there.length
                      ? there.map((s) => s.name).join(' · ')
                      : 'free'}
                </Text>
                {selected ? <Icon name="check" size={size.iconMd} color={c.onPrimary} /> : null}
              </Pressable>
            );
          })}
        </View>

        {notes.map((n) => (
          <TipCard key={n} icon="alert" title="coach note" tone="info">
            {n}
          </TipCard>
        ))}
        {move.error ? (
          <Text className="text-center type-caption text-danger-text">{move.error.message}</Text>
        ) : null}
        <Button block disabled={!date} loading={move.isPending} onPress={confirm}>
          {date ? `move to ${shortDay(date)}` : 'pick a day'}
        </Button>
      </ScrollView>
    </View>
  );
}
