/**
 * Watches — parent view of all MAVL watch configs.
 *
 * Tabs: All | Active | Past
 * - Tap an active watch → watch-detail
 * - Long press any watch → select it (red highlight) → delete button appears
 * - One active watch at a time (enforced at creation)
 * - "+" header button → watch-create (only shown when no active watch)
 *
 * This screen can be removed from _layout.tsx (set href: null) without
 * breaking anything — watch-detail and watch-create remain accessible
 * via the dashboard banner.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BG, overlayColor } from '@/constants/backgrounds';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import type { WatchConfig } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabFilter = 'all' | 'active' | 'past';

// ─── WatchRow ─────────────────────────────────────────────────────────────────

function WatchRow({
  watch,
  isSelected,
  onPress,
  onLongPress,
  onDelete,
}: {
  watch: WatchConfig;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
}) {
  const { theme, isDark } = useTheme();

  const cardBg     = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)';
  const cardBorder = isSelected
    ? '#ef4444'
    : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
  const textPrimary = isDark ? 'rgba(242,249,234,0.95)' : 'rgba(10,30,10,0.90)';
  const textMuted   = isDark ? 'rgba(242,249,234,0.50)' : 'rgba(10,30,10,0.45)';

  const startMs     = new Date(watch.startDate).getTime();
  const daysElapsed = Math.floor((Date.now() - startMs) / 86_400_000);
  const daysLeft    = Math.max(0, watch.durationDays - daysElapsed);

  const endDate = new Date(startMs + watch.durationDays * 86_400_000);
  const endLabel = `${endDate.getMonth() + 1}/${endDate.getDate()}/${endDate.getFullYear()}`;

  const startLabel = (() => {
    const d = new Date(watch.startDate);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  })();

  return (
    <TouchableOpacity
      activeOpacity={0.80}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {/* Left accent bar */}
        <View
          style={[
            styles.accentBar,
            { backgroundColor: watch.active ? theme.green : 'rgba(136,136,136,0.5)' },
          ]}
        />

        <View style={styles.cardContent}>
          {/* Top row: area + status badge */}
          <View style={styles.cardTopRow}>
            <MaterialIcons
              name="visibility"
              size={16}
              color={watch.active ? theme.green : '#888'}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.areaText, { color: textPrimary }]} numberOfLines={1}>
              {watch.area}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: watch.active
                    ? (isDark ? 'rgba(74,222,128,0.18)' : 'rgba(74,222,128,0.22)')
                    : (isDark ? 'rgba(136,136,136,0.18)' : 'rgba(136,136,136,0.15)'),
                  borderColor: watch.active ? theme.green : '#888',
                },
              ]}
            >
              <Text style={[styles.statusText, { color: watch.active ? theme.green : '#888' }]}>
                {watch.active ? 'Active' : 'Past'}
              </Text>
            </View>
          </View>

          {/* Meta row */}
          <Text style={[styles.metaText, { color: textMuted }]}>
            {watch.durationDays}-day watch · Started {startLabel}
          </Text>
          <Text style={[styles.metaText, { color: textMuted }]}>
            {watch.active
              ? `Day ${Math.min(daysElapsed + 1, watch.durationDays)} of ${watch.durationDays} · ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
              : `Ended ${endLabel}`}
          </Text>

          {/* Delete button (shown only when selected) */}
          {isSelected && (
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Chevron (tap hint, only on active) */}
        {watch.active && !isSelected && (
          <MaterialIcons name="chevron-right" size={20} color={textMuted} style={styles.chevron} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WatchesScreen() {
  const { isDark } = useTheme();
  const { watchConfigs, activeWatch, removeWatch } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const hasActiveWatch = activeWatch() !== null;

  const filtered = [...watchConfigs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((w) => {
      if (activeTab === 'active') return w.active;
      if (activeTab === 'past')   return !w.active;
      return true;
    });

  const TABS: { key: TabFilter; label: string }[] = [
    { key: 'all',    label: 'All'    },
    { key: 'active', label: 'Active' },
    { key: 'past',   label: 'Past'   },
  ];

  function handlePress(watch: WatchConfig) {
    if (selectedId) {
      // Deselect on tap when in selection mode
      setSelectedId(null);
      return;
    }
    if (watch.active) {
      router.push('/(parent)/watch-detail');
    }
  }

  function handleLongPress(id: string) {
    setSelectedId((prev) => (prev === id ? null : id));
  }

  function handleDelete(watch: WatchConfig) {
    const label = watch.active ? 'Delete & end' : 'Delete';
    Alert.alert(
      `${label} Watch?`,
      `"${watch.area}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setSelectedId(null) },
        {
          text: label,
          style: 'destructive',
          onPress: async () => {
            setSelectedId(null);
            await removeWatch(watch.id);
          },
        },
      ],
    );
  }

  return (
    <ImageBackground
      source={isDark ? BG.dark : BG.light}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor(isDark, 0.50) }]} />

      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Watches</Text>
        {!hasActiveWatch && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/(parent)/watch-create')}
          >
            <MaterialIcons name="add" size={22} color="#FFD700" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.pill, activeTab === key && styles.pillActive]}
            onPress={() => { setActiveTab(key); setSelectedId(null); }}
          >
            <Text style={[styles.pillText, activeTab === key && styles.pillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WatchRow
            watch={item}
            isSelected={selectedId === item.id}
            onPress={() => handlePress(item)}
            onLongPress={() => handleLongPress(item.id)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyInner}>
            <MaterialIcons name="visibility-off" size={40} color="#555" />
            <Text style={styles.emptyText}>
              {activeTab === 'active'
                ? 'No active watch.\nTap + to start monitoring a skin area.'
                : activeTab === 'past'
                ? 'No past watches yet.'
                : 'No watches yet.\nTap + to start your first watch.'}
            </Text>
            {activeTab !== 'past' && !hasActiveWatch && (
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => router.push('/(parent)/watch-create')}
              >
                <Text style={styles.emptyCreateText}>Start a Watch</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Selection hint */}
      {selectedId && (
        <View style={styles.selectionHint}>
          <Text style={styles.selectionHintText}>Long press to deselect</Text>
        </View>
      )}
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  addBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#3a3a5e',
    backgroundColor: '#2a2a3e',
  },
  pillActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700',
  },
  pillText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
  pillTextActive: { color: '#1a1a2e' },
  listContent: { paddingHorizontal: 20, paddingBottom: 32 },
  emptyContainer: { flex: 1 },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    color: '#555',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyCreateBtn: {
    marginTop: 8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCreateText: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 4,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardContent: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  areaText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  metaText: { fontSize: 12 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
  },
  deleteBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },
  chevron: { marginRight: 12 },
  selectionHint: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  selectionHintText: { color: '#fff', fontSize: 12 },
});
