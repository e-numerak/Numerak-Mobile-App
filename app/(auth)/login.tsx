import { useState, useEffect } from 'react';
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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuthStore } from '../../src/store/authStore';
import { tokenStorage } from '../../src/utils/tokenStorage';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 100;

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Pre-fill the remembered email + password (saved on a previous
  // "Remember me" login, in the encrypted SecureStore).
  useEffect(() => {
    tokenStorage.getRememberedCredentials().then((saved) => {
      if (saved) {
        setEmail(saved.email);
        setPassword(saved.password);
        setRememberMe(true);
      }
    });
  }, []);

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

      // Persist (or clear) the remembered credentials based on the checkbox.
      if (rememberMe) {
        await tokenStorage.setRememberedCredentials(email.trim(), password);
      } else {
        await tokenStorage.clearRememberedCredentials();
      }

      if (result === 'mfa_setup_required') {
        router.replace('/(auth)/mfa-setup');
      } else if (result === 'mfa_required') {
        router.replace('/(auth)/mfa-verify');
      } else {
        router.replace('/(app)/dashboard');
      }
    } catch (err: any) {
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
    <LinearGradient
      colors={['#1e3a5f', '#16314f', '#0c1d30']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Decorative blurred accent circles */}
      <View style={styles.circleTop} />
      <View style={styles.circleBottom} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
              <View style={[styles.passwordWrap, passwordFocused && styles.inputFocused]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#a0a0a0"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!isAuthLoading}
                />
                <TouchableOpacity
                  style={styles.showBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  disabled={isAuthLoading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={20}
                    color="#64748b"
                  />
                </TouchableOpacity>
              </View>

              {/* Remember me  +  Forgot password */}
              <View style={styles.rememberRow}>
                <TouchableOpacity
                  style={styles.checkboxWrap}
                  onPress={() => setRememberMe((v) => !v)}
                  activeOpacity={0.7}
                  disabled={isAuthLoading}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/forgot-password')}
                  disabled={isAuthLoading}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

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
                <TouchableOpacity
                  onPress={() => router.push('/register')}
                  disabled={isAuthLoading}
                >
                  <Text style={styles.registerLink}>Register</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  // Decorative accent circles
  circleTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(96,165,250,0.18)',
  },
  circleBottom: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(37,99,235,0.16)',
  },

  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#cbd5e1',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
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
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e5ec',
    borderRadius: 12,
    backgroundColor: '#f9fafc',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111',
  },
  showBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  showBtnText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  inputError: {
    borderColor: '#e11d48',
  },
  errorText: {
    color: '#e11d48',
    fontSize: 12,
    marginTop: 6,
  },

  // Remember me row
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  checkboxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  rememberText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  forgotLink: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
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
