import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, EmptyState, MicroLabel, TemplatePickRow } from '@/components';
import { usePlanSessions, useSessions } from '@/db/queries/sessions';
import { useTemplates, type TemplateListItem } from '@/db/queries/templates';
import { toLocalDate } from '@/engine/calendar';
import { FOCUS_LABEL, type Focus } from '@/engine/focus';
import { showMenu } from '@/lib/menu';
import { closeOr } from '@/lib/nav';
import { templateMeta } from '@/plan/describe';
import { fillItems, fillSlots, type FillSlot } from '@/plan/fill';
import { addDays, weekdayCode, weekLabel } from '@/plan/week';
import { useTheme } from '@/theme';
import type { UnitSystem } from '@/units';

const BLOCKED: Record<NonNullable<FillSlot['blocked']>, (plan: string) => string> = {
  past: () => 'already passed',
  planned: () => 'already planned',
  no_templates: (plan) => `no ${plan} templates yet`,
};

/** "Fill week from focus": the focus split over the week, pre-filled by rotation; confirm to add. */
export default function FillWeekSheet() {
  const { c } = useTheme();
  const { week } = useLocalSearchParams<{ week: string }>();
  const { userId, profile } = useAuth();
  const sessions = useSessions(userId, week, addDays(week, 6));
  const templates = useTemplates(userId);

  if (!sessions.data || !templates.data || !profile)
    return (
      <View className="flex-1 items-center justify-center bg-bg p-6">
        {sessions.error || templates.error ? (
          <Text className="type-body text-danger-text">
            {(sessions.error ?? templates.error)?.message}
          </Text>
        ) : (
          <ActivityIndicator color={c.textMuted} />
        )}
      </View>
    );

  const initial = fillSlots(
    profile.focus,
    week,
    toLocalDate(new Date()),
    sessions.data,
    templates.data,
  );
  return (
    <Preview
      week={week}
      focus={profile.focus}
      units={profile.unit_system}
      initial={initial}
      templates={templates.data}
    />
  );
}

function Preview({
  week,
  focus,
  units,
  initial,
  templates,
}: {
  week: string;
  focus: Focus;
  units: UnitSystem;
  initial: FillSlot[];
  templates: TemplateListItem[];
}) {
  const { userId } = useAuth();
  const plan = usePlanSessions(userId);
  const [slots, setSlots] = useState(initial);
  const items = fillItems(slots);
  const byId = new Map(templates.map((t) => [t.id, t]));

  const choose = (i: number) => {
    const slot = slots[i];
    const kind = slot.plan === 'rest' ? null : slot.plan;
    const options = templates
      .filter((t) => !kind || t.kind === kind)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    const set = (template: FillSlot['template']) =>
      setSlots((s) => s.map((x, j) => (j === i ? { ...x, template } : x)));
    showMenu(weekdayCode(slot.date).toLowerCase(), [
      ...options.map((t) => ({
        label: t.name,
        onPress: () => set({ id: t.id, name: t.name, kind: t.kind }),
      })),
      ...(slot.template ? [{ label: 'rest day', onPress: () => set(null) }] : []),
    ]);
  };

  const confirm = () => plan.mutate(items, { onSuccess: () => closeOr('/plan') });

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
            fill week from focus
          </Text>
          <Text className="type-subhead text-text-muted">
            {FOCUS_LABEL[focus]} · {weekLabel(week)}
          </Text>
        </View>

        {templates.length === 0 ? (
          <EmptyState
            icon="plan"
            title="no templates yet"
            body="Build a lift and a run template first, then fill the week from them."
          />
        ) : (
          <View className="gap-3">
            {slots.map((slot, i) => (
              <View key={slot.date} className="flex-row items-center gap-3">
                <View className="w-12 items-center">
                  <MicroLabel>{weekdayCode(slot.date)}</MicroLabel>
                  <Text className="font-display text-[22px] leading-[28px] text-text tabular-nums">
                    {Number(slot.date.slice(8))}
                  </Text>
                </View>
                <View className="flex-1">
                  {slot.blocked ? (
                    <SlotNote text={BLOCKED[slot.blocked](slot.plan)} />
                  ) : slot.template ? (
                    <TemplatePickRow
                      kind={slot.template.kind}
                      name={slot.template.name}
                      meta={(() => {
                        const t = byId.get(slot.template.id);
                        return t ? templateMeta(t, units) : '';
                      })()}
                      icon="chevron-down"
                      onPress={() => choose(i)}
                    />
                  ) : (
                    <SlotNote text="rest day" action="choose" onPress={() => choose(i)} />
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <Text className="px-1 type-caption text-text-muted">
          Lift days rotate through your lift templates and run days through your run templates. Days
          you’ve already planned stay as they are.
        </Text>
        {plan.error ? (
          <Text className="text-center type-caption text-danger-text">{plan.error.message}</Text>
        ) : null}
        <Button block disabled={!items.length} loading={plan.isPending} onPress={confirm}>
          {items.length
            ? `add ${items.length} session${items.length === 1 ? '' : 's'}`
            : 'nothing to add'}
        </Button>
        <Pressable
          onPress={() => router.push('/settings/focus')}
          accessibilityRole="link"
          className="items-center py-2 active:opacity-60"
        >
          <Text className="type-label text-text-muted">change focus</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SlotNote({
  text,
  action,
  onPress,
}: {
  text: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      className="min-h-16 flex-row items-center justify-between rounded-card border-[1.5px] border-hairline px-4 active:bg-surface-inset"
    >
      <Text className="type-body text-text-muted">{text}</Text>
      {action ? <Text className="type-label text-text">{action}</Text> : null}
    </Pressable>
  );
}
