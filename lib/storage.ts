/**
 * Typed storage helpers — Supabase primary, AsyncStorage fallback.
 *
 * Strategy:
 *   WRITE: AsyncStorage first (instant, responsive), then Supabase (cross-device sync)
 *   READ:  Supabase first (fresh from other devices); fall back to AsyncStorage on error
 *
 * Exported function signatures are identical to the original AsyncStorage version
 * so the Zustand store (useAppStore.ts) needs zero changes.
 *
 * No mutation should touch storage outside of this file.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, getClerkUserId } from './supabase';
import type {
  AppState,
  ChildProfile,
  FlareLog,
  PointsLedger,
  Prize,
  RedemptionRequest,
  WatchConfig,
  WatchPhoto,
} from './types';

// ─── AsyncStorage keys (offline fallback) ────────────────────────────────────

const KEYS = {
  PROFILE:           'eczcalibur:profile',
  FLARE_LOGS:        'eczcalibur:flare_logs',
  PRIZES:            'eczcalibur:prizes',
  REDEMPTIONS:       'eczcalibur:redemptions',
  POINTS:            'eczcalibur:points',
  QUEST_COMPLETIONS: 'eczcalibur:quest_completions',
  WATCH_CONFIGS:     'eczcalibur:watch_configs',
} as const;

// ─── In-memory fallback (when AsyncStorage native module unavailable) ────────

const memStore = new Map<string, string>();

async function localRead<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw !== null) memStore.set(key, raw);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    const raw = memStore.get(key) ?? null;
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  }
}

async function localWrite<T>(key: string, value: T): Promise<void> {
  const serialized = JSON.stringify(value);
  memStore.set(key, serialized);
  try {
    await AsyncStorage.setItem(key, serialized);
  } catch {
    // data safe in memStore for this session
  }
}

async function localRemove(key: string): Promise<void> {
  memStore.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // no-op
  }
}

// ─── Row mappers: Supabase snake_case ↔ TypeScript camelCase ────────────────

function profileFromRow(row: Record<string, unknown>): ChildProfile {
  return {
    id:                  row.id as string,
    parentName:          (row.parent_name as string) ?? undefined,
    parentCallName:      (row.parent_call_name as string) ?? undefined,
    parentRelationship:  (row.parent_relationship as ChildProfile['parentRelationship']) ?? undefined,
    parentPhone:         (row.parent_phone as string) ?? undefined,
    name:                row.name as string,
    age:                 row.age as number,
    gender:              (row.gender as ChildProfile['gender']) ?? undefined,
    location:            row.location as string,
    diagnosis:           row.diagnosis as string,
    medications:         row.medications as ChildProfile['medications'],
    triggers:            row.triggers as string[],
    affectedAreas:       row.affected_areas as ChildProfile['affectedAreas'],
    actionPlan:          (row.action_plan as ChildProfile['actionPlan']) ?? null,
    onboardingComplete:  row.onboarding_complete as boolean,
    createdAt:           row.created_at as string,
    updatedAt:           row.updated_at as string,
  };
}

function profileToRow(profile: ChildProfile, clerkUserId: string): Record<string, unknown> {
  return {
    id:                  profile.id,
    clerk_user_id:       clerkUserId,
    parent_name:         profile.parentName ?? null,
    parent_call_name:    profile.parentCallName ?? null,
    parent_relationship: profile.parentRelationship ?? null,
    parent_phone:        profile.parentPhone ?? null,
    name:                profile.name,
    age:                 profile.age,
    gender:              profile.gender ?? null,
    location:            profile.location,
    diagnosis:           profile.diagnosis,
    medications:         profile.medications,
    triggers:            profile.triggers,
    affected_areas:      profile.affectedAreas,
    action_plan:         profile.actionPlan,
    onboarding_complete: profile.onboardingComplete,
    created_at:          profile.createdAt,
    updated_at:          profile.updatedAt,
  };
}

function flareLogFromRow(row: Record<string, unknown>): FlareLog {
  return {
    id:            row.id as string,
    childId:       row.child_id as string,
    timestamp:     row.timestamp as string,
    zone:          row.zone as FlareLog['zone'],
    moodScore:     row.mood_score as number,
    affectedAreas: row.affected_areas as FlareLog['affectedAreas'],
    notes:         row.notes as string,
    photoUri:      (row.photo_uri as string) ?? null,
    photoUris:     (row.photo_uris as string[]) ?? undefined,
    pointsAwarded: row.points_awarded as number,
  };
}

function flareLogToRow(log: FlareLog, clerkUserId: string): Record<string, unknown> {
  return {
    id:             log.id,
    clerk_user_id:  clerkUserId,
    child_id:       log.childId,
    timestamp:      log.timestamp,
    zone:           log.zone,
    mood_score:     log.moodScore,
    affected_areas: log.affectedAreas,
    notes:          log.notes,
    photo_uri:      log.photoUri,
    photo_uris:     log.photoUris ?? [],
    points_awarded: log.pointsAwarded,
  };
}

function prizeFromRow(row: Record<string, unknown>): Prize {
  return {
    id:          row.id as string,
    name:        row.name as string,
    description: row.description as string,
    pointCost:   row.point_cost as number,
    icon:        row.icon as string,
    isActive:    row.is_active as boolean,
    createdAt:   row.created_at as string,
  };
}

function prizeToRow(prize: Prize, clerkUserId: string): Record<string, unknown> {
  return {
    id:            prize.id,
    clerk_user_id: clerkUserId,
    name:          prize.name,
    description:   prize.description,
    point_cost:    prize.pointCost,
    icon:          prize.icon,
    is_active:     prize.isActive,
    created_at:    prize.createdAt,
  };
}

function redemptionFromRow(row: Record<string, unknown>): RedemptionRequest {
  return {
    id:          row.id as string,
    childId:     row.child_id as string,
    prizeId:     row.prize_id as string,
    prizeName:   row.prize_name as string,
    pointCost:   row.point_cost as number,
    status:      row.status as RedemptionRequest['status'],
    requestedAt: row.requested_at as string,
    resolvedAt:  (row.resolved_at as string) ?? null,
  };
}

function redemptionToRow(r: RedemptionRequest, clerkUserId: string): Record<string, unknown> {
  return {
    id:            r.id,
    clerk_user_id: clerkUserId,
    child_id:      r.childId,
    prize_id:      r.prizeId,
    prize_name:    r.prizeName,
    point_cost:    r.pointCost,
    status:        r.status,
    requested_at:  r.requestedAt,
    resolved_at:   r.resolvedAt,
  };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function readProfile(): Promise<ChildProfile | null> {
  const uid = await getClerkUserId();
  if (uid) {
    try {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('clerk_user_id', uid)
        .maybeSingle();
      if (!error && data) {
        const profile = profileFromRow(data as Record<string, unknown>);
        await localWrite(KEYS.PROFILE, profile);
        return profile;
      }
    } catch {
      // fall through to local
    }
  }
  return localRead<ChildProfile>(KEYS.PROFILE);
}

export async function writeProfile(profile: ChildProfile): Promise<void> {
  await localWrite(KEYS.PROFILE, profile);
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    await supabase
      .from('child_profiles')
      .upsert(profileToRow(profile, uid), { onConflict: 'clerk_user_id' });
  } catch {
    // local write succeeded — will sync on next online session
  }
}

export async function clearProfile(): Promise<void> {
  await localRemove(KEYS.PROFILE);
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    await supabase.from('child_profiles').delete().eq('clerk_user_id', uid);
  } catch {
    // no-op
  }
}

// ─── Flare Logs ──────────────────────────────────────────────────────────────

export async function readFlareLogs(): Promise<FlareLog[]> {
  const uid = await getClerkUserId();
  if (uid) {
    try {
      const { data, error } = await supabase
        .from('flare_logs')
        .select('*')
        .eq('clerk_user_id', uid)
        .order('timestamp', { ascending: true });
      if (!error && data) {
        const logs = (data as Record<string, unknown>[]).map(flareLogFromRow);
        await localWrite(KEYS.FLARE_LOGS, logs);
        return logs;
      }
    } catch {
      // fall through
    }
  }
  return (await localRead<FlareLog[]>(KEYS.FLARE_LOGS)) ?? [];
}

export async function writeFlareLogs(logs: FlareLog[]): Promise<void> {
  await localWrite(KEYS.FLARE_LOGS, logs);
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    // Full replacement — used for bulk ops like resetDailyLogs
    await supabase.from('flare_logs').delete().eq('clerk_user_id', uid);
    if (logs.length > 0) {
      await supabase.from('flare_logs').insert(logs.map((l) => flareLogToRow(l, uid)));
    }
  } catch {
    // local write succeeded
  }
}

/** Append a single log entry and persist. Returns the new full array. */
export async function appendFlareLog(log: FlareLog): Promise<FlareLog[]> {
  const existing = await readFlareLogs();
  const updated = [...existing, log];
  await localWrite(KEYS.FLARE_LOGS, updated);
  const uid = await getClerkUserId();
  if (uid) {
    try {
      await supabase.from('flare_logs').insert(flareLogToRow(log, uid));
    } catch {
      // local write succeeded
    }
  }
  return updated;
}

