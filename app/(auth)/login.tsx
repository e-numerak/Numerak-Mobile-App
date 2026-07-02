import { useState, useEffect, useRef } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

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

  // ---- Animations (visual only — no effect on functionality) ----
  const headerAnim = useRef(new Animated.Value(0)).current; // 0 -> 1 entrance
  const cardAnim = useRef(new Animated.Value(0)).current; // 0 -> 1 entrance
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const glow = useRef(new Animated.Value(0)).current; // logo halo pulse loop
  const floatA = useRef(new Animated.Value(0)).current; // top circle drift
  const floatB = useRef(new Animated.Value(0)).current; // bottom circle drift
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.sequence([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.stagger(120, [
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous loops
    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const g = loop(glow, 1600);
    const a = loop(floatA, 5000);
    const b = loop(floatB, 6500);
    g.start();
    a.start();
    b.start();

    return () => {
      g.stop();
      a.stop();
      b.stop();
    };
  }, []);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const emailValidationError = validateEmail(email);
    setEmailError(emailValidationError);

    if (emailValidationError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    if (!password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
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
      {/* Decorative floating accent circles */}
      <Animated.View
        style={[
          styles.circleTop,
          {
            transform: [
              {
                translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, 26] }),
              },
              {
                translateX: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circleBottom,
          {
            transform: [
              {
                translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }),
              },
              {
                translateX: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }),
              },
            ],
          },
        ]}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.headerSection,
              {
                opacity: headerAnim,
                transform: [
                  {
                    translateY: headerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: logoScale }] }}>
              {/* Pulsing halo behind the logo */}
              <Animated.View
                style={[
                  styles.logoGlow,
                  {
                    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }),
                    transform: [
                      {
                        scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] }),
                      },
                    ],
                  },
                ]}
              />
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoCircle}
              >
                <Text style={styles.logoText}>EN</Text>
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>E-Numerak</Text>
            <Text style={styles.subtitle}>Sign in to your account</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  },
                ],
              },
            ]}
          >
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
                placeholderTextColor={colors.textMuted}
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
                  placeholderTextColor={colors.textMuted}
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
                    color={colors.textSecondary}
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

              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  onPress={handleLogin}
                  onPressIn={() =>
                    Animated.spring(btnScale, {
                      toValue: 0.97,
                      useNativeDriver: true,
                    }).start()
                  }
                  onPressOut={() =>
                    Animated.spring(btnScale, {
                      toValue: 1,
                      friction: 4,
                      useNativeDriver: true,
                    }).start()
                  }
                  disabled={isAuthLoading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={
                      isAuthLoading
                        ? ['#93b4f0', '#93b4f0']
                        : ['#3b82f6', '#2563eb', '#1d4ed8']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.button}
                  >
                    {isAuthLoading ? (
                      <ActivityIndicator color={colors.textOnDark} />
                    ) : (
                      <Text style={styles.buttonText}>Login</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

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
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primarySoft: 'rgba(37, 99, 235, 0.16)',
  accentSoft: 'rgba(96, 165, 250, 0.18)',

  danger: '#e11d48',

  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#64748b',
  textOnDark: '#ffffff',
  textOnDarkMuted: '#cbd5e1',

  border: '#e2e5ec',
  borderFocus: '#2563eb',

  surface: '#ffffff',
  surfaceMuted: '#f9fafc',

  white: '#ffffff',
  overlayBorder: 'rgba(255, 255, 255, 0.25)',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
};

const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 35,
};

const typography = {
  title: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, fontWeight: '500' as const, letterSpacing: 0.2 },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  button: { fontSize: 16, fontWeight: '700' as const, letterSpacing: 0.8 },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

const shadow = (
  elevation: number,
  opacity = 0.15,
  radiusPx = 10,
  color = '#000'
) => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: Math.round(elevation / 1.5) },
  shadowOpacity: opacity,
  shadowRadius: radiusPx,
  elevation,
});

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },

  // Decorative accent circles
  circleTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentSoft,
  },
  circleBottom: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primarySoft,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoGlow: {
    position: 'absolute',
    top: -9,
    left: -9,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#60a5fa',
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.overlayBorder,
    ...shadow(5, 0.3, 8),
  },
  logoText: {
    ...typography.title,
    fontSize: 25,
    letterSpacing: 1,
    color: colors.textOnDark,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    color: colors.textOnDark,
  },
  subtitle: {
    ...typography.subtitle,
    textAlign: 'center',
    color: colors.textOnDarkMuted,
    marginTop: spacing.xs,
  },

  // Card / form container
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    ...shadow(8, 0.2, 20),
  },
  form: {
    width: '100%',
  },

  // Field labels
  labelRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    marginBottom: spacing.sm - 2,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  required: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },

  // Text inputs
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    backgroundColor: colors.surfaceMuted,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.borderFocus,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '400',
    marginTop: spacing.xs + 2,
  },

  // Password field
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: colors.textPrimary,
  },
  showBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  showBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  // Remember me row
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md + 2,
  },
  checkboxWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxTick: {
    color: colors.textOnDark,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  rememberText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  forgotLink: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Primary button
  button: {
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl - 6,
    ...shadow(6, 0.35, 12, colors.primary),
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.textOnDark,
  },

  // Footer / register row
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  registerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});