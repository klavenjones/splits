import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
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
  EmptyState,
  Icon,
  SafeAreaView,
  SegmentedControl,
  TemplateCard,
} from '@/components';
import {
  useDeleteTemplate,
  useDuplicateTemplate,
  useTemplates,
  type TemplateListItem,
} from '@/db/queries/templates';
import { aboutMinutes } from '@/templates/liftTemplate';
import { size, useTheme } from '@/theme';
import { formatDistance, type UnitSystem } from '@/units';

type Filter = 'all' | 'lift' | 'run';

function meta(t: TemplateListItem, units: UnitSystem): string {
  const minutes = t.est_duration_s ? `${aboutMinutes(t.est_duration_s)} min` : null;
  const first =
    t.kind === 'lift'
      ? `${t.exercise_count} exercise${t.exercise_count === 1 ? '' : 's'}`
      : t.est_distance_m
        ? formatDistance(t.est_distance_m, units)
        : null;
  return [first, minutes].filter(Boolean).join(' · ');
}

/** Plan tab. The week planner arrives in step 4; templates live here now. */
export default function PlanScreen() {
  const { c } = useTheme();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const [view, setView] = useState<'week' | 'templates'>('templates');
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
    if (Platform.OS === 'ios')
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'new template', options: ['lift', 'run', 'cancel'], cancelButtonIndex: 2 },
        (i) => (i === 0 ? create('lift') : i === 1 ? create('run') : undefined),
      );
    else
      Alert.alert('new template', undefined, [
        { text: 'lift', onPress: () => create('lift') },
        { text: 'run', onPress: () => create('run') },
        { text: 'cancel', style: 'cancel' },
      ]);
  };

  const confirmDelete = (t: TemplateListItem) =>
    Alert.alert(`Delete ${t.name}?`, 'Past workouts from this template keep their history.', [
      { text: 'cancel', style: 'cancel' },
      { text: 'delete', style: 'destructive', onPress: () => remove.mutate(t.id) },
    ]);

  const menu = (t: TemplateListItem) => {
    const actions = [() => open(t.id), () => duplicate.mutate(t.id), () => confirmDelete(t)];
    if (Platform.OS === 'ios')
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: t.name,
          options: ['edit', 'duplicate', 'delete', 'cancel'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
        },
        (i) => actions[i]?.(),
      );
    else
      Alert.alert(t.name, undefined, [
        { text: 'edit', onPress: actions[0] },
        { text: 'duplicate', onPress: actions[1] },
        { text: 'delete', style: 'destructive', onPress: actions[2] },
        { text: 'cancel', style: 'cancel' },
      ]);
  };

  const rows: TemplateListItem[][] = [];
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-5 px-4 pt-4 pb-32">
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

          {view === 'week' ? (
            <EmptyState
              icon="plan"
              title="week planner soon"
              body="Next up: drag your templates onto days to plan the week."
            />
          ) : (
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
                <EmptyState
                  icon="alert"
                  title="Couldn’t load templates"
                  body={templates.error.message}
                />
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
                          meta={meta(t, units)}
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
          )}

          <Pressable
            onPress={() => router.push('/exercises')}
            accessibilityRole="link"
            className="flex-row items-center justify-center gap-2 py-2 active:opacity-60"
          >
            <Icon name="search" size={size.iconSm} color={c.textMuted} />
            <Text className="type-label text-text-muted">exercise library</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
