import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import {
  SafeAreaView,
  Avatar,
  displayNameOf,
  Icon,
  SettingsGroup,
  SettingsRow,
  SyncBadge,
  TopNav,
} from '@/components';

import { signOut, useAuth } from '@/auth';
import { useHealthConnected } from '@/health/connection';
import { useImportStatus } from '@/health/importStatus';
import { requestSync } from '@/local/syncService';
import { syncSummary } from '@/local/syncSummary';
import { useSyncOverview } from '@/workout/useSyncStatus';
import { FOCUS_LABEL } from '@/engine/focus';
import { size, useTheme } from '@/theme';

const UNITS_LABEL = { imperial: 'lb, mi', metric: 'kg, km' } as const;

/** Profile, sync status, training focus, units, connected apps, about, log out. */
export default function Settings() {
  const { c } = useTheme();
  const { session, profile } = useAuth();
  const name = displayNameOf(profile?.display_name, session?.user.email);
  const health = useHealthConnected(session?.user.id);
  const importFailed = useImportStatus().failed;
  const sync = syncSummary(useSyncOverview());
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

          {sync ? (
            <SettingsGroup title="sync">
              <SettingsRow
                label={sync.label}
                onPress={() => requestSync(0)}
                right={<SyncBadge status={sync.status} detail={sync.detail} />}
                last
              />
            </SettingsGroup>
          ) : null}

          <SettingsGroup title="training">
            <SettingsRow
              label="training focus"
              value={profile ? FOCUS_LABEL[profile.focus] : ''}
              onPress={() => router.push('/settings/focus')}
            />
            <SettingsRow
              label="goal and targets"
              onPress={() => router.push('/settings/nutrition')}
            />
            <SettingsRow
              label="units"
              value={profile ? UNITS_LABEL[profile.unit_system] : ''}
              onPress={() => router.push('/settings/units')}
              last
            />
          </SettingsGroup>

          {Platform.OS === 'ios' ? (
            <SettingsGroup title="connected apps">
              <SettingsRow
                label="Apple Health"
                value={!health ? 'off' : importFailed ? 'import failed' : 'connected'}
                onPress={() => router.push('/settings/health')}
                last
              />
            </SettingsGroup>
          ) : null}

          <SettingsGroup title="about">
            <SettingsRow label="credits" onPress={() => router.push('/settings/credits')} />
            <SettingsRow
              label="diagnostics"
              onPress={() => router.push('/settings/diagnostics')}
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
