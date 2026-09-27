import './storage';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  );
}

// Static web rendering runs in Node, which has no usable session storage (Node 25's global
// localStorage exists but is unusable without a file). There's no session to keep there anyway.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // Native: expo-sqlite's localStorage (see storage.native.ts). Web: the browser's.
    storage: isServer ? undefined : globalThis.localStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
    // Email links carry a `code` that src/app/auth/callback.tsx exchanges for a session.
    flowType: 'pkce',
  },
});

// Refresh tokens only while the app is in the foreground (native only).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
