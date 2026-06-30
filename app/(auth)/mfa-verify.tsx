import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { OtpInput } from '../../src/components/OtpInput';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';

export default function MfaVerifyScreen() {
  const router = useRouter();
  const { error, isAuthLoading, mfaVerify } = useAuthStore();
  const [code, setCode] = useState('');

  const handleVerify = async () => {
    try {
      await mfaVerify(code);
      router.replace('/(app)/dashboard');
    } catch {
      // error surfaced via store
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Gradient header */}
      <LinearGradient
        colors={['#1e3a5f', '#16314f', '#0c1d30']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.iconCircle}>
          <Feather name="shield" size={28} color="#fff" />
        </View>
        <Text style={styles.title}>Verify It's You</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code from your authenticator app to finish signing in.
        </Text>
      </LinearGradient>

      {/* Card */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Verification Code</Text>

        <OtpInput value={code} onChange={setCode} error={!!error} />

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#be123c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.hintRow}>
          <Feather name="smartphone" size={13} color={SLATE} />
          <Text style={styles.hintText}>
            Open your authenticator app and enter the current code shown for E-Numerak.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, (isAuthLoading || code.length !== 6) && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={isAuthLoading || code.length !== 6}
          activeOpacity={0.85}
        >
          {isAuthLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify & Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backBtn}>
          <Feather name="arrow-left" size={15} color={NAVY} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Feather name="clock" size={14} color="#166534" />
          <Text style={styles.infoText}>
            This code refreshes every 30 seconds — enter it before it changes.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 20, paddingTop: 36, paddingBottom: 48, flexGrow: 1, justifyContent: 'center' },

  header: {
    borderRadius: 24, paddingVertical: 28, paddingHorizontal: 22, alignItems: 'center',
    marginBottom: -28,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 21, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#cbd5e1', textAlign: 'center', marginTop: 8, lineHeight: 19 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22, paddingTop: 40,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 12 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff1f2', borderRadius: 10, padding: 12, marginTop: 16,
    borderWidth: 1, borderColor: '#fecdd3',
  },
  errorText: { color: '#be123c', fontSize: 13, flex: 1 },

  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 18 },
  hintText: { flex: 1, fontSize: 13, color: SLATE, lineHeight: 18 },

  button: {
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 20, marginBottom: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, marginBottom: 16,
  },
  backText: { color: NAVY, fontSize: 14, fontWeight: '600' },

  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  infoText: { flex: 1, fontSize: 12, color: '#166534', lineHeight: 17 },
});
