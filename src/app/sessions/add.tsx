import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Chip, EmptyState, Icon, TemplatePickRow } from '@/components';
import { usePlanSessions } from '@/db/queries/sessions';
import { useTemplates } from '@/db/queries/templates';
import { closeOr } from '@/lib/nav';
import { templateMeta } from '@/plan/describe';
import { longDay } from '@/plan/week';
import { size, useTheme } from '@/theme';

type Filter = 'all' | 'lift' | 'run';

/** Add a session on a day: pick one of your templates. */
export default function AddSessionSheet() {
  const { c } = useTheme();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const templates = useTemplates(userId);
  const plan = usePlanSessions(userId);
  const [filter, setFilter] = useState<Filter>('all');
  const [picked, setPicked] = useState<string | null>(null);

  const list = (templates.data ?? [])
    .filter((t) => filter === 'all' || t.kind === filter)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

  const add = (templateId: string) => {
    setPicked(templateId);
    plan.mutate([{ template_id: templateId, scheduled_date: date }], {
      onSuccess: () => closeOr('/plan'),
    });
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-5 px-4 pt-5 pb-12">
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
            add a session
          </Text>
          <Text className="type-subhead text-text-muted">{longDay(date)}</Text>
        </View>
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
            body="Build a template first, then put it on a day."
          />
        ) : (
          <View className="gap-3">
            {list.map((t) => (
              <TemplatePickRow
                key={t.id}
                kind={t.kind}
                name={t.name}
                meta={templateMeta(t, units)}
                selected={plan.isPending && picked === t.id}
                disabled={plan.isPending}
                onPress={() => add(t.id)}
              />
            ))}
          </View>
        )}
        {plan.error ? (
          <Text className="text-center type-caption text-danger-text">{plan.error.message}</Text>
        ) : null}

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/templates/[id]',
              params: { id: 'new', kind: filter === 'run' ? 'run' : 'lift' },
            })
          }
          accessibilityRole="link"
          className="flex-row items-center justify-center gap-2 py-2 active:opacity-60"
        >
          <Icon name="plus" size={size.iconSm} color={c.textMuted} />
          <Text className="type-label text-text-muted">new template</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
