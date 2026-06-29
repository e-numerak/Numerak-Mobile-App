import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useProfile, useUpdateProfile, useChangePassword } from '../../../src/hooks/useProfile';
import { useCompanies } from '../../../src/hooks/useCompanies';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const GREEN = '#16a34a';
const ERROR = '#dc2626';

type Msg = { type: 'success' | 'error'; text: string } | null;

export default function ProfileScreen() {
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const { data: companies } = useCompanies();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  // Active company — mirrors web's activeCompany (first company here).
  const company = companies?.[0];

  // ── Personal details ──────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
    }
  }, [profile]);

  async function saveProfile() {
    setProfileMsg(null);
    try {
      await updateProfile.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      const details = apiError?.details
        ? Object.values(apiError.details).flat().join(' ')
        : null;
      setProfileMsg({ type: 'error', text: details ?? apiError?.message ?? 'Failed to update profile.' });
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function submitPassword() {
    setPwMsg(null);
    const errs: Record<string, string> = {};
    if (!oldPw) errs.old_password = 'Current password is required.';
    if (!newPw) errs.new_password = 'New password is required.';
    else if (newPw.length < 8) errs.new_password = 'New password must be at least 8 characters.';
    else if (oldPw && oldPw === newPw) errs.new_password = 'New password must be different from your current password.';
    if (!confirmPw) errs.confirm_new_password = 'Please confirm your new password.';
    else if (newPw !== confirmPw) errs.confirm_new_password = 'Passwords do not match.';

    if (Object.keys(errs).length > 0) {
      setPwErrors(errs);
      return;
    }
    setPwErrors({});
    try {
      await changePassword.mutateAsync({
        old_password: oldPw,
        new_password: newPw,
        confirm_new_password: confirmPw,
      });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
      setOldPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err: any) {
      const apiError = err?.response?.data?.error;
      const details = apiError?.details as Record<string, string[]> | undefined;
      if (details) {
        const mapped: Record<string, string> = {};
        Object.entries(details).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setPwErrors(mapped);
      } else {
        setPwMsg({ type: 'error', text: apiError?.message ?? 'Failed to change password.' });
      }
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.errTitle}>Couldn't load profile</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
          <Text style={styles.primaryBtnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fullName =
    (profile.full_name as string) || `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim();
  const roleLabel = (profile.role ?? '').replace(/_/g, ' ');

  const companyRows = company
    ? [
        { label: 'TRN', value: company.trn },
        { label: 'Address', value: company.formatted_address },
        { label: 'Phone', value: company.phone },
        { label: 'Email', value: company.email },
        { label: 'Website', value: company.website },
        { label: 'E-Invoice Endpoint', value: company.peppol_endpoint },
      ].filter((r) => r.value)
    : [];

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Personal details ── */}
        <View style={styles.card}>
          <View style={styles.identityRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {`${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{fullName}</Text>
              <Text style={styles.email}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col}>
              <Text style={styles.label}>First name</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Last name</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <Text style={styles.label}>Email</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} value={profile.email} editable={false} />

          <Text style={styles.label}>Role</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled, { textTransform: 'capitalize' }]}
            value={roleLabel}
            editable={false}
          />

          {profileMsg && (
            <Text style={[styles.msg, profileMsg.type === 'success' ? styles.msgOk : styles.msgErr]}>
              {profileMsg.text}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primaryFull, updateProfile.isPending && { opacity: 0.6 }]}
            onPress={saveProfile}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryFullText}>💾  Save changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Company (read-only) ── */}
        {company && (
          <View style={styles.card}>
            <View style={styles.companyHeader}>
              <View style={styles.companyLogo}>
                <Text style={styles.companyLogoText}>
                  {(company.name || '?').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{company.name}</Text>
                {company.legal_name && company.legal_name !== company.name ? (
                  <Text style={styles.email}>{company.legal_name}</Text>
                ) : null}
              </View>
            </View>

            {companyRows.map((r) => (
              <View key={r.label} style={styles.companyRow}>
                <Text style={styles.companyLabel}>{r.label}</Text>
                <Text style={styles.companyValue}>{String(r.value)}</Text>
              </View>
            ))}

            <Text style={styles.companyNote}>
              Company details are managed by your administrator. Contact support to request changes.
            </Text>
          </View>
        )}

        {/* ── Change password ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔒  Change password</Text>

          <PwField
            label="Current password"
            value={oldPw}
            onChange={(v) => { setOldPw(v); setPwErrors((p) => ({ ...p, old_password: '' })); }}
            show={showOld}
            toggle={() => setShowOld((v) => !v)}
            error={pwErrors.old_password}
          />
          <PwField
            label="New password"
            value={newPw}
            onChange={(v) => { setNewPw(v); setPwErrors((p) => ({ ...p, new_password: '' })); }}
            show={showNew}
            toggle={() => setShowNew((v) => !v)}
            error={pwErrors.new_password}
          />
          <PwField
            label="Confirm new password"
            value={confirmPw}
            onChange={(v) => { setConfirmPw(v); setPwErrors((p) => ({ ...p, confirm_new_password: '' })); }}
            show={showConfirm}
            toggle={() => setShowConfirm((v) => !v)}
            error={pwErrors.confirm_new_password}
          />

          {pwMsg && (
            <Text style={[styles.msg, pwMsg.type === 'success' ? styles.msgOk : styles.msgErr]}>
              {pwMsg.text}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.primaryFull, changePassword.isPending && { opacity: 0.6 }]}
            onPress={submitPassword}
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryFullText}>🔒  Update password</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function PwField({
  label,
  value,
  onChange,
  show,
  toggle,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  toggle: () => void;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.pwWrap, error ? styles.inputErrorBorder : null]}>
        <TextInput
          style={styles.pwInput}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={toggle} style={styles.eyeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Feather name={show ? 'eye-off' : 'eye'} size={20} color="#64748b" />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.fieldErr}>⚠ {error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginBottom: 14,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: NAVY, marginBottom: 6 },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  name: { fontSize: 16, fontWeight: '800', color: NAVY },
  email: { fontSize: 13, color: SLATE, marginTop: 2 },

  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  field: { marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: '#f9fafc', color: '#0f172a',
  },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  inputErrorBorder: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },

  pwWrap: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: BORDER,
    borderRadius: 10, backgroundColor: '#f9fafc',
  },
  pwInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a' },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  eyeIcon: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  fieldErr: { color: ERROR, fontSize: 12, marginTop: 4 },

  msg: { fontSize: 13, marginTop: 12, fontWeight: '600' },
  msgOk: { color: GREEN },
  msgErr: { color: ERROR },

  primaryFull: {
    backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 16,
  },
  primaryFullText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  companyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  companyLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  companyLogoText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  companyRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  companyLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },
  companyValue: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  companyNote: { fontSize: 12, color: '#94a3b8', marginTop: 14, lineHeight: 17 },

  emoji: { fontSize: 44, marginBottom: 12 },
  errTitle: { fontSize: 17, fontWeight: '700', color: NAVY, marginBottom: 16 },
  primaryBtn: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
