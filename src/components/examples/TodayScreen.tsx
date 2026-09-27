import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AnchorCard,
  Button,
  Card,
  HeroStat,
  IconButton,
  MicroLabel,
  PlateRack,
  SessionCard,
  Tag,
  TabBar,
  type RackDay,
} from '@/components';

const WEEK: RackDay[] = [
  { label: 'Sunday', date: 20, sessions: [{ kind: 'run', done: true }] },
  {
    label: 'Monday',
    date: 21,
    sessions: [
      { kind: 'lift', done: true },
      { kind: 'fuel', done: true },
    ],
  },
  {
    label: 'Tuesday',
    date: 22,
    sessions: [
      { kind: 'run', done: true },
      { kind: 'fuel', done: true },
    ],
  },
  {
    label: 'Wednesday',
    date: 23,
    sessions: [
      { kind: 'lift', done: true },
      { kind: 'run', done: true },
      { kind: 'fuel', done: true },
    ],
  },
  {
    label: 'Thursday',
    date: 24,
    sessions: [
      { kind: 'lift', done: false },
      { kind: 'run', done: false },
    ],
  },
  { label: 'Friday', date: 25, sessions: [{ kind: 'run', done: false }] },
  {
    label: 'Saturday',
    date: 26,
    sessions: [
      { kind: 'lift', done: false },
      { kind: 'run', done: false },
    ],
  },
];

/** The Today screen from the design system, built from the Splits components. */
export default function TodayScreen() {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-3 px-4 pb-32">
          <View className="flex-row items-end justify-between px-1 pt-4 pb-1">
            <View>
              <MicroLabel>thu · sep 24 · week 12 of 16</MicroLabel>
              <Text className="mt-1 type-display text-text" accessibilityRole="header">
                today
              </Text>
            </View>
            <IconButton icon="gear" label="Settings" />
          </View>

          <PlateRack days={WEEK} today={4} streak={11} />

          <AnchorCard title="up next" icon="lift">
            <View className="mt-3 mb-5">
              <Tag kind="lift" solid size="sm" />
              <Text className="mt-3 font-display text-[30px] leading-[34px] tracking-[-0.6px] text-on-anchor">
                upper body A
              </Text>
              <Text className="mt-1 type-subhead text-on-anchor-muted">
                5 exercises · ~55 min · bench 185 × 8 target
              </Text>
            </View>
            <Button
              variant="inverse"
              icon="play"
              block
              onPress={() => router.push('/dev/lift-logger')}
            >
              start workout
            </Button>
          </AnchorCard>

          <SessionCard
            kind="run"
            title="easy 5k"
            subtitle="zone 2 · after lifting or this evening"
            meta={[
              { value: '3.1', label: 'mi' },
              { value: '9:45', label: 'pace /mi' },
              { value: '~30', label: 'min' },
            ]}
          />

          <HeroStat
            value="1,240"
            label="kcal left"
            kind="fuel"
            size="hero-sm"
            stats={[
              { value: '1,320', label: 'eaten' },
              { value: '+180', label: 'run' },
              { value: '2,380', label: 'target' },
            ]}
          />

          <Card padding="p-4" className="flex-row items-center gap-3">
            <View className="flex-1">
              <MicroLabel>morning weigh-in</MicroLabel>
              <Text className="type-stat text-text">
                182.4<Text className="type-subhead text-text-muted"> lb</Text>
              </Text>
            </View>
            <Text className="type-caption text-success-text">logged 7:02</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
      <TabBar active="today" onChange={() => {}} onAdd={() => {}} />
    </View>
  );
}
