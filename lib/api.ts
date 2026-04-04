/**
 * Centralized API fetch wrapper.
 *
 * When EXPO_PUBLIC_API_BASE_URL is set, calls the FastAPI backend on Fly.io
 * and attaches the Clerk RS256 session token as Authorization header.
 *
 * When absent, falls back to the local Expo +api.ts routes (no auth header
 * needed — they run server-side in the same process).
 *
 * Usage:
 *   const res = await apiFetch('/generate-plan', body);
 */

import { getClerkTokenFn } from './clerkToken';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export async function apiFetch(path: string, body: unknown): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  let url: string;

  if (API_BASE) {
    // External FastAPI backend — attach Clerk default session token (RS256)
    url = `${API_BASE}${path}`;
    const getToken = getClerkTokenFn();
    if (getToken) {
      const token = await getToken(); // no template → RS256 default session token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } else {
    // Local Expo API route fallback
    url = `/api${path}`;
  }

  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}
