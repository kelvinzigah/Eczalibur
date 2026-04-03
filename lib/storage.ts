/**
 * Typed AsyncStorage helpers.
 *
 * All reads are async. This module is the single point of contact with
 * AsyncStorage — Zustand is the in-memory cache and should be read everywhere
 * else in the app. AsyncStorage is only hit:
 *   - On app launch (hydration in useAppStore)
 *   - On mutations (write-through from store actions)
 *
 * Falls back to an in-memory Map when the AsyncStorage native module is
 * unavailable (e.g. RN/Expo Go version mismatch during development).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState, ChildProfile, FlareLog, PointsLedger, Prize, RedemptionRequest } from './types';

// ─── Storage Keys ────────────────────────────────────────────────────────────

const KEYS = {
  PROFILE: 'eczcalibur:profile',
  FLARE_LOGS: 'eczcalibur:flare_logs',
  PRIZES: 'eczcalibur:prizes',
  REDEMPTIONS: 'eczcalibur:redemptions',
  POINTS: 'eczcalibur:points',
  QUEST_COMPLETIONS: 'eczcalibur:quest_completions',
} as const;

// ─── Memory fallback ──────────────────────────────────────────────────────────

const memStore = new Map<string, string>();

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw !== null) memStore.set(key, raw); // keep in sync
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    const raw = memStore.get(key) ?? null;
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }
}

async function write<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  memStore.set(key, serialized); // always write to memory first
  try {
    await AsyncStorage.setItem(key, serialized);
  } catch {
    // silently fall through — data is safe in memStore for this session
  }
}

async function remove(key: string): Promise<void> {
  memStore.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // no-op
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function readProfile(): Promise<ChildProfile | null> {
  return read<ChildProfile>(KEYS.PROFILE);
}

export async function writeProfile(profile: ChildProfile): Promise<void> {
  return write(KEYS.PROFILE, profile);
}

export async function clearProfile(): Promise<void> {
  return remove(KEYS.PROFILE);
}

// ─── Flare Logs ──────────────────────────────────────────────────────────────

export async function readFlareLogs(): Promise<FlareLog[]> {
  return (await read<FlareLog[]>(KEYS.FLARE_LOGS)) ?? [];
}

export async function writeFlareLogs(logs: FlareLog[]): Promise<void> {
  return write(KEYS.FLARE_LOGS, logs);
}

/** Append a single log entry and persist. Returns the new full array. */
export async function appendFlareLog(log: FlareLog): Promise<FlareLog[]> {
  const existing = await readFlareLogs();
  const updated = [...existing, log];
  await writeFlareLogs(updated);
  return updated;
}

// ─── Prizes ──────────────────────────────────────────────────────────────────

export async function readPrizes(): Promise<Prize[]> {
  return (await read<Prize[]>(KEYS.PRIZES)) ?? [];
}

export async function writePrizes(prizes: Prize[]): Promise<void> {
  return write(KEYS.PRIZES, prizes);
}

// ─── Redemptions ─────────────────────────────────────────────────────────────

export async function readRedemptions(): Promise<RedemptionRequest[]> {
  return (await read<RedemptionRequest[]>(KEYS.REDEMPTIONS)) ?? [];
}

export async function writeRedemptions(redemptions: RedemptionRequest[]): Promise<void> {
  return write(KEYS.REDEMPTIONS, redemptions);
}

// ─── Points ──────────────────────────────────────────────────────────────────

const DEFAULT_POINTS: PointsLedger = { total: 0, earned: 0, spent: 0 };

export async function readPoints(): Promise<PointsLedger> {
  return (await read<PointsLedger>(KEYS.POINTS)) ?? DEFAULT_POINTS;
}

export async function writePoints(points: PointsLedger): Promise<void> {
  return write(KEYS.POINTS, points);
}

// ─── Quest Completions ────────────────────────────────────────────────────────

export type QuestCompletions = Partial<Record<'green' | 'yellow' | 'red', number[]>>;

export async function readQuestCompletions(): Promise<QuestCompletions> {
  return (await read<QuestCompletions>(KEYS.QUEST_COMPLETIONS)) ?? {};
}

export async function writeQuestCompletions(completions: QuestCompletions): Promise<void> {
  return write(KEYS.QUEST_COMPLETIONS, completions);
}

// ─── Full hydration ───────────────────────────────────────────────────────────

/** Load all persisted state in parallel. Used at app launch to hydrate Zustand. */
export async function hydrateAll(): Promise<AppState> {
  const [profile, flareLogs, prizes, redemptions, points] = await Promise.all([
    readProfile(),
    readFlareLogs(),
    readPrizes(),
    readRedemptions(),
    readPoints(),
  ]);

  return { profile, flareLogs, prizes, redemptions, points };
}

/** Wipe all app data (useful for sign-out / reset). */
export async function clearAll(): Promise<void> {
  memStore.clear();
  try {
    await Promise.all(Object.values(KEYS).map((k) => AsyncStorage.removeItem(k)));
  } catch {
    // no-op
  }
}
