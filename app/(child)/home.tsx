import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { PinVerifyModal } from '@/lib/auth/PinVerifyModal';
import type { Zone } from '@/lib/types';

// ─── Assets ───────────────────────────────────────────────────────────────────

const HERO_IMAGES = {
  male:    require('@/assets/images/hero-male.jpg'),
  female:  require('@/assets/images/hero-female.jpg'),
  neutral: require('@/assets/images/hero-male.jpg'),
};

// ─── Fallback quest steps ─────────────────────────────────────────────────────

const FALLBACK_STEPS: Record<Zone, string[]> = {
  green: [
    'Keep up your moisturising routine every day — apply your cream after every bath or shower, even when your skin feels fine.',
    'Stay cool and avoid your known triggers. Wear soft breathable fabrics and keep away from heat and sweaty environments.',
    'Drink plenty of water throughout the day. Hydrated skin heals faster and is less likely to crack or itch.',
    'Wear soft, breathable clothes today. Avoid wool or tight synthetic fabrics that can irritate your skin.',
    'Log how you are feeling to earn gold. Tracking your skin every day helps your doctor understand your patterns.',
  ],
  yellow: [
    'Apply your yellow zone cream right now — do not wait for it to get worse before using your treatment.',
    'Tell a parent your skin is acting up. They need to know early so they can help you manage it before it becomes a red zone.',
    'Avoid scratching — try pressing a cool damp cloth on the itchy area instead. Scratching breaks the skin and makes things worse.',
    'Stay out of heat and direct sun today. Hot temperatures and sweat are common triggers that make yellow zones worse.',
    'Log this flare to earn gold and help track your triggers. Every log builds a better picture for your next doctor visit.',
  ],
  red: [
    'Tell a parent or trusted adult RIGHT NOW — do not stay alone. You need someone with you to help manage this flare.',
    'Apply your red zone medication immediately. Use exactly the amount your doctor prescribed — do not skip it.',
    'Do NOT scratch — use a cold damp cloth on the worst areas instead. Scratching in red zone can cause infection.',
    'Stay calm and press the Flare-Up button below. Panicking makes itching worse — slow your breathing and stay still.',
    'Rest in a cool quiet place while help comes. Avoid heat, pets, and anything else on your known trigger list.',
  ],
};

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
const STEP_ICONS: IconName[] = ['healing', 'opacity', 'hotel', 'star', 'security'];

