import { apiFetch } from '@/lib/api';
import { useState } from 'react';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import { BG, overlayColor } from '@/constants/backgrounds';

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

export default function AppointmentScreen() {
  const { isDark } = useTheme();
  const { isHydrated, profile, flareLogs } = useAppStore();

  const [appointmentDate, setAppointmentDate] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!isHydrated) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#FFD700" size="large" />
      </View>
    );
  }

  async function handleGenerate() {
    if (!isValidDate(appointmentDate)) {
      Alert.alert('Invalid date', 'Please enter the date in YYYY-MM-DD format (e.g. 2026-05-15).');
      return;
    }
    if (!profile) {
      Alert.alert('No profile', 'Complete onboarding before generating a summary.');
      return;
    }
    setLoading(true);
    setSummary(null);
    try {
      const res = await apiFetch('/appointment-summary', { profile, logs: flareLogs, appointmentDate });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setSummary(data.summary ?? '');
    } catch (err) {
      Alert.alert('Generation failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    if (!summary) return;
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
        return;
      }
      const file = new File(Paths.cache, `eczalibur-summary-${appointmentDate}.txt`);
      file.write(summary);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Appointment Summary',
      });
    } catch (err) {
      Alert.alert('Share failed', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSharing(false);
    }
  }

  return (
    <ImageBackground source={isDark ? BG.dark : BG.light} style={styles.screen} resizeMode="cover">
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.50) }]} />
      <KeyboardAvoidingView
        style={styles.innerScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Appointment Summary</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Privacy disclosure */}
        <View style={styles.disclosureBanner}>
          <Text style={styles.disclosureText}>
            🔒 This data is shared with Claude only to generate this summary. Not stored on any server.
          </Text>
        </View>

        {/* Date input */}
        <Text style={styles.label}>Appointment Date</Text>
        <TextInput
          style={styles.input}
          value={appointmentDate}
          onChangeText={setAppointmentDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#555"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          autoCapitalize="none"
        />

        {/* Generate button */}
        <TouchableOpacity
          style={[styles.generateBtn, loading && styles.disabledBtn]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1a1a2e" />
          ) : (
            <Text style={styles.generateBtnText}>Generate Summary</Text>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingText}>Generating clinical summary…</Text>
        )}

        {/* Summary output */}
        {summary && !loading && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>CLINICAL SUMMARY</Text>
            <Text style={styles.summaryText} selectable>
              {summary}
            </Text>
          </View>
        )}

        {/* Share button */}
        {summary && !loading && (
          <TouchableOpacity
            style={[styles.shareBtn, sharing && styles.disabledBtn]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color="#1a1a2e" />
            ) : (
              <Text style={styles.shareBtnText}>📤 Share Summary</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  innerScreen: { flex: 1 },
  loadingScreen: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  backBtn: { paddingRight: 12, paddingVertical: 4 },
  backText: { color: '#FFD700', fontSize: 15, fontWeight: '600' },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  headerSpacer: { width: 48 },
  disclosureBanner: {
    backgroundColor: '#1e1e35',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3a5e',
    padding: 12,
  },
  disclosureText: { color: '#aaa', fontSize: 12, lineHeight: 18 },
  label: { color: '#aaa', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#2a2a3e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a5e',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    fontSize: 15,
  },
  generateBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  generateBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
  disabledBtn: { opacity: 0.4 },
  loadingText: { color: '#aaa', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  summaryCard: {
    backgroundColor: '#2a2a3e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3a3a5e',
    padding: 18,
    gap: 10,
  },
  summaryLabel: {
    color: '#888',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  summaryText: { color: '#fff', fontSize: 14, lineHeight: 22 },
  shareBtn: {
    backgroundColor: '#4ade80',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  shareBtnText: { color: '#0d2b0d', fontWeight: 'bold', fontSize: 16 },
});
