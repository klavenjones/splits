import * as Linking from 'expo-linking';

import { supabase } from '@/db/client';

/**
 * Sign-in methods. Welcome renders a button for each enabled provider.
 * Apple and Google come later via `supabase.auth.signInWithIdToken` (Apple needs a dev build and the
 * paid Apple Developer Program): implement them here and flip the flag.
 */
export const AUTH_PROVIDERS = { email: true, apple: false, google: false } as const;
export type AuthProviderId = keyof typeof AUTH_PROVIDERS;

/** Where the email link lands: `splits://auth/callback` in builds, `exp://…/--/auth/callback` in Expo Go. */
export const authRedirectUrl = () => Linking.createURL('/auth/callback');

/**
 * Emails a one-time code (and a link) to `email`.
 * `createUser: false` for "log in", so a typo doesn't silently create a new account.
 */
export async function sendEmailCode(email: string, { createUser }: { createUser: boolean }) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: createUser, emailRedirectTo: authRedirectUrl() },
  });
  if (error) throw error;
}

/** Signs in with the code from the email. */
export async function verifyEmailCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
}

/** Finishes a sign-in started from the email link (PKCE `code` in the redirect URL). */
export async function completeLinkSignIn(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
