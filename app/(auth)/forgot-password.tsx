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
  Animated,
  Easing,
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import apiClient from '../../src/api/client';
import { AUTH_ENDPOINTS } from '../../src/constants/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 100;

// Unique indigo/violet-on-navy palette (distinct from the login screen,
// but still in the same trustworthy blue family).
const C = {
  grad: ['#1b2a5b', '#22306e', '#0b1636'] as const,
  accent: '#6366f1',
  accentDark: '#4f46e5',
  accentSoft: 'rgba(129,140,248,0.18)',
  violetSoft: 'rgba(99,102,241,0.16)',
  danger: '#f43f5e',
  textOnDark: '#ffffff',
  textMutedDark: '#c7d2fe',
};

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // ── Animations (visual only) ──
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.6)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const floatA = useRef(new Animated.Value(0)).current;
  const floatB = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(badgeScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.stagger(120, [
        Animated.timing(headerAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(cardAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    const loop = (val: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
    const g = loop(glow, 1700);
    const a = loop(floatA, 5200);
    const b = loop(floatB, 6800);
    g.start(); a.start(); b.start();
    return () => { g.stop(); a.stop(); b.stop(); };
  }, []);

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required.';
    if (value.length > EMAIL_MAX_LENGTH) return `Must be under ${EMAIL_MAX_LENGTH} characters.`;
    if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address.';
    return '';
  };

  const handleSubmit = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const emError = validateEmail(email);
    setEmailError(emError);
    if (emError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post(AUTH_ENDPOINTS.forgotPassword, { email: email.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSent(true);
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
    <LinearGradient colors={C.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
      {/* Floating accent circles */}
      <Animated.View
        style={[
          styles.circleTop,
          { transform: [
            { translateY: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) },
            { translateX: floatA.interpolate({ inputRange: [0, 1], outputRange: [0, -16] }) },
          ] },
        ]}
      />
      <Animated.View
        style={[
          styles.circleBottom,
          { transform: [
            { translateY: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, -32] }) },
            { translateX: floatB.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) },
          ] },
        ]}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: headerAnim, transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: badgeScale }], marginBottom: 18 }}>
              <Animated.View
                style={[
                  styles.badgeGlow,
                  {
                    opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] }),
                    transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
                  },
                ]}
              />
              <LinearGradient colors={[C.accent, C.accentDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
                <Feather name="lock" size={30} color="#fff" />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.title}>Forgot password?</Text>
            <Text style={styles.subtitle}>No worries — enter your email and we'll send you a secure reset link.</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            style={[
              styles.card,
              { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] },
            ]}
          >
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email address</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused, !!emailError && styles.inputWrapError]}>
              <Feather name="mail" size={18} color={emailFocused ? C.accent : '#94a3b8'} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => { setEmailFocused(false); setEmailError(validateEmail(email)); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                maxLength={EMAIL_MAX_LENGTH}
                editable={!isLoading}
              />
            </View>
            {emailError ? (
              <View style={styles.errRow}>
                <Feather name="alert-circle" size={12} color={C.danger} />
                <Text style={styles.errorText}>{emailError}</Text>
              </View>
            ) : null}

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                onPress={handleSubmit}
                onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(btnScale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                disabled={isLoading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={isLoading ? ['#a5b4fc', '#a5b4fc'] : [C.accent, C.accentDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.button}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name={sent ? 'check' : 'send'} size={17} color="#fff" />
                      <Text style={styles.buttonText}>{sent ? 'Link Sent' : 'Send Reset Link'}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Remember your password? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity disabled={isLoading}>
                  <Text style={styles.loginLink}>Back to login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>

          {/* Reassurance footer */}
          <Animated.View style={[styles.secureRow, { opacity: cardAnim }]}>
            <Feather name="shield" size={13} color="rgba(199,210,254,0.7)" />
            <Text style={styles.secureText}>Your data is encrypted &amp; secure</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },

  circleTop: {
    position: 'absolute', top: -70, right: -50, width: 210, height: 210,
    borderRadius: 105, backgroundColor: C.accentSoft,
  },
  circleBottom: {
    position: 'absolute', bottom: -80, left: -60, width: 230, height: 230,
    borderRadius: 115, backgroundColor: C.violetSoft,
  },

  header: { alignItems: 'center', marginBottom: 26 },
  badgeGlow: {
    position: 'absolute', top: -8, left: -8, width: 92, height: 92,
    borderRadius: 46, backgroundColor: C.accent,
  },
  badge: {
    width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
  },
  title: { fontSize: 26, fontWeight: '900', color: C.textOnDark, letterSpacing: -0.4, textAlign: 'center' },
  subtitle: {
    fontSize: 13.5, color: C.textMutedDark, textAlign: 'center',
    marginTop: 9, lineHeight: 20, paddingHorizontal: 14, opacity: 0.85,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 22, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 10,
  },
  labelRow: { flexDirection: 'row', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  required: { fontSize: 13, fontWeight: '700', color: C.danger },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#e2e5ec', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#f8fafc',
  },
  inputWrapFocused: { borderColor: C.accent, backgroundColor: '#fff' },
  inputWrapError: { borderColor: C.danger, backgroundColor: '#fff5f6' },
  input: { flex: 1, fontSize: 15, color: '#0f172a', padding: 0 },

  errRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  errorText: { color: C.danger, fontSize: 12, fontWeight: '600' },

  button: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    borderRadius: 14, paddingVertical: 16, marginTop: 22,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: '#64748b', fontSize: 14 },
  loginLink: { color: C.accentDark, fontSize: 14, fontWeight: '800' },

  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 22 },
  secureText: { fontSize: 12, color: 'rgba(199,210,254,0.7)', fontWeight: '600' },
});
