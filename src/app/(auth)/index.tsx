import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AUTH_PROVIDERS } from '@/auth';
import { Button, cn, MicroLabel } from '@/components';

type Plate = 'run' | 'lift' | 'fuel' | 'body';
const FILL: Record<Plate, string> = {
  run: 'bg-run-fill',
  lift: 'bg-lift-fill',
  fuel: 'bg-fuel-fill',
  body: 'bg-body-fill',
};
const OUTLINE: Record<Plate, string> = {
  run: 'border-run-text',
  lift: 'border-lift-fill',
  fuel: 'border-fuel-fill',
  body: 'border-body-fill',
};

// A week of sessions stacked like plates, bottom first. The last day's top plates are still planned.
const WEEK: { day: string; done: Plate[]; planned?: Plate[] }[] = [
  { day: 'S', done: ['run', 'lift', 'fuel'] },
  { day: 'M', done: ['lift', 'run', 'fuel', 'body', 'run'] },
  { day: 'T', done: [] },
  { day: 'W', done: ['run', 'lift', 'fuel', 'run', 'body', 'lift'] },
  { day: 'T', done: ['lift', 'fuel', 'run', 'lift', 'fuel', 'run', 'body', 'lift'] },
  { day: 'F', done: ['run', 'lift', 'fuel', 'run', 'lift', 'fuel', 'body', 'run', 'lift'] },
  {
    day: 'S',
    done: ['lift', 'run', 'fuel', 'body', 'lift', 'run', 'fuel'],
    planned: ['lift', 'run', 'fuel'],
  },
];

function PlateWeek() {
  return (
    <View className="flex-1 flex-row items-end justify-between gap-2" aria-hidden>
      {WEEK.map((d, i) => (
        <View key={i} className="flex-1 items-center gap-1.5">
          {[...(d.planned ?? [])].reverse().map((p, j) => (
            <View
              key={`p${j}`}
              className={cn('h-5 w-full rounded-sm border-2 border-dashed', OUTLINE[p])}
            />
          ))}
          {[...d.done].reverse().map((p, j) => (
            <View key={j} className={cn('h-5 w-full rounded-sm', FILL[p])} />
          ))}
          {d.done.length === 0 ? <View className="h-1.5 w-1/2 rounded-pill bg-track" /> : null}
          <Text className="mt-2 type-label text-text-muted">{d.day}</Text>
        </View>
      ))}
    </View>
  );
}

/** First launch: what Splits is, and how to get in. */
export default function Welcome() {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top', 'bottom']} className="flex-1">
        <View className="flex-1 gap-8 px-5 pt-6 pb-4">
          <View className="flex-row items-center justify-between">
            <Text className="type-title text-text" accessibilityRole="header">
              splits
            </Text>
            <MicroLabel>run · lift · fuel</MicroLabel>
          </View>

          <PlateWeek />

          <View className="gap-3">
            <Text className="type-display text-text">run, lift, and eat from one plan.</Text>
            <Text className="type-body text-text-muted">
              Training and food targets that adjust to each other every week.
            </Text>
          </View>

          <View className="gap-3">
            {AUTH_PROVIDERS.apple ? (
              <Button block onPress={() => {}}>
                continue with Apple
              </Button>
            ) : null}
            <Button
              block
              variant={AUTH_PROVIDERS.apple ? 'secondary' : 'primary'}
              onPress={() => router.push({ pathname: '/email', params: { mode: 'signup' } })}
            >
              sign up with email
            </Button>
            <Text className="text-center type-subhead text-text-muted">
              Already have an account?{' '}
              <Text
                className="font-body-bold text-text underline"
                accessibilityRole="link"
                onPress={() => router.push({ pathname: '/email', params: { mode: 'login' } })}
              >
                Log in
              </Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
