import { useState } from 'react';
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
import { Link, useRouter } from 'expo-router';

import apiClient from '../../src/api/client';
import { AUTH_ENDPOINTS } from '../../src/constants/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 100;

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required.';
    if (value.length > EMAIL_MAX_LENGTH) return `Must be under ${EMAIL_MAX_LENGTH} characters.`;
    if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address.';
    return '';
  };

  const handleSubmit = async () => {
    const emError = validateEmail(email);
    setEmailError(emError);
    if (emError) return;

    setIsLoading(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.forgotPassword, { email: email.trim() });
      Alert.alert(
        'Check Your Email',
        'If an account exists with this email, a password reset link has been sent.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'Something went wrong. Please try again.';
      Alert.alert('Request Failed', message);
    } finally {
      setIsLoading(false);
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
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.form}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                emailFocused && styles.inputFocused,
                emailError && styles.inputError,
              ]}
              placeholder="you@example.com"
              placeholderTextColor="#a0a0a0"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) setEmailError(validateEmail(v));
              }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => {
                setEmailFocused(false);
                setEmailError(validateEmail(email));
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              editable={!isLoading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Remember your password? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity disabled={isLoading}>
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
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});