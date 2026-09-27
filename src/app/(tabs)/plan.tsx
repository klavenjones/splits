import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { SafeAreaView, SettingsGroup, SettingsRow } from '@/components';

/** Plan tab. The week calendar and templates arrive in step 3; the exercise library is here now. */
export default function PlanScreen() {
  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-6 px-4 pt-4 pb-32">
          <View>
            <Text className="type-display text-text" accessibilityRole="header">
              plan
            </Text>
            <Text className="mt-2 type-subhead text-text-muted">
              The week calendar and your lift and run templates are coming soon.
            </Text>
          </View>
          <SettingsGroup title="library">
            <SettingsRow label="exercises" onPress={() => router.push('/exercises')} last />
          </SettingsGroup>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
