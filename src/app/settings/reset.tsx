import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, TextField } from '@/components';
import { exitWorkout } from '@/lib/nav';
import { confirmsReset, RESET_PHRASE } from '@/lib/resetTraining';
import { runResetTraining } from '@/lib/runResetTraining';

const DELETED = [
  'every workout and run you’ve logged, including planned ones',
  'a workout in progress, and anything on this phone that hasn’t synced yet',
  'your progress: PRs, bests and charts',
];
const KEPT = [
  'your templates and custom exercises',
  'food, weigh-ins and targets',
  'your profile and settings',
];

/** Wipes all training history after a typed confirmation. Irreversible. */
export default function ResetTraining() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = async () => {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      await runResetTraining(userId, qc);
      exitWorkout();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t reset. Try again.');
      setBusy(false);
    }
  };

  return (
    <View className="gap-5 bg-surface-card px-5 pt-6 pb-10">
      <View className="gap-2">
        <Text className="type-title text-text" accessibilityRole="header">
          reset training data
        </Text>
        <Text className="type-body text-text-muted">
          This can’t be undone. Apple Health runs from before now won’t come back.
        </Text>
      </View>

      <View className="gap-1.5">
        <Text className="type-label text-text">deletes</Text>
        {DELETED.map((d) => (
          <Text key={d} className="type-subhead text-text-muted">
            · {d}
          </Text>
        ))}
      </View>
      <View className="gap-1.5">
        <Text className="type-label text-text">keeps</Text>
        {KEPT.map((k) => (
          <Text key={k} className="type-subhead text-text-muted">
            · {k}
          </Text>
        ))}
      </View>

      <TextField
        label={`type ${RESET_PHRASE} to confirm`}
        value={text}
        onChangeText={setText}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        editable={!busy}
        error={error ?? undefined}
      />
      <Button
        block
        variant="destructive"
        loading={busy}
        disabled={!confirmsReset(text)}
        onPress={reset}
      >
        reset
      </Button>
    </View>
  );
}
