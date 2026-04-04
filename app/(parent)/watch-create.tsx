/**
 * Watch Create — parent selects a skin area + monitoring duration and saves a
 * WatchConfig. Navigates back to dashboard on success.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BG, overlayColor } from '@/constants/backgrounds';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import type { WatchConfig } from '@/lib/types';

const AREAS = [
  'Left elbow crease',
  'Right elbow crease',
  'Left knee crease',
  'Right knee crease',
  'Face',
  'Neck',
  'Chest',
  'Back',
  'Left wrist',
  'Right wrist',
  'Hands',
  'Scalp',
  'Other',
];

const DURATIONS: { days: 7 | 14 | 21; label: string }[] = [
  { days: 7,  label: '7 days'  },
  { days: 14, label: '14 days' },
  { days: 21, label: '21 days' },
];

export default function WatchCreateScreen() {
  const { theme, isDark } = useTheme();
  const { profile, addWatchConfig } = useAppStore();

  const [selectedArea, setSelectedArea]       = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<7 | 14 | 21>(14);
  const [saving, setSaving]                   = useState(false);

  const textPrimary = isDark ? 'rgba(242,249,234,0.95)' : 'rgba(10,30,10,0.90)';
  const textMuted   = isDark ? 'rgba(242,249,234,0.50)' : 'rgba(10,30,10,0.45)';
  const cardBg      = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)';
  const cardBorder  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';

  async function handleSave() {
    if (!selectedArea || !profile) return;
    setSaving(true);
    const now = new Date();
    const config: WatchConfig = {
      id:           `watch-${Date.now()}`,
      childId:      profile.id,
      area:         selectedArea,
      durationDays: selectedDuration,
      startDate:    now.toISOString().slice(0, 10),
      active:       true,
      createdAt:    now.toISOString(),
    };
    await addWatchConfig(config);
    setSaving(false);
    router.back();
  }

  return (
    <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.container} resizeMode="cover">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.55) }]} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? 'rgba(2,11,2,0.85)' : 'rgba(240,248,240,0.85)' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={theme.green} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.green }]}>New Watch</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Area selection */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>Skin Area to Monitor</Text>
          <View style={styles.areaGrid}>
            {AREAS.map((area) => {
              const active = selectedArea === area;
              return (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.areaChip,
                    {
                      backgroundColor: active
                        ? (isDark ? 'rgba(74,222,128,0.20)' : 'rgba(74,222,128,0.30)')
                        : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                      borderColor: active ? theme.green : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                    },
                  ]}
                  onPress={() => setSelectedArea(area)}
                >
                  <Text style={[styles.areaChipText, { color: active ? theme.green : textPrimary }]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Duration selection */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionLabel, { color: textMuted }]}>Monitoring Duration</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map(({ days, label }) => {
              const active = selectedDuration === days;
              return (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.durationChip,
                    {
                      backgroundColor: active
                        ? (isDark ? 'rgba(74,222,128,0.20)' : 'rgba(74,222,128,0.30)')
                        : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'),
                      borderColor: active ? theme.green : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'),
                    },
                  ]}
                  onPress={() => setSelectedDuration(days)}
                >
                  <Text style={[styles.durationText, { color: active ? theme.green : textPrimary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: selectedArea ? theme.green : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'),
              opacity: selectedArea ? 1 : 0.5,
            },
          ]}
          onPress={handleSave}
          disabled={!selectedArea || saving}
        >
          {saving ? (
            <ActivityIndicator color="#020b02" />
          ) : (
            <Text style={styles.saveBtnText}>Start Watch</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 12, paddingHorizontal: 20 },
  backBtn:     { width: 36 },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  content:     { padding: 20, gap: 16, paddingBottom: 60 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 14 },
  areaGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  areaChipText: { fontSize: 13, fontWeight: '500' },
  durationRow:  { flexDirection: 'row', gap: 10 },
  durationChip: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  durationText: { fontSize: 14, fontWeight: '600' },
  saveBtn:      { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  saveBtnText:  { fontSize: 16, fontWeight: '700', color: '#020b02', letterSpacing: 0.5 },
});
