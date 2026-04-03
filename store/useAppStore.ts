/**
 * Zustand store — in-memory cache for all app state.
 *
 * Pattern:
 *   - Read state: use the store directly (synchronous, no await)
 *   - Mutations: store actions write to AsyncStorage, then update in-memory state
 *   - App launch: call store.hydrate() once to load from AsyncStorage
 *
 * No mutation should touch AsyncStorage outside of this file.
 */

import { create } from 'zustand';
import {
  appendFlareLog,
  clearAll,
  hydrateAll,
  writePoints,
  writePrizes,
  writeProfile,
  writeRedemptions,
} from '@/lib/storage';
import type {
  ActionPlan,
  AppState,
  ChildProfile,
  FlareLog,
  PointsLedger,
  Prize,
  RedemptionRequest,
  Zone,
} from '@/lib/types';

// ─── Store shape ──────────────────────────────────────────────────────────────

interface AppStore extends AppState {
  /** True once hydrateAll() has completed. */
  isHydrated: boolean;

  // Lifecycle
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;

  // Profile
  setProfile: (profile: ChildProfile) => Promise<void>;
  setActionPlan: (plan: ActionPlan) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;

  // Flare logs
  addFlareLog: (log: FlareLog) => Promise<void>;

  // Points
  awardPoints: (amount: number) => Promise<void>;
  spendPoints: (amount: number) => Promise<void>;

  // Prizes
  setPrizes: (prizes: Prize[]) => Promise<void>;
  addPrize: (prize: Prize) => Promise<void>;
  togglePrize: (prizeId: string, isActive: boolean) => Promise<void>;

  // Redemptions
  requestRedemption: (request: RedemptionRequest) => Promise<void>;
  resolveRedemption: (requestId: string, status: 'approved' | 'denied') => Promise<void>;

  // Derived helpers
  currentZone: () => Zone;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: AppState & { isHydrated: boolean } = {
  isHydrated: false,
  profile: null,
  flareLogs: [],
  prizes: [],
  redemptions: [],
  points: { total: 0, earned: 0, spent: 0 },
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── Lifecycle ──

  async hydrate() {
    const state = await hydrateAll();
    set({ ...state, isHydrated: true });
  },

  async reset() {
    await clearAll();
    set({ ...INITIAL_STATE, isHydrated: true });
  },

  // ── Profile ──

  async setProfile(profile) {
    await writeProfile(profile);
    set({ profile });
  },

  async setActionPlan(plan) {
    const { profile } = get();
    if (!profile) return;
    const updated: ChildProfile = { ...profile, actionPlan: plan, updatedAt: new Date().toISOString() };
    await writeProfile(updated);
    set({ profile: updated });
  },

  async markOnboardingComplete() {
    const { profile } = get();
    if (!profile) return;
    const updated: ChildProfile = { ...profile, onboardingComplete: true, updatedAt: new Date().toISOString() };
    await writeProfile(updated);
    set({ profile: updated });
  },

  // ── Flare logs ──

  async addFlareLog(log) {
    const today = new Date().toDateString();
    const todayCount = get().flareLogs.filter(
      (l) => new Date(l.timestamp).toDateString() === today,
    ).length;
    if (todayCount >= 3) return;
    const updated = await appendFlareLog(log);
    set({ flareLogs: updated });
  },

  // ── Points ──

  async awardPoints(amount) {
    const prev = get().points;
    const updated: PointsLedger = {
      earned: prev.earned + amount,
      spent: prev.spent,
      total: prev.total + amount,
    };
    await writePoints(updated);
    set({ points: updated });
  },

  async spendPoints(amount) {
    const prev = get().points;
    const updated: PointsLedger = {
      earned: prev.earned,
      spent: prev.spent + amount,
      total: prev.total - amount,
    };
    await writePoints(updated);
    set({ points: updated });
  },

  // ── Prizes ──

  async setPrizes(prizes) {
    await writePrizes(prizes);
    set({ prizes });
  },

  async addPrize(prize) {
    const updated = [...get().prizes, prize];
    await writePrizes(updated);
    set({ prizes: updated });
  },

  async togglePrize(prizeId, isActive) {
    const updated = get().prizes.map((p) =>
      p.id === prizeId ? { ...p, isActive } : p,
    );
    await writePrizes(updated);
    set({ prizes: updated });
  },

  // ── Redemptions ──

  async requestRedemption(request) {
    const updated = [...get().redemptions, request];
    await writeRedemptions(updated);
    set({ redemptions: updated });
  },

  async resolveRedemption(requestId, status) {
    const updated = get().redemptions.map((r) =>
      r.id === requestId
        ? { ...r, status, resolvedAt: new Date().toISOString() }
        : r,
    );
    await writeRedemptions(updated);
    set({ redemptions: updated });
  },

  // ── Derived ──

  currentZone(): Zone {
    const { flareLogs } = get();
    if (flareLogs.length === 0) return 'green';
    return flareLogs[flareLogs.length - 1].zone;
  },
}));
