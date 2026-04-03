import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PIN_KEY = 'eczcalibur_child_pin';
const PIN_LENGTH = 4;

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
};

interface PinVerifyModalProps {
  visible: boolean;
  prompt?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Modal PIN verification — used to gate child→parent navigation.
 * Shows only the keypad entry (no set-PIN flow — PinGate handles that).
 */
export function PinVerifyModal({ visible, prompt, onSuccess, onCancel }: PinVerifyModalProps) {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleDigit(digit: string) {
    if (pinInput.length >= PIN_LENGTH) return;
    const next = pinInput + digit;
    setPinInput(next);
    if (next.length === PIN_LENGTH) {
      verify(next);
    }
  }

  function handleDelete() {
    setPinInput((prev) => prev.slice(0, -1));
    setError(null);
  }

  async function verify(input: string) {
    const stored = await storage.getItem(PIN_KEY);
    if (input === stored) {
      setPinInput('');
      setError(null);
      onSuccess();
    } else {
      setError('Wrong PIN. Try again.');
      setPinInput('');
    }
  }

  function handleCancel() {
    setPinInput('');
    setError(null);
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>🔒 Parent Mode</Text>
          <Text style={styles.prompt}>
            {prompt ?? 'Enter your PIN to switch to Parent View'}
          </Text>

          <View style={styles.dots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View key={i} style={[styles.dot, i < pinInput.length && styles.dotFilled]} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.key, !key && styles.keyEmpty]}
                onPress={() => {
                  if (key === '⌫') handleDelete();
                  else if (key) handleDigit(key);
                }}
                disabled={!key}
              >
                <Text style={styles.keyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 48,
    gap: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f5c842',
  },
  prompt: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  dots: {
    flexDirection: 'row',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f5c842',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#f5c842',
  },
  error: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 240,
    gap: 12,
    justifyContent: 'center',
  },
  key: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a3a5e',
  },
  keyEmpty: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  keyText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
  },
});
