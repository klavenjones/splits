import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { completeLinkSignIn } from '@/auth';
import { Button } from '@/components';
import { useTheme } from '@/theme';

/** Landing route for the email link: exchanges `?code=` for a session, then hands off to the guards. */
export default function AuthCallback() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const error =
    params.error_description ??
    exchangeError ??
    (params.code ? null : 'This sign-in link is missing its code.');

  useEffect(() => {
    if (!params.code || params.error_description) return;
    completeLinkSignIn(params.code)
      .then(() => router.replace('/'))
      .catch((e) => setExchangeError(e instanceof Error ? e.message : String(e)));
  }, [params.code, params.error_description]);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-5">
      {error ? (
        <>
          <Text className="text-center type-title text-text">that link didn’t work</Text>
          <Text className="text-center type-body text-text-muted">
            {error} Try the code in the email instead.
          </Text>
          <Button onPress={() => router.replace('/')}>back to sign in</Button>
        </>
      ) : (
        <>
          <ActivityIndicator color={c.text} />
          <Text className="type-subhead text-text-muted">signing you in…</Text>
        </>
      )}
    </View>
  );
}
