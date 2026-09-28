import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, Icon, MicroLabel, NumberPad, NumericField } from '@/components';
import { supabase } from '@/db/client';
import { useNutritionProfile, useSaveWeighIn, useWeighIns } from '@/db/queries/nutrition';
import { addDays, toLocalDate } from '@/engine/calendar';
import { navyBodyFat, recommendPhase } from '@/engine/nutrition';
import { rollingAverage } from '@/engine/progress';
import { longDay } from '@/plan/week';
import { size, useTheme } from '@/theme';
import {
  fromDisplayLength,
  fromDisplayWeight,
  lengthUnit,
  toDisplayLength,
  toDisplayWeight,
  weightUnit,
} from '@/units';

const PHASE_LABEL = { cut: 'a cut', maintain: 'maintenance', lean_bulk: 'a lean bulk' } as const;
const one = (v: number) => String(Math.round(v * 10) / 10);

/**
 * Weigh-in (mockups 06/01–03): today's weight on a number pad, optional waist / neck / hip with
 * the Navy body-fat estimate, and a prompt when that changes the recommended phase.
 */
export default function WeighInSheet() {
  const { c } = useTheme();
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const today = toLocalDate(new Date());
  const recent = useWeighIns(userId, addDays(today, -7)).data ?? [];
  const nutrition = useNutritionProfile(userId).data;
  const save = useSaveWeighIn(userId);
  const qc = useQueryClient();
  const todayRow = recent.find((r) => r.checkin_date === today);
  const [text, setText] = useState<string | null>(null);
  const [measure, setMeasure] = useState(false);
  const [waist, setWaist] = useState('');
  const [neck, setNeck] = useState('');
  const [hip, setHip] = useState('');

  const value =
    text ?? (todayRow?.weight_kg ? one(toDisplayWeight(Number(todayRow.weight_kg), units)) : '');
  const yesterday = recent.find((r) => r.checkin_date === addDays(today, -1));
  const avg = rollingAverage(recent.filter((r) => r.checkin_date < today)).at(-1);

  const key = (k: string) => {
    const cur = value;
    if (k === 'del') return setText(cur.slice(0, -1));
    if (k === '.' && (cur.includes('.') || !cur)) return;
    if (cur.includes('.') && cur.split('.')[1].length >= 1) return;
    if (cur.replace('.', '').length >= 4 && k !== '.') return;
    setText(cur + k);
  };

  const female = nutrition?.sex === 'female';
  const len = (s: string) => {
    const v = Number(s.replace(',', '.'));
    return s.trim() && v > 0 ? fromDisplayLength(v, units) : null;
  };
  const cm = { waist: len(waist), neck: len(neck), hip: len(hip) };
  const bodyFat =
    nutrition && cm.waist && cm.neck && (!female || cm.hip) && cm.waist > cm.neck
      ? navyBodyFat({
          sex: nutrition.sex,
          heightCm: Number(nutrition.height_cm),
          waistCm: cm.waist,
          neckCm: cm.neck,
          hipCm: cm.hip ?? undefined,
        })
      : null;
  const previousBf =
    recent.filter((r) => r.body_fat_pct !== null).at(-1)?.body_fat_pct ??
    nutrition?.start_body_fat_pct;

  const weightKg = Number(value) > 0 ? fromDisplayWeight(Number(value), units) : undefined;
  const canSave = !!weightKg || bodyFat !== null;

  const submit = () =>
    save.mutate(
      {
        date: today,
        weight_kg: weightKg ? Math.round(weightKg * 100) / 100 : undefined,
        ...(bodyFat !== null
          ? {
              waist_cm: Math.round(cm.waist! * 10) / 10,
              neck_cm: Math.round(cm.neck! * 10) / 10,
              hip_cm: cm.hip ? Math.round(cm.hip * 10) / 10 : undefined,
              body_fat_pct: bodyFat,
            }
          : {}),
      },
      {
        onSuccess: () => {
          router.back();
          if (bodyFat === null || !nutrition) return;
          const next = recommendPhase({
            sex: nutrition.sex,
            bodyFatPct: bodyFat,
            goal: nutrition.goal,
          });
          if (next === nutrition.phase) return;
          Alert.alert(
            'time to change phase?',
            `At ${bodyFat}% body fat, ${PHASE_LABEL[next]} is now recommended for your goal. Your targets follow the new phase from the next check-in.`,
            [
              { text: `keep ${PHASE_LABEL[nutrition.phase]}`, style: 'cancel' },
              {
                text: `switch to ${PHASE_LABEL[next]}`,
                onPress: () =>
                  void supabase
                    .rpc('update_nutrition_settings', { p_profile: { phase: next } })
                    .then(() => qc.invalidateQueries({ queryKey: ['nutrition-profile', userId] })),
              },
            ],
          );
        },
      },
    );

  return (
    <ScrollView
      className="bg-surface-card"
      keyboardShouldPersistTaps="handled"
      contentContainerClassName="gap-5 px-5 pt-5 pb-10"
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        hitSlop={12}
        className="self-start"
      >
        <Text className="type-label text-text">cancel</Text>
      </Pressable>
      <View className="gap-1">
        <Text className="type-title text-text" accessibilityRole="header">
          log weight
        </Text>
        <Text className="type-subhead text-text-muted">today, {longDay(today)}</Text>
      </View>
      <View className="items-center gap-1">
        <MicroLabel className="text-body-text">morning weigh-in</MicroLabel>
        <View
          className="flex-row items-baseline"
          accessible
          accessibilityLabel={`${value || 'no weight'} ${weightUnit(units)}`}
        >
          <Text className="type-hero text-text">{value || '–'}</Text>
          <Text className="ml-1 type-headline text-text-muted">{weightUnit(units)}</Text>
        </View>
        <Text className="type-subhead text-text-muted">
          {[
            yesterday?.weight_kg
              ? `yesterday ${one(toDisplayWeight(Number(yesterday.weight_kg), units))} ${weightUnit(units)}`
              : null,
            avg
              ? `7-day average ${one(toDisplayWeight(avg.kg, units))} ${weightUnit(units)}`
              : null,
          ]
            .filter(Boolean)
            .join(' · ') || 'your first weigh-in'}
        </Text>
      </View>
      <NumberPad onKey={key} />

      {measure ? (
        <View className="gap-3">
          <View className="flex-row gap-2.5">
            <View className="flex-1">
              <NumericField
                label="waist (at navel)"
                unit={lengthUnit(units)}
                value={waist}
                onChangeText={setWaist}
              />
            </View>
            <View className="flex-1">
              <NumericField
                label="neck"
                unit={lengthUnit(units)}
                value={neck}
                onChangeText={setNeck}
              />
            </View>
          </View>
          {female ? (
            <NumericField
              label="hip (widest)"
              unit={lengthUnit(units)}
              value={hip}
              onChangeText={setHip}
            />
          ) : null}
          <View className="flex-row items-center justify-between rounded-card bg-body-soft px-4 py-3">
            <Text className="type-subhead text-body-text">estimated body fat (Navy)</Text>
            <Text className="type-headline text-text">
              {bodyFat !== null ? `${bodyFat}%` : '–'}
              {bodyFat !== null && previousBf ? (
                <Text className="type-caption text-text-muted"> from {Number(previousBf)}%</Text>
              ) : null}
            </Text>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => {
            setMeasure(true);
            if (todayRow?.waist_cm)
              setWaist(one(toDisplayLength(Number(todayRow.waist_cm), units)));
            if (todayRow?.neck_cm) setNeck(one(toDisplayLength(Number(todayRow.neck_cm), units)));
          }}
          accessibilityRole="button"
          className="flex-row items-center gap-2 self-center py-1"
        >
          <Icon name="plus" size={size.iconMd} color={c.text} />
          <Text className="type-label text-text">add measurements</Text>
        </Pressable>
      )}

      <Button block icon="check" disabled={!canSave} loading={save.isPending} onPress={submit}>
        save
      </Button>
      {save.error ? (
        <Text className="type-caption text-danger-text">{save.error.message}</Text>
      ) : null}
    </ScrollView>
  );
}