// ─── Prizes ──────────────────────────────────────────────────────────────────

export async function readPrizes(): Promise<Prize[]> {
  const uid = await getClerkUserId();
  if (uid) {
    try {
      const { data, error } = await supabase
        .from('prizes')
        .select('*')
        .eq('clerk_user_id', uid)
        .order('created_at', { ascending: true });
      if (!error && data) {
        const prizes = (data as Record<string, unknown>[]).map(prizeFromRow);
        await localWrite(KEYS.PRIZES, prizes);
        return prizes;
      }
    } catch {
      // fall through
    }
  }
  return (await localRead<Prize[]>(KEYS.PRIZES)) ?? [];
}

export async function writePrizes(prizes: Prize[]): Promise<void> {
  await localWrite(KEYS.PRIZES, prizes);
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    await supabase.from('prizes').delete().eq('clerk_user_id', uid);
    if (prizes.length > 0) {
      await supabase.from('prizes').insert(prizes.map((p) => prizeToRow(p, uid)));
    }
  } catch {
    // local write succeeded
  }
}

// ─── Redemptions ─────────────────────────────────────────────────────────────

export async function readRedemptions(): Promise<RedemptionRequest[]> {
  const uid = await getClerkUserId();
  if (uid) {
    try {
      const { data, error } = await supabase
        .from('redemption_requests')
        .select('*')
        .eq('clerk_user_id', uid)
        .order('requested_at', { ascending: true });
      if (!error && data) {
        const redemptions = (data as Record<string, unknown>[]).map(redemptionFromRow);
        await localWrite(KEYS.REDEMPTIONS, redemptions);
        return redemptions;
      }
    } catch {
      // fall through
    }
  }
  return (await localRead<RedemptionRequest[]>(KEYS.REDEMPTIONS)) ?? [];
}

