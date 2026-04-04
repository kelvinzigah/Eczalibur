import * as ExpoCrypto from 'expo-crypto';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BG, overlayColor } from '@/constants/backgrounds';
import { useAppStore } from '@/store/useAppStore';
import type { Prize, RedemptionRequest } from '@/lib/types';

export default function StoreScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isHydrated, prizes, points, redemptions, profile, requestRedemption, spendPoints } =
    useAppStore();
  const [redeeming, setRedeeming] = useState<string | null>(null);

  if (!isHydrated || !profile) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator color={theme.gold} size="large" />
      </View>
    );
  }

  const activePrizes = prizes.filter((p) => p.isActive);
  const todayStr = new Date().toDateString();

  type PrizeStatus = 'available' | 'pending' | 'approved' | 'denied-retryable' | 'denied-locked';

  function getPrizeStatus(prizeId: string): PrizeStatus {
    const todayRecords = redemptions.filter(
      (r) => r.prizeId === prizeId && new Date(r.requestedAt).toDateString() === todayStr,
    );
    if (todayRecords.some((r) => r.status === 'approved')) return 'approved';
    const deniedCount = todayRecords.filter((r) => r.status === 'denied').length;
    if (deniedCount >= 3) return 'denied-locked';
    if (todayRecords.some((r) => r.status === 'pending')) return 'pending';
    if (deniedCount > 0) return 'denied-retryable';
    return 'available';
  }

  async function handleRedeem(prize: Prize) {
    if (!profile) return;
    if (points.total < prize.pointCost) {
      Alert.alert(
        'Not enough gold',
        `You need 🪙 ${prize.pointCost} but only have 🪙 ${points.total}. Keep completing quests to earn more!`,
      );
      return;
    }
    // Guard against double-pending
    if (redemptions.some((r) => r.prizeId === prize.id && r.status === 'pending')) {
      Alert.alert('Already requested', 'This prize request is waiting for parent approval.');
      return;
    }

    setRedeeming(prize.id);
    try {
      const request: RedemptionRequest = {
        id: ExpoCrypto.randomUUID(),
        childId: profile.id,
        prizeId: prize.id,
        prizeName: prize.name,
        pointCost: prize.pointCost,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        resolvedAt: null,
      };
      await requestRedemption(request);
      await spendPoints(prize.pointCost);
      Alert.alert('Request sent! 🎉', `Your parent will approve "${prize.name}" soon.`);
    } finally {
      setRedeeming(null);
    }
  }

  return (
    <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />

      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bgNav }]}>
        <TouchableOpacity onPress={toggleTheme}>
          <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.gold }]}>PRIZE STORE</Text>
        <View style={[styles.goldBadge, { borderColor: theme.gold }]}>
          <Text style={[styles.goldText, { color: theme.gold }]}>🪙 {points.total}</Text>
        </View>
      </View>

      {/* Prizes list */}
      {activePrizes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎁</Text>
          <Text style={[styles.emptyTitle, { color: theme.gold }]}>No prizes yet</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textMuted }]}>
            Ask your parent to add prizes in the dashboard!
          </Text>
        </View>
      ) : (
        <FlatList
          data={activePrizes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const status = getPrizeStatus(item.id);
            const canAfford = points.total >= item.pointCost;
            const isLoading = redeeming === item.id;
            const isLocked = status === 'approved' || status === 'denied-locked';
            const isDisabled = isLocked || status === 'pending' || !canAfford || isLoading;

            const BUTTON: Record<PrizeStatus, { label: string; bg: string; fg: string }> = {
              available:        { label: 'Redeem',       bg: canAfford ? theme.gold : theme.bgSurface, fg: canAfford ? theme.bgNav : theme.textMuted },
              pending:          { label: '⏳ Pending',   bg: theme.bgSurface, fg: theme.textMuted },
              approved:         { label: '✅ Approved',  bg: 'rgba(74,222,128,0.15)', fg: theme.zoneGreen },
              'denied-retryable': { label: '❌ Try Again', bg: 'rgba(239,68,68,0.15)', fg: '#ef4444' },
              'denied-locked':  { label: '❌ Denied',    bg: theme.bgSurface, fg: theme.textMuted },
            };
            const btn = BUTTON[status];

            const cardBorderColor =
              status === 'approved' ? theme.zoneGreen :
              status === 'denied-locked' ? '#ef4444' :
              theme.border;

            return (
              <View
                style={[
                  styles.prizeCard,
                  { backgroundColor: theme.bgCard, borderColor: cardBorderColor },
                ]}
              >
                <Text style={styles.prizeIcon}>{item.icon}</Text>
                <View style={styles.prizeInfo}>
                  <Text style={[styles.prizeName, { color: theme.textPrimary }]}>{item.name}</Text>
                  {item.description ? (
                    <Text style={[styles.prizeDesc, { color: theme.textMuted }]}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.prizeCost, { color: canAfford ? theme.gold : theme.textMuted }]}>
                    🪙 {item.pointCost} pts
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.redeemBtn, { backgroundColor: btn.bg }]}
                  onPress={() => handleRedeem(item)}
                  disabled={isDisabled}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.bgNav} />
                  ) : (
                    <Text style={[styles.redeemBtnText, { color: btn.fg }]}>{btn.label}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}


    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 0,
    elevation: 8,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
  },
  goldBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goldText: { fontWeight: '700', fontSize: 13 },

  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 12 },

  prizeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  prizeIcon: { fontSize: 36 },
  prizeInfo: { flex: 1, gap: 2 },
  prizeName: { fontSize: 16, fontWeight: 'bold' },
  prizeDesc: { fontSize: 13 },
  prizeCost: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  redeemBtn: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  redeemBtnText: { fontSize: 13, fontWeight: 'bold' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },

});
