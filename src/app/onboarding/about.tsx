import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { signOut } from '@/auth';
import { Button, Icon, NumericField, SegmentedControl, StepScreen } from '@/components';
import { navyBodyFat } from '@/engine/nutrition';
import { useDraft } from '@/onboarding/draft';
import { useNumberField } from '@/onboarding/useNumberField';
import { size, useTheme } from '@/theme';
import {
  fromDisplayLength,
  fromDisplayWeight,
  lengthUnit,
  toDisplayLength,
  toDisplayWeight,
  weightUnit,
} from '@/units';

// Plausible adult ranges, metric.
const HEIGHT_CM = [120, 230] as const;
const WEIGHT_KG = [35, 320] as const;
const BODY_FAT = [3, 70] as const;
const inRange = (v: number | null, [lo, hi]: readonly [number, number]) =>
  v !== null && v >= lo && v <= hi;

/** Step 1: units, sex, height, weight, body fat (typed or estimated with the Navy formula). */
export default function AboutYou() {
  const { c } = useTheme();
  const { draft, update } = useDraft();
  const units = draft.unitSystem;
  const [estimateOpen, setEstimateOpen] = useState(true);
  const [waistCm, setWaistCm] = useState<number | null>(null);
  const [neckCm, setNeckCm] = useState<number | null>(null);
  const [hipCm, setHipCm] = useState<number | null>(null);

  const length = {
    toDisplay: (v: number) => toDisplayLength(v, units),
    fromDisplay: (v: number) => fromDisplayLength(v, units),
    unitKey: units,
  };
  const height = useNumberField({
    value: draft.heightCm,
    onValue: (v) => update({ heightCm: v }),
    ...length,
  });
  const weight = useNumberField({
    value: draft.weightKg,
    onValue: (v) => update({ weightKg: v }),
    toDisplay: (v) => toDisplayWeight(v, units),
    fromDisplay: (v) => fromDisplayWeight(v, units),
    unitKey: units,
  });
  const bodyFat = useNumberField({
    value: draft.bodyFatPct,
    onValue: (v) => update({ bodyFatPct: v }),
    toDisplay: (v) => v,
    fromDisplay: (v) => v,
    unitKey: 'pct',
    decimals: 0,
  });
  const waist = useNumberField({ value: waistCm, onValue: setWaistCm, ...length });
  const neck = useNumberField({ value: neckCm, onValue: setNeckCm, ...length });
  const hip = useNumberField({ value: hipCm, onValue: setHipCm, ...length });

  const estimate = estimateBodyFat({
    sex: draft.sex,
    heightCm: draft.heightCm,
    waistCm,
    neckCm,
    hipCm,
  });

  // Fill body fat from the estimate whenever the measurements produce one.
  useEffect(() => {
    if (estimate !== null) update({ bodyFatPct: estimate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate]);

  const valid =
    draft.sex !== null &&
    inRange(draft.heightCm, HEIGHT_CM) &&
    inRange(draft.weightKg, WEIGHT_KG) &&
    inRange(draft.bodyFatPct, BODY_FAT);

  return (
    <StepScreen
      step={1}
      total={5}
      onBack={() => signOut()}
      title="about you"
      subtitle="We use these to estimate what your body burns."
      footer={
        <Button block disabled={!valid} onPress={() => router.push('/onboarding/focus')}>
          continue
        </Button>
      }
    >
      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <Text className="px-1 type-subhead text-text-muted">units</Text>
          <SegmentedControl
            accessibilityLabel="units"
            segments={[
              { value: 'imperial', label: 'lb · in' },
              { value: 'metric', label: 'kg · cm' },
            ]}
            value={units}
            onChange={(v) => update({ unitSystem: v })}
          />
        </View>
        <View className="flex-1 gap-2">
          <Text className="px-1 type-subhead text-text-muted">sex</Text>
          <SegmentedControl
            accessibilityLabel="sex"
            segments={[
              { value: 'male', label: 'male' },
              { value: 'female', label: 'female' },
            ]}
            value={draft.sex}
            onChange={(v) => update({ sex: v })}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <NumericField
          className="flex-1"
          label="height"
          unit={lengthUnit(units)}
          {...height}
          error={
            draft.heightCm !== null && !inRange(draft.heightCm, HEIGHT_CM) ? 'check height' : null
          }
        />
        <NumericField
          className="flex-1"
          label="weight"
          unit={weightUnit(units)}
          {...weight}
          error={
            draft.weightKg !== null && !inRange(draft.weightKg, WEIGHT_KG) ? 'check weight' : null
          }
        />
      </View>

      <NumericField
        label="body fat"
        unit="%"
        {...bodyFat}
        error={
          draft.bodyFatPct !== null && !inRange(draft.bodyFatPct, BODY_FAT)
            ? 'between 3 and 70%'
            : null
        }
      />

      <View className="gap-4 rounded-card bg-surface-card p-5 shadow-card">
        <Pressable
          onPress={() => setEstimateOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: estimateOpen }}
          className="flex-row items-center gap-4"
        >
          <View
            className="items-center justify-center rounded-md bg-info-soft"
            style={{ width: size.touchMin, height: size.touchMin }}
          >
            <Icon name="info" size={size.iconMd} color={c.infoText} />
          </View>
          <View className="flex-1">
            <Text className="type-headline text-text">not sure? estimate it</Text>
            <Text className="type-subhead text-text-muted">
              Measure your waist and neck{draft.sex === 'female' ? ' and hips' : ''} instead.
            </Text>
          </View>
          <View style={{ transform: [{ rotate: estimateOpen ? '180deg' : '0deg' }] }}>
            <Icon name="chevron-down" size={size.iconMd} color={c.text} />
          </View>
        </Pressable>

        {estimateOpen ? (
          <>
            <View className="flex-row gap-3">
              <NumericField className="flex-1" label="waist" unit={lengthUnit(units)} {...waist} />
              <NumericField className="flex-1" label="neck" unit={lengthUnit(units)} {...neck} />
            </View>
            {draft.sex === 'female' ? (
              <NumericField label="hips" unit={lengthUnit(units)} {...hip} />
            ) : null}
            <Text className="type-subhead text-text-muted" accessibilityLiveRegion="polite">
              {estimate !== null
                ? `That puts you at about ${estimate}% body fat. We filled it in above.`
                : draft.sex === null || draft.heightCm === null
                  ? 'Pick your sex and enter your height first.'
                  : 'Measure at the navel and just below the larynx.'}
            </Text>
          </>
        ) : null}
      </View>
    </StepScreen>
  );
}

function estimateBodyFat(m: {
  sex: 'male' | 'female' | null;
  heightCm: number | null;
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
}): number | null {
  const { sex, heightCm, waistCm, neckCm, hipCm } = m;
  if (!sex || !heightCm || !waistCm || !neckCm || waistCm <= neckCm) return null;
  if (sex === 'female' && !hipCm) return null;
  const bf = navyBodyFat({ sex, heightCm, waistCm, neckCm, hipCm: hipCm ?? undefined });
  return Number.isFinite(bf) && bf >= BODY_FAT[0] && bf <= BODY_FAT[1] ? bf : null;
}
