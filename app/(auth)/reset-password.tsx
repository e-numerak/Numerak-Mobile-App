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
import { Link, useRouter, useLocalSearchParams } from 'expo-router';

import apiClient from '../../src/api/client';
import { AUTH_ENDPOINTS } from '../../src/constants/api';

const PASSWORD_MIN_LENGTH = 8;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (value: string) => {
    if (!value.trim()) return 'Password is required.';
    if (value.length < PASSWORD_MIN_LENGTH) return `Must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    return '';
  };

  const validateConfirmPassword = (value: string, pwd: string) => {
    if (!value.trim()) return 'Please confirm your password.';
    if (value !== pwd) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async () => {
    const pwError = validatePassword(password);
    const cpError = validateConfirmPassword(confirmPassword, password);
    setPasswordError(pwError);
    setConfirmPasswordError(cpError);

    if (pwError || cpError) return;

    if (!params.token) {
      Alert.alert('Invalid Link', 'This reset link is missing required information. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.resetPassword, {
        token: params.token,
        email: params.email,
        password,
      });
      Alert.alert(
        'Password Reset',
        'Your password has been reset successfully. Please log in.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'Something went wrong. Please try again.';
      Alert.alert('Reset Failed', message);
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
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password below</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.form}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>New Password</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                passwordFocused && styles.inputFocused,
                passwordError && styles.inputError,
              ]}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              placeholderTextColor="#a0a0a0"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (passwordError) setPasswordError(validatePassword(v));
                if (confirmPasswordError) {
                  setConfirmPasswordError(validateConfirmPassword(confirmPassword, v));
                }
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => {
                setPasswordFocused(false);
                setPasswordError(validatePassword(password));
              }}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            <View style={styles.labelRow}>
              <Text style={styles.label}>Confirm New Password</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                confirmFocused && styles.inputFocused,
                confirmPasswordError && styles.inputError,
              ]}
              placeholder="Re-enter new password"
              placeholderTextColor="#a0a0a0"
              value={confirmPassword}
              onChangeText={(v) => {
                setConfirmPassword(v);
                if (confirmPasswordError) {
                  setConfirmPasswordError(validateConfirmPassword(v, password));
                }
              }}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => {
                setConfirmFocused(false);
                setConfirmPasswordError(validateConfirmPassword(confirmPassword, password));
              }}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
            />
            {confirmPasswordError ? (
              <Text style={styles.errorText}>{confirmPasswordError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reset Password</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Link href="/login" asChild>
                <TouchableOpacity disabled={isLoading}>
                  <Text style={styles.loginLink}>Back to Login</Text>
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
  subtitle: { fontSize: 14, textAlign: 'center', color: '#888', marginTop: 6 },
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
  loginLink: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});