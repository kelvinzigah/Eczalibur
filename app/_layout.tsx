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

function StoreHydrator() {
  const hydrate = useAppStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  return null;
}

/** Registers the Clerk token provider with the Supabase client once on mount. */
function SupabaseTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setClerkTokenProvider(getToken);
  }, [getToken]);
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
          <StoreHydrator />
          <SupabaseTokenSync />
          <RealtimeSync />
          <Slot />
        </ClerkLoaded>
      </ClerkProvider>
    </ThemeProvider>
  );
}
