import { useSignIn } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'credentials' | 'otp' | 'otp2'>('credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else if (result.status === 'needs_first_factor') {
        await signIn.prepareFirstFactor({ strategy: 'email_code' } as Parameters<typeof signIn.prepareFirstFactor>[0]);
        setStage('otp');
      } else if (result.status === 'needs_second_factor') {
        // Pick the first available second factor strategy
        const supported = result.supportedSecondFactors ?? [];
        const factor = supported[0];
        if (!factor) {
          setError('2FA is required but no method is enrolled. Disable MFA enforcement in your Clerk dashboard.');
          return;
        }
        if (factor.strategy === 'totp') {
          // TOTP doesn't need prepare — just show input
        } else {
          await signIn.prepareSecondFactor({ strategy: factor.strategy } as Parameters<typeof signIn.prepareSecondFactor>[0]);
        }
        setStage('otp2');
      } else {
        setError(`Unexpected status: ${result.status}. Contact support.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Check your credentials.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp2() {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const supported = signIn.supportedSecondFactors ?? [];
      const strategy = (supported[0]?.strategy ?? 'totp') as Parameters<typeof signIn.attemptSecondFactor>[0]['strategy'];
      const result = await signIn.attemptSecondFactor({
        strategy,
        code: otp.trim(),
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('2FA verification incomplete. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid 2FA code. Try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtp() {
    if (!isLoaded) return;
    setLoading(true);
    setError(null);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code: otp.trim(),
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/');
      } else {
        setError('Verification incomplete. Please try again.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>Eczcalibur</Text>

        {stage === 'credentials' ? (
          <>
            <Text style={styles.subtitle}>Sign in to continue</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#888"
              autoCapitalize="none"
              keyboardType="default"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSignIn} disabled={loading}>
              {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.buttonText}>Sign In</Text>}
            </TouchableOpacity>
          </>
        ) : stage === 'otp' ? (
          <>
            <Text style={styles.subtitle}>Check your email for a verification code</Text>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor="#888"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.buttonText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStage('credentials'); setError(null); setOtp(''); }}>
              <Text style={styles.backLink}>← Back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Two-factor authentication required</Text>
            <Text style={styles.hint}>Dev mode: use code 424242</Text>
            <TextInput
              style={styles.input}
              placeholder="Authentication code"
              placeholderTextColor="#888"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleOtp2} disabled={loading}>
              {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.buttonText}>Verify 2FA</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStage('credentials'); setError(null); setOtp(''); }}>
              <Text style={styles.backLink}>← Back</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#f5c842', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 16 },
  input: { height: 52, backgroundColor: '#2a2a3e', borderRadius: 12, paddingHorizontal: 16, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#3a3a5e' },
  error: { color: '#ff6b6b', fontSize: 14, textAlign: 'center' },
  button: { height: 52, backgroundColor: '#f5c842', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold' },
  backLink: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 4 },
  hint: { color: '#f5c842', fontSize: 12, textAlign: 'center', opacity: 0.7 },
});
