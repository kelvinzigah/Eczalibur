/**
 * Shared Clerk token provider.
 *
 * Extracted from lib/supabase.ts so both supabase.ts and lib/api.ts
 * can import it without circular dependencies.
 */

type GetToken = (opts?: { template?: string }) => Promise<string | null>;

let _getToken: GetToken | null = null;

/**
 * Call once from app/_layout.tsx after Clerk is loaded.
 * Pass in the `getToken` function from useAuth().
 */
export function setClerkTokenProvider(fn: GetToken): void {
  _getToken = fn;
}

/**
 * Returns the raw getToken function, or null if not yet set.
 * Used internally by supabase.ts and api.ts.
 */
export function getClerkTokenFn(): GetToken | null {
  return _getToken;
}

/**
 * Decode the Clerk JWT and return the `sub` claim (= clerk_user_id).
 * Returns null if no token provider is set or token cannot be decoded.
 * Uses the "supabase" template (HS256) for Supabase RLS.
 */
export async function getClerkUserId(): Promise<string | null> {
  if (!_getToken) return null;
  try {
    const token = await _getToken({ template: 'supabase' });
    if (!token) return null;
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload)) as Record<string, unknown>;
    return (decoded.sub as string) ?? null;
  } catch {
    return null;
  }
}
