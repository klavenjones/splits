import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Icon, MicroLabel, type IconName } from '@/components';
import { MEAL_LABEL, mealForHour } from '@/db/queries/nutrition';
import { useSessions } from '@/db/queries/sessions';
import { toLocalDate } from '@/engine/calendar';
import { showMenu } from '@/lib/menu';
import { useWorkout } from '@/store/workout';
import { size, useTheme } from '@/theme';
import { startEmptyWorkout, startPlannedSession } from '@/workout/start';

/** The center + sheet: start a workout, log food, log weight, quick add. */
export default function AddSheet() {
  const { c } = useTheme();
  const { userId } = useAuth();
  const qc = useQueryClient();
  const today = toLocalDate(new Date());
  const planned = (useSessions(userId, today, today).data ?? []).filter(
    (s) => s.kind === 'lift' && s.status === 'planned',
  );
  const active = useWorkout((s) => s.active);

  const meal = mealForHour(new Date().getHours());
  const food = (pathname: '/sheets/food-search' | '/sheets/weigh-in' | '/food/quick-add') => {
    router.back();
    setTimeout(() => router.push({ pathname, params: { meal, date: today } }), 350);
  };

  const start = () => {
    if (active) {
      router.back();
      return router.push({ pathname: '/workout/[id]', params: { id: active.id } });
    }
    const go = (fn: () => void) => {
      router.back();
      setTimeout(fn, 350);
    };
    showMenu('start workout', [
      ...planned.map((s) => ({
        label: s.name,
        onPress: () => go(() => void startPlannedSession(s, qc)),
      })),
      { label: 'empty workout', onPress: () => go(startEmptyWorkout) },
    ]);
  };

  const row = (icon: IconName, label: string, onPress?: () => void, detail?: string) => (
    <Pressable
      key={label}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !onPress }}
      accessibilityLabel={onPress ? label : `${label}, coming soon`}
      className="flex-row items-center gap-3 rounded-md bg-surface-inset px-4 active:bg-surface-control"
      style={{ minHeight: size.controlH }}
    >
      <Icon name={icon} size={size.iconMd} color={onPress ? c.text : c.textMuted} />
      <Text className="flex-1 type-label text-text">{label}</Text>
      {detail ? <Text className="type-caption text-text-muted">{detail}</Text> : null}
      {onPress ? null : <MicroLabel>soon</MicroLabel>}
    </Pressable>
  );

  return (
    <View className="gap-2 bg-surface-card px-4 pt-6 pb-10">
      <Text className="mb-2 type-title text-text" accessibilityRole="header">
        log
      </Text>
      {row(
        'lift',
        active ? 'resume workout' : 'start workout',
        start,
        active ? active.name : planned.length ? `${planned.length} planned today` : undefined,
      )}
      {row('fuel', 'log food', () => food('/sheets/food-search'), MEAL_LABEL[meal])}
      {row('body', 'log weight', () => food('/sheets/weigh-in'))}
      {row('flame', 'quick add', () => food('/food/quick-add'), MEAL_LABEL[meal])}
    </View>
  );
}
