import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import type { Prize } from '@/lib/types';

const MAX_PRIZES = 6;

// ─── Prize edit modal ─────────────────────────────────────────────────────────

interface PrizeModalProps {
  visible: boolean;
  initial: Prize | null; // null = new prize
  onSave: (data: { name: string; icon: string; pointCost: number; description: string }) => void;
  onClose: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
}

function PrizeModal({ visible, initial, onSave, onClose, theme }: PrizeModalProps) {
  const [name,   setName]   = useState(initial?.name        ?? '');
  const [icon,   setIcon]   = useState(initial?.icon        ?? '🎁');
  const [cost,   setCost]   = useState(String(initial?.pointCost ?? 50));
  const [desc,   setDesc]   = useState(initial?.description ?? '');

  // Reset when modal opens with new data
  const handleOpen = () => {
    setName(initial?.name        ?? '');
    setIcon(initial?.icon        ?? '🎁');
    setCost(String(initial?.pointCost ?? 50));
    setDesc(initial?.description ?? '');
  };

  function handleSave() {
    const parsed = parseInt(cost, 10);
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter a prize name.');
      return;
    }
    if (isNaN(parsed) || parsed < 1) {
      Alert.alert('Invalid cost', 'Gold cost must be a positive number.');
      return;
    }
    onSave({ name: name.trim(), icon: icon || '🎁', pointCost: parsed, description: desc.trim() });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onShow={handleOpen}>
      <KeyboardAvoidingView
        style={styles.modalOuter}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.prizeModalSheet, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
            {initial ? 'Edit Prize' : 'New Prize'}
          </Text>

          <View style={styles.fieldRow}>
            <View style={[styles.iconField, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
              <TextInput
                value={icon}
                onChangeText={setIcon}
                maxLength={2}
                style={styles.iconInput}
              />
            </View>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Prize name"
              placeholderTextColor={theme.textMuted}
              style={[styles.nameInput, { backgroundColor: theme.bgSurface, borderColor: theme.border, color: theme.textPrimary }]}
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>🪙 Gold cost</Text>
            <TextInput
              value={cost}
              onChangeText={setCost}
              keyboardType="numeric"
              style={[styles.inlineInput, { color: theme.textPrimary }]}
            />
          </View>

          <View style={[styles.inputWrap, { backgroundColor: theme.bgSurface, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.textMuted }]}>Description (optional)</Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Short description shown in store"
              placeholderTextColor={theme.textMuted}
              multiline
              style={[styles.inlineInput, styles.multilineInput, { color: theme.textPrimary }]}
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.gold }]}
              onPress={handleSave}
            >
              <Text style={[styles.modalBtnText, { color: theme.bgNav }]}>
                {initial ? 'Save Changes' : 'Add Prize'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.bgSurface, borderWidth: 1, borderColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalBtnText, { color: theme.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Settings screen ─────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { theme }   = useTheme();
  const { prizes, addPrize, updatePrize, removePrize, reset, resetDailyLogs } = useAppStore();

  const [editTarget, setEditTarget] = useState<Prize | null | 'new'>('new');
  const [modalVisible, setModalVisible] = useState(false);

  function openEdit(prize: Prize) {
    setEditTarget(prize);
    setModalVisible(true);
  }

  function openAdd() {
    setEditTarget('new');
    setModalVisible(true);
  }

  async function handleSave(data: { name: string; icon: string; pointCost: number; description: string }) {
    if (editTarget === 'new' || editTarget === null) {
      const newPrize: Prize = {
        id: `prize_${Date.now()}`,
        ...data,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      await addPrize(newPrize);
    } else {
      await updatePrize(editTarget.id, data);
    }
    setModalVisible(false);
  }

  function confirmRemove(prize: Prize) {
    Alert.alert(
      `Remove "${prize.name}"?`,
      'This will remove the prize from the child\'s store.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removePrize(prize.id) },
      ],
    );
  }

  function confirmResetLogs() {
    Alert.alert(
      'Reset today\'s logs?',
      'This erases all of today\'s flare logs from memory. Claude will have no context of them, and the child can enter 3 new logs. Accumulated points are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Logs',
          style: 'destructive',
          onPress: async () => {
            await resetDailyLogs();
            Alert.alert('Done', 'Today\'s logs have been cleared.');
          },
        },
      ],
    );
  }

  function confirmReOnboard() {
    Alert.alert(
      'Reset & Re-onboard?',
      'This wipes the child\'s profile, all logs, points, and prizes. The app will restart onboarding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset Everything', style: 'destructive', onPress: () => reset() },
      ],
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bgPrimary }]}>
      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: theme.bgNav }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={22} color={theme.green} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { color: theme.green }]}>SETTINGS</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── DATA ── */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>DATA</Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          onPress={confirmResetLogs}
        >
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,193,7,0.12)' }]}>
            <MaterialIcons name="today" size={20} color={theme.gold} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Reset Daily Logs</Text>
            <Text style={[styles.rowSub, { color: theme.textMuted }]}>
              Erase today's logs so the child can log 3 new ones. Points are kept.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: theme.bgCard, borderColor: theme.error }]}
          onPress={confirmReOnboard}
        >
          <View style={[styles.rowIcon, { backgroundColor: 'rgba(176,37,0,0.12)' }]}>
            <MaterialIcons name="restart-alt" size={20} color={theme.error} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: theme.error }]}>Reset & Re-onboard</Text>
            <Text style={[styles.rowSub, { color: theme.textMuted }]}>
              Wipes all data including profile, logs, points, and prizes. Cannot be undone.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
        </TouchableOpacity>

        {/* ── PRIZE STORE ── */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>PRIZE STORE</Text>
          <Text style={[styles.prizesCount, { color: theme.textMuted }]}>
            {prizes.length} / {MAX_PRIZES}
          </Text>
        </View>

        <FlatList
          data={prizes}
          keyExtractor={(p) => p.id}
          scrollEnabled={false}
          contentContainerStyle={styles.prizeList}
          renderItem={({ item }) => (
            <View style={[styles.prizeRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
              <Text style={styles.prizeIcon}>{item.icon}</Text>
              <View style={styles.prizeInfo}>
                <Text style={[styles.prizeName, { color: theme.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.prizeCost, { color: theme.gold }]}>🪙 {item.pointCost}</Text>
              </View>
              <TouchableOpacity
                style={[styles.prizeAction, { backgroundColor: theme.bgSurface }]}
                onPress={() => openEdit(item)}
              >
                <MaterialIcons name="edit" size={16} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.prizeAction, { backgroundColor: 'rgba(176,37,0,0.12)' }]}
                onPress={() => confirmRemove(item)}
              >
                <MaterialIcons name="delete-outline" size={16} color={theme.error} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.emptyPrizes, { color: theme.textMuted }]}>
              No prizes yet — add one below.
            </Text>
          }
        />

        {prizes.length < MAX_PRIZES ? (
          <TouchableOpacity
            style={[styles.addPrizeBtn, { borderColor: theme.borderActive }]}
            onPress={openAdd}
          >
            <MaterialIcons name="add" size={18} color={theme.green} />
            <Text style={[styles.addPrizeBtnText, { color: theme.green }]}>Add Prize</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.maxNote, { color: theme.textMuted }]}>
            Maximum {MAX_PRIZES} prizes reached.
          </Text>
        )}

        {/* ── ACCOUNT ── */}
        <Text style={[styles.sectionHeader, { color: theme.textMuted, marginTop: 8 }]}>ACCOUNT</Text>

        <TouchableOpacity
          style={[styles.settingRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
          onPress={() => {
            Alert.alert('Sign out?', 'You will need to sign in again.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
            ]);
          }}
        >
          <View style={[styles.rowIcon, { backgroundColor: theme.bgSurface }]}>
            <MaterialIcons name="logout" size={20} color={theme.textMuted} />
          </View>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: theme.textPrimary }]}>Sign Out</Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={theme.textMuted} />
        </TouchableOpacity>

      </ScrollView>

      <PrizeModal
        visible={modalVisible}
        initial={editTarget === 'new' ? null : editTarget}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
        theme={theme}
      />
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
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },

  scroll: { padding: 16, gap: 10, paddingBottom: 60 },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  prizesCount: { fontSize: 11, fontWeight: '600' },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText:  { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: '700' },
  rowSub:   { fontSize: 12, lineHeight: 17 },

  // Prize list
  prizeList: { gap: 8 },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  prizeIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  prizeInfo: { flex: 1, gap: 2 },
  prizeName: { fontSize: 14, fontWeight: '700' },
  prizeCost: { fontSize: 12, fontWeight: '600' },
  prizeAction: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyPrizes: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  addPrizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 14,
    marginTop: 4,
  },
  addPrizeBtnText: { fontSize: 14, fontWeight: '700' },
  maxNote: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },

  // Prize modal
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  prizeModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },

  fieldRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconField: {
    width: 56, height: 56, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  iconInput: { fontSize: 28, textAlign: 'center' },
  nameInput: {
    flex: 1, height: 56, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, fontSize: 15, fontWeight: '600',
  },

  inputWrap: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, gap: 4,
  },
  inputLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  inlineInput:   { fontSize: 15, fontWeight: '600', padding: 0 },
  multilineInput: { minHeight: 48, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: {
    flex: 1, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBtnText: { fontSize: 14, fontWeight: '800' },
});
