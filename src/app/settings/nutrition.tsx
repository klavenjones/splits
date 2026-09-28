import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import {
  Button,
  NumericField,
  SafeAreaView,
  SegmentedControl,
  SettingsGroup,
  SettingsRow,
  Toggle,
  TopNav,
} from '@/components';
import { supabase } from '@/db/client';
import {
  asEngineProfile,
  fetchDays,
  useNutritionProfile,
  useTargetHistory,
} from '@/db/queries/nutrition';
import { targetsKey } from '@/db/queries/targets';
import { mondayOf, toLocalDate } from '@/engine/calendar';
import { proposeTargets } from '@/engine/checkin';
import {
  computeTargets,
  recommendPhase,
  weeklyRatePct,
  type Experience,
  type Goal,
  type Phase,
} from '@/engine/nutrition';
import { monthDay } from '@/engine/progress';
import { kcalText } from '@/nutrition/describe';
import { useTheme } from '@/theme';
import { fromDisplayWeight, toDisplayWeight, weightUnit } from '@/units';

const PHASES: { value: Phase; label: string }[] = [
  { value: 'cut', label: 'cut' },
  { value: 'maintain', label: 'maintain' },
  { value: 'lean_bulk', label: 'lean bulk' },
];
const STATUS = { proposed: 'waiting', accepted: 'accepted', kept: 'kept' } as const;
const METHOD = { initial: 'starting', adaptive: 'check-in', manual: 'recalculated' } as const;

