import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';

import apiClient from '../../src/api/client';
import { AUTH_ENDPOINTS } from '../../src/constants/api';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';

  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeFocused, setCodeFocused] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleCodeChange = (value: string) => {
    const digitsOnly = value.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digitsOnly);
    if (codeError) setCodeError('');
  };

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      setCodeError(`Please enter the ${CODE_LENGTH}-digit code.`);
      return;
    }

    if (!email) {
      Alert.alert(
        'Missing Email',
        'We could not find your email address. Please sign in again.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
      return;
    }

    setIsVerifying(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.verifyEmail, { email, code });
      Alert.alert(
        'Email Verified',
        'Your email has been verified successfully! You can now log in.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Invalid or expired code. Please try again.';
      setCodeError(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert('Missing Email', 'We could not find your email address.');
      return;
    }

    setIsResending(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.resendVerification, { email });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Could not resend the code. Please try again later.';
      Alert.alert('Resend Failed', message);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EN</Text>
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            {email
              ? `Enter the ${CODE_LENGTH}-digit code sent to ${email}`
              : `Enter the ${CODE_LENGTH}-digit code sent to your email`}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.form}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Verification Code</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                styles.codeInput,
                codeFocused && styles.inputFocused,
                codeError && styles.inputError,
              ]}
              placeholder="000000"
              placeholderTextColor="#a0a0a0"
              value={code}
              onChangeText={handleCodeChange}
              onFocus={() => setCodeFocused(true)}
              onBlur={() => setCodeFocused(false)}
              keyboardType="number-pad"
              maxLength={CODE_LENGTH}
              editable={!isVerifying}
              autoFocus
            />
            {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isVerifying && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={isVerifying}
              activeOpacity={0.85}
            >
              {isVerifying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResend}
              disabled={isResending || resendCooldown > 0}
              activeOpacity={0.7}
            >
              {isResending ? (
                <ActivityIndicator color="#2563eb" size="small" />
              ) : (
                <Text
                  style={[
                    styles.resendText,
                    resendCooldown > 0 && styles.resendTextDisabled,
                  ]}
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Didn't get a code? Resend"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already verified? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity disabled={isVerifying}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  headerSection: { alignItems: 'center', marginBottom: 28 },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', color: '#111' },
  subtitle: {
    fontSize: 14, textAlign: 'center', color: '#888',
    marginTop: 6, paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  form: { width: '100%' },
  labelRow: { flexDirection: 'row', marginTop: 14, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#333' },
  required: { fontSize: 13, fontWeight: '700', color: '#e11d48' },
  input: {
    borderWidth: 1.5, borderColor: '#e2e5ec', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: '#f9fafc', color: '#111',
  },
  codeInput: {
    fontSize: 24, fontWeight: '700', textAlign: 'center',
    letterSpacing: 8, paddingVertical: 16,
  },
  inputFocused: { borderColor: '#2563eb', backgroundColor: '#fff' },
  inputError: { borderColor: '#e11d48' },
  errorText: { color: '#e11d48', fontSize: 12, marginTop: 6 },
  button: {
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 22, shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25,
    shadowRadius: 8, elevation: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resendButton: { alignItems: 'center', marginTop: 16, paddingVertical: 6 },
  resendText: { color: '#2563eb', fontSize: 13, fontWeight: '500' },
  resendTextDisabled: { color: '#a0a0a0' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});