export async function writeRedemptions(redemptions: RedemptionRequest[]): Promise<void> {
  await localWrite(KEYS.REDEMPTIONS, redemptions);
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    await supabase.from('redemption_requests').delete().eq('clerk_user_id', uid);
    if (redemptions.length > 0) {
      await supabase.from('redemption_requests').insert(
        redemptions.map((r) => redemptionToRow(r, uid)),
      );
    }
  } catch {
    // local write succeeded
  }
}

// ─── Points ──────────────────────────────────────────────────────────────────

const DEFAULT_POINTS: PointsLedger = { total: 0, earned: 0, spent: 0 };

export async function readPoints(): Promise<PointsLedger> {
  const uid = await getClerkUserId();
  if (uid) {
    try {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('clerk_user_id', uid)
        .maybeSingle();
      if (!error && data) {
        const points: PointsLedger = {
          total:  (data as Record<string, unknown>).total  as number,
          earned: (data as Record<string, unknown>).earned as number,
          spent:  (data as Record<string, unknown>).spent  as number,
        };
        await localWrite(KEYS.POINTS, points);
        return points;
      }
    } catch {
      // fall through
    }
  }
  return (await localRead<PointsLedger>(KEYS.POINTS)) ?? DEFAULT_POINTS;
}

export async function writePoints(points: PointsLedger): Promise<void> {
  await localWrite(KEYS.POINTS, points);
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    await supabase.from('points_ledger').upsert({
      clerk_user_id: uid,
      total:  points.total,
      earned: points.earned,
      spent:  points.spent,
    });
  } catch {
    // local write succeeded
  }
}

