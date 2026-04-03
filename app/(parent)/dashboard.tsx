import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { router, Redirect } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import type { RedemptionRequest, Zone } from '@/lib/types';

const ZONE_CONFIG: Record<Zone, { label: string; color: string; bg: string; border: string }> = {
  green: { label: '🟢 Green — Controlled', color: '#4ade80', bg: '#0d2b0d', border: '#4ade80' },
  yellow: { label: '🟡 Yellow — Flaring', color: '#FFD700', bg: '#2b2200', border: '#FFD700' },
  red: { label: '🔴 Red — Severe', color: '#ef4444', bg: '#2b0000', border: '#ef4444' },
};

export default function ParentDashboard() {
  const { signOut } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { isHydrated, profile, flareLogs, points, redemptions, currentZone, resolveRedemption, awardPoints, reset } =
    useAppStore();

  if (!isHydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator color={theme.gold} size="large" />
      </View>
    );
  }

  if (!profile?.onboardingComplete) {
    return <Redirect href="/(parent)/onboarding" />;
  }

  async function handleResolve(r: RedemptionRequest, decision: 'approved' | 'denied') {
    await resolveRedemption(r.id, decision);
    if (decision === 'denied') {
      await awardPoints(r.pointCost);
    }
  }

  const zone = currentZone();
  const zc = ZONE_CONFIG[zone];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bgPrimary }]}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bgNav }]}>
        <TouchableOpacity onPress={toggleTheme}>
          <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={22} color={theme.green} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.green }]}>ECZCALIBUR</Text>
        <TouchableOpacity onPress={() => signOut()}>
          <MaterialIcons name="logout" size={22} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <Text style={[styles.greeting, { color: theme.textMuted }]}>Welcome back,</Text>
      <Text style={[styles.childName, { color: theme.gold }]}>{profile.name}'s Quest</Text>

      {/* Zone card */}
      <View style={[styles.zoneCard, { borderColor: zc.border, backgroundColor: zc.bg }]}>
        <Text style={[styles.cardLabel, { color: theme.textMuted }]}>CURRENT ZONE</Text>
        <Text style={[styles.cardValue, { color: zc.color }]}>{zc.label}</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.statValue, { color: theme.gold }]}>{flareLogs.length}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Logs</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.statValue, { color: theme.gold }]}>🪙 {points.total}</Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Points Balance</Text>
        </View>
      </View>

      {/* Pending redemption requests */}
      {redemptions.filter((r) => r.status === 'pending').length > 0 && (
        <View style={styles.redemptionSection}>
          <Text style={[styles.redemptionTitle, { color: theme.gold }]}>🎁 Prize Requests</Text>
          {redemptions
            .filter((r) => r.status === 'pending')
            .map((r) => (
              <View
                key={r.id}
                style={[styles.redemptionCard, { backgroundColor: theme.bgCard, borderColor: theme.gold }]}
              >
                <View style={styles.redemptionInfo}>
                  <Text style={[styles.redemptionName, { color: theme.textPrimary }]}>{r.prizeName}</Text>
                  <Text style={[styles.redemptionCost, { color: theme.gold }]}>🪙 {r.pointCost} pts</Text>
                </View>
                <View style={styles.redemptionActions}>
                  <TouchableOpacity
                    style={[styles.resolveBtn, { backgroundColor: theme.zoneGreen }]}
                    onPress={() => handleResolve(r, 'approved')}
                  >
                    <Text style={[styles.resolveBtnText, { color: theme.bgNav }]}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resolveBtn, { backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.zoneRed }]}
                    onPress={() => handleResolve(r, 'denied')}
                  >
                    <Text style={[styles.resolveBtnText, { color: theme.zoneRed }]}>✕ Deny</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
        </View>
      )}

      {/* Switch to child view */}
      <TouchableOpacity
        style={[styles.childViewBtn, { backgroundColor: theme.bgCard, borderColor: theme.borderActive }]}
        onPress={() => router.push('/(child)/home')}
      >
        <MaterialIcons name="child-care" size={20} color={theme.green} />
        <Text style={[styles.childViewText, { color: theme.green }]}>Switch to Child View</Text>
      </TouchableOpacity>

      {/* Dev reset */}
      <TouchableOpacity
        style={[styles.resetBtn, { borderColor: theme.zoneRed }]}
        onPress={() =>
          Alert.alert(
            'Reset all data?',
            'This will wipe the profile, logs, points, and prizes — returning to onboarding.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => reset() },
            ]
          )
        }
      >
        <Text style={[styles.resetText, { color: theme.zoneRed }]}>Reset & Re-onboard</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 40, gap: 16 },

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
    marginBottom: 8,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
  },

  greeting: { paddingHorizontal: 24, fontSize: 16 },
  childName: { paddingHorizontal: 24, fontSize: 28, fontWeight: 'bold' },

  zoneCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
  },
  cardLabel: { fontSize: 11, letterSpacing: 2, fontWeight: '600' },
  cardValue: { fontSize: 18, fontWeight: 'bold' },

  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 11, letterSpacing: 1, fontWeight: '600' },

  childViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  childViewText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },

  resetBtn: {
    marginHorizontal: 24,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  redemptionSection: { gap: 10, paddingHorizontal: 24 },
  redemptionTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  redemptionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  redemptionInfo: { gap: 2 },
  redemptionName: { fontSize: 15, fontWeight: '600' },
  redemptionCost: { fontSize: 13 },
  redemptionActions: { flexDirection: 'row', gap: 10 },
  resolveBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  resolveBtnText: { fontSize: 13, fontWeight: 'bold' },
});
