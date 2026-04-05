import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { BG, overlayColor } from '@/constants/backgrounds';
import { appendWatchPhoto } from '@/lib/storage';
import { compressForWatch } from '@/lib/imageUtils';
import { useAppStore } from '@/store/useAppStore';
import type { BodyArea, FlareLog, WatchPhoto, Zone } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { score: 1, emoji: '😊', label: 'Great!' },
  { score: 2, emoji: '🙂', label: 'Okay' },
  { score: 3, emoji: '😕', label: 'Itchy' },
  { score: 4, emoji: '😣', label: 'Very Itchy' },
  { score: 5, emoji: '😭', label: 'Painful' },
];

const ALL_AREAS: BodyArea[] = [
  'face', 'neck', 'chest', 'back', 'arms', 'hands', 'legs', 'feet', 'scalp', 'other',
];

const AREA_LABELS: Record<BodyArea, string> = {
  face: 'Face', neck: 'Neck', chest: 'Chest', back: 'Back',
  arms: 'Arms', hands: 'Hands', legs: 'Legs', feet: 'Feet',
  scalp: 'Scalp', other: 'Other',
};

const COOLDOWN_MS  = 15 * 1000; // 15 seconds
const MAX_PHOTOS   = 3;
const MAX_DAILY    = 15;

