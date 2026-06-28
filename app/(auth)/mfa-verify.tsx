import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function MfaVerifyScreen() {
  const router = useRouter();
  const { error, isAuthLoading, mfaVerify } = useAuthStore();
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    try {
      await mfaVerify(code);
      router.replace('/(app)/dashboard');
    } catch {}
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🛡️</Text>
        </View>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit verification code from your authenticator app to continue.
        </Text>
      </View>

      {/* Card */}
      <View style={styles.card}>

        <Text style={styles.inputLabel}>Verification Code</Text>

        {/* Code Input */}
        <TextInput
          style={[styles.codeInput, error ? styles.codeInputError : null]}
          placeholder="000000"
          placeholderTextColor="#bbb"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />

        {/* Error */}
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* Hint */}
        <Text style={styles.hintText}>
          Open your authenticator app and enter the current 6-digit code shown for E-Numerak.
        </Text>

        {/* Button */}
        <TouchableOpacity
          style={[
            styles.button,
            (isAuthLoading || code.length !== 6) && styles.buttonDisabled,
          ]}
          onPress={handleVerify}
          disabled={isAuthLoading || code.length !== 6}
          activeOpacity={0.85}
        >
          {isAuthLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Verify & Sign In →</Text>
          }
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.backText}>← Back to Login</Text>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🔒 This code refreshes every 30 seconds. Make sure to enter it quickly.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 20,
    paddingVertical: 40,
    justifyContent: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#e2e5ec',
    borderRadius: 14,
    padding: 16,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 10,
    color: '#111',
    marginBottom: 16,
    backgroundColor: '#f9fafc',
  },
  codeInputError: {
    borderColor: '#e11d48',
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  errorText: {
    color: '#be123c',
    fontSize: 13,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  backText: {
    color: '#2563eb',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  infoText: {
    fontSize: 12,
    color: '#166534',
    textAlign: 'center',
    lineHeight: 18,
  },
});