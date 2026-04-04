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
  deactivateWatchConfig,
  deleteWatchConfig,
  hydrateAll,
  readQuestCompletions,
  saveWatchConfig,
  writeFlareLogs,
  writePoints,
  writePrizes,
  writeProfile,
  writeQuestCompletions,
  writeRedemptions,
  type QuestCompletions,
} from '@/lib/storage';
import type {
  ActionPlan,
  AppState,
  ChildProfile,
  FlareLog,
  PointsLedger,
  Prize,
  RedemptionRequest,
  WatchConfig,
  Zone,
} from '@/lib/types';

// ─── Store shape ──────────────────────────────────────────────────────────────

interface AppStore extends AppState {
  /** True once hydrateAll() has completed. */
  isHydrated: boolean;

  /** Persisted set of completed quest indices per zone. */
  questCompletions: Required<QuestCompletions>;

  // Lifecycle
  hydrate: () => Promise<void>;
  reset: () => Promise<void>;

  // Profile
  setProfile: (profile: ChildProfile) => Promise<void>;
  setActionPlan: (plan: ActionPlan) => Promise<void>;
  markOnboardingComplete: () => Promise<void>;

  // Flare logs
  addFlareLog: (log: FlareLog) => Promise<void>;
  resetDailyLogs: () => Promise<void>;

  // Points
  awardPoints: (amount: number) => Promise<void>;
  spendPoints: (amount: number) => Promise<void>;

  // Prizes
  setPrizes: (prizes: Prize[]) => Promise<void>;
  addPrize: (prize: Prize) => Promise<void>;
  updatePrize: (prizeId: string, updates: Partial<Pick<Prize, 'name' | 'description' | 'icon' | 'pointCost' | 'isActive'>>) => Promise<void>;
  removePrize: (prizeId: string) => Promise<void>;
  togglePrize: (prizeId: string, isActive: boolean) => Promise<void>;

  // Redemptions
  requestRedemption: (request: RedemptionRequest) => Promise<void>;
  resolveRedemption: (requestId: string, status: 'approved' | 'denied') => Promise<void>;

  // Quest completions
  completeQuest: (zone: Zone, questIndex: number) => Promise<void>;

  // Watch configs
  setWatchConfigs: (configs: WatchConfig[]) => void;
  addWatchConfig: (config: WatchConfig) => Promise<void>;
  deactivateWatch: (id: string) => Promise<void>;
  removeWatch: (id: string) => Promise<void>;

  // Derived helpers
  currentZone: () => Zone;
  activeWatch: () => WatchConfig | null;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const EMPTY_COMPLETIONS: Required<QuestCompletions> = { green: [], yellow: [], red: [] };

const INITIAL_STATE: AppState & { isHydrated: boolean; questCompletions: Required<QuestCompletions> } = {
  isHydrated: false,
  profile: null,
  flareLogs: [],
  prizes: [],
  redemptions: [],
  points: { total: 0, earned: 0, spent: 0 },
  watchConfigs: [],
  questCompletions: EMPTY_COMPLETIONS,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── Lifecycle ──

  async hydrate() {
    const [state, completions] = await Promise.all([hydrateAll(), readQuestCompletions()]);
    set({
      ...state,
      isHydrated: true,
      questCompletions: {
        green:  completions.green  ?? [],
        yellow: completions.yellow ?? [],
        red:    completions.red    ?? [],
      },
    });
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
    if (todayCount >= 15) return;
    const updated = await appendFlareLog(log);
    set({ flareLogs: updated });
  },

  async resetDailyLogs() {
    const today = new Date().toDateString();
    const updated = get().flareLogs.filter(
      (l) => new Date(l.timestamp).toDateString() !== today,
    );
    await writeFlareLogs(updated);
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

  async updatePrize(prizeId, updates) {
    const updated = get().prizes.map((p) =>
      p.id === prizeId ? { ...p, ...updates } : p,
    );
    await writePrizes(updated);
    set({ prizes: updated });
  },

  async removePrize(prizeId) {
    const updated = get().prizes.filter((p) => p.id !== prizeId);
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

  // ── Quest completions ──

  async completeQuest(zone, questIndex) {
    const prev = get().questCompletions;
    if (prev[zone].includes(questIndex)) return;
    const updated: Required<QuestCompletions> = {
      ...prev,
      [zone]: [...prev[zone], questIndex],
    };
    await writeQuestCompletions(updated);
    set({ questCompletions: updated });
  },

  // ── Watch configs ──

  setWatchConfigs(configs) {
    set({ watchConfigs: configs });
  },

  async addWatchConfig(config) {
    await saveWatchConfig(config);
    set({ watchConfigs: [...get().watchConfigs, config] });
  },

  async deactivateWatch(id) {
    await deactivateWatchConfig(id);
    set({
      watchConfigs: get().watchConfigs.map((c) =>
        c.id === id ? { ...c, active: false } : c,
      ),
    });
  },

  async removeWatch(id) {
    await deleteWatchConfig(id);
    set({ watchConfigs: get().watchConfigs.filter((c) => c.id !== id) });
  },

  // ── Derived ──

  currentZone(): Zone {
    const { flareLogs } = get();
    if (flareLogs.length === 0) return 'green';
    return flareLogs[flareLogs.length - 1].zone;
  },

  activeWatch(): WatchConfig | null {
    return get().watchConfigs.find((c) => c.active) ?? null;
  },
}));
