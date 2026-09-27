import { router } from 'expo-router';
import { Text, View } from 'react-native';

import {
  Button,
  Card,
  MicroLabel,
  NumericField,
  RadioOptionCard,
  StepScreen,
  TipCard,
  Toggle,
} from '@/components';
import { recommendPhase, weeklyRatePct, type Goal, type Phase } from '@/engine/nutrition';
import { useDraft } from '@/onboarding/draft';
import { useNumberField } from '@/onboarding/useNumberField';
import { fromDisplayWeight, toDisplayWeight, weightUnit } from '@/units';

const GOALS: {
  goal: Goal;
  title: string;
  subtitle: string;
  icon: 'body' | 'progress' | 'lift';
  color: 'bodyText' | 'text' | 'liftFill';
}[] = [
  {
    goal: 'lose_fat',
    title: 'lose fat',
    subtitle: 'drop fat, keep your strength',
    icon: 'body',
    color: 'bodyText',
  },
  {
    goal: 'maintain',
    title: 'maintain',
    subtitle: 'hold your weight and train hard',
    icon: 'progress',
    color: 'text',
  },
  {
    goal: 'build_muscle',
    title: 'build muscle',
    subtitle: 'gain slowly with extra fuel',
    icon: 'lift',
    color: 'liftFill',
  },
];

const PHASE_LABEL: Record<Phase, string> = {
  cut: 'cut',
  maintain: 'maintain',
  lean_bulk: 'lean bulk',
};

function phaseReason(phase: Phase, goal: Goal, bodyFatPct: number): string {
  const bf = Math.round(bodyFatPct);
  if (phase === 'cut' && goal !== 'lose_fat')
    return `At about ${bf}% body fat, we suggest losing fat first, then building. Your runs and lifts get easier as you lean out.`;
  if (phase === 'cut')
    return `At about ${bf}% body fat, losing fat first will make your runs and lifts easier.`;
  if (phase === 'lean_bulk') return 'A small surplus builds muscle without much fat gain.';
  return 'Eat at maintenance and let your training drive progress.';
}

/** Step 3: goal, recommended phase, and weekly rate (auto or manual). */
export default function MainGoal() {
  const { draft, update } = useDraft();
  const units = draft.unitSystem;
  const unit = weightUnit(units);
  const { sex, bodyFatPct, weightKg, experience, goal } = draft;

  const phase =
    goal && sex && bodyFatPct !== null ? recommendPhase({ sex, bodyFatPct, goal }) : null;
  const autoPct =
    phase && sex && experience && bodyFatPct !== null
      ? weeklyRatePct({ sex, experience, bodyFatPct, phase })
      : null;
  const autoKg = autoPct !== null && weightKg ? (autoPct / 100) * weightKg : null;

  const manual = useNumberField({
    value: draft.manualRateKgPerWeek,
    onValue: (v) => update({ manualRateKgPerWeek: v }),
    toDisplay: (v) => toDisplayWeight(v, units),
    fromDisplay: (v) => fromDisplayWeight(v, units),
    unitKey: units,
    decimals: 2,
  });

  const rateKg = draft.rateManual ? draft.manualRateKgPerWeek : autoKg;
  const ratePct = rateKg !== null && weightKg ? (rateKg / weightKg) * 100 : null;
  const rateDisplay = rateKg === null ? null : toDisplayWeight(rateKg, units);
  const manualTooFast = ratePct !== null && Math.abs(ratePct) > 1.5;

  const valid = goal !== null && (!draft.rateManual || (rateKg !== null && !manualTooFast));

  return (
    <StepScreen
      step={3}
      total={5}
      onBack={() => router.back()}
      title="main goal"
      subtitle="Your calories and weekly pace are built around it."
      footer={
        <Button block disabled={!valid} onPress={() => router.push('/onboarding/targets')}>
          continue
        </Button>
      }
    >
      <View className="gap-3" accessibilityRole="radiogroup">
        {GOALS.map((g) => (
          <RadioOptionCard
            key={g.goal}
            icon={g.icon}
            iconColor={g.color}
            title={g.title}
            subtitle={g.subtitle}
            selected={goal === g.goal}
            onPress={() => update({ goal: g.goal })}
          />
        ))}
      </View>

      {phase && goal && bodyFatPct !== null ? (
        <TipCard icon="body" title={`recommended phase: ${PHASE_LABEL[phase]}`}>
          {phaseReason(phase, goal, bodyFatPct)}
        </TipCard>
      ) : null}

      {phase ? (
        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <MicroLabel className="text-body-text">weekly rate</MicroLabel>
            <View className="flex-row items-center gap-3">
              <Text className="type-subhead text-text">set manually</Text>
              <Toggle
                accessibilityLabel="set weekly rate manually"
                value={draft.rateManual}
                onValueChange={(on) =>
                  update({
                    rateManual: on,
                    manualRateKgPerWeek: on
                      ? (draft.manualRateKgPerWeek ?? autoKg)
                      : draft.manualRateKgPerWeek,
                  })
                }
              />
            </View>
          </View>

          {draft.rateManual ? (
            <NumericField
              allowNegative
              label={`change per week (negative = loss)`}
              unit={`${unit} / wk`}
              {...manual}
              error={manualTooFast ? 'Keep it within 1.5% of your weight per week.' : null}
            />
          ) : (
            <Text
              className="type-hero-sm text-text"
              accessibilityLabel={`${formatSigned(rateDisplay)} ${unit} per week`}
            >
              {formatSigned(rateDisplay)}
              <Text className="type-headline text-text-muted"> {unit} per week</Text>
            </Text>
          )}
          <Text className="type-subhead text-text-muted">
            {ratePct === null || ratePct === 0
              ? 'Hold your weight steady.'
              : `${Math.abs(Number(ratePct.toFixed(2)))}% of your body weight each week`}
          </Text>
        </Card>
      ) : null}
    </StepScreen>
  );
}

/** −1.4, +0.5, 0 */
function formatSigned(n: number | null): string {
  if (n === null) return '–';
  const r = Number(n.toFixed(1));
  if (r === 0) return '0';
  return `${r > 0 ? '+' : '−'}${Math.abs(r)}`;
}