/** Goal and targets (mockup 11/02): goal, phase, experience, weekly rate, history, recalculate. */
export default function NutritionSettings() {
  const { c } = useTheme();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const qc = useQueryClient();
  const np = useNutritionProfile(userId).data;
  const history = useTargetHistory(userId).data ?? [];
  const today = toLocalDate(new Date());
  const week = mondayOf(today);
  const [draft, setDraft] = useState<{
    goal?: Goal;
    phase?: Phase;
    experience?: Experience;
    manual?: boolean;
    rate?: string;
  }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current body fat as the engine carries it (for the recommendation and the auto rate).
  const latest = useQuery({
    queryKey: ['nutrition-profile', userId, 'latest', week],
    enabled: !!np,
    queryFn: async () => {
      const p = asEngineProfile(np!);
      return proposeTargets(p, week, await fetchDays(p.start_date, week))?.result ?? null;
    },
  });

  if (!np)
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={c.textMuted} />
      </View>
    );

  const p = asEngineProfile(np);
  const goal = draft.goal ?? p.goal;
  const experience = draft.experience ?? p.experience;
  const bodyFat = latest.data?.week.bodyFatPct ?? p.start_body_fat_pct;
  const recommended = recommendPhase({ sex: p.sex, bodyFatPct: bodyFat, goal });
  const phase = draft.phase ?? p.phase;
  const manual = draft.manual ?? p.rate_mode === 'manual';
  const wu = weightUnit(units);
  const autoPct = weeklyRatePct({ sex: p.sex, experience, bodyFatPct: bodyFat, phase });
  const perWeek = (pct: number) => toDisplayWeight((pct / 100) * p.start_weight_kg, units);
  const rateText =
    draft.rate ?? String(Math.round(perWeek(manual ? p.weekly_rate_pct : autoPct) * 10) / 10);
  const manualPct = (fromDisplayWeight(Number(rateText) || 0, units) / p.start_weight_kg) * 100;

  const recalc = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = {
        ...p,
        goal,
        phase,
        experience,
        rate_mode: manual ? ('manual' as const) : ('auto' as const),
        weekly_rate_pct: manual ? manualPct : autoPct,
      };
      const proposal = proposeTargets(next, week, await fetchDays(p.start_date, week))?.proposal;
      const t =
        proposal ??
        (() => {
          const r = computeTargets({
            sex: p.sex,
            experience,
            goal,
            phase,
            weightKg: p.start_weight_kg,
            bodyFatPct: p.start_body_fat_pct,
            rateOverridePct: manual ? manualPct : undefined,
          });
          return {
            week_start: week,
            maintenance_kcal: r.maintenanceKcal,
            kcal_target: r.kcalTarget,
            kcal_low: r.kcalLow,
            kcal_high: r.kcalHigh,
            protein_g: r.proteinG,
            fat_g: r.fatG,
            carbs_g: r.carbsG,
          };
        })();
      const { error: e } = await supabase.rpc('update_nutrition_settings', {
        p_profile: {
          goal,
          phase,
          experience,
          rate_mode: next.rate_mode,
          weekly_rate_pct: Math.round(next.weekly_rate_pct * 1000) / 1000,
        },
        p_targets: { ...t, week_start: week },
      });
      if (e) throw e;
      setDraft({});
      qc.invalidateQueries({ queryKey: ['nutrition-profile', userId] });
      qc.invalidateQueries({ queryKey: targetsKey(userId) });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-6 px-4 pb-12 pt-2"
        >
          <TopNav onBack={() => router.back()} title="goal and targets" />

          <View className="gap-2">
            <Text className="px-1 type-micro text-text-muted">main goal</Text>
            <SegmentedControl
              accessibilityLabel="main goal"
              segments={[
                { value: 'lose_fat', label: 'lose fat' },
                { value: 'maintain', label: 'maintain' },
                { value: 'build_muscle', label: 'build muscle' },
              ]}
              value={goal}
              onChange={(v) => setDraft({ ...draft, goal: v })}
            />
          </View>

          <View className="gap-2">
            <Text className="px-1 type-micro text-text-muted">
              phase · {PHASES.find((x) => x.value === recommended)?.label} recommended at {bodyFat}%
              body fat
            </Text>
            <SegmentedControl
              accessibilityLabel="phase"
              segments={PHASES}
              value={phase}
              onChange={(v) => setDraft({ ...draft, phase: v })}
            />
          </View>

          <View className="gap-2">
            <Text className="px-1 type-micro text-text-muted">experience</Text>
            <SegmentedControl
              accessibilityLabel="experience"
              segments={[
                { value: 'beginner', label: 'beginner' },
                { value: 'intermediate', label: 'intermediate' },
              ]}
              value={experience}
              onChange={(v) => setDraft({ ...draft, experience: v })}
            />
          </View>

          <SettingsGroup title="weekly rate">
            <SettingsRow
              label="set manually"
              right={
                <Toggle
                  value={manual}
                  onValueChange={(v) => setDraft({ ...draft, manual: v, rate: undefined })}
                  accessibilityLabel="Set the weekly rate manually"
                />
              }
              last={!manual}
            />
            {manual ? (
              <View className="px-5 pb-4">
                <NumericField
                  label="per week (negative to lose)"
                  unit={`${wu}/wk`}
                  value={rateText}
                  allowNegative
                  onChangeText={(t) => setDraft({ ...draft, rate: t })}
                />
              </View>
            ) : (
              <SettingsRow
                label="from your phase and body fat"
                value={`${rateText} ${wu} per week`}
                last
              />
            )}
          </SettingsGroup>

          <Button block icon="undo" loading={busy} onPress={() => void recalc()}>
            recalculate targets now
          </Button>
          {error ? <Text className="type-caption text-danger-text">{error}</Text> : null}

          <SettingsGroup title="target history">
            {history.map((h, i) => (
              <Pressable
                key={h.id}
                onPress={() =>
                  h.method === 'adaptive'
                    ? router.push({ pathname: '/checkin/[week]', params: { week: h.week_start } })
                    : undefined
                }
                accessibilityRole={h.method === 'adaptive' ? 'button' : undefined}
                className={`flex-row items-center gap-3 px-5 py-3 ${i < history.length - 1 ? 'border-b border-hairline' : ''}`}
              >
                <View className="flex-1">
                  <Text className="type-body-strong text-text">
                    week of {monthDay(h.week_start)}
                  </Text>
                  <Text className="type-caption text-text-muted">
                    {METHOD[h.method]} · {STATUS[h.status]}
                  </Text>
                </View>
                <Text className="type-label text-text">{kcalText(h.kcal_target)} kcal</Text>
              </Pressable>
            ))}
          </SettingsGroup>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
