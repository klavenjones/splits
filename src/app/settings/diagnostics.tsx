import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { Button, SafeAreaView, SettingsGroup, SettingsRow, SyncBadge, TopNav } from '@/components';
import { report, Sentry, sentryEnabled, sentryEnvironment } from '@/lib/sentry';
import { requestSync } from '@/local/syncService';
import { syncSummary } from '@/local/syncSummary';
import { useSyncOverview } from '@/workout/useSyncStatus';

/** Thrown on purpose by "test crash (JavaScript)"; the stack trace should point here. */
function throwTestCrash(): never {
  throw new Error('Splits test crash (JavaScript) from Settings → diagnostics');
}

const confirm = (title: string, body: string, onOk: () => void) =>
  Alert.alert(title, body, [
    { text: 'cancel', style: 'cancel' },
    { text: 'crash', style: 'destructive', onPress: onOk },
  ]);

/**
 * App version, error reporting status and sync status, plus test errors and crashes for
 * checking that reports (with readable stack traces) reach Sentry from a release build.
 */
export default function Diagnostics() {
  // Release builds from the production profile don't offer ways to crash the app.
  const canTest = __DEV__ || sentryEnvironment !== 'production';
  const overview = useSyncOverview();
  const sync = syncSummary(overview);
  const [note, setNote] = useState<string | null>(null);

  const testError = () => {
    report(new Error('Splits test error from Settings → diagnostics'), 'diagnostics');
    setNote(
      sentryEnabled
        ? 'Test error sent. It shows in Sentry within a minute.'
        : 'Error reporting is off in this build, so nothing was sent.',
    );
  };

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-6 px-4 pb-12 pt-2">
          <TopNav onBack={() => router.back()} title="diagnostics" />

          <SettingsGroup title="app">
            <SettingsRow label="version" value={Constants.expoConfig?.version ?? '–'} />
            <SettingsRow label="environment" value={sentryEnvironment} />
            <SettingsRow
              label="error reporting"
              value={sentryEnabled ? 'on' : __DEV__ ? 'off in development' : 'off'}
              last
            />
          </SettingsGroup>

          <SettingsGroup title="sync">
            <SettingsRow
              label={sync?.label ?? 'everything synced'}
              right={sync ? <SyncBadge status={sync.status} detail={sync.detail} /> : undefined}
              value={sync ? undefined : overview.online ? 'online' : 'offline'}
              onPress={sync ? () => requestSync(0) : undefined}
            />
            <SettingsRow label="last error" value={overview.lastError ?? 'none'} last />
          </SettingsGroup>

          {canTest ? (
            <>
              <View className="gap-2">
                <Text className="px-5 type-micro text-text-muted">test reports</Text>
                <Text className="px-1 type-caption text-text-muted">
                  Reports never include weights, reps, food, body or health data.
                </Text>
              </View>
              <View className="gap-3">
                <Button block variant="secondary" onPress={testError}>
                  send test error
                </Button>
                <Button
                  block
                  variant="destructive"
                  onPress={() =>
                    confirm(
                      'Crash Splits?',
                      'The app closes. Reopen it to send the report. Your workouts are saved on this phone.',
                      throwTestCrash,
                    )
                  }
                >
                  test crash (JavaScript)
                </Button>
                <Button
                  block
                  variant="destructive"
                  onPress={() =>
                    confirm(
                      'Crash Splits natively?',
                      'The app closes. Reopen it to send the report.',
                      () => Sentry.nativeCrash(),
                    )
                  }
                >
                  test crash (native)
                </Button>
              </View>
              {note ? <Text className="px-1 type-caption text-text-muted">{note}</Text> : null}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
