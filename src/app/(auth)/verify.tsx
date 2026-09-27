import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { sendEmailCode, verifyEmailCode } from '@/auth';
import { Button, StepScreen, TextField } from '@/components';

const RESEND_AFTER_S = 60;

/** Enter the emailed code. Signing in moves the app on to onboarding or Today by itself. */
export default function VerifyScreen() {
  const { email = '', mode } = useLocalSearchParams<{ email: string; mode?: 'signup' | 'login' }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER_S);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const digits = code.replace(/\D/g, '');
  const valid = digits.length >= 6;

  const verify = async () => {
    setError(null);
    setVerifying(true);
    try {
      await verifyEmailCode(email, digits);
      // The route guard takes it from here.
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(/expired|invalid/i.test(msg) ? 'That code is wrong or has expired.' : msg);
      setVerifying(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await sendEmailCode(email, { createUser: mode !== 'login' });
      setWait(RESEND_AFTER_S);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <StepScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      title="check your email"
      subtitle={`Enter the code we sent to ${email}. Or open the link in the email on this phone.`}
      footer={
        <>
          <Button block loading={verifying} disabled={!valid} onPress={verify}>
            continue
          </Button>
          <Button block variant="ghost" disabled={wait > 0} onPress={resend}>
            {wait > 0 ? `resend code in ${wait}s` : 'resend code'}
          </Button>
        </>
      }
    >
      <TextField
        label="code"
        large
        value={code}
        onChangeText={setCode}
        placeholder="123456"
        autoFocus
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={10}
        returnKeyType="done"
        onSubmitEditing={() => valid && verify()}
        error={error}
      />
      <Text className="px-1 type-caption text-text-muted">
        Codes expire after an hour. Check spam if it hasn’t arrived.
      </Text>
    </StepScreen>
  );
}
