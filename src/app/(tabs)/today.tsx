import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView, Avatar, Card, displayNameOf, MicroLabel } from '@/components';

import { useAuth } from '@/auth';
import { useCurrentTargets } from '@/db/queries/targets';

const fmt = (n: number) => n.toLocaleString('en-US');

/** Today (placeholder until build step 4): settings avatar and the current targets. */
export default function TodayScreen() {
  const { userId, session, profile } = useAuth();
  const targets = useCurrentTargets(userId);
  const name = displayNameOf(profile?.display_name, session?.user.email);
  const t = targets.data;

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-4 px-4 pb-32 pt-4">
          <View className="flex-row items-end justify-between px-1">
            <View>
              <MicroLabel>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </MicroLabel>
              <Text className="mt-1 type-display text-text" accessibilityRole="header">
                today
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              className="active:opacity-70"
            >
              <Avatar name={name} />
            </Pressable>
          </View>

          <Card className="gap-3">
            <MicroLabel className="text-fuel-text">daily targets</MicroLabel>
            {t ? (
              <>
                <Text className="type-stat text-text">
                  {fmt(t.kcal_target)}
                  <Text className="type-subhead text-text-muted"> kcal</Text>
                </Text>
                <Text className="type-subhead text-text-muted">
                  aim for {fmt(t.kcal_low)} to {fmt(t.kcal_high)} · maintenance{' '}
                  {fmt(t.maintenance_kcal)}
                </Text>
                <Text className="type-label text-text">
                  {t.protein_g} g protein · {t.fat_g} g fat · {t.carbs_g} g carbs
                </Text>
              </>
            ) : (
              <Text className="type-subhead text-text-muted">
                {targets.isPending ? 'loading…' : 'No targets yet.'}
              </Text>
            )}
          </Card>

          <Text className="px-1 type-subhead text-text-muted">
            Sessions, food and weigh-ins arrive in the next build steps.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
