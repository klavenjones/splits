import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, SafeAreaView, SettingsGroup, SettingsRow, TopNav } from '@/components';
import {
  backgroundGranted,
  connectHealth,
  disconnectHealth,
  fetchIntegration,
  importNow,
  useHealthConnected,
} from '@/health/connection';
import { addSampleRun, isAvailable } from '@/health/healthkit';

const ago = (iso: string) => {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/** Apple Health: connect, see the last import, import now, disconnect. */
export default function HealthSettings() {
  const { userId, profile } = useAuth();
  const units = profile?.unit_system ?? 'imperial';
  const connected = useHealthConnected(userId);
  const available = isAvailable();
  const integration = useQuery({
    queryKey: ['integration', userId],
    enabled: !!userId,
    queryFn: () => fetchIntegration(userId!),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const act = (name: string, fn: () => Promise<string | null | void>) => async () => {
    setBusy(name);
    setNote(null);
    try {
      const msg = await fn();
      if (msg) setNote(msg);
      await integration.refetch();
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const connect = act('connect', async () => {
    const { background } = await connectHealth(userId!);
    const r = await importNow(userId!, units);
    return `${r ? `Imported ${r.runs} run${r.runs === 1 ? '' : 's'}. ` : ''}${
      background ? '' : 'New runs import when you open Splits.'
    }`;
  });
  const sync = act('sync', async () => {
    const r = await importNow(userId!, units);
    return r
      ? `${r.runs} new run${r.runs === 1 ? '' : 's'}, ${r.weights} weight${r.weights === 1 ? '' : 's'}.`
      : null;
  });
  const disconnect = () =>
    Alert.alert(
      'Disconnect Apple Health?',
      'Runs already imported stay. To remove Splits’ access fully, use the Health app.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'disconnect',
          style: 'destructive',
          onPress: act('disconnect', () => disconnectHealth(userId!)),
        },
      ],
    );

  const sample = (hour: number, miles: number) =>
    act('sample', async () => {
      const start = new Date();
      start.setHours(hour, hour === 6 ? 10 : 45, 0, 0);
      await addSampleRun({ start, meters: miles * 1609.344, pace: 352, kg: 92.4 });
      return `Added a ${miles} mi run at ${start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`;
    });

  const last = integration.data?.last_synced_at;
  const bg = backgroundGranted(userId);

  return (
    <View className="flex-1 bg-bg">
      <SafeAreaView edges={['top']} className="flex-1">
        <ScrollView contentContainerClassName="gap-6 px-4 pb-12 pt-2">
          <TopNav onBack={() => router.back()} title="Apple Health" />
          <Text className="px-1 type-body text-text-muted">
            Splits reads runs from your Apple Watch (with distance and heart rate) and your weight.
            It never writes to Health.
          </Text>

          {!available ? (
            <Text className="px-1 type-body text-text-muted">
              Apple Health isn’t available here. It needs the Splits app on an iPhone (not Expo Go).
            </Text>
          ) : (
            <>
              <SettingsGroup title="status">
                <SettingsRow label="connection" value={connected ? 'connected' : 'not connected'} />
                <SettingsRow label="last import" value={last && connected ? ago(last) : '–'} />
                <SettingsRow
                  label="while Splits is closed"
                  value={!connected || bg === null ? '–' : bg ? 'imports' : 'when you open Splits'}
                  last
                />
              </SettingsGroup>
              {connected ? (
                <View className="gap-3">
                  <Button block icon="undo" loading={busy === 'sync'} onPress={sync}>
                    import now
                  </Button>
                  <Button
                    block
                    variant="secondary"
                    loading={busy === 'disconnect'}
                    onPress={disconnect}
                  >
                    disconnect
                  </Button>
                </View>
              ) : (
                <Button block variant="run" loading={busy === 'connect'} onPress={connect}>
                  connect Apple Health
                </Button>
              )}
              {note ? <Text className="px-1 type-caption text-text-muted">{note}</Text> : null}

              {__DEV__ ? (
                <SettingsGroup title="development">
                  <SettingsRow label="add a 4.1 mi run this morning" onPress={sample(6, 4.1)} />
                  <SettingsRow
                    label="add a 3.2 mi run this evening"
                    onPress={sample(17, 3.2)}
                    last
                  />
                </SettingsGroup>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
