import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import { Slot } from 'expo-router';
import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ThemeProvider } from '@/context/ThemeContext';
import { setClerkTokenProvider } from '@/lib/supabase';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set in .env');
}

/**
 * Sets the Clerk token provider on the Supabase client, then hydrates the
 * Zustand store. Token must be registered before hydrate() so Supabase reads
 * fire with a valid JWT on Device 2 (fresh install / new login).
 */
function AppBootstrap() {
  const { getToken } = useAuth();
  const hydrate = useAppStore((s) => s.hydrate);
  useEffect(() => {
    setClerkTokenProvider(getToken);
    hydrate();
  }, [getToken, hydrate]);
  return null;
}

/** Subscribes to Supabase Realtime; no-ops until store is hydrated. */
function RealtimeSync() {
  useRealtimeSync();
  return null;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <AppBootstrap />
          <RealtimeSync />
          <Slot />
        </ClerkLoaded>
      </ClerkProvider>
    </ThemeProvider>
  );
}
