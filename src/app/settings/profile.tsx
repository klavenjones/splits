import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useAuth } from '@/auth';
import { Button, TextField } from '@/components';
import { useUpdateProfile } from '@/db/queries/profile';

/** Edit display name. */
export default function EditProfile() {
  const { userId, profile } = useAuth();
  const update = useUpdateProfile(userId);
  const [name, setName] = useState(profile?.display_name ?? '');

  return (
    <View className="gap-5 bg-surface-card px-5 pt-6 pb-10">
      <Text className="type-title text-text" accessibilityRole="header">
        your name
      </Text>
      <TextField
        label="name"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        autoComplete="name"
        textContentType="givenName"
        maxLength={40}
        returnKeyType="done"
        error={update.error?.message}
      />
      <Button
        block
        loading={update.isPending}
        onPress={() =>
          update.mutate({ display_name: name.trim() || null }, { onSuccess: () => router.back() })
        }
      >
        save
      </Button>
    </View>
  );
}
