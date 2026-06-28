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
  ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 100;
const NAME_MAX_LENGTH = 80;
const PASSWORD_MIN_LENGTH = 8;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isAuthLoading, error, clearError } = useAuthStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const validateName = (value: string, label: string) => {
    if (!value.trim()) return `${label} is required.`;
    if (value.trim().length < 2) return `${label} is too short.`;
    if (value.length > NAME_MAX_LENGTH) return `Must be under ${NAME_MAX_LENGTH} characters.`;
    return '';
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required.';
    if (value.length > EMAIL_MAX_LENGTH) return `Must be under ${EMAIL_MAX_LENGTH} characters.`;
    if (!EMAIL_REGEX.test(value.trim())) return 'Please enter a valid email address.';
    return '';
  };

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

  const handleRegister = async () => {
    const fnError = validateName(firstName, 'First name');
    const lnError = validateName(lastName, 'Last name');
    const emError = validateEmail(email);
    const pwError = validatePassword(password);
    const cpError = validateConfirmPassword(confirmPassword, password);

    setFirstNameError(fnError);
    setLastNameError(lnError);
    setEmailError(emError);
    setPasswordError(pwError);
    setConfirmPasswordError(cpError);

    if (fnError || lnError || emError || pwError || cpError) return;

    try {
      clearError();
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
      });

      Alert.alert(
        'Registration Successful',
        'Your account has been created. Please check your email to verify your account, then log in.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
    } catch (err: any) {
      Alert.alert('Registration Failed', error ?? 'Something went wrong. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>EN</Text>
          </View>
          <Text style={styles.title}>E-Numerak</Text>
          <Text style={styles.subtitle}>Create a new account</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.form}>

            {/* First Name */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>First Name</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[styles.input, firstNameFocused && styles.inputFocused, firstNameError && styles.inputError]}
              placeholder="John"
              placeholderTextColor="#a0a0a0"
              value={firstName}
              onChangeText={(v) => { setFirstName(v); if (firstNameError) setFirstNameError(validateName(v, 'First name')); }}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => { setFirstNameFocused(false); setFirstNameError(validateName(firstName, 'First name')); }}
              autoCapitalize="words"
              maxLength={NAME_MAX_LENGTH}
              editable={!isAuthLoading}
            />
            {firstNameError ? <Text style={styles.errorText}>{firstNameError}</Text> : null}

            {/* Last Name */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Last Name</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[styles.input, lastNameFocused && styles.inputFocused, lastNameError && styles.inputError]}
              placeholder="Doe"
              placeholderTextColor="#a0a0a0"
              value={lastName}
              onChangeText={(v) => { setLastName(v); if (lastNameError) setLastNameError(validateName(v, 'Last name')); }}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => { setLastNameFocused(false); setLastNameError(validateName(lastName, 'Last name')); }}
              autoCapitalize="words"
              maxLength={NAME_MAX_LENGTH}
              editable={!isAuthLoading}
            />
            {lastNameError ? <Text style={styles.errorText}>{lastNameError}</Text> : null}

            {/* Email */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused, emailError && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor="#a0a0a0"
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(validateEmail(v)); }}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => { setEmailFocused(false); setEmailError(validateEmail(email)); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              editable={!isAuthLoading}
            />
            {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

            {/* Password */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[styles.input, passwordFocused && styles.inputFocused, passwordError && styles.inputError]}
              placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
              placeholderTextColor="#a0a0a0"
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                if (passwordError) setPasswordError(validatePassword(v));
                if (confirmPasswordError) setConfirmPasswordError(validateConfirmPassword(confirmPassword, v));
              }}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => { setPasswordFocused(false); setPasswordError(validatePassword(password)); }}
              secureTextEntry
              autoCapitalize="none"
              editable={!isAuthLoading}
            />
            {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

            {/* Confirm Password */}
            <View style={styles.labelRow}>
              <Text style={styles.label}>Confirm Password</Text>
              <Text style={styles.required}> *</Text>
            </View>
            <TextInput
              style={[styles.input, confirmFocused && styles.inputFocused, confirmPasswordError && styles.inputError]}
              placeholder="Re-enter password"
              placeholderTextColor="#a0a0a0"
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); if (confirmPasswordError) setConfirmPasswordError(validateConfirmPassword(v, password)); }}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => { setConfirmFocused(false); setConfirmPasswordError(validateConfirmPassword(confirmPassword, password)); }}
              secureTextEntry
              autoCapitalize="none"
              editable={!isAuthLoading}
            />
            {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isAuthLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isAuthLoading}
              activeOpacity={0.85}
            >
              {isAuthLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity disabled={isAuthLoading}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  headerSection: { alignItems: 'center', marginBottom: 24 },
  logoCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', color: '#111' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#888', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  form: { width: '100%' },
  labelRow: { flexDirection: 'row', marginTop: 14, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#333' },
  required: { fontSize: 13, fontWeight: '700', color: '#e11d48' },
  input: { borderWidth: 1.5, borderColor: '#e2e5ec', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, backgroundColor: '#f9fafc', color: '#111' },
  inputFocused: { borderColor: '#2563eb', backgroundColor: '#fff' },
  inputError: { borderColor: '#e11d48' },
  errorText: { color: '#e11d48', fontSize: 12, marginTop: 6 },
  button: { backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 22, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginText: { color: '#666', fontSize: 14 },
  loginLink: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
});