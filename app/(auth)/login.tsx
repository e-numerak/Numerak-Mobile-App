import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuthStore } from '../../src/store/authStore';
import { tokenStorage } from '../../src/utils/tokenStorage';
import { NumerakMark } from '../../src/components/NumerakLogo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 100;

// ---------------------------------------------------------------------------
// MEMOIZED COMPONENTS (To prevent lag during typing re-renders)
// ---------------------------------------------------------------------------

// Decorative Background Circles - never re-renders after mount (props are stable Animated.Value refs)
const BackgroundCircles = memo(({ floatA, floatB }: { floatA: Animated.Value; floatB: Animated.Value }) => (
  <>
    <Animated.View
      pointerEvents="none"
      style={[
        styles.circleTop,
        {
          transform: [
            { translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, 26] }) },
            { translateX: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
          ],
        },
      ]}
    />
    <Animated.View
      pointerEvents="none"
      style={[
        styles.circleBottom,
        {
          transform: [
            { translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) },
            { translateX: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
          ],
        },
      ]}
    />
  </>
));

// Header Section with Logo and Titles - never re-renders after mount
const HeaderSection = memo(
  ({ headerAnim, logoScale, glow }: { headerAnim: Animated.Value; logoScale: Animated.Value; glow: Animated.Value }) => (
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
      <Animated.View style={{ transform: [{ scale: logoScale }], marginBottom: spacing.md }}>
        <Animated.View
          style={[
            styles.logoGlow,
            {
              opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] }),
              transform: [
                {
                  scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }),
                },
              ],
            },
          ]}
        />
        <NumerakMark size={84} />
      </Animated.View>
      <Text style={styles.title}>
        E-<Text style={styles.titleAccent}>N</Text>umerak
      </Text>
      <Text style={styles.brandTag}>SMART BILLING. SEAMLESS BUSINESS.</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>
    </Animated.View>
  )
);

// Email Field - isolated so typing password doesn't re-render this, and vice versa
type EmailFieldProps = {
  value: string;
  error: string;
  focused: boolean;
  disabled: boolean;
  onChangeText: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing: () => void;
  inputRef: React.RefObject<TextInput | null>;
};
const EmailField = memo(
  ({ value, error, focused, disabled, onChangeText, onFocus, onBlur, onSubmitEditing, inputRef }: EmailFieldProps) => (
    <>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.required}> *</Text>
      </View>
      <TextInput
        ref={inputRef}
        style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError]}
        placeholder="you@example.com"
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="next"
        onSubmitEditing={onSubmitEditing}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        maxLength={EMAIL_MAX_LENGTH}
        editable={!disabled}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  )
);

// Password Field - isolated so typing email doesn't re-render this, and vice versa
type PasswordFieldProps = {
  value: string;
  showPassword: boolean;
  focused: boolean;
  disabled: boolean;
  onChangeText: (v: string) => void;
  onToggleShow: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing: () => void;
  inputRef: React.RefObject<TextInput | null>;
};
const PasswordField = memo(
  ({
    value,
    showPassword,
    focused,
    disabled,
    onChangeText,
    onToggleShow,
    onFocus,
    onBlur,
    onSubmitEditing,
    inputRef,
  }: PasswordFieldProps) => (
    <>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Password</Text>
        <Text style={styles.required}> *</Text>
      </View>
      <View style={[styles.passwordWrap, focused && styles.inputFocused]}>
        <TextInput
          ref={inputRef}
          style={styles.passwordInput}
          placeholder="Enter your password"
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={!showPassword}
          returnKeyType="go"
          onSubmitEditing={onSubmitEditing}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          editable={!disabled}
        />
        <TouchableOpacity
          style={styles.showBtn}
          onPress={onToggleShow}
          disabled={disabled}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </>
  )
);

