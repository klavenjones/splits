import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, Chip, ChipGroup, Dialog } from '@/components';
import { useSession, useShiftWeek, useSkipSession } from '@/db/queries/sessions';
import { closeOr } from '@/lib/nav';
import { SKIP_REASONS, type SkipReason } from '@/plan/week';

const close = () => closeOr('/plan');

/** Skip dialog: "just skip" (with an optional reason) or "shift the week". */
export default function SkipDialog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId } = useAuth();
  const session = useSession(id);
  const skip = useSkipSession(userId);
  const shift = useShiftWeek(userId);
  const [reason, setReason] = useState<SkipReason | null>(null);
  const name = session.data?.name ?? 'this session';
  const busy = skip.isPending || shift.isPending;
  const error = skip.error ?? shift.error;

  return (
    <Dialog onDismiss={close}>
      <Text className="type-title text-text" accessibilityRole="header">
        skip {name}?
      </Text>
      <View className="gap-2">
        <Text className="type-subhead text-text-muted">reason (optional)</Text>
        <ChipGroup label="reason">
          {SKIP_REASONS.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={reason === r}
              onPress={() => setReason(reason === r ? null : r)}
            />
          ))}
        </ChipGroup>
      </View>
      {error ? <Text className="type-caption text-danger-text">{error.message}</Text> : null}
      <Button
        block
        loading={skip.isPending}
        disabled={busy}
        onPress={() => skip.mutate({ id, reason }, { onSuccess: close })}
      >
        just skip
      </Button>
      <View className="gap-1.5">
        <Button
          block
          variant="secondary"
          loading={shift.isPending}
          disabled={busy}
          onPress={() => shift.mutate(id, { onSuccess: close })}
        >
          shift the week
        </Button>
        <Text className="text-center type-caption text-text-muted">
          Moves this and the rest of the week’s sessions a day later.
        </Text>
      </View>
      <Button block variant="ghost" disabled={busy} onPress={close}>
        cancel
      </Button>
    </Dialog>
  );
}
