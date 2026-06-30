import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { OtpInput } from '../../src/components/OtpInput';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';

export default function MfaSetupScreen() {
  const router = useRouter();
  const { qrUri, secret, error, isAuthLoading, mfaSetup, mfaEnable } = useAuthStore();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    mfaSetup().catch(() => {});
  }, []);

  const handleCopy = async () => {
    if (!secret) return;
    await Clipboard.setStringAsync(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnable = async () => {
    try {
      await mfaEnable(code);
      router.replace('/(app)/dashboard');
    } catch {
      // error surfaced via store
    }
  };

  if (!qrUri) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={NAVY} />
        <Text style={styles.loadingText}>Preparing your authenticator…</Text>
      </View>
    );
  }

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
        <Text style={styles.title}>Set Up Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Add an extra layer of security. You'll use an authenticator app to verify each sign-in.
        </Text>
      </LinearGradient>

      {/* Card */}
      <View style={styles.card}>
        {/* Step 1 */}
        <Step number={1}>
          Open <Text style={styles.bold}>Google Authenticator</Text> (or any TOTP app) and scan the
          QR code below.
        </Step>

        <View style={styles.qrWrapper}>
          <QRCode value={qrUri} size={172} />
        </View>

        {/* Step 2 */}
        <Step number={2}>Can't scan? Enter this setup key manually instead.</Step>

        <View style={styles.secretBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.secretLabel}>Manual Entry Key</Text>
            <Text selectable style={styles.secretKey}>
              {secret}
            </Text>
          </View>
          <TouchableOpacity style={styles.copyBtn} onPress={handleCopy} activeOpacity={0.7}>
            <Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? '#16a34a' : NAVY} />
            <Text style={[styles.copyText, copied && { color: '#16a34a' }]}>
              {copied ? 'Copied' : 'Copy'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Step 3 */}
        <Step number={3}>
          Enter the <Text style={styles.bold}>6-digit code</Text> shown in your authenticator app.
        </Step>

        <OtpInput value={code} onChange={setCode} error={!!error} autoFocus={false} />

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={15} color="#be123c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, (isAuthLoading || code.length !== 6) && styles.buttonDisabled]}
          onPress={handleEnable}
          disabled={isAuthLoading || code.length !== 6}
          activeOpacity={0.85}
        >
          {isAuthLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enable & Continue</Text>
          )}
        </TouchableOpacity>

        <View style={styles.infoRow}>
          <Feather name="lock" size={13} color={SLATE} />
          <Text style={styles.infoText}>
            Once enabled, you'll need this app every time you sign in.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Step({ number, children }: { number: number; children: React.ReactNode }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { padding: 20, paddingTop: 36, paddingBottom: 48 },

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#f4f6fb',
  },
  loadingText: { color: SLATE, fontSize: 14, marginTop: 8 },

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

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 12 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  stepNumber: { color: '#fff', fontSize: 13, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 20 },
  bold: { fontWeight: '800', color: '#0f172a' },

  qrWrapper: {
    alignItems: 'center', backgroundColor: '#f8faff', borderRadius: 16,
    padding: 20, marginBottom: 22, borderWidth: 1, borderColor: BORDER,
  },

  secretBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f1f5f9', borderRadius: 12, padding: 14, marginBottom: 22,
    borderWidth: 1, borderColor: BORDER,
  },
  secretLabel: {
    fontSize: 10, fontWeight: '700', color: '#94a3b8',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  secretKey: { fontSize: 14, color: NAVY, fontWeight: '700', letterSpacing: 1 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  copyText: { fontSize: 12, fontWeight: '700', color: NAVY },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff1f2', borderRadius: 10, padding: 12, marginTop: 14,
    borderWidth: 1, borderColor: '#fecdd3',
  },
  errorText: { color: '#be123c', fontSize: 13, flex: 1 },

  button: {
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 20, marginBottom: 14,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  infoText: { fontSize: 12, color: SLATE, textAlign: 'center' },
});