// ─── Quest Completions ───────────────────────────────────────────────────────

export type QuestCompletions = Partial<Record<'green' | 'yellow' | 'red', number[]>>;

export async function readQuestCompletions(): Promise<QuestCompletions> {
  const uid = await getClerkUserId();
  if (uid) {
    try {
      const { data, error } = await supabase
        .from('quest_completions')
        .select('completions')
        .eq('clerk_user_id', uid)
        .maybeSingle();
      if (!error && data) {
        const completions = (data as Record<string, unknown>).completions as QuestCompletions;
        await localWrite(KEYS.QUEST_COMPLETIONS, completions);
        return completions;
      }
    } catch {
      // fall through
    }
  }
  return (await localRead<QuestCompletions>(KEYS.QUEST_COMPLETIONS)) ?? {};
}

export async function writeQuestCompletions(completions: QuestCompletions): Promise<void> {
  await localWrite(KEYS.QUEST_COMPLETIONS, completions);
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    await supabase.from('quest_completions').upsert({ clerk_user_id: uid, completions });
  } catch {
    // local write succeeded
  }
}

// ─── Full hydration ──────────────────────────────────────────────────────────

// ─── Watch Configs ────────────────────────────────────────────────────────────

function watchConfigFromRow(row: Record<string, unknown>): WatchConfig {
  return {
    id:           row.id as string,
    childId:      row.child_id as string,
    area:         row.area as string,
    durationDays: row.duration_days as WatchConfig['durationDays'],
    startDate:    row.start_date as string,
    active:       row.active as boolean,
    createdAt:    row.created_at as string,
  };
}

function watchConfigToRow(config: WatchConfig, clerkUserId: string): Record<string, unknown> {
  return {
    id:            config.id,
    clerk_user_id: clerkUserId,
    child_id:      config.childId,
    area:          config.area,
    duration_days: config.durationDays,
    start_date:    config.startDate,
    active:        config.active,
    created_at:    config.createdAt,
  };
}

function watchPhotoFromRow(row: Record<string, unknown>): WatchPhoto {
  return {
    id:             row.id as string,
    watchConfigId:  row.watch_config_id as string,
    photoUrl:       row.photo_url as string,
    timestamp:      row.timestamp as string,
    area:           row.area as string,
    notes:          (row.notes as string) ?? null,
    createdAt:      row.created_at as string,
  };
}

function watchPhotoToRow(photo: WatchPhoto, clerkUserId: string): Record<string, unknown> {
  return {
    id:              photo.id,
    clerk_user_id:   clerkUserId,
    watch_config_id: photo.watchConfigId,
    photo_url:       photo.photoUrl,
    timestamp:       photo.timestamp,
    area:            photo.area,
    notes:           photo.notes ?? null,
    created_at:      photo.createdAt,
  };
}

export async function readWatchConfigs(): Promise<WatchConfig[]> {
  const uid = await getClerkUserId();
  if (uid) {
    try {
      const { data, error } = await supabase
        .from('watch_configs')
        .select('*')
        .eq('clerk_user_id', uid)
        .order('created_at', { ascending: false });
      if (!error && data) {
        const configs = (data as Record<string, unknown>[]).map(watchConfigFromRow);
        await localWrite(KEYS.WATCH_CONFIGS, configs);
        return configs;
      }
    } catch {
      // fall through
    }
  }
  return (await localRead<WatchConfig[]>(KEYS.WATCH_CONFIGS)) ?? [];
}

