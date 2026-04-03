import * as ExpoCrypto from 'expo-crypto';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
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
  const pendingRedemptions = redemptions.filter((r) => r.status === 'pending');

  function isPending(prizeId: string) {
    return redemptions.some((r) => r.prizeId === prizeId && r.status === 'pending');
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
    if (isPending(prize.id)) {
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
    <View style={[styles.screen, { backgroundColor: theme.bgPrimary }]}>

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
            const pending = isPending(item.id);
            const canAfford = points.total >= item.pointCost;
            const isLoading = redeeming === item.id;

            return (
              <View
                style={[
                  styles.prizeCard,
                  { backgroundColor: theme.bgCard, borderColor: theme.border },
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
                  <Text
                    style={[
                      styles.prizeCost,
                      { color: canAfford ? theme.gold : theme.textMuted },
                    ]}
                  >
                    🪙 {item.pointCost} pts
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.redeemBtn,
                    pending || !canAfford || isLoading
                      ? [styles.redeemBtnDisabled, { backgroundColor: theme.bgSurface }]
                      : { backgroundColor: theme.gold },
                  ]}
                  onPress={() => handleRedeem(item)}
                  disabled={pending || isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={theme.bgNav} />
                  ) : (
                    <Text
                      style={[
                        styles.redeemBtnText,
                        { color: pending || !canAfford ? theme.textMuted : theme.bgNav },
                      ]}
                    >
                      {pending ? '⏳ Pending' : 'Redeem'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Pending requests footer */}
      {pendingRedemptions.length > 0 && (
        <View style={[styles.pendingFooter, { backgroundColor: theme.bgCard, borderColor: theme.gold }]}>
          <Text style={[styles.pendingTitle, { color: theme.gold }]}>
            Waiting for parent approval
          </Text>
          {pendingRedemptions.map((r) => (
            <Text key={r.id} style={[styles.pendingItem, { color: theme.textPrimary }]}>
              • {r.prizeName} (🪙 {r.pointCost})
            </Text>
          ))}
        </View>
      )}

    </View>
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
  redeemBtnDisabled: {},
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

  pendingFooter: {
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  pendingTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  pendingItem: { fontSize: 13 },
});
