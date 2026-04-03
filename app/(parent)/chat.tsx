import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage } from '@/lib/types';

export default function ChatScreen() {
  const { theme, isDark } = useTheme();
  const { isHydrated, profile, flareLogs } = useAppStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  if (!isHydrated) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: theme.bgPrimary }]}>
        <ActivityIndicator color={theme.gold} size="large" />
      </View>
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const updatedMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      if (!profile) throw new Error('No profile loaded');

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          recentLogs: flareLogs.slice(-30),
          profile: {
            name: profile.name,
            age: profile.age,
            diagnosis: profile.diagnosis,
            medications: profile.medications,
            triggers: profile.triggers,
          },
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Something went wrong. Please check your connection and try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.headerRow, { backgroundColor: theme.bgNav }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: theme.gold }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Claude Chat</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Privacy banner */}
      <View style={[styles.disclosureBanner, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
        <Text style={[styles.disclosureText, { color: theme.textMuted }]}>
          🔒 Your child's health data (profile, logs) is transmitted to Anthropic's API to generate responses. It is not stored by us or Anthropic after processing. By using this chat you consent on behalf of your child.
        </Text>
      </View>

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        style={styles.messageList}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user'
                ? { backgroundColor: theme.gold, alignSelf: 'flex-end' as const }
                : { backgroundColor: theme.bgCard, alignSelf: 'flex-start' as const, borderWidth: 1, borderColor: theme.border },
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === 'user'
                  ? { color: theme.bgNav, fontWeight: '600' as const }
                  : { color: theme.textPrimary },
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={[styles.emptyChatText, { color: theme.textMuted }]}>
              Ask Claude anything about{'\n'}
              {profile?.name ?? 'your child'}'s eczema management.
            </Text>
            <Text style={[styles.emptyChatHint, { color: theme.textMuted }]}>
              Try: "Why might she flare more on weekends?" or "What should I ask at the next appointment?"
            </Text>
          </View>
        }
        contentContainerStyle={
          messages.length === 0 ? styles.emptyContainer : styles.listContent
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={theme.gold} size="small" />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Claude is thinking…</Text>
        </View>
      )}

      {/* Input row */}
      <View style={[styles.inputRow, { backgroundColor: theme.bgNav, borderColor: theme.border }]}>
        <TextInput
          style={[styles.textInput, { backgroundColor: theme.bgCard, borderColor: theme.border, color: theme.textPrimary }, loading && styles.inputDisabled]}
          value={input}
          onChangeText={setInput}
          placeholder="Ask a question…"
          placeholderTextColor={theme.textMuted}
          multiline
          editable={!loading}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: theme.gold }, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          <Text style={[styles.sendBtnText, { color: theme.bgNav }]}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  backBtn: { paddingRight: 12, paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: '600' },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  headerSpacer: { width: 48 },
  disclosureBanner: {
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  disclosureText: { fontSize: 11, lineHeight: 16 },
  messageList: { flex: 1 },
  listContent: { paddingVertical: 12 },
  emptyContainer: { flex: 1 },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
    gap: 12,
  },
  emptyChatText: { fontSize: 16, textAlign: 'center', lineHeight: 24, fontWeight: '600' },
  emptyChatHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontStyle: 'italic' },
  bubble: {
    maxWidth: '80%',
    borderRadius: 14,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
  },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  loadingText: { fontSize: 13, fontStyle: 'italic' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  inputDisabled: { opacity: 0.5 },
  sendBtn: { borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontWeight: 'bold', fontSize: 14 },
});