// ---------------------------------------------------------------------------
// MAIN SCREEN COMPONENT
// ---------------------------------------------------------------------------
export default function LoginScreen() {
  const router = useRouter();

  // Zustand Store selectors optimized to prevent unnecessary renders
  const login = useAuthStore((state) => state.login);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Animations Refs
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
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

    // Continuous loops (native driver -> run on native thread, off the JS thread)
    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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

  useEffect(() => {
    tokenStorage.getRememberedCredentials().then((saved) => {
      if (saved) {
        setEmail(saved.email);
        setPassword(saved.password);
        setRememberMe(true);
      }
    });
  }, []);

  const validateEmail = useCallback((value: string) => {
    if (!value.trim()) return 'Email is required.';
    if (value.length > EMAIL_MAX_LENGTH) return `Email must be under ${EMAIL_MAX_LENGTH} characters.`;
    if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address.';
    return '';
  }, []);

  // Stable callbacks so memoized children never re-render just because
  // LoginScreen re-rendered (e.g. while the OTHER field is being typed in).
  const handleEmailChange = useCallback(
    (value: string) => {
      setEmail(value);
      setEmailError((prev) => (prev ? validateEmail(value) : prev));
    },
    [validateEmail]
  );

  const handlePasswordChange = useCallback((value: string) => {
    setPassword(value);
  }, []);

  const handleEmailFocus = useCallback(() => setEmailFocused(true), []);
  const handleEmailBlur = useCallback(() => {
    setEmailFocused(false);
    setEmailError(validateEmail(email));
  }, [email, validateEmail]);

  const handlePasswordFocus = useCallback(() => setPasswordFocused(true), []);
  const handlePasswordBlur = useCallback(() => setPasswordFocused(false), []);

  const handleToggleShowPassword = useCallback(() => setShowPassword((v) => !v), []);
  const handleToggleRememberMe = useCallback(() => setRememberMe((v) => !v), []);

  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);

  const handleLogin = useCallback(async () => {
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
  }, [email, password, rememberMe, login, clearError, error, router, validateEmail]);

  const handleBtnPressIn = useCallback(() => {
    Animated.spring(btnScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  }, [btnScale]);

  const handleBtnPressOut = useCallback(() => {
    Animated.spring(btnScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [btnScale]);

  return (
    <LinearGradient
      colors={['#1e3a5f', '#16314f', '#0c1d30']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Memoized Background Circles */}
      <BackgroundCircles floatA={floatA} floatB={floatB} />

      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={28}
        extraKeyboardSpace={0}
      >
        {/* Memoized Header Section */}
        <HeaderSection headerAnim={headerAnim} logoScale={logoScale} glow={glow} />

        <Animated.View
          // renderToHardwareTextureAndroid: caches the card as a bitmap on Android so
          // the elevation/shadow isn't recomputed every re-render while typing.
          renderToHardwareTextureAndroid={Platform.OS === 'android'}
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
            <EmailField
              value={email}
              error={emailError}
              focused={emailFocused}
              disabled={isAuthLoading}
              onChangeText={handleEmailChange}
              onFocus={handleEmailFocus}
              onBlur={handleEmailBlur}
              onSubmitEditing={focusPassword}
              inputRef={emailRef}
            />

            <PasswordField
              value={password}
              showPassword={showPassword}
              focused={passwordFocused}
              disabled={isAuthLoading}
              onChangeText={handlePasswordChange}
              onToggleShow={handleToggleShowPassword}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
              onSubmitEditing={handleLogin}
              inputRef={passwordRef}
            />

            {/* Remember me + Forgot password */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.checkboxWrap}
                onPress={handleToggleRememberMe}
                activeOpacity={0.7}
                disabled={isAuthLoading}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/forgot-password')} disabled={isAuthLoading}>
                <Text style={styles.forgotLink}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                onPress={handleLogin}
                onPressIn={handleBtnPressIn}
                onPressOut={handleBtnPressOut}
                disabled={isAuthLoading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isAuthLoading ? ['#93b4f0', '#93b4f0'] : ['#3b82f6', '#2563eb', '#1d4ed8']}
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
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Design tokens & Stylesheet (unchanged)
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
};

const shadow = (elevation: number, opacity = 0.15, radiusPx = 10, color = '#000') => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: Math.round(elevation / 1.5) },
  shadowOpacity: opacity,
  shadowRadius: radiusPx,
  elevation,
});

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
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
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3b82f6',
  },
  title: {
    ...typography.title,
    textAlign: 'center',
    color: colors.textOnDark,
    letterSpacing: 0.3,
    fontWeight: '900',
  },
  titleAccent: { color: '#5b8def' },
  brandTag: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2.4,
    marginTop: 7,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.subtitle,
    textAlign: 'center',
    color: colors.textOnDarkMuted,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 22,
    ...shadow(8, 0.2, 20),
  },
  form: {
    width: '100%',
  },
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
  button: {
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl - 6,
    ...shadow(6, 0.35, 12, colors.primary),
  },
  buttonText: {
    ...typography.button,
    color: colors.textOnDark,
  },
});