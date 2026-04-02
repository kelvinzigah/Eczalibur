import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';

// expo-secure-store is not available on web — fall back to localStorage
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    return SecureStore.setItemAsync(key, value);
  },
};
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PIN_KEY = 'eczcalibur_child_pin';
const PIN_LENGTH = 4;

interface PinGateProps {
  children: React.ReactNode;
}

export function PinGate({ children }: PinGateProps) {
  const [status, setStatus] = useState<'loading' | 'set-pin' | 'enter-pin' | 'unlocked'>('loading');
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmPin, setConfirmPin] = useState('');
  const [settingStep, setSettingStep] = useState<'enter' | 'confirm'>('enter');

  useEffect(() => {
    async function checkPin() {
      const stored = await storage.getItem(PIN_KEY);
      setStatus(stored ? 'enter-pin' : 'set-pin');
    }
    checkPin();
  }, []);

  function handleDigit(digit: string) {
    if (status === 'enter-pin') {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length === PIN_LENGTH) {
        verifyPin(next);
      }
    } else if (status === 'set-pin') {
      if (settingStep === 'enter') {
        const next = pinInput + digit;
        setPinInput(next);
        if (next.length === PIN_LENGTH) {
          setConfirmPin(next);
          setPinInput('');
          setSettingStep('confirm');
        }
      } else {
        const next = pinInput + digit;
        setPinInput(next);
        if (next.length === PIN_LENGTH) {
          if (next === confirmPin) {
            savePin(next);
          } else {
            setError('PINs do not match. Try again.');
            setPinInput('');
            setSettingStep('enter');
            setConfirmPin('');
          }
        }
      }
    }
  }

  function handleDelete() {
    setPinInput((prev) => prev.slice(0, -1));
    setError(null);
  }

  async function verifyPin(input: string) {
    const stored = await storage.getItem(PIN_KEY);
    if (input === stored) {
      setStatus('unlocked');
    } else {
      setError('Wrong PIN. Try again.');
      setPinInput('');
    }
  }

  async function savePin(pin: string) {
    await storage.setItem(PIN_KEY, pin);
    setStatus('unlocked');
  }

  if (status === 'loading') {
    return (
      <View style={styles.container}>
        <ActivityIndicator color="#f5c842" size="large" />
      </View>
    );
  }

  if (status === 'unlocked') {
    return <>{children}</>;
  }

  const isSettingPin = status === 'set-pin';
  const label = isSettingPin
    ? settingStep === 'enter'
      ? 'Set a 4-digit PIN for the child view'
      : 'Confirm your PIN'
    : 'Enter your PIN';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗡️ Eczcalibur</Text>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.dots}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < pinInput.length && styles.dotFilled]}
          />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f5c842',
  },
  label: {
    fontSize: 16,
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
});
