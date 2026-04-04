/**
 * Watch Detail — shows the photo timeline for an active watch and lets the
 * parent request a Claude analysis of the full sequence.
 *
 * Photos are loaded from Supabase (watch_photos table).
 * Analysis calls POST /analyze-watch via apiFetch.
 */

import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BG, overlayColor } from '@/constants/backgrounds';
import { useTheme } from '@/context/ThemeContext';
import { apiFetch } from '@/lib/api';
import { getWatchPhotos } from '@/lib/storage';
import type { WatchAnalysisResult, WatchPhoto } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

const TREND_CONFIG = {
  improving:        { label: 'Improving',        color: '#4ade80', icon: 'trending-up'   as const },
  stable:           { label: 'Stable',            color: '#FFD700', icon: 'trending-flat' as const },
  worsening:        { label: 'Worsening',         color: '#ef4444', icon: 'trending-down' as const },
  insufficient_data:{ label: 'Not enough data',   color: '#888',    icon: 'help-outline'  as const },
};

export default function WatchDetailScreen() {
  const { theme, isDark } = useTheme();
  const { profile, activeWatch, deactivateWatch } = useAppStore();

  const watch = activeWatch();

  const [photos, setPhotos]     = useState<WatchPhoto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]     = useState<WatchAnalysisResult | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const textPrimary = isDark ? 'rgba(242,249,234,0.95)' : 'rgba(10,30,10,0.90)';
  const textMuted   = isDark ? 'rgba(242,249,234,0.50)' : 'rgba(10,30,10,0.45)';
  const cardBg      = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';

  useEffect(() => {
    if (!watch) { setLoading(false); return; }
    getWatchPhotos(watch.id)
      .then(setPhotos)
      .finally(() => setLoading(false));
  }, [watch?.id]);

  if (!watch) {
    return (
      <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.container} resizeMode="cover">
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.55) }]} />
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(2,11,2,0.85)' : 'rgba(240,248,240,0.85)' }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <MaterialIcons name="arrow-back" size={22} color={theme.green} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.green }]}>Watch Detail</Text>
          <View style={styles.headerBtn} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: textMuted }]}>No active watch found.</Text>
          <TouchableOpacity style={[styles.createBtn, { backgroundColor: theme.green }]} onPress={() => router.replace('/(parent)/watch-create')}>
            <Text style={styles.createBtnText}>Start a Watch</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  async function handleAnalyze() {
    if (!profile || photos.length === 0) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Photos are stored as local file URIs — read directly as base64 via expo-file-system.
      const photoPayloads = await Promise.all(
        photos.slice(0, 10).map(async (p) => {
          const base64 = await FileSystem.readAsStringAsync(p.photoUrl, {
            encoding: 'base64',
          });
          return { photob64: base64, mediaType: 'image/jpeg' as const, timestamp: p.timestamp, area: p.area, notes: p.notes };
        }),
      );

      const body = {
        childName:        profile.name,
        age:              profile.age,
        diagnosis:        profile.diagnosis,
        watchArea:        watch!.area,
        watchDurationDays: watch!.durationDays,
        photos: photoPayloads.map((p) => ({
          photoB64:  p.photob64,
          mediaType: p.mediaType,
          timestamp: p.timestamp,
          area:      p.area,
          notes:     p.notes ?? undefined,
        })),
        triggers: profile.triggers,
      };

      const res = await apiFetch('/analyze-watch', body);
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult({
        summary:             data.summary,
        trend:               data.trend,
        keyObservations:     data.keyObservations ?? data.key_observations ?? [],
        questionsForDoctor:  data.questionsForDoctor ?? data.questions_for_doctor ?? [],
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDeactivate() {
    Alert.alert(
      'End Watch',
      'This will mark the watch as complete. You can view past results but no more photos will be added.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Watch',
          style: 'destructive',
          onPress: async () => {
            await deactivateWatch(watch!.id);
            router.back();
          },
        },
      ],
    );
  }

  // Days elapsed
  const startMs = new Date(watch.startDate).getTime();
  const daysElapsed = Math.floor((Date.now() - startMs) / 86_400_000);
  const daysRemaining = Math.max(0, watch.durationDays - daysElapsed);

  return (
    <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.container} resizeMode="cover">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.55) }]} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? 'rgba(2,11,2,0.85)' : 'rgba(240,248,240,0.85)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={22} color={theme.green} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.green }]}>Watch</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleDeactivate}>
          <MaterialIcons name="stop-circle" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Watch info card */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={[styles.watchAccent, { backgroundColor: theme.green }]} />
          <View style={styles.watchInfoRow}>
            <MaterialIcons name="visibility" size={22} color={theme.green} />
            <View style={styles.watchInfoText}>
              <Text style={[styles.watchArea, { color: textPrimary }]}>{watch.area}</Text>
              <Text style={[styles.watchMeta, { color: textMuted }]}>
                Day {Math.min(daysElapsed + 1, watch.durationDays)} of {watch.durationDays} · {daysRemaining} days left
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />
          <View style={styles.photoCountRow}>
            <Text style={[styles.photoCountLabel, { color: textMuted }]}>Photos logged</Text>
            <Text style={[styles.photoCountValue, { color: theme.gold }]}>{photos.length}</Text>
          </View>
        </View>

        {/* Photo timeline */}
        {loading ? (
          <ActivityIndicator color={theme.green} style={{ marginTop: 20 }} />
        ) : photos.length === 0 ? (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.emptyPhotos, { color: textMuted }]}>
              No photos yet. Ask {profile?.name ?? 'your child'} to log a Special Mission photo.
            </Text>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: textMuted }]}>Photo Timeline</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {photos.map((p, i) => {
                const d = new Date(p.timestamp);
                const label = `${d.getMonth() + 1}/${d.getDate()}`;
                return (
                  <View key={p.id} style={styles.photoItem}>
                    <Image source={{ uri: p.photoUrl }} style={styles.photoThumb} resizeMode="cover" />
                    <Text style={[styles.photoLabel, { color: textMuted }]}>Photo {i + 1}</Text>
                    <Text style={[styles.photoDate, { color: textMuted }]}>{label}</Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Analyze button */}
        <TouchableOpacity
          style={[
            styles.analyzeBtn,
            {
              backgroundColor: (photos.length > 0 && !analyzing) ? theme.green : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'),
              opacity: photos.length > 0 ? 1 : 0.45,
            },
          ]}
          onPress={handleAnalyze}
          disabled={photos.length === 0 || analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#020b02" />
          ) : (
            <>
              <MaterialIcons name="auto-awesome" size={18} color="#020b02" style={{ marginRight: 8 }} />
              <Text style={styles.analyzeBtnText}>Run Analysis</Text>
            </>
          )}
        </TouchableOpacity>

        {error && (
          <View style={[styles.card, { backgroundColor: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.30)' }]}>
            <Text style={{ color: '#ef4444', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {/* Analysis result */}
        {result && (
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.sectionLabel, { color: textMuted }]}>Analysis Result</Text>

            {/* Trend badge */}
            {(() => {
              const tc = TREND_CONFIG[result.trend];
              return (
                <View style={[styles.trendBadge, { backgroundColor: `${tc.color}22`, borderColor: `${tc.color}55` }]}>
                  <MaterialIcons name={tc.icon} size={18} color={tc.color} />
                  <Text style={[styles.trendLabel, { color: tc.color }]}>{tc.label}</Text>
                </View>
              );
            })()}

            <Text style={[styles.summaryText, { color: textPrimary }]}>{result.summary}</Text>

            {result.keyObservations.length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />
                <Text style={[styles.resultSectionLabel, { color: textMuted }]}>Key Observations</Text>
                {result.keyObservations.map((obs, i) => (
                  <Text key={i} style={[styles.bulletText, { color: textPrimary }]}>· {obs}</Text>
                ))}
              </>
            )}

            {result.questionsForDoctor.length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: dividerColor, marginVertical: 12 }]} />
                <Text style={[styles.resultSectionLabel, { color: textMuted }]}>Questions for Your Doctor</Text>
                {result.questionsForDoctor.map((q, i) => (
                  <Text key={i} style={[styles.bulletText, { color: textPrimary }]}>· {q}</Text>
                ))}
              </>
            )}
          </View>
        )}

      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 12, paddingHorizontal: 20 },
  headerBtn:        { width: 36 },
  headerTitle:      { fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  content:          { padding: 20, gap: 16, paddingBottom: 60 },
  centered:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  emptyText:        { fontSize: 15, textAlign: 'center' },
  createBtn:        { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  createBtnText:    { fontSize: 15, fontWeight: '700', color: '#020b02' },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  watchAccent:      { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  watchInfoRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12 },
  watchInfoText:    { flex: 1 },
  watchArea:        { fontSize: 16, fontWeight: '700' },
  watchMeta:        { fontSize: 12, marginTop: 2 },
  divider:          { height: 1 },
  photoCountRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12 },
  photoCountLabel:  { fontSize: 12 },
  photoCountValue:  { fontSize: 20, fontWeight: '700' },
  sectionLabel:     { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 12 },
  photoScroll:      { marginHorizontal: -4 },
  photoItem:        { alignItems: 'center', marginHorizontal: 4 },
  photoThumb:       { width: 80, height: 80, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.10)' },
  photoLabel:       { fontSize: 10, marginTop: 4 },
  photoDate:        { fontSize: 10 },
  emptyPhotos:      { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  analyzeBtn:       { borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  analyzeBtnText:   { fontSize: 16, fontWeight: '700', color: '#020b02' },
  trendBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start', marginBottom: 12 },
  trendLabel:       { fontSize: 13, fontWeight: '700' },
  summaryText:      { fontSize: 14, lineHeight: 21 },
  resultSectionLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginBottom: 8 },
  bulletText:       { fontSize: 13, lineHeight: 20, marginBottom: 4 },
});