function shortTitle(step: string): string {
  const words = step.split(' ');
  return words.length <= 4 ? step : words.slice(0, 4).join(' ');
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChildHome() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { profile, points, flareLogs, currentZone, awardPoints, questCompletions, completeQuest } = useAppStore();

  const [showParentPin, setShowParentPin] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<{ index: number; step: string } | null>(null);
  const [showAllQuests, setShowAllQuests] = useState(false);

  const zone         = currentZone();
  const childName    = profile?.name ?? 'Hero';
  const gender       = (profile?.gender ?? 'neutral') as 'male' | 'female' | 'neutral';
  const steps        = profile?.actionPlan ? profile.actionPlan[zone].childInstructions : FALLBACK_STEPS[zone];
  const level        = Math.max(1, Math.floor(flareLogs.length / 3) + 1);
  const heroImage    = HERO_IMAGES[gender];
  const completedSet = new Set(questCompletions[zone] ?? []);

  function handleComplete(index: number) {
    if (completedSet.has(index)) return;
    completeQuest(zone, index);
    awardPoints(10);
    setSelectedQuest(null);
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgPrimary }]}>

      {/* ── Top bar — sits above the hero image ── */}
      <View style={[styles.topBar, { backgroundColor: theme.bgNav }]}>
        <TouchableOpacity onPress={toggleTheme}>
          <MaterialIcons name={isDark ? 'light-mode' : 'dark-mode'} size={22} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>QUEST LOG</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>🪙 {points.total}</Text>
        </View>
      </View>

      {/* ── Hero scene — full image, unobscured ── */}
      <ImageBackground source={heroImage} style={styles.heroScene} resizeMode="cover">
        <View style={[styles.nameOverlay, { backgroundColor: 'rgba(2,11,2,0.65)' }]}>
          <Text style={styles.heroName}>{childName.toUpperCase()}</Text>
          <Text style={styles.heroLevel}>LEVEL {level} FOREST GUARDIAN</Text>
        </View>
      </ImageBackground>

      {/* ── Quest section (scrollable) ── */}
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.bgPrimary }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header row */}
        <View style={styles.questHeader}>
          <Text style={[styles.questTitle, { color: theme.textPrimary }]}>ACTIVE QUESTS</Text>
          <TouchableOpacity onPress={() => setShowAllQuests(true)}>
            <Text style={[styles.viewAll, { color: theme.gold }]}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {/* 2-column quest grid */}
        <View style={styles.questGrid}>
          {steps.map((step, i) => {
            const done = completedSet.has(i);
            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.questCard,
                  {
                    backgroundColor: theme.bgCard,
                    borderColor: done ? theme.green : theme.border,
                    opacity: done ? 0.55 : 1,
                  },
                ]}
                onPress={() => setSelectedQuest({ index: i, step })}
                activeOpacity={0.75}
              >
                <View style={[styles.questIconBg, { backgroundColor: theme.bgGlass }]}>
                  <MaterialIcons
                    name={STEP_ICONS[i % STEP_ICONS.length]}
                    size={20}
                    color={done ? theme.gold : theme.green}
                  />
                </View>
                <Text style={[styles.questText, { color: theme.textPrimary }]} numberOfLines={2}>
                  {shortTitle(step)}
                </Text>
                <View style={[styles.progressBg, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: done ? theme.gold : theme.green, width: done ? '100%' : '10%' },
                    ]}
                  />
                </View>
                <Text style={[styles.questReward, { color: theme.gold }]}>
                  {done ? '✓ Done' : '+10 🪙'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Parent view link */}
        <TouchableOpacity style={styles.parentLink} onPress={() => setShowParentPin(true)}>
          <MaterialIcons name="lock" size={13} color={theme.textMuted} />
          <Text style={[styles.parentLinkText, { color: theme.textMuted }]}> Parent View</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── FLARE-UP button (fixed footer) ── */}
      <View style={[styles.flareWrapper, { backgroundColor: theme.bgPrimary }]}>
        <TouchableOpacity
          style={[styles.flareButton, { backgroundColor: theme.error, shadowColor: theme.errorDark }]}
          onPress={() => router.push('/(child)/emergency')}
          activeOpacity={0.85}
        >
          <MaterialIcons name="warning" size={22} color="#fff" />
          <Text style={styles.flareText}>FLARE-UP!</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quest detail modal ── */}
      <Modal visible={selectedQuest !== null} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setSelectedQuest(null)}>
          <Pressable
            style={[styles.questModal, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={() => {/* block backdrop tap propagation */}}
          >
            <View style={[styles.questModalIcon, { backgroundColor: theme.bgGlass }]}>
              <MaterialIcons
                name={selectedQuest ? STEP_ICONS[selectedQuest.index % STEP_ICONS.length] : 'healing'}
                size={36}
                color={theme.green}
              />
            </View>
            <Text style={[styles.questModalTitle, { color: theme.textPrimary }]}>
              {selectedQuest ? shortTitle(selectedQuest.step) : ''}
            </Text>
            <Text style={[styles.questModalDesc, { color: theme.textMuted }]}>
              {selectedQuest?.step ?? ''}
            </Text>
            <TouchableOpacity
              style={[
                styles.completeBtn,
                {
                  backgroundColor: selectedQuest && completedSet.has(selectedQuest.index)
                    ? theme.bgSurface
                    : theme.gold,
                },
              ]}
              onPress={() => selectedQuest && handleComplete(selectedQuest.index)}
              disabled={selectedQuest ? completedSet.has(selectedQuest.index) : false}
            >
              <Text
                style={[
                  styles.completeBtnText,
                  {
                    color: selectedQuest && completedSet.has(selectedQuest.index)
                      ? theme.textMuted
                      : theme.bgNav,
                  },
                ]}
              >
                {selectedQuest && completedSet.has(selectedQuest.index)
                  ? '✓ Quest Completed'
                  : 'Complete Quest  +10 🪙'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedQuest(null)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.textMuted }]}>✕ Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── View All quests modal ── */}
      <Modal visible={showAllQuests} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setShowAllQuests(false)}>
          <Pressable
            style={[styles.allQuestsModal, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
            onPress={() => {}}
          >
            <Text style={[styles.allQuestsTitle, { color: theme.textPrimary }]}>All Quests</Text>
            <FlatList
              data={steps}
              keyExtractor={(_, i) => String(i)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const done = completedSet.has(index);
                return (
                  <TouchableOpacity
                    style={[styles.allQuestRow, { borderBottomColor: theme.border, opacity: done ? 0.5 : 1 }]}
                    onPress={() => {
                      setShowAllQuests(false);
                      setSelectedQuest({ index, step: item });
                    }}
                  >
                    <View style={[styles.questIconBg, { backgroundColor: theme.bgGlass }]}>
                      <MaterialIcons
                        name={STEP_ICONS[index % STEP_ICONS.length]}
                        size={18}
                        color={done ? theme.gold : theme.green}
                      />
                    </View>
                    <Text style={[styles.allQuestText, { color: theme.textPrimary }]} numberOfLines={1}>
                      {shortTitle(item)}
                    </Text>
                    {done
                      ? <MaterialIcons name="check-circle" size={16} color={theme.green} />
                      : <MaterialIcons name="chevron-right" size={16} color={theme.textMuted} />
                    }
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity onPress={() => setShowAllQuests(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: theme.textMuted }]}>✕ Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <PinVerifyModal
        visible={showParentPin}
        prompt="Enter your PIN to switch to Parent View"
        onSuccess={() => { setShowParentPin(false); router.replace('/(parent)/dashboard'); }}
        onCancel={() => setShowParentPin(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  // Top bar ────────────────────────────────────────────────────────────────────
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
    color: '#4ade80',
  },
  goldBadge: {
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  goldText: { fontWeight: '700', fontSize: 13, color: '#FFD700' },

  // Hero scene ─────────────────────────────────────────────────────────────────
  heroScene: {
    width: '100%',
    height: 240,
    justifyContent: 'flex-end',
  },
  nameOverlay: {
    alignItems: 'center',
    paddingBottom: 14,
    paddingTop: 10,
  },
  heroName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#4ade80',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroLevel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#FFD700',
    textTransform: 'uppercase',
    marginTop: 3,
  },

  // Quest section ──────────────────────────────────────────────────────────────
  scrollContent: { paddingTop: 16, paddingBottom: 8 },

  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  viewAll: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // 2-column grid ──────────────────────────────────────────────────────────────
  questGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  questCard: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  questIconBg: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questText:    { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  progressBg:   { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  questReward:  { fontSize: 11, fontWeight: '700' },

  parentLink: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  parentLinkText: { fontSize: 13 },

  // Flare button ───────────────────────────────────────────────────────────────
  flareWrapper: { paddingHorizontal: 16, paddingVertical: 10 },
  flareButton: {
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

  // Quest detail modal ─────────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  questModal: {
    width: '82%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  questModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questModalTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  questModalDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  completeBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  completeBtnText: { fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  closeBtn: { paddingVertical: 6 },
  closeBtnText: { fontSize: 13, fontWeight: '600' },

  // View All modal ─────────────────────────────────────────────────────────────
  allQuestsModal: {
    width: '88%',
    maxHeight: '70%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  allQuestsTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  allQuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  allQuestText: { flex: 1, fontSize: 13, fontWeight: '600' },
});
