import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Icon, IconButton, MicroLabel, RestTimer, SetRow } from '@/components';
import { useTheme } from '@/theme';

/** The lift logger from the design system: set table, one current set, and the frosted rest timer. */
export default function LiftLoggerScreen() {
  const { c } = useTheme();
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <View className="flex-row items-center justify-between px-4 py-1">
          <IconButton icon="chevron-left" label="Back to Today" onPress={() => router.back()} />
          <Text className="font-display-bold text-[17px] leading-[22px] text-text">upper body A</Text>
          <Button size="sm">finish</Button>
        </View>
        <View className="flex-row px-5 pt-2 pb-4">
          {[['24:18', 'elapsed'], ['6,840', 'volume lb'], ['1/5', 'exercises']].map(([v, l]) => (
            <View key={l} className="flex-1 gap-0.5">
              <Text className="font-display text-[24px] leading-[28px] tracking-[-0.5px] text-text tabular-nums">{v}</Text>
              <MicroLabel>{l}</MicroLabel>
            </View>
          ))}
        </View>
        <ScrollView contentContainerClassName="gap-3 px-4 pb-48">
          <Card padding="pb-2">
            <View className="flex-row items-center gap-3 p-4 pb-3">
              <View className="h-12 w-12 items-center justify-center rounded-md bg-lift-soft"><Icon name="lift" color={c.liftText} /></View>
              <View className="flex-1">
                <Text className="type-headline text-text">bench press</Text>
                <Text className="type-caption text-text-muted">4 × 8 @ 185 · 3/4 sets</Text>
              </View>
              <Button variant="secondary" size="sm" icon="swap">swap</Button>
            </View>
            <View className="px-2">
              <SetRow warmup previous="95 × 10" weight="95" reps="10" state="completed" />
              <SetRow index={1} previous="185 × 8" weight="185" reps="8" state="completed" />
              <SetRow index={2} previous="180 × 8" weight="185" reps="8" state="completed" pr />
              <SetRow index={3} previous="180 × 7" weight="185" state="current" />
              <SetRow index={4} previous="180 × 6" />
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
      <SafeAreaView edges={['bottom']} className="absolute bottom-0 left-3 right-3">
        <RestTimer seconds={83} total={120} next="bench set 4 · 185 × 8" running={false} />
      </SafeAreaView>
    </View>
  );
}
