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

import { useAuthStore } from '../../src/store/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 100;

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      return 'Email is required.';
    }
    if (value.length > EMAIL_MAX_LENGTH) {
      return `Email must be under ${EMAIL_MAX_LENGTH} characters.`;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailError) {
      setEmailError(validateEmail(value));
    }
  };

  const handleLogin = async () => {
    console.log('LOGIN BUTTON PRESSED', { email, password });

    const emailValidationError = validateEmail(email);
    setEmailError(emailValidationError);

    if (emailValidationError) {
      return;
    }

    if (!password.trim()) {
      Alert.alert('Missing Information', 'Please enter your password.');
      return;
    }

    try {
      clearError();
      const result = await login(email.trim(), password);
      console.log('LOGIN SUCCESS', result);

      if (result === 'mfa_setup_required') {
        router.replace('/(auth)/mfa-setup');
      } else if (result === 'mfa_required') {
        router.replace('/(auth)/mfa-verify');
      } else {
        router.replace('/(app)/dashboard');
      }
    } catch (err: any) {
      const errorPayload = err?.response?.data ?? err?.message ?? err;
      console.log('LOGIN ERROR', errorPayload);

      const errorCode = err?.response?.data?.error?.details?.code;

      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        router.push({ pathname: '/verify-email', params: { email: email.trim() } });
        return;
      }

      const errorMessage = err?.response?.data?.error?.message ?? error;

      Alert.alert(
        'Login Failed',
        errorMessage ?? 'Something went wrong. Please check your credentials and try again.'
      );
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
          <Text style={styles.title}>E-Numerak</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>
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
              onChangeText={handleEmailChange}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => {
                setEmailFocused(false);
                setEmailError(validateEmail(email));
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              editable={!isAuthLoading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[styles.input, passwordFocused && styles.inputFocused]}
              placeholder="••••••••"
              placeholderTextColor="#a0a0a0"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry
              autoCapitalize="none"
              editable={!isAuthLoading}
            />

            <Link href="/forgot-password" asChild>
              <TouchableOpacity disabled={isAuthLoading}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </Link>

            <TouchableOpacity
              style={[styles.button, isAuthLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isAuthLoading}
              activeOpacity={0.85}
            >
              {isAuthLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity disabled={isAuthLoading}>
                  <Text style={styles.registerLink}>Register</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  form: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    marginTop: 14,
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  required: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e11d48',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e5ec',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#f9fafc',
    color: '#111',
  },
  inputFocused: {
    borderColor: '#2563eb',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e11d48',
  },
  errorText: {
    color: '#e11d48',
    fontSize: 12,
    marginTop: 6,
  },
  forgotLink: {
    color: '#2563eb',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 12,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 22,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
});