import { MaterialIcons } from '@expo/vector-icons';
import { router, Redirect } from 'expo-router';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BG, overlayColor } from '@/constants/backgrounds';
import { useAppStore } from '@/store/useAppStore';
import type { FlareLog, RedemptionRequest, WatchConfig, Zone } from '@/lib/types';

// ─── Zone config ─────────────────────────────────────────────────────────────

const ZONE_CONFIG: Record<Zone, {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
}> = {
  green: {
    label: 'GREEN',
    shortLabel: 'CONTROLLED',
    description: 'Symptoms are stable. Child is comfortable.',
    color: '#4ade80',
  },
  yellow: {
    label: 'YELLOW',
    shortLabel: 'FLARING',
    description: 'Eczema is flaring up. Monitor closely.',
    color: '#FFD700',
  },
  red: {
    label: 'RED',
    shortLabel: 'SEVERE',
    description: 'Severe flare. Follow red zone plan immediately.',
    color: '#ef4444',
  },
};

const DOT_COLOR: Record<Zone, string> = {
  green: '#4ade80',
  yellow: '#FFD700',
  red: '#ef4444',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast7DaysZones(logs: FlareLog[]): { dayLabel: string; zone: Zone | null }[] {
  const days: { dayLabel: string; zone: Zone | null }[] = [];
  const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const label = DAY_LABELS[d.getDay()];
    const logsForDay = logs.filter((l) => new Date(l.timestamp).toDateString() === dateStr);
    const zone = logsForDay.length > 0 ? logsForDay[logsForDay.length - 1].zone : null;
    days.push({ dayLabel: label, zone });
  }
  return days;
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatLastFlare(logs: FlareLog[]): { datePart: string; timePart: string } | null {
  if (logs.length === 0) return null;
  const last = logs[logs.length - 1];
  const d = new Date(last.timestamp);
  const datePart = `${DAY_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const timePart = `${h12}:${m} ${ampm}`;
  return { datePart, timePart };
}

// ─── Frosted card style ───────────────────────────────────────────────────────

function frostedCard(isDark: boolean): ViewStyle {
  return {
    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOpacity: isDark ? 0.25 : 0.10,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    padding: 18,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isHydrated, profile, flareLogs, points, redemptions, watchConfigs, currentZone, activeWatch, resolveRedemption, awardPoints } =
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
  const zoneColor = zc.color;
  const last7 = getLast7DaysZones(flareLogs);
  const lastFlare = formatLastFlare(flareLogs);
  const topTrigger = profile.triggers?.[0] ?? 'None recorded';
  const pendingRedemptions = redemptions.filter((r) => r.status === 'pending');
  const watch: WatchConfig | null = isHydrated ? activeWatch() : null;

  const actionBullets: string[] = profile.actionPlan
    ? (profile.actionPlan[zone]?.parentInstructions ?? []).slice(0, 3)
    : [];

  const card = frostedCard(isDark);
  const textPrimary = isDark ? 'rgba(242,249,234,0.95)' : 'rgba(10,30,10,0.90)';
  const textMuted = isDark ? 'rgba(242,249,234,0.50)' : 'rgba(10,30,10,0.45)';

  return (
    <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.container} resizeMode="cover">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.50) }]} />
      <ScrollView style={styles.scrollFill} contentContainerStyle={styles.scrollContent}>

        {/* ── Top Bar ── */}
        <View style={[styles.topBar, { backgroundColor: isDark ? 'rgba(2,11,2,0.85)' : 'rgba(240,248,240,0.85)' }]}>
          <TouchableOpacity onPress={toggleTheme}>
            <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={22} color={theme.green} />
          </TouchableOpacity>
          <Text style={[styles.topTitle, { color: theme.green }]}>ECZCALIBUR</Text>
          <TouchableOpacity onPress={() => router.push('/(parent)/settings')}>
            <MaterialIcons name="settings" size={22} color={textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Title ── */}
        <View style={styles.titleSection}>
          <Text style={[styles.greeting, { color: textMuted }]}>Welcome back,</Text>
          <Text style={[styles.childTitle, { color: theme.gold }]}>{profile.parentCallName || profile.parentName || 'Parent'}</Text>
        </View>

        {/* ── Zone Card ── */}
        <View style={[card, styles.zoneCard]}>
          <View style={[styles.zoneAccentBar, { backgroundColor: zoneColor }]} />
          <View style={styles.zoneHeader}>
            <MaterialIcons name="security" size={30} color={zoneColor} style={styles.shieldIcon} />
            <View style={styles.zoneHeaderText}>
              <View style={styles.zoneBadgeRow}>
                <View style={[styles.zoneDot, { backgroundColor: zoneColor }]} />
                <Text style={[styles.zoneBadgeLabel, { color: zoneColor }]}>{zc.label}</Text>
                <Text style={[styles.zoneSep, { color: textMuted }]}>—</Text>
                <Text style={[styles.zoneShortLabel, { color: textPrimary }]}>{zc.shortLabel}</Text>
              </View>
              <Text style={[styles.zoneDescription, { color: textMuted }]}>{zc.description}</Text>
            </View>
          </View>

          <View style={[styles.zoneDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]} />

          <Text style={[styles.actionPreviewLabel, { color: textMuted }]}>Recommended Actions</Text>
          {actionBullets.length > 0 ? (
            actionBullets.map((bullet, i) => (
              <Text key={i} style={[styles.actionBullet, { color: textPrimary }]}>·  {bullet}</Text>
            ))
          ) : (
            <Text style={[styles.actionBullet, { color: textMuted, fontStyle: 'italic' }]}>
              Generate a plan to see recommendations
            </Text>
          )}
        </View>

        {/* ── Stats + Mini-Chart ── */}
        <View style={styles.statsRow}>
          {/* Stats card */}
          <View style={[card, styles.statsCard]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: textMuted }]}>Total Logs</Text>
              <Text style={[styles.statValue, { color: theme.gold }]}>{flareLogs.length}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: textMuted }]}>Points Balance</Text>
              <Text style={[styles.statValue, { color: theme.gold }]}>🪙 {points.total}</Text>
            </View>
          </View>

          {/* Mini-chart card */}
          <View style={[card, styles.chartCard]}>
            <Text style={[styles.chartTitle, { color: textPrimary }]}>Zone History</Text>
            <Text style={[styles.chartSubtitle, { color: textMuted }]}>7 days</Text>
            <View style={styles.chartDots}>
              {last7.map((d, i) => (
                <View key={i} style={styles.chartDotCol}>
                  <View style={[
                    styles.chartDot,
                    { backgroundColor: d.zone ? DOT_COLOR[d.zone] : (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)') },
                  ]} />
                  <Text style={[styles.chartDayLabel, { color: textMuted }]}>{d.dayLabel}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── ECZ Insights ── */}
        <View style={[card, styles.insightsCard]}>
          <Text style={[styles.insightsHeader, { color: textMuted }]}>ECZ Insights</Text>
          <View style={styles.insightsRow}>
            <View style={styles.insightsCol}>
              <Text style={[styles.insightsIconLabel, { color: '#FFD700' }]}>⚠ Most Common Trigger</Text>
              <Text style={[styles.insightsValue, { color: textPrimary }]}>{topTrigger.toUpperCase()}</Text>
            </View>
            <View style={[styles.insightsVertDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }]} />
            <View style={styles.insightsCol}>
              <Text style={[styles.insightsIconLabel, { color: '#ef4444' }]}>🔥 Last Flare</Text>
              {lastFlare ? (
                <>
                  <Text style={[styles.insightsValue, { color: textPrimary }]}>{lastFlare.datePart}</Text>
                  <Text style={[styles.insightsSubValue, { color: textMuted }]}>{lastFlare.timePart}</Text>
                </>
              ) : (
                <Text style={[styles.insightsValue, { color: textMuted, fontStyle: 'italic' }]}>No flares yet</Text>
              )}
            </View>
          </View>
        </View>

        {/* ── Active Watch Banner (conditional) ── */}
        {watch ? (
          <TouchableOpacity
            style={[card, styles.watchBanner]}
            onPress={() => router.push('/(parent)/watches')}
            activeOpacity={0.80}
          >
            <View style={[styles.watchAccentBar, { backgroundColor: theme.green }]} />
            <View style={styles.watchBannerContent}>
              <MaterialIcons name="visibility" size={20} color={theme.green} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.watchBannerLabel, { color: textMuted }]}>Active Watch</Text>
                <Text style={[styles.watchBannerArea, { color: textPrimary }]}>{watch.area}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={textMuted} />
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[card, styles.watchBanner]}
            onPress={() => router.push('/(parent)/watch-create')}
            activeOpacity={0.80}
          >
            <View style={styles.watchBannerContent}>
              <MaterialIcons name="add-circle-outline" size={20} color={textMuted} style={{ marginRight: 10 }} />
              <Text style={[styles.watchBannerLabel, { color: textMuted, flex: 1 }]}>Start a Watch — track a skin area over time</Text>
              <MaterialIcons name="chevron-right" size={20} color={textMuted} />
            </View>
          </TouchableOpacity>
        )}

        {/* ── Prize Requests (conditional) ── */}
        {pendingRedemptions.length > 0 && (
          <View style={[card, styles.insightsCard]}>
            <Text style={[styles.insightsHeader, { color: theme.gold }]}>🎁 Prize Requests</Text>
            {pendingRedemptions.map((r) => (
              <View key={r.id} style={styles.redemptionItem}>
                <View style={styles.redemptionInfo}>
                  <Text style={[styles.redemptionName, { color: textPrimary }]}>{r.prizeName}</Text>
                  <Text style={[styles.redemptionCost, { color: textMuted }]}>🪙 {r.pointCost} pts</Text>
                </View>
                <View style={styles.redemptionActions}>
                  <TouchableOpacity
                    style={[styles.resolveBtn, { backgroundColor: 'rgba(74,222,128,0.18)', borderColor: '#4ade80' }]}
                    onPress={() => handleResolve(r, 'approved')}
                  >
                    <Text style={[styles.resolveBtnText, { color: '#4ade80' }]}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.resolveBtn, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: '#ef4444' }]}
                    onPress={() => handleResolve(r, 'denied')}
                  >
                    <Text style={[styles.resolveBtnText, { color: '#ef4444' }]}>✕ Deny</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionSection}>
          <Text style={[styles.quickActionLabel, { color: textMuted }]}>Quick Actions</Text>
          <View style={styles.quickActionRow}>
            {([
              { icon: 'description' as const,  label: 'Plan',  route: '/(parent)/settings'    },
              { icon: 'list'        as const,  label: 'Logs',  route: '/(parent)/logs'        },
              { icon: 'event'       as const,  label: 'Appt',  route: '/(parent)/appointment' },
              { icon: 'child-care'  as const,  label: 'Child', route: '/(child)/home'         },
            ]).map(({ icon, label, route }) => (
              <TouchableOpacity
                key={label}
                style={[styles.quickBtn, {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.60)',
                  borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                }]}
                onPress={() => router.push(route as Parameters<typeof router.push>[0])}
              >
                <MaterialIcons name={icon} size={22} color={theme.green} />
                <Text style={[styles.quickBtnLabel, { color: textMuted }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  scrollFill: { flex: 1 },
  scrollContent: { paddingBottom: 40, gap: 14 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 0,
    elevation: 8,
    marginBottom: 4,
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
  },

  titleSection: { paddingHorizontal: 20, gap: 2 },
  greeting: { fontSize: 14 },
  childTitle: { fontSize: 28, fontWeight: '800' },

  // Zone card
  zoneCard: { marginHorizontal: 16, gap: 10, overflow: 'hidden' },
  zoneAccentBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  zoneHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  shieldIcon: { marginTop: 2 },
  zoneHeaderText: { flex: 1, gap: 4 },
  zoneBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneBadgeLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  zoneSep: { fontSize: 13 },
  zoneShortLabel: { fontSize: 13, fontWeight: '600' },
  zoneDescription: { fontSize: 13, lineHeight: 18 },
  zoneDivider: { height: 1, borderRadius: 1 },
  actionPreviewLabel: { fontSize: 11, letterSpacing: 0.5, fontWeight: '600' },
  actionBullet: { fontSize: 13, lineHeight: 20 },

  // Stats + chart
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  statsCard: { flex: 1, gap: 12 },
  statItem: { gap: 2 },
  statLabel: { fontSize: 11, letterSpacing: 0.3 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statDivider: { height: 1, borderRadius: 1 },

  chartCard: { flex: 1, gap: 4 },
  chartTitle: { fontSize: 12, fontWeight: '600' },
  chartSubtitle: { fontSize: 10, marginBottom: 6 },
  chartDots: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  chartDotCol: { alignItems: 'center', gap: 4 },
  chartDot: { width: 18, height: 18, borderRadius: 9 },
  chartDayLabel: { fontSize: 9 },

  // ECZ Insights
  insightsCard: {},
  insightsHeader: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, marginBottom: 10 },
  insightsRow: { flexDirection: 'row' },
  insightsCol: { flex: 1, gap: 4 },
  insightsVertDivider: { width: 1, marginHorizontal: 14, borderRadius: 1 },
  insightsIconLabel: { fontSize: 11, fontWeight: '600' },
  insightsValue: { fontSize: 15, fontWeight: '700' },
  insightsSubValue: { fontSize: 12 },

  // Redemptions
  redemptionItem: { gap: 8, marginTop: 8 },
  redemptionInfo: { gap: 2 },
  redemptionName: { fontSize: 14, fontWeight: '600' },
  redemptionCost: { fontSize: 12 },
  redemptionActions: { flexDirection: 'row', gap: 10 },
  resolveBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 9, alignItems: 'center' },
  resolveBtnText: { fontSize: 13, fontWeight: '700' },

  // Quick Actions
  quickActionSection: { paddingHorizontal: 16, gap: 10 },
  quickActionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  quickActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickBtn: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
  },
  quickBtnLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  watchBanner: { paddingVertical: 14, overflow: 'hidden' },
  watchAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  watchBannerContent: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12 },
  watchBannerLabel: { fontSize: 11, fontWeight: '500' },
  watchBannerArea: { fontSize: 14, fontWeight: '700', marginTop: 1 },
});
