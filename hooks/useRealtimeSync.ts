/**
 * useRealtimeSync — subscribes to Supabase Realtime changes for tables
 * where cross-device instant updates matter:
 *   - redemption_requests (parent approves → child sees ✅ immediately)
 *   - points_ledger       (points sync across devices)
 *   - prizes              (parent edits prize → child store updates)
 *
 * Mount this hook once in the root layout after hydration is complete.
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';
import type { PointsLedger, Prize, RedemptionRequest } from '@/lib/types';

export function useRealtimeSync() {
  const { userId } = useAuth();
  const isHydrated = useAppStore((s) => s.isHydrated);

  useEffect(() => {
    if (!userId || !isHydrated) return;

    const channel = supabase
      .channel(`family:${userId}`)

      // ── Redemption status changes ──────────────────────────────────────────
      // Fires when parent approves/denies a prize request on their device.
      // Child store updates immediately without polling.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'redemption_requests',
          filter: `clerk_user_id=eq.${userId}`,
        },
        async () => {
          const { data } = await supabase
            .from('redemption_requests')
            .select('*')
            .eq('clerk_user_id', userId)
            .order('requested_at', { ascending: true });
          if (data) {
            useAppStore.setState({
              redemptions: (data as Record<string, unknown>[]).map((r) => ({
                id:          r.id          as string,
                childId:     r.child_id    as string,
                prizeId:     r.prize_id    as string,
                prizeName:   r.prize_name  as string,
                pointCost:   r.point_cost  as number,
                status:      r.status      as RedemptionRequest['status'],
                requestedAt: r.requested_at as string,
                resolvedAt:  (r.resolved_at as string) ?? null,
              })) as RedemptionRequest[],
            });
          }
        },
      )

      // ── Points balance changes ─────────────────────────────────────────────
      // Fires when points update on either device.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_ledger',
          filter: `clerk_user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> | undefined }) => {
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
        },
      )

      // ── Prize catalog changes ──────────────────────────────────────────────
      // Fires when parent adds/edits/deletes a prize from settings.
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prizes',
          filter: `clerk_user_id=eq.${userId}`,
        },
        async () => {
          const { data } = await supabase
            .from('prizes')
            .select('*')
            .eq('clerk_user_id', userId)
            .order('created_at', { ascending: true });
          if (data) {
            useAppStore.setState({
              prizes: (data as Record<string, unknown>[]).map((p) => ({
                id:          p.id          as string,
                name:        p.name        as string,
                description: p.description as string,
                pointCost:   p.point_cost  as number,
                icon:        p.icon        as string,
                isActive:    p.is_active   as boolean,
                createdAt:   p.created_at  as string,
              })) as Prize[],
            });
          }
        },
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isHydrated]);
}