type Step = 1 | 2 | 3 | 4 | 'done';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCountdown(ms: number): string {
  const totalSecs = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LogScreen() {
  const { theme, isDark } = useTheme();
  const { profile, points, flareLogs, currentZone, activeWatch, addFlareLog, awardPoints } = useAppStore();
  const watch = activeWatch();

  const zone           = currentZone();
  const monitoredAreas = profile?.affectedAreas ?? [];

  // ── Daily cap & cooldown ─────────────────────────────────────────────────────
  const todayStr    = new Date().toDateString();
  const todayLogs   = flareLogs.filter(l => new Date(l.timestamp).toDateString() === todayStr);
  const todayCount  = todayLogs.length;
  const isAtLimit   = todayCount >= MAX_DAILY;

  const lastLogTime = flareLogs.length > 0
    ? new Date(flareLogs[flareLogs.length - 1].timestamp).getTime()
    : 0;

  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, COOLDOWN_MS - (Date.now() - lastLogTime)),
  );

  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastLogTime));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lastLogTime]);

  const isOnCooldown = timeLeft > 0;

  // ── Form state ───────────────────────────────────────────────────────────────
  const totalSteps = watch ? 4 : 3;

  const [step,          setStep]          = useState<Step>(1);
  const [moodScore,     setMoodScore]     = useState<number | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<BodyArea[]>(monitoredAreas);
  const [photoUris,     setPhotoUris]     = useState<string[]>([]);
  const [watchPhotoUri, setWatchPhotoUri] = useState<string | null>(null);
  const [pointsEarned,  setPointsEarned]  = useState(0);
  const [loading,       setLoading]       = useState(false);

  function toggleArea(area: BodyArea) {
    setSelectedAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area],
    );
  }

  async function pickPhoto() {
    if (photoUris.length >= MAX_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUris(prev => [...prev, result.assets[0].uri]);
    }
  }

  async function handleSubmit() {
    if (!moodScore) return;
    setLoading(true);

    // +5 per flare photo, +15 for watch mission photo, base 10
    const watchBonus = watchPhotoUri ? 15 : 0;
    const earned = 10 + photoUris.length * 5 + watchBonus;

    // Derive zone from itch/mood severity — this is the mechanism that drives zone transitions
    const derivedZone: Zone = moodScore <= 2 ? 'green' : moodScore === 3 ? 'yellow' : 'red';

    const log: FlareLog = {
      id:            `log_${Date.now()}`,
      childId:       profile?.id ?? 'unknown',
      timestamp:     new Date().toISOString(),
      zone:          derivedZone,
      moodScore,
      affectedAreas: selectedAreas,
      notes:         '',
      photoUri:      photoUris[0] ?? null,
      photoUris,
      pointsAwarded: earned,
    };

    await addFlareLog(log);
    await awardPoints(earned);

    // Upload watch photo if captured
    if (watchPhotoUri && watch) {
      try {
        const compressed = await compressForWatch(watchPhotoUri);
        const wp: WatchPhoto = {
          id:            `wp_${Date.now()}`,
          watchConfigId: watch.id,
          photoUrl:      compressed.uri,
          timestamp:     new Date().toISOString(),
          area:          watch.area,
          notes:         null,
          createdAt:     new Date().toISOString(),
        };
        await appendWatchPhoto(wp);
      } catch {
        // Non-fatal — log still saved, watch photo silently skipped
      }
    }

    setPointsEarned(earned);
    setLoading(false);
    setStep('done');
    // Reset cooldown display immediately
    setTimeLeft(COOLDOWN_MS);
  }

  // ─── Guard: daily limit ───────────────────────────────────────────────────────

  if (isAtLimit && step !== 'done') {
    return (
      <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />
        <View style={styles.centreContainer}>
          <Text style={styles.bigEmoji}>📋</Text>
          <Text style={[styles.guardTitle, { color: theme.gold }]}>Daily Limit Reached</Text>
          <Text style={[styles.guardSub, { color: theme.textMuted }]}>
            You've logged {MAX_DAILY} times today — great work!{'\n'}Come back tomorrow for more quests.
          </Text>
          <View style={[styles.limitBadges, { borderColor: theme.border }]}>
            {[...Array(MAX_DAILY)].map((_, i) => (
              <Text key={i} style={styles.limitDot}>📜</Text>
            ))}
          </View>
        </View>
      </ImageBackground>
    );
  }

  // ─── Guard: cooldown ──────────────────────────────────────────────────────────

  if (isOnCooldown && step !== 'done') {
    const pct = 1 - timeLeft / COOLDOWN_MS;
    return (
      <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />
        <View style={styles.centreContainer}>
          <Text style={styles.bigEmoji}>⏳</Text>
          <Text style={[styles.guardTitle, { color: theme.gold }]}>Next log available in</Text>
          <View style={[styles.timerRing, { borderColor: theme.green }]}>
            <Text style={[styles.timerDigits, { color: theme.green }]}>
              {formatCountdown(timeLeft)}
            </Text>
            <Text style={[styles.timerLabel, { color: theme.textMuted }]}>remaining</Text>
          </View>
          <View style={[styles.cooldownBar, { backgroundColor: theme.border }]}>
            <View style={[styles.cooldownFill, { backgroundColor: theme.green, width: `${pct * 100}%` }]} />
          </View>
          <Text style={[styles.guardSub, { color: theme.textMuted }]}>
            Logs today: {todayCount} / {MAX_DAILY}
          </Text>
        </View>
      </ImageBackground>
    );
  }

  // ─── Done screen ──────────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />
        <View style={styles.centreContainer}>
          <Text style={styles.bigEmoji}>🪙</Text>
          <Text style={[styles.doneTitle, { color: theme.gold }]}>Quest Logged!</Text>
          <Text style={[styles.doneSub, { color: theme.textMuted }]}>
            +{pointsEarned} gold earned{'\n'}Total: 🪙 {points.total}
          </Text>
          <View style={[styles.cooldownNote, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.cooldownNoteText, { color: theme.textMuted }]}>
              ⏳ Next log unlocks in {Math.ceil(timeLeft / 1000)}s
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: theme.gold }]}
            onPress={() => router.replace('/(child)/home')}
          >
            <Text style={[styles.doneButtonText, { color: theme.bgNav }]}>Back to Quests</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  // ─── Step 1: Mood ─────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.stepLabel, { color: theme.textMuted }]}>STEP 1 OF {totalSteps}</Text>
          <Text style={[styles.title, { color: theme.gold }]}>How does your skin feel?</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Tap the face that matches right now
          </Text>

          <View style={styles.moodGrid}>
            {MOOD_OPTIONS.map(({ score, emoji, label }) => {
              const selected = moodScore === score;
              return (
                <TouchableOpacity
                  key={score}
                  style={[
                    styles.moodCard,
                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                    selected && { borderColor: theme.gold, backgroundColor: 'rgba(255,215,0,0.12)' },
                  ]}
                  onPress={() => setMoodScore(score)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                  <Text style={[styles.moodLabel, { color: selected ? theme.gold : theme.textMuted }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.gold },
              !moodScore && { opacity: 0.35 },
            ]}
            onPress={() => moodScore && setStep(2)}
            disabled={!moodScore}
          >
            <Text style={[styles.primaryBtnText, { color: theme.bgNav }]}>Next →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Text style={[styles.backLinkText, { color: theme.textMuted }]}>← Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    );
  }

  // ─── Step 2: Body areas ───────────────────────────────────────────────────────

  if (step === 2) {
    return (
      <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.stepLabel, { color: theme.textMuted }]}>STEP 2 OF {totalSteps}</Text>
          <Text style={[styles.title, { color: theme.gold }]}>Where is it bothering you?</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Tap all areas that feel itchy or sore today
          </Text>

          <View style={styles.chipGrid}>
            {ALL_AREAS.map((area) => {
              const isSelected  = selectedAreas.includes(area);
              const isMonitored = monitoredAreas.includes(area);
              return (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.bgCard, borderColor: theme.border },
                    isSelected   && { borderColor: theme.gold, backgroundColor: 'rgba(255,215,0,0.12)' },
                    isMonitored && !isSelected && { borderColor: theme.green, borderStyle: 'dashed' },
                  ]}
                  onPress={() => toggleArea(area)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, { color: isSelected ? theme.gold : theme.textMuted }]}>
                    {isMonitored ? '📍 ' : ''}{AREA_LABELS[area]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.hint, { color: theme.textMuted }]}>
            📍 = areas your parent set up to watch
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.gold }]}
            onPress={() => setStep(3)}
          >
            <Text style={[styles.primaryBtnText, { color: theme.bgNav }]}>Next →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}>
            <Text style={[styles.backLinkText, { color: theme.textMuted }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    );
  }

  // ─── Step 4: Special Mission (watch photo) ────────────────────────────────────

  if (step === 4 && watch) {
    const missionEarned = 10 + photoUris.length * 5 + (watchPhotoUri ? 15 : 0);
    return (
      <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.stepLabel, { color: theme.textMuted }]}>STEP 4 OF 4</Text>
          <Text style={[styles.title, { color: theme.gold }]}>⚔ Special Mission!</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Take a photo of your {watch.area.toLowerCase()} for your parent's Watch log.{'\n'}
            This earns you +15 bonus gold!
          </Text>

          {watchPhotoUri ? (
            <View style={styles.watchPhotoContainer}>
              <Image source={{ uri: watchPhotoUri }} style={styles.watchPhotoThumb} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.removePhoto, { backgroundColor: theme.error }]}
                onPress={() => setWatchPhotoUri(null)}
              >
                <Text style={styles.removePhotoX}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.addPhotoSlot, styles.watchPhotoSlot, { borderColor: theme.gold }]}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  quality: 0.8,
                  base64: false,
                });
                if (!result.canceled && result.assets[0]) {
                  setWatchPhotoUri(result.assets[0].uri);
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={[styles.addPhotoText, { color: theme.gold }]}>Take mission photo</Text>
            </TouchableOpacity>
          )}

          <View style={[styles.pointsPreview, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
            <Text style={[styles.pointsPreviewText, { color: theme.gold }]}>
              🪙 {missionEarned} pts this log
            </Text>
            <Text style={[styles.pointsBreakdown, { color: theme.textMuted }]}>
              10 base
              {photoUris.length > 0 ? ` + ${photoUris.length * 5} photo bonus` : ''}
              {watchPhotoUri ? ' + 15 mission bonus' : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.green },
              loading && { opacity: 0.4 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[styles.primaryBtnText, { color: theme.bgNav }]}>
              {loading ? 'Saving…' : `✓ Log it! (+${missionEarned} pts)`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => setStep(3)}>
            <Text style={[styles.backLinkText, { color: theme.textMuted }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    );
  }

  // ─── Step 3: Photos ───────────────────────────────────────────────────────────

  const canAddMore = photoUris.length < MAX_PHOTOS;
  const earned     = 10 + photoUris.length * 5 + (watchPhotoUri ? 15 : 0);

  return (
    <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.48) }]} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.stepLabel, { color: theme.textMuted }]}>STEP 3 OF {totalSteps}</Text>
        <Text style={[styles.title, { color: theme.gold }]}>Add photos? (+5 each)</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Photos help track how your skin changes.{'\n'}
          Up to {MAX_PHOTOS} photos — totally optional!
        </Text>

        {/* Photo slots */}
        <View style={styles.photoRow}>
          {photoUris.map((uri, i) => (
            <View key={i} style={styles.photoThumbContainer}>
              <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
              <TouchableOpacity
                style={[styles.removePhoto, { backgroundColor: theme.error }]}
                onPress={() => setPhotoUris(prev => prev.filter((_, idx) => idx !== i))}
              >
                <Text style={styles.removePhotoX}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {canAddMore && (
            <TouchableOpacity
              style={[styles.addPhotoSlot, { borderColor: theme.border }]}
              onPress={pickPhoto}
              activeOpacity={0.7}
            >
              <Text style={styles.addPhotoIcon}>📷</Text>
              <Text style={[styles.addPhotoText, { color: theme.textMuted }]}>
                {photoUris.length === 0 ? 'Add photo' : 'Add another'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.pointsPreview, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.pointsPreviewText, { color: theme.gold }]}>
            🪙 {earned} pts this log
          </Text>
          <Text style={[styles.pointsBreakdown, { color: theme.textMuted }]}>
            10 base{photoUris.length > 0 ? ` + ${photoUris.length * 5} photo bonus` : ''}
          </Text>
        </View>

        {watch ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.gold }]}
            onPress={() => setStep(4)}
          >
            <Text style={[styles.primaryBtnText, { color: theme.bgNav }]}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.green },
              loading && { opacity: 0.4 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={[styles.primaryBtnText, { color: theme.bgNav }]}>
              {loading ? 'Saving…' : `✓ Log it! (+${earned} pts)`}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.backLink} onPress={() => setStep(2)}>
          <Text style={[styles.backLinkText, { color: theme.textMuted }]}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 56, paddingBottom: 40 },

  stepLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  title:     { fontSize: 24, fontWeight: '900', marginBottom: 6 },
  subtitle:  { fontSize: 14, lineHeight: 20, marginBottom: 32 },
  hint:      { fontSize: 12, marginBottom: 24, textAlign: 'center' },

  // Mood
  moodGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    justifyContent: 'center', marginBottom: 32,
  },
  moodCard: {
    width: 90, paddingVertical: 18, borderRadius: 16,
    alignItems: 'center', gap: 8, borderWidth: 2,
  },
  moodEmoji: { fontSize: 36 },
  moodLabel: { fontSize: 12, fontWeight: '600' },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },

  // Photos
  photoRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
    marginBottom: 20,
  },
  photoThumbContainer: { position: 'relative' },
  photoThumb: { width: 96, height: 96, borderRadius: 12 },
  removePhoto: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  removePhotoX: { color: '#fff', fontSize: 11, fontWeight: '900' },
  addPhotoSlot: {
    width: 96, height: 96, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  addPhotoIcon: { fontSize: 28 },
  addPhotoText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  watchPhotoSlot: { width: 160, height: 160, alignSelf: 'center', marginBottom: 20, borderColor: undefined },
  watchPhotoContainer: { alignSelf: 'center', position: 'relative', marginBottom: 20 },
  watchPhotoThumb: { width: 160, height: 160, borderRadius: 16 },

  // Points preview
  pointsPreview: {
    borderRadius: 12, borderWidth: 1,
    paddingVertical: 12, paddingHorizontal: 16,
    alignItems: 'center', marginBottom: 24, gap: 4,
  },
  pointsPreviewText: { fontSize: 18, fontWeight: '900' },
  pointsBreakdown:   { fontSize: 12 },

  // Buttons
  primaryBtn: {
    borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  backLink:     { alignItems: 'center', paddingVertical: 10 },
  backLinkText: { fontSize: 14 },

  // Guard / cooldown screens
  centreContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 16, padding: 32,
  },
  bigEmoji:   { fontSize: 64 },
  guardTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
  guardSub:   { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  timerRing: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  timerDigits: { fontSize: 36, fontWeight: '900', letterSpacing: 2 },
  timerLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },

  cooldownBar: {
    width: '80%', height: 6, borderRadius: 3, overflow: 'hidden',
  },
  cooldownFill: { height: 6, borderRadius: 3 },

  limitBadges: {
    flexDirection: 'row', gap: 12,
    borderWidth: 1, borderRadius: 16, padding: 12,
  },
  limitDot: { fontSize: 24 },

  // Done
  doneTitle:     { fontSize: 28, fontWeight: '900' },
  doneSub:       { fontSize: 16, textAlign: 'center', lineHeight: 26 },
  cooldownNote: {
    borderRadius: 10, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  cooldownNoteText: { fontSize: 13, fontWeight: '600' },
  doneButton: {
    borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 40, marginTop: 8,
  },
  doneButtonText: { fontWeight: '900', fontSize: 16 },
});
