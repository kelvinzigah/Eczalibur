import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { PinVerifyModal } from '@/lib/auth/PinVerifyModal';
import type { Zone } from '@/lib/types';

// ─── Zone config ──────────────────────────────────────────────────────────────

const REALM_NAMES: Record<Zone, string> = {
  green: 'Forest of Freshness',
  yellow: 'Flare Marshes',
  red: 'Danger Keep',
};

const FALLBACK_STEPS: Record<Zone, string[]> = {
  green: [
    'Keep up your moisturising routine every day',
    'Stay cool and avoid your known triggers',
    'Drink plenty of water to hydrate your skin',
    'Wear soft, breathable clothes today',
    'Log how you\'re feeling to earn gold',
  ],
  yellow: [
    'Apply your yellow zone cream right now',
    'Tell a parent your skin is acting up',
    'Avoid scratching — try a cool cloth on the area',
    'Stay out of the heat and direct sun',
    'Log this flare to earn gold',
  ],
  red: [
    'Tell a parent or trusted adult RIGHT NOW',
    'Apply your red zone medication immediately',
    'Do NOT scratch — use a cold cloth instead',
    'Stay calm and press the Flare-Up button below',
    'Rest in a cool, quiet place while help comes',
  ],
};

// Step icons cycling through quest types
type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
const STEP_ICONS: IconName[] = ['healing', 'opacity', 'hotel', 'star', 'security'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeartGauge({ zone }: { zone: Zone }) {
  const { theme } = useTheme();
  const filled = zone === 'green' ? 5 : zone === 'yellow' ? 3 : 1;
  return (
    <View style={styles.hearts}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons
          key={i}
          name={i <= filled ? 'favorite' : 'favorite-border'}
          size={18}
          color={i <= filled ? '#ef4444' : theme.purpleDim}
        />
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChildHome() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { profile, points, flareLogs, currentZone } = useAppStore();
  const [showParentPin, setShowParentPin] = useState(false);

  const zone = currentZone();
  const childName = profile?.name ?? 'Hero';
  const gender = profile?.gender;
  const steps = profile?.actionPlan
    ? profile.actionPlan[zone].childInstructions
    : FALLBACK_STEPS[zone];
  const level = Math.max(1, Math.floor(flareLogs.length / 3) + 1);
  const heroEmoji = gender === 'male' ? '🧝‍♂️' : gender === 'female' ? '🧝‍♀️' : '🧙';

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgPrimary }]}>

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { backgroundColor: theme.bgNav }]}>
        <TouchableOpacity onPress={toggleTheme}>
          <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={22} color={theme.green} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.green }]}>QUEST LOG</Text>
        <View style={[styles.goldBadge, { borderColor: theme.gold }]}>
          <Text style={[styles.goldText, { color: theme.gold }]}>🪙 {points.total}</Text>
        </View>
      </View>

      {/* ── Status Banner ── */}
      <View style={[styles.statusBanner, { backgroundColor: 'rgba(10,106,29,0.20)', borderBottomColor: theme.border }]}>
        <Text style={[styles.realmName, { color: theme.textPrimary }]}>
          {REALM_NAMES[zone]}
        </Text>
        <HeartGauge zone={zone} />
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Canvas */}
        <View style={styles.heroSection}>
          <View style={[styles.heroGlow, { backgroundColor: theme.purple }]} />
          <Text style={styles.heroEmoji}>{heroEmoji}</Text>
          <Text style={[styles.heroName, { color: theme.green }]}>
            {childName.toUpperCase()}
          </Text>
          <Text style={[styles.heroLevel, { color: theme.gold }]}>
            LEVEL {level} FOREST GUARDIAN
          </Text>
        </View>

        {/* Quest section header */}
        <View style={styles.questHeader}>
          <Text style={[styles.questTitle, { color: theme.textPrimary }]}>ACTIVE QUESTS</Text>
          <Text style={[styles.questCount, { color: theme.gold }]}>{steps.length} quests</Text>
        </View>

        {/* Horizontal quest cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.questList}
        >
          {steps.map((step, i) => {
            const icon = STEP_ICONS[i % STEP_ICONS.length];
            return (
              <View
                key={i}
                style={[styles.questCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
              >
                <View style={[styles.questIconBg, { backgroundColor: theme.bgGlass }]}>
                  <MaterialIcons name={icon} size={20} color={theme.green} />
                </View>
                <Text style={[styles.questText, { color: theme.textPrimary }]} numberOfLines={3}>
                  {step}
                </Text>
                <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.progressFill, { backgroundColor: theme.green }]} />
                </View>
                <Text style={[styles.questReward, { color: theme.gold }]}>+10 🪙</Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Parent view — PIN-gated */}
        <TouchableOpacity
          style={styles.parentLink}
          onPress={() => setShowParentPin(true)}
        >
          <MaterialIcons name="lock" size={13} color={theme.textMuted} />
          <Text style={[styles.parentLinkText, { color: theme.textMuted }]}> Parent View</Text>
        </TouchableOpacity>

      </ScrollView>

      <PinVerifyModal
        visible={showParentPin}
        prompt="Enter your PIN to switch to Parent View"
        onSuccess={() => {
          setShowParentPin(false);
          router.replace('/(parent)/dashboard');
        }}
        onCancel={() => setShowParentPin(false)}
      />

      {/* ── FLARE-UP Button (pinned above tab bar) ── */}
      <TouchableOpacity
        style={[
          styles.flareButton,
          {
            backgroundColor: theme.error,
            shadowColor: theme.errorDark,
          },
        ]}
        onPress={() => router.push('/(child)/emergency')}
        activeOpacity={0.85}
      >
        <MaterialIcons name="warning" size={22} color="#fff" />
        <Text style={styles.flareText}>FLARE-UP!</Text>
      </TouchableOpacity>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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

  statusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  realmName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  hearts: { flexDirection: 'row', gap: 4 },

  scrollContent: { paddingBottom: 160 },

  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.07,
    top: 16,
  },
  heroEmoji: { fontSize: 88, lineHeight: 104 },
  heroName: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 10,
  },
  heroLevel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 5,
    textTransform: 'uppercase',
  },

  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  questCount: { fontSize: 10, fontWeight: '700' },

  questList: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },

  questCard: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  questIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questText: { fontSize: 12, fontWeight: '600', lineHeight: 18 },
  progressBg: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, width: '10%', borderRadius: 2 },
  questReward: { fontSize: 11, fontWeight: '700' },

  parentLink: { alignItems: 'center', paddingVertical: 20 },
  parentLinkText: { fontSize: 13 },

  flareButton: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  flareText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
