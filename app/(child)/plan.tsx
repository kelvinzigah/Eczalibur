import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import type { Zone } from '@/lib/types';

const ZONE_META: Record<Zone, { label: string; colorKey: 'zoneGreen' | 'zoneYellow' | 'zoneRed'; emoji: string }> = {
  green: { label: 'GREEN ZONE', colorKey: 'zoneGreen', emoji: '🟢' },
  yellow: { label: 'YELLOW ZONE', colorKey: 'zoneYellow', emoji: '🟡' },
  red: { label: 'RED ZONE', colorKey: 'zoneRed', emoji: '🔴' },
};

const FALLBACK: Record<Zone, string[]> = {
  green: ['Keep up your moisturising routine', 'Stay cool and avoid triggers', 'Log how you feel each day'],
  yellow: ['Apply your yellow zone cream now', 'Tell a parent your skin is acting up', 'Avoid scratching — try a cold cloth'],
  red: ['Tell a parent RIGHT NOW', 'Apply your red zone medication', 'Do NOT scratch — get help'],
};

export default function PlanScreen() {
  const { theme } = useTheme();
  const { profile, currentZone } = useAppStore();
  const plan = profile?.actionPlan;
  const zone = currentZone();

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgPrimary }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={[styles.title, { color: theme.gold }]}>📜 Your Action Plan</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Know what to do at every stage</Text>

        {(['green', 'yellow', 'red'] as Zone[]).map((z) => {
          const meta = ZONE_META[z];
          const color = theme[meta.colorKey];
          const steps = plan ? plan[z].childInstructions : FALLBACK[z];
          const isActive = z === zone;

          return (
            <View
              key={z}
              style={[
                styles.zoneCard,
                {
                  borderColor: color,
                  backgroundColor: theme.bgCard,
                },
                isActive && {
                  shadowColor: color,
                  shadowOpacity: 0.25,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 6,
                },
              ]}
            >
              {isActive && (
                <View style={[styles.activeBadge, { backgroundColor: color }]}>
                  <Text style={[styles.activeBadgeText, { color: theme.bgNav }]}>YOU ARE HERE</Text>
                </View>
              )}
              <Text style={styles.zoneEmoji}>{meta.emoji}</Text>
              <Text style={[styles.zoneLabel, { color }]}>{meta.label}</Text>
              {steps.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <Text style={[styles.stepDot, { color }]}>▸</Text>
                  <Text style={[styles.stepText, { color: theme.textPrimary }]}>{step}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {!plan && (
          <Text style={[styles.noplan, { color: theme.textMuted }]}>
            No action plan yet — complete onboarding to generate your personalised plan.
          </Text>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: 24, paddingHorizontal: 20, paddingTop: 56 },

  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 24 },

  zoneCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    gap: 8,
    position: 'relative',
  },
  activeBadge: {
    position: 'absolute',
    top: -10,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  zoneEmoji: { fontSize: 28 },
  zoneLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 3, marginBottom: 4 },
  stepRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  stepDot: { fontSize: 14, lineHeight: 22 },
  stepText: { fontSize: 14, lineHeight: 22, flex: 1 },

  noplan: { fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 24 },
});
