import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import {
  SafeAreaView,
  Avatar,
  displayNameOf,
  Icon,
  SettingsGroup,
  SettingsRow,
  TopNav,
} from '@/components';

import { signOut, useAuth } from '@/auth';
import { FOCUS_LABEL } from '@/engine/focus';
import { size, useTheme } from '@/theme';

const UNITS_LABEL = { imperial: 'lb, mi', metric: 'kg, km' } as const;

/** Profile, training focus, units, log out. More rows arrive with later steps. */
export default function Settings() {
  const { c } = useTheme();
  const { session, profile } = useAuth();
  const name = displayNameOf(profile?.display_name, session?.user.email);
  const since = profile
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '';

  const logOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Log out?', 'Your data stays in your account.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-6 px-4 pb-12 pt-2">
          <TopNav onBack={() => router.back()} title="settings" />

          <Pressable
            onPress={() => router.push('/settings/profile')}
            accessibilityRole="button"
            accessibilityLabel={`${name}, edit profile`}
            className="flex-row items-center gap-4 rounded-card bg-surface-card p-5 shadow-card active:bg-surface-inset"
          >
            <Avatar name={name} large />
            <View className="flex-1">
              <Text className="type-title text-text">{name}</Text>
              <Text className="type-subhead text-text-muted">member since {since}</Text>
            </View>
            <Icon name="chevron-right" size={size.iconMd} color={c.textMuted} />
          </Pressable>

          <SettingsGroup title="training">
            <SettingsRow
              label="training focus"
              value={profile ? FOCUS_LABEL[profile.focus] : ''}
              onPress={() => router.push('/settings/focus')}
            />
            <SettingsRow
              label="units"
              value={profile ? UNITS_LABEL[profile.unit_system] : ''}
              onPress={() => router.push('/settings/units')}
              last
            />
          </SettingsGroup>

          <SettingsGroup title="account">
            <SettingsRow label="log out" destructive onPress={logOut} last />
          </SettingsGroup>

          <Text className="text-center type-caption text-text-subtle">{session?.user.email}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
