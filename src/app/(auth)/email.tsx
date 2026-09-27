import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { sendEmailCode } from '@/auth';
import { Button, StepScreen, TextField } from '@/components';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign up or log in: ask for an email and send a one-time code. */
export default function EmailScreen() {
  const { mode } = useLocalSearchParams<{ mode?: 'signup' | 'login' }>();
  const login = mode === 'login';
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const valid = EMAIL.test(email.trim());

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      await sendEmailCode(email, { createUser: !login });
      router.push({
        pathname: '/verify',
        params: { email: email.trim().toLowerCase(), mode: login ? 'login' : 'signup' },
      });
    } catch (e) {
      setError(messageFor(e, login));
    } finally {
      setSending(false);
    }
  };

  return (
    <StepScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      title={login ? 'log in' : 'sign up'}
      subtitle="We'll email you a code. No password needed."
      footer={
        <Button block loading={sending} disabled={!valid} onPress={send}>
          send code
        </Button>
      }
    >
      <TextField
        label="email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={() => valid && send()}
        error={error}
      />
      {login ? (
        <Text className="px-1 type-subhead text-text-muted">
          New here?{' '}
          <Text
            className="font-body-bold text-text underline"
            accessibilityRole="link"
            onPress={() => router.setParams({ mode: 'signup' })}
          >
            Sign up
          </Text>
        </Text>
      ) : null}
    </StepScreen>
  );
}

function messageFor(e: unknown, login: boolean): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (login && /signups? not allowed|user not found/i.test(msg)) {
    return 'No account with that email yet. Sign up instead.';
  }
  if (/rate limit|too many|security purposes/i.test(msg)) {
    return 'Too many emails sent. Wait a minute and try again.';
  }
  return msg;
}