export async function saveWatchConfig(config: WatchConfig): Promise<void> {
  const uid = await getClerkUserId();
  const existing = await readWatchConfigs();
  const updated = existing.some((c) => c.id === config.id)
    ? existing.map((c) => (c.id === config.id ? config : c))
    : [...existing, config];
  await localWrite(KEYS.WATCH_CONFIGS, updated);
  if (!uid) return;
  try {
    await supabase
      .from('watch_configs')
      .upsert(watchConfigToRow(config, uid), { onConflict: 'id' });
  } catch {
    // local write succeeded
  }
}

export async function deactivateWatchConfig(id: string): Promise<void> {
  const uid = await getClerkUserId();
  const existing = await readWatchConfigs();
  const updated = existing.map((c) => (c.id === id ? { ...c, active: false } : c));
  await localWrite(KEYS.WATCH_CONFIGS, updated);
  if (!uid) return;
  try {
    await supabase
      .from('watch_configs')
      .update({ active: false })
      .eq('id', id)
      .eq('clerk_user_id', uid);
  } catch {
    // local write succeeded
  }
}

export async function deleteWatchConfig(id: string): Promise<void> {
  const uid = await getClerkUserId();
  const existing = await readWatchConfigs();
  const updated = existing.filter((c) => c.id !== id);
  await localWrite(KEYS.WATCH_CONFIGS, updated);
  if (!uid) return;
  try {
    await supabase
      .from('watch_configs')
      .delete()
      .eq('id', id)
      .eq('clerk_user_id', uid);
  } catch {
    // local delete succeeded
  }
}

export async function appendWatchPhoto(photo: WatchPhoto): Promise<void> {
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    await supabase.from('watch_photos').insert(watchPhotoToRow(photo, uid));
  } catch {
    // photos are Supabase-only — no local fallback (base64 is too large for AsyncStorage)
  }
}

export async function getWatchPhotos(watchConfigId: string): Promise<WatchPhoto[]> {
  const uid = await getClerkUserId();
  if (!uid) return [];
  try {
    const { data, error } = await supabase
      .from('watch_photos')
      .select('*')
      .eq('watch_config_id', watchConfigId)
      .eq('clerk_user_id', uid)
      .order('timestamp', { ascending: true });
    if (!error && data) {
      return (data as Record<string, unknown>[]).map(watchPhotoFromRow);
    }
  } catch {
    // no-op
  }
  return [];
}

/** Load all persisted state in parallel. Used at app launch to hydrate Zustand. */
export async function hydrateAll(): Promise<AppState> {
  const [profile, flareLogs, prizes, redemptions, points, watchConfigs] = await Promise.all([
    readProfile(),
    readFlareLogs(),
    readPrizes(),
    readRedemptions(),
    readPoints(),
    readWatchConfigs(),
  ]);
  return { profile, flareLogs, prizes, redemptions, points, watchConfigs };
}

/** Wipe all app data (sign-out / reset). */
export async function clearAll(): Promise<void> {
  memStore.clear();
  try {
    await Promise.all(Object.values(KEYS).map((k) => AsyncStorage.removeItem(k)));
  } catch {
    // no-op
  }
  const uid = await getClerkUserId();
  if (!uid) return;
  try {
    // Cascade from child_profiles cleans flare_logs, prizes, redemption_requests,
    // watch_configs, and watch_photos (all FK to clerk_user_id)
    await Promise.all([
      supabase.from('quest_completions').delete().eq('clerk_user_id', uid),
      supabase.from('points_ledger').delete().eq('clerk_user_id', uid),
      supabase.from('child_profiles').delete().eq('clerk_user_id', uid),
    ]);
  } catch {
    // no-op — local already cleared
  }
}
