/**
 * Supabase client singleton — Expo + Clerk JWT auth.
 *
 * Uses @clerk/clerk-expo's getToken() to pass a Clerk-signed JWT to Supabase.
 * RLS policies read the `sub` claim from that JWT as the clerk_user_id.
 *
 * ONE-TIME SETUP REQUIRED:
 *
 * 1. Clerk Dashboard → JWT Templates → Create → "supabase"
 *    - Set signing key = your Supabase JWT secret (Settings > API > JWT Settings)
 *    - Template name must be exactly "supabase"
 *
 * 2. Supabase Dashboard → Settings > API > JWT Settings
 *    - Paste the same signing key used in Clerk
 *
 * 3. .env (add to your project root):
 *    EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 *    EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// ─── Token provider ──────────────────────────────────────────────────────────

type GetToken = (opts?: { template?: string }) => Promise<string | null>;

let _getToken: GetToken | null = null;

/**
 * Call once from app/_layout.tsx after Clerk is loaded.
 * Pass in the `getToken` function from useAuth().
 */
export function setClerkTokenProvider(fn: GetToken): void {
  _getToken = fn;
}

// ─── Supabase client ─────────────────────────────────────────────────────────

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      // Inject the Clerk JWT on every request so RLS can identify the user
      fetch: async (url, options = {}) => {
        const headers = new Headers(options.headers as HeadersInit | undefined);
        if (_getToken) {
          const token = await _getToken({ template: 'supabase' });
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        }
        return fetch(url, { ...options, headers });
      },
    },
  },
);

// ─── User ID helper ──────────────────────────────────────────────────────────

/**
 * Decode the Clerk JWT and return the `sub` claim (= clerk_user_id).
 * Returns null if no token provider is set or token cannot be decoded.
 */
export async function getClerkUserId(): Promise<string | null> {
  if (!_getToken) return null;
  try {
    const token = await _getToken({ template: 'supabase' });
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    // atob works in React Native (Hermes engine supports it)
    const decoded = JSON.parse(atob(payload)) as Record<string, unknown>;
    return (decoded.sub as string) ?? null;
  } catch {
    return null;
  }
}
