import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/db/client';
import { useProfile } from '@/db/queries/profile';
import type { Tables } from '@/db/types';

export type AuthStatus = 'loading' | 'signedOut' | 'onboarding' | 'ready';

type AuthState = {
  session: Session | null;
  userId: string | undefined;
  profile: Tables<'users'> | undefined;
  /**
   * Where the app belongs. Never goes back to 'loading' once settled: while the profile loads
   * after a sign-in, the previous status holds so the route guards don't flicker.
   */
  status: AuthStatus;
};

const AuthContext = createContext<AuthState | null>(null);

/** Session (persisted by supabase-js) plus the `users` row that decides where the app opens. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data, error }) =>
        setSession(
          data.session ?? (error && isAuthRetryableFetchError(error) ? storedSession() : null),
        ),
      );
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') qc.clear();
    });
    return () => data.subscription.unsubscribe();
  }, [qc]);

  const userId = session?.user.id;
  const profile = useProfile(userId);

  let next: AuthStatus;
  if (session === undefined) next = 'loading';
  else if (session === null) next = 'signedOut';
  else if (profile.isPending) next = 'loading';
  else if (profile.data?.onboarding_completed_at) next = 'ready';
  // Offline with nothing cached: keep where we are rather than guess "onboarding".
  else if (profile.isError) next = 'loading';
  else next = 'onboarding';

  const [status, setStatus] = useState<AuthStatus>('loading');
  if (next !== 'loading' && next !== status) setStatus(next);

  return (
    <AuthContext.Provider
      value={{ session: session ?? null, userId, profile: profile.data, status }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * The session supabase-js stored, read directly. Used only when the token has expired and can't be
 * refreshed because there's no connection: the app still knows who you are and works offline
 * (the live workout, cached data), and supabase-js refreshes the token once you're back online.
 */
function storedSession(): Session | null {
  try {
    const key = (supabase.auth as unknown as { storageKey: string }).storageKey;
    const raw = (globalThis as { localStorage?: Storage }).localStorage?.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as Session | { currentSession?: Session }) : null;
    if (!parsed) return null;
    return 'currentSession' in parsed ? (parsed.currentSession ?? null) : (parsed as Session);
  } catch {
    return null;
  }
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
