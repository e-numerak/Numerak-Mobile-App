import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function MfaSetupScreen() {
  const router = useRouter();
  const { qrUri, secret, error, isAuthLoading, mfaSetup, mfaEnable } = useAuthStore();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    mfaSetup().catch(() => {});
  }, []);

  const handleEnable = async () => {
    try {
      await mfaEnable(code);
      router.replace('/(app)/dashboard');
    } catch {
      // error shown via store
    }
  };

  if (!qrUri) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Setting up authenticator...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>🔐</Text>
        </View>
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Secure your account with an authenticator app for an extra layer of protection.
        </Text>
      </View>

      {/* Card */}
      <View style={styles.card}>

        {/* Step 1 */}
        <View style={styles.stepRow}>
          <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
          <Text style={styles.stepText}>
            Open <Text style={styles.bold}>Google Authenticator</Text> or any TOTP app and scan the QR code below.
          </Text>
        </View>

        {/* QR Code */}
        <View style={styles.qrWrapper}>
          <QRCode value={qrUri} size={180} />
        </View>

        {/* Step 2 */}
        <View style={styles.stepRow}>
          <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
          <Text style={styles.stepText}>
            Can't scan? Enter this key manually in your authenticator app.
          </Text>
        </View>

        {/* Secret Key */}
        <View style={styles.secretBox}>
          <Text style={styles.secretLabel}>Manual Entry Key</Text>
          <Text selectable style={styles.secretKey}>{secret}</Text>
        </View>

        {/* Step 3 */}
        <View style={styles.stepRow}>
          <View style={styles.stepBadge}><Text style={styles.stepNumber}>3</Text></View>
          <Text style={styles.stepText}>
            Enter the <Text style={styles.bold}>6-digit verification code</Text> shown in your authenticator app.
          </Text>
        </View>

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

        {/* Button */}
        <TouchableOpacity
          style={[
            styles.button,
            (isAuthLoading || code.length !== 6) && styles.buttonDisabled,
          ]}
          onPress={handleEnable}
          disabled={isAuthLoading || code.length !== 6}
          activeOpacity={0.85}
        >
          {isAuthLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Enable & Continue →</Text>
          }
        </TouchableOpacity>

        {/* Info */}
        <Text style={styles.infoText}>
          🔒 Once enabled, you'll need this app every time you sign in.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f4f6fb',
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 20,
    paddingVertical: 40,
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumber: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#111',
  },
  qrWrapper: {
    alignItems: 'center',
    backgroundColor: '#f8faff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secretBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secretLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secretKey: {
    fontSize: 14,
    color: '#1e3a5f',
    fontWeight: '600',
    letterSpacing: 1,
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#e2e5ec',
    borderRadius: 14,
    padding: 16,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
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
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
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
  infoText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
  },
});