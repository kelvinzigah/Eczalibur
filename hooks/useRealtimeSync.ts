/**
 * useRealtimeSync — subscribes to Supabase Realtime changes for tables
 * where cross-device instant updates matter:
 *   - flare_logs         (child logs → parent zone + count updates live)
 *   - redemption_requests (child redeems → parent sees pending; parent resolves → child sees result)
 *   - points_ledger      (points sync across devices)
 *   - prizes             (parent edits prize → child store updates)
 *
 * All callbacks use payload.new / payload.old directly — async re-fetches
 * are silently dropped by the Supabase realtime client which does not await
 * callback return values.
 *
 * Mount this hook once in the root layout after hydration is complete.
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { FlareLog, PointsLedger, Prize, RedemptionRequest } from '@/lib/types';

type Payload = { new: Record<string, unknown> | null; old: Record<string, unknown> | null };

function rowToFlareLog(r: Record<string, unknown>): FlareLog {
  return {
    id:            r.id            as string,
    childId:       r.child_id      as string,
    timestamp:     r.timestamp     as string,
    zone:          r.zone          as FlareLog['zone'],
    moodScore:     r.mood_score    as number,
    affectedAreas: r.affected_areas as FlareLog['affectedAreas'],
    notes:         (r.notes        as string) ?? '',
    photoUri:      (r.photo_uri    as string) ?? null,
    photoUris:     (r.photo_uris   as string[]) ?? undefined,
    pointsAwarded: r.points_awarded as number,
  };
}

function rowToRedemption(r: Record<string, unknown>): RedemptionRequest {
  return {
    id:          r.id           as string,
    childId:     r.child_id     as string,
    prizeId:     r.prize_id     as string,
    prizeName:   r.prize_name   as string,
    pointCost:   r.point_cost   as number,
    status:      r.status       as RedemptionRequest['status'],
    requestedAt: r.requested_at as string,
    resolvedAt:  (r.resolved_at as string) ?? null,
  };
}

function rowToPrize(r: Record<string, unknown>): Prize {
  return {
    id:          r.id          as string,
    name:        r.name        as string,
    description: r.description as string,
    pointCost:   r.point_cost  as number,
    icon:        r.icon        as string,
    isActive:    r.is_active   as boolean,
    createdAt:   r.created_at  as string,
  };
}

export function useRealtimeSync() {
  const { userId, getToken } = useAuth();
  const isHydrated = useAppStore((s) => s.isHydrated);

  useEffect(() => {
    if (!userId || !isHydrated) return;

    let cancelled = false;

    async function subscribe() {
      // Authenticate the WebSocket before subscribing so RLS allows events.
      const token = await getToken({ template: 'supabase' });
      if (cancelled) return;
      if (token) supabase.realtime.setAuth(token);

      supabase
        .channel(`family:${userId}`)

        // ── Flare log inserts ──────────────────────────────────────────────────
        // Child logs a flare → parent zone card + log count update immediately.
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'flare_logs',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          if (!payload.new) return;
          const log = rowToFlareLog(payload.new);
          useAppStore.setState((s) => ({ flareLogs: [...s.flareLogs, log] }));
        })

        // ── Redemption changes ─────────────────────────────────────────────────
        // INSERT: child requests prize → parent sees pending card.
        // UPDATE: parent approves/denies → child sees result.
        // DELETE: cleanup.
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'redemption_requests',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          if (!payload.new) return;
          const r = rowToRedemption(payload.new);
          useAppStore.setState((s) => ({
            redemptions: [...s.redemptions.filter((x) => x.id !== r.id), r],
          }));
        })

        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'redemption_requests',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          if (!payload.new) return;
          const r = rowToRedemption(payload.new);
          useAppStore.setState((s) => ({
            redemptions: s.redemptions.map((x) => (x.id === r.id ? r : x)),
          }));
        })

        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'redemption_requests',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          const id = payload.old?.id as string | undefined;
          if (!id) return;
          useAppStore.setState((s) => ({
            redemptions: s.redemptions.filter((x) => x.id !== id),
          }));
        })

        // ── Points balance ─────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'points_ledger',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          const row = payload.new;
          if (row) {
            useAppStore.setState({
              points: {
                total:  row.total  as number,
                earned: row.earned as number,
                spent:  row.spent  as number,
              } satisfies PointsLedger,
            });
          }
        })

        // ── Prize catalog ──────────────────────────────────────────────────────
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'prizes',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          if (!payload.new) return;
          const p = rowToPrize(payload.new);
          useAppStore.setState((s) => ({ prizes: [...s.prizes, p] }));
        })

        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'prizes',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          if (!payload.new) return;
          const p = rowToPrize(payload.new);
          useAppStore.setState((s) => ({
            prizes: s.prizes.map((x) => (x.id === p.id ? p : x)),
          }));
        })

        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'prizes',
          filter: `clerk_user_id=eq.${userId}`,
        }, (payload: Payload) => {
          const id = payload.old?.id as string | undefined;
          if (!id) return;
          useAppStore.setState((s) => ({
            prizes: s.prizes.filter((x) => x.id !== id),
          }));
        })

        .subscribe();
    }

    subscribe();

    return () => {
      cancelled = true;
      supabase.removeAllChannels();
    };
  }, [userId, isHydrated, getToken]);
}